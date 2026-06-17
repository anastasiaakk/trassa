import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { FormColumn, FormLayout, FormTemplate, FormTemplateSheet } from "../types/adminForms";
import {
  assignTemplateToContractors,
  importTemplateFromCsv,
  listAllMonitoring,
  loadAdminFormsStore,
  removeFormTemplate,
  saveAdminFormsStore,
  upsertFormTemplate,
} from "../utils/adminFormsStorage";
import {
  assignAdminForms,
  fetchAdminFormsStore,
  importAdminFormFile,
  putAdminFormsStore,
} from "../api/adminFormsApi";
import { authListUsers } from "../api/authApi";
import { getAdminApiToken } from "../api/adminApi";
import { isAuthApiEnabled } from "../utils/authMode";
import { listRegisteredUsers, type LocalUserRecord } from "../utils/localAuth";
import { generateTemplateFillHints, runAdminAiQuery } from "../utils/adminFormsAi";
import { downloadMonitoringCsv, downloadAiResultCsv } from "../utils/adminFormsExport";
import {
  loadAiPromptLibrary,
  removeAiPrompt,
  upsertAiPrompt,
} from "../utils/aiPromptsStorage";

import FormColumnEditor from "../components/admin/FormColumnEditor";
import FormGridEditor from "../components/admin/FormGridEditor";
import FormSubmissionViewer from "../components/forms/FormSubmissionViewer";
import { getFormSubmissionReview } from "../utils/adminFormsStorage";
import { fetchFormsManageSubmission } from "../api/formsManageApi";
import type { FormMonitoringRow } from "../types/adminForms";
import type { FormSubmission } from "../types/adminForms";
import { cloneSeedRows, templateLayout } from "../utils/adminFormsGrid";
import styles from "./AdminPanel.module.css";
import glass from "./AdminPanelGlass.module.css";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import tables from "./AdminTablesPanel.module.css";

type PanelView = "workspace" | "monitor" | "ai";
type EditorTab = "general" | "columns" | "hints" | "assign";

function TablesIconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TablesIconImport({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3.5v8m0 0l2.5-2.5M10 11.5 7.5 9M5 13.5v1.75A1.75 1.75 0 0 0 6.75 17h6.5A1.75 1.75 0 0 0 15 15.25V13.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TablesIconMonitor({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19h16M6.5 15.5 10 11l3.5 2.5L18 8"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V7A1.5 1.5 0 0 1 5 5.5Z"
      />
    </svg>
  );
}

/** Искры (ИИ) — контур, без заливки */
function TablesIconAi({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 4.5 12.2 8.2 16 9.4 12.2 10.6 11 14.5 9.8 10.6 6 9.4 9.8 8.2 11 4.5Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 6.5 18.55 8.1 20.2 8.65 18.55 9.2 18 10.85 17.45 9.2 15.8 8.65 17.45 8.1 18 6.5Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 16.5 7 17.85 8.35 18.35 7 18.85 6.5 20.2 6 18.85 4.65 18.35 6 17.85 6.5 16.5Z"
      />
    </svg>
  );
}

const PANEL_NAV_LABELS: Record<PanelView, string> = {
  workspace: "Конструктор",
  monitor: "Мониторинг",
  ai: "ИИ-ассистент",
};

function stripMergedHeaderWithFirstRow(columns: FormColumn[], seedRows?: { cells: Record<string, unknown> }[]): FormColumn[] {
  const firstRow = seedRows?.[0]?.cells;
  if (!firstRow) return columns;
  let changed = false;
  const next = columns.map((col) => {
    const title = String(col.title ?? "");
    const value = String(firstRow[col.id] ?? "").trim();
    if (!value) return col;
    const marker = ` — ${value}`;
    if (!title.endsWith(marker)) return col;
    changed = true;
    return { ...col, title: title.slice(0, -marker.length).trim() || col.title };
  });
  return changed ? next : columns;
}

function sanitizeTemplateMergedHeaders(template: FormTemplate): FormTemplate {
  const baseColumns = stripMergedHeaderWithFirstRow(template.columns, template.seedRows);
  const sheets = template.importSheets?.map((sheet) => ({
    ...sheet,
    columns: stripMergedHeaderWithFirstRow(sheet.columns, sheet.seedRows),
  }));
  return {
    ...template,
    columns: baseColumns,
    importSheets: sheets,
  };
}

export default function AdminTablesPanel() {
  const isV2 = usePortalDesign() === "v2";
  const authApi = isAuthApiEnabled();
  const aiReady = authApi && Boolean(getAdminApiToken());

  const [view, setView] = useState<PanelView>("workspace");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const [templateSearch, setTemplateSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [store, setStore] = useState(() => loadAdminFormsStore());
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Partial<FormTemplate>>({});
  const [assignEmails, setAssignEmails] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [promptLib, setPromptLib] = useState(() => loadAiPromptLibrary());
  const [editPromptId, setEditPromptId] = useState<string | null>(null);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptBody, setPromptBody] = useState("");
  const [portalUsers, setPortalUsers] = useState<LocalUserRecord[]>(() => listRegisteredUsers());
  const [reviewRow, setReviewRow] = useState<FormMonitoringRow | null>(null);
  const [reviewTemplate, setReviewTemplate] = useState<FormTemplate | null>(null);
  const [reviewSubmission, setReviewSubmission] = useState<FormSubmission | null>(null);
  const [columnsEditMode, setColumnsEditMode] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authApi && getAdminApiToken()) {
      const r = await fetchAdminFormsStore();
      if (r.ok) {
        saveAdminFormsStore(r.store);
        setStore(loadAdminFormsStore());
        return;
      }
      setMsg(r.error);
    }
    setStore(loadAdminFormsStore());
  }, [authApi]);

  const reloadPortalUsers = useCallback(async () => {
    if (authApi && getAdminApiToken()) {
      const r = await authListUsers();
      if (r.ok) {
        setPortalUsers(
          r.users.map((u) => ({
            emailNorm: u.emailNorm,
            passwordHash: "",
            profile: u.profile,
            createdAt: u.createdAt,
          }))
        );
        return;
      }
    }
    setPortalUsers(listRegisteredUsers());
  }, [authApi]);

  useEffect(() => {
    void refresh();
    void reloadPortalUsers();
    const onChange = () => {
      setStore(loadAdminFormsStore());
      void reloadPortalUsers();
    };
    window.addEventListener("trassa-admin-forms-changed", onChange);
    window.addEventListener("trassa-profile-saved", onChange);
    return () => {
      window.removeEventListener("trassa-admin-forms-changed", onChange);
      window.removeEventListener("trassa-profile-saved", onChange);
    };
  }, [refresh, reloadPortalUsers]);

  const contractors = useMemo(
    () =>
      portalUsers.filter(
        (u) =>
          u.profile.roleLabel.toLowerCase().includes("подряд") ||
          Boolean(u.profile.contractorCompanyName.trim())
      ),
    [portalUsers]
  );

  const syncStoreToServer = useCallback(async (): Promise<boolean> => {
    if (!authApi) return true;
    if (!getAdminApiToken()) {
      setMsg("Нет токена администратора. Выйдите и войдите снова.");
      return false;
    }
    const r = await putAdminFormsStore(loadAdminFormsStore());
    if (!r.ok) {
      setMsg(`Не удалось синхронизировать таблицы с сервером: ${r.error}`);
      return false;
    }
    return true;
  }, [authApi]);

  const monitoring = useMemo(() => listAllMonitoring(), [store]);
  const avgFill = useMemo(() => {
    if (monitoring.length === 0) return 0;
    return Math.round(monitoring.reduce((s, r) => s + r.fillPercent, 0) / monitoring.length);
  }, [monitoring]);

  const tablesKpiItems = useMemo(() => {
    const templates = store.templates.length;
    const assignments = store.assignments.length;
    return [
      {
        id: "templates",
        label: "Шаблонов",
        value: String(templates),
        trend: templates > 0 ? ("up" as const) : ("neutral" as const),
        insight: "Готовые таблицы для назначения подрядчикам.",
      },
      {
        id: "assignments",
        label: "Назначений",
        value: String(assignments),
        trend: assignments > 0 ? ("up" as const) : ("neutral" as const),
        insight: "Активные назначения форм организациям.",
      },
      {
        id: "fill",
        label: "Средний % заполнения",
        value: `${avgFill}%`,
        trend: avgFill >= 70 ? ("up" as const) : avgFill > 0 ? ("neutral" as const) : ("down" as const),
        trendLabel: avgFill > 0 ? `${avgFill}%` : undefined,
        insight:
          avgFill >= 70
            ? "Большинство таблиц заполнены выше порога."
            : "Следите за просроченными и пустыми ячейками.",
      },
      {
        id: "ai",
        label: "ИИ",
        value: aiReady ? "OpenAI" : "Локально",
        trend: aiReady ? ("up" as const) : ("neutral" as const),
        insight: aiReady
          ? "Подсказки и разбор таблиц через облачный API."
          : "Работа без внешнего ключа — только локальные сценарии.",
      },
    ];
  }, [store.templates.length, store.assignments.length, avgFill, aiReady]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return store.templates;
    return store.templates.filter((t) => t.title.toLowerCase().includes(q));
  }, [store.templates, templateSearch]);

  const selected = store.templates.find((t) => t.id === selectedId);
  const assignedCount = selectedId
    ? store.assignments.filter((a) => a.templateId === selectedId).length
    : 0;

  const activeSheet = useMemo<FormTemplateSheet | null>(() => {
    const sheets = draft.importSheets ?? [];
    if (sheets.length === 0) return null;
    if (selectedSheetId) {
      const picked = sheets.find((s) => s.id === selectedSheetId);
      if (picked) return picked;
    }
    return sheets[0] ?? null;
  }, [draft.importSheets, selectedSheetId]);

  const effectiveLayout: FormLayout =
    templateLayout({
      layout: activeSheet?.layout ?? draft.layout,
      seedRows: activeSheet?.seedRows ?? draft.seedRows,
    }) === "form"
      ? "form"
      : "grid";
  const effectiveColumns = activeSheet?.columns ?? draft.columns ?? [];
  const effectiveRows = useMemo(() => {
    const raw = activeSheet?.seedRows ?? draft.seedRows;
    if (effectiveLayout !== "grid") return raw ?? [];
    if (raw?.length) return raw;
    return cloneSeedRows();
  }, [activeSheet?.seedRows, draft.seedRows, effectiveLayout]);

  const updateSheetDraft = useCallback(
    (patch: {
      columns?: FormTemplateSheet["columns"];
      seedRows?: FormTemplateSheet["seedRows"];
      layout?: FormLayout;
    }) => {
      if (!activeSheet) {
        setDraft((prev) => ({ ...prev, ...patch }));
        return;
      }
      setDraft((prev) => {
        const sheets = (prev.importSheets ?? []).map((s) =>
          s.id === activeSheet.id ? { ...s, ...patch } : s
        );
        const nextActive = sheets.find((s) => s.id === activeSheet.id);
        return {
          ...prev,
          importSheets: sheets,
          columns: nextActive?.columns ?? prev.columns,
          seedRows: nextActive?.seedRows ?? prev.seedRows,
          layout: (nextActive?.layout ?? prev.layout) as FormLayout | undefined,
        };
      });
    },
    [activeSheet]
  );

  const removeImportSheet = (sheetId: string) => {
    const sheets = draft.importSheets ?? [];
    if (sheets.length <= 1) {
      setMsg("Нельзя удалить последнюю вкладку.");
      return;
    }
    const target = sheets.find((s) => s.id === sheetId);
    if (!target) return;
    if (!window.confirm(`Удалить вкладку «${target.title}»?`)) return;

    const nextSheets = sheets.filter((s) => s.id !== sheetId);
    const nextActive =
      selectedSheetId === sheetId
        ? nextSheets[0]
        : (nextSheets.find((s) => s.id === selectedSheetId) ?? nextSheets[0]);

    setSelectedSheetId(nextActive?.id ?? null);
    setDraft((prev) => ({
      ...prev,
      importSheets: nextSheets.length > 1 ? nextSheets : undefined,
      columns: nextActive?.columns ?? prev.columns,
      seedRows: nextActive?.seedRows ?? prev.seedRows,
      layout: nextActive?.layout ?? prev.layout,
    }));
    setMsg(`Вкладка «${target.title}» удалена.`);
  };

  const startNewTemplate = () => {
    setSelectedId("");
    setEditorTab("general");
    setColumnsEditMode(false);
    setSelectedSheetId(null);
    setDraft({
      title: "",
      description: "",
      columns: [{ id: `col-${Date.now()}`, title: "Поле", type: "text", required: true }],
      deadlineAt: null,
      active: true,
      aiFillHints: "",
      layout: "grid",
      seedRows: cloneSeedRows(),
    });
  };

  const loadTemplateToDraft = (t: FormTemplate) => {
    const normalized = sanitizeTemplateMergedHeaders(t);
    const layout = templateLayout(normalized);
    setSelectedId(normalized.id);
    setDraft({
      ...normalized,
      layout,
      seedRows: layout === "grid" ? cloneSeedRows(normalized.seedRows) : normalized.seedRows,
    });
    setEditorTab(templateLayout(normalized) === "grid" ? "columns" : "general");
    setColumnsEditMode(false);
    setSelectedSheetId(normalized.importSheets?.[0]?.id ?? null);
  };

  const handleSaveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    const title = (draft.title ?? "").trim();
    if (!title) {
      setMsg("Укажите название шаблона.");
      return;
    }
    const columns = effectiveColumns.filter((c) => c.title.trim());
    if (columns.length === 0) {
      setMsg("Добавьте хотя бы один столбец.");
      return;
    }
    const layout: FormLayout = effectiveLayout;
    const item = upsertFormTemplate({
      id: selectedId || undefined,
      title,
      description: (draft.description ?? "").trim(),
      columns,
      layout,
      seedRows: layout === "grid" ? cloneSeedRows(effectiveRows) : undefined,
      importSheets: draft.importSheets,
      deadlineAt: draft.deadlineAt || null,
      active: draft.active !== false,
      aiFillHints: (draft.aiFillHints ?? "").trim(),
    });
    setSelectedId(item.id);
    setDraft(item);
    setColumnsEditMode(false);
    if (!(await syncStoreToServer())) return;
    await refresh();
    setMsg(`Шаблон «${item.title}» сохранён.`);
  };

  const handleGenerateHints = async () => {
    if (!draft.title || !(draft.columns?.length)) {
      setMsg("Сначала укажите название и столбцы.");
      return;
    }
    setAiBusy(true);
    setMsg(null);
    const hints = await generateTemplateFillHints({
      id: selectedId || "draft",
      title: draft.title,
      description: draft.description ?? "",
      columns: draft.columns ?? [],
      layout: draft.layout,
      seedRows: draft.seedRows,
      deadlineAt: draft.deadlineAt ?? null,
      active: true,
      aiFillHints: "",
      createdAt: "",
      updatedAt: "",
    });
    setDraft((d) => ({ ...d, aiFillHints: hints }));
    setAiBusy(false);
    setEditorTab("hints");
    setMsg(
      aiReady
        ? "Подсказки сгенерированы (OpenAI). Проверьте текст и сохраните шаблон."
        : "Подсказки сформированы локально. Для ИИ на сервере задайте OPENAI_API_KEY и войдите в админку с API."
    );
  };

  const parseAssignEmails = () =>
    assignEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

  const handleAssign = async () => {
    if (!selectedId) {
      setMsg("Выберите шаблон.");
      return;
    }
    const emails = parseAssignEmails();
    if (emails.length === 0) {
      setMsg("Укажите e-mail подрядчиков или выберите из списка.");
      return;
    }
    if (authApi && getAdminApiToken()) {
      if (!(await syncStoreToServer())) return;
      const r = await assignAdminForms({ templateId: selectedId, contractorEmails: emails });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      saveAdminFormsStore(r.store);
      setStore(loadAdminFormsStore());
      setMsg(`Назначено подрядчикам: ${r.added} (новых).`);
      return;
    }
    assignTemplateToContractors(selectedId, emails);
    await refresh();
    setMsg(`Назначено подрядчикам: ${emails.length}`);
  };

  const handleAssignAll = async () => {
    if (!selectedId) {
      setMsg("Сначала выберите шаблон в списке слева или сохраните новый.");
      return;
    }
    const allEmails = contractors.map((c) => c.emailNorm.trim().toLowerCase()).filter(Boolean);
    if (allEmails.length === 0) {
      setMsg(
        "Нет подрядчиков для назначения. Добавьте пользователей с ролью «подрядчик» (раздел «Пользователи» в админке) или укажите e-mail вручную."
      );
      return;
    }
    setAssignEmails(allEmails.join(", "));
    if (authApi && getAdminApiToken()) {
      if (!(await syncStoreToServer())) return;
      const r = await assignAdminForms({ templateId: selectedId, contractorEmails: allEmails });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      saveAdminFormsStore(r.store);
      setStore(loadAdminFormsStore());
      setMsg(`Назначено всем подрядчикам (новых: ${r.added}).`);
      return;
    }
    assignTemplateToContractors(selectedId, allEmails);
    await refresh();
    setMsg(`Назначено всем подрядчикам (${contractors.length}).`);
  };

  const toggleContractorEmail = (email: string) => {
    const set = new Set(parseAssignEmails());
    if (set.has(email)) set.delete(email);
    else set.add(email);
    setAssignEmails(Array.from(set).join(", "));
  };

  const openSubmissionReview = async (row: FormMonitoringRow) => {
    setReviewRow(row);
    if (authApi && getAdminApiToken()) {
      const r = await fetchFormsManageSubmission(row.templateId, row.contractorEmailNorm);
      if (r.ok) {
        setReviewTemplate(r.template);
        setReviewSubmission(r.submission);
        return;
      }
    }
    const local = getFormSubmissionReview(row.templateId, row.contractorEmailNorm);
    setReviewTemplate(local?.template ?? null);
    setReviewSubmission(local?.submission ?? null);
  };

  const handleImport = async () => {
    if (!importFile) {
      setMsg("Выберите файл.");
      return;
    }
    const title = importTitle || importFile.name.replace(/\.[^.]+$/, "");

    if (authApi && getAdminApiToken()) {
      const r = await importAdminFormFile(importFile, title);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      saveAdminFormsStore(r.store);
      setStore(loadAdminFormsStore());
      loadTemplateToDraft(r.template);
      setImportModalOpen(false);
      setEditorTab("columns");
      setColumnsEditMode(false);
      const rows = r.rowCount ?? r.template.seedRows?.length ?? 0;
      const sheet = r.sheetName ? ` · лист «${r.sheetName}»` : "";
      const aiNote = r.usedAi ? " · ИИ разобрал структуру без изменения ячеек" : "";
      setMsg(
        `Импортирован шаблон «${r.template.title}»${sheet}${rows > 0 ? ` (${rows} строк, режим таблицы)` : ""}${aiNote}.`
      );
      return;
    }

    const ext = importFile.name.toLowerCase();
    if (
      /\.(xlsx|xls|xlsm|xlsb|ods|fods|xltx|xltm|docx)$/i.test(ext)
    ) {
      setMsg("Импорт Excel/Word на сервере: включите API и войдите как администратор.");
      return;
    }
    const text = await importFile.text();
    const t = importTemplateFromCsv(text, title);
    if (!t) {
      setMsg("Не удалось разобрать файл. Нужна строка заголовков.");
      return;
    }
    await refresh();
    loadTemplateToDraft(t);
    setImportModalOpen(false);
    setMsg(`Импортирован шаблон «${t.title}».`);
  };

  const handleAiRun = async () => {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    setAiReply("");
    const reply = await runAdminAiQuery(aiPrompt.trim(), store);
    setAiReply(reply);
    setAiBusy(false);
  };

  const handleAiExport = () => {
    if (!aiReply.trim()) return;
    downloadAiResultCsv("ai-otvet", [
      ["Запрос", aiPrompt],
      ["Ответ", aiReply],
    ]);
  };

  const savePrompt = () => {
    if (!promptTitle.trim() || !promptBody.trim()) return;
    upsertAiPrompt({
      id: editPromptId ?? undefined,
      title: promptTitle,
      body: promptBody,
    });
    setPromptLib(loadAiPromptLibrary());
    setEditPromptId(null);
    setPromptTitle("");
    setPromptBody("");
    setMsg("Промпт сохранён.");
  };

  const closeImportModal = useCallback(() => {
    setImportModalOpen(false);
  }, []);

  useEffect(() => {
    if (!importModalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeImportModal();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [importModalOpen, closeImportModal]);

  const navBtn = (id: PanelView, options?: { iconOnly?: boolean }) => {
    const label = PANEL_NAV_LABELS[id];
    const iconOnly = options?.iconOnly ?? false;
    return (
      <button
        key={id}
        type="button"
        className={cx(
          view === id ? tables.navBtnActive : tables.navBtn,
          iconOnly && tables.navBtnIconOnly,
          isV2 && "admin-tables-nav-btn",
          isV2 && view === id && "admin-tables-nav-btn--active",
        )}
        onClick={() => setView(id)}
        title={label}
        aria-label={label}
        aria-current={view === id ? "page" : undefined}
      >
        {iconOnly ? (
          id === "monitor" ? (
            <TablesIconMonitor className={tables.navGlyph} />
          ) : id === "ai" ? (
            <TablesIconAi className={tables.navGlyph} />
          ) : (
            label
          )
        ) : (
          label
        )}
      </button>
    );
  };

  const editorTabBtn = (id: EditorTab, label: string) => (
    <button
      key={id}
      type="button"
      className={cx(
        editorTab === id ? tables.tabBtnActive : tables.tabBtn,
        isV2 && "admin-tables-tab-btn",
        isV2 && editorTab === id && "admin-tables-tab-btn--active",
      )}
      onClick={() => setEditorTab(id)}
    >
      {label}
    </button>
  );

  const renderEditorBody = () => {
    if (!draft.title && !selectedId && !(draft.columns?.length)) {
      return (
        <div className={tables.emptyState}>
          Выберите шаблон слева или нажмите «Новый шаблон». Здесь настраиваются поля, подсказки и
          назначение подрядчикам.
        </div>
      );
    }

    return (
      <form className={styles.form} onSubmit={(e) => void handleSaveTemplate(e)}>
        {editorTab === "general" ? (
          <>
            <label className={styles.label}>
              Название
              <input
                className={styles.input}
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className={styles.label}>
              Описание для подрядчика
              <textarea
                className={styles.input}
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Зачем заполнять таблицу, откуда данные"
              />
            </label>
            <div className={styles.rowBtns} style={{ flexWrap: "wrap" }}>
              <label className={styles.label} style={{ flex: 1, minWidth: 200 }}>
                Срок сдачи
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={
                    draft.deadlineAt
                      ? new Date(draft.deadlineAt).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      deadlineAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </label>
              <label className={styles.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.active !== false}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Активен
              </label>
            </div>
          </>
        ) : null}

        {editorTab === "columns" ? (
          <>
            <div className={tables.columnsToolbar}>
              <label className={tables.columnsToolbarMode}>
                <span className={tables.columnsToolbarModeLabel}>Режим</span>
                <select
                  className={tables.columnsToolbarSelect}
                  value={effectiveLayout}
                  disabled={!columnsEditMode}
                  onChange={(e) => {
                    const layout = e.target.value as FormLayout;
                    updateSheetDraft({
                      layout,
                      seedRows:
                        layout === "grid"
                          ? effectiveRows.length
                            ? effectiveRows
                            : cloneSeedRows()
                          : undefined,
                    });
                  }}
                >
                  <option value="grid">Таблица (строки и столбцы)</option>
                  <option value="form">Одна форма (поля)</option>
                </select>
              </label>
              <button
                type="button"
                className={columnsEditMode ? tables.actionBtnPrimary : tables.actionBtnSecondary}
                onClick={() => setColumnsEditMode((v) => !v)}
              >
                {columnsEditMode ? "Завершить" : "Изменить столбцы"}
              </button>
            </div>
            {columnsEditMode ? (
              <FormColumnEditor
                columns={effectiveColumns}
                onChange={(columns) => updateSheetDraft({ columns })}
              />
            ) : null}
            {effectiveLayout !== "form" ? (
              <div className={tables.dataGrid}>
                {(() => {
                  const importedSheets = draft.importSheets ?? [];
                  const hasImportedSheets = importedSheets.length > 0;
                  const tabs = hasImportedSheets
                    ? importedSheets.map((sheet) => ({
                        id: sheet.id,
                        title: sheet.title,
                        removable: importedSheets.length > 1,
                      }))
                    : [{ id: "__base__", title: "Основной", removable: false }];
                  return (
                    <div className={tables.sheetTabsBar} role="tablist" aria-label="Листы таблицы">
                      <span className={tables.sheetTabsBarLabel}>Листы</span>
                      <div className={tables.sheetTabsScroll}>
                        {tabs.map((sheet) => {
                          const isActive = hasImportedSheets
                            ? (activeSheet?.id ?? importedSheets[0]?.id) === sheet.id
                            : true;
                          return (
                            <div
                              key={sheet.id}
                              className={`${tables.sheetTab} ${isActive ? tables.sheetTabActive : ""}`}
                              role="tab"
                              aria-selected={isActive}
                            >
                              <button
                                type="button"
                                className={tables.sheetTabLabel}
                                onClick={() => setSelectedSheetId(sheet.id === "__base__" ? null : sheet.id)}
                              >
                                {sheet.title}
                              </button>
                              {sheet.removable ? (
                                <button
                                  type="button"
                                  className={tables.sheetTabClose}
                                  title="Удалить лист"
                                  aria-label={`Удалить лист ${sheet.title}`}
                                  onClick={() => removeImportSheet(sheet.id)}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <FormGridEditor
                  columns={effectiveColumns}
                  rows={effectiveRows}
                  readOnly={!columnsEditMode}
                  onChange={(seedRows) => updateSheetDraft({ seedRows })}
                  isV2={isV2}
                />
              </div>
            ) : columnsEditMode ? null : (
              <p className={styles.subtitle}>
                Переключите режим на «Таблица (строки и столбцы)».
              </p>
            )}
          </>
        ) : null}

        {editorTab === "hints" ? (
          <>
            <div className={aiReady ? tables.aiOk : tables.aiWarn}>
              {aiReady
                ? "ИИ: OpenAI на сервере. Подсказки — деловая инструкция по столбцам, без «чат-бота»."
                : "ИИ на сервере выключен — подсказки строятся по шаблону локально. Задайте OPENAI_API_KEY в .env и перезапустите API."}
            </div>
            <label className={styles.label}>
              Текст для подрядчика (показывается при заполнении)
              <textarea
                className={styles.input}
                rows={10}
                value={draft.aiFillHints ?? ""}
                onChange={(e) => setDraft({ ...draft, aiFillHints: e.target.value })}
              />
            </label>
            {draft.aiFillHints ? (
              <div className={tables.hintsBox}>{draft.aiFillHints}</div>
            ) : null}
            <button
              type="button"
              className={styles.btnNeoPrimary}
              disabled={aiBusy}
              onClick={() => void handleGenerateHints()}
            >
              {aiBusy ? "Генерация…" : "Сгенерировать подсказки (ИИ)"}
            </button>
          </>
        ) : null}

        {editorTab === "assign" ? (
          <>
            <p className={styles.subtitle}>
              Назначено подрядчиков: <strong>{assignedCount}</strong>
              {selected?.deadlineAt
                ? ` · срок ${new Date(selected.deadlineAt).toLocaleString("ru-RU")}`
                : ""}
            </p>
            <label className={styles.label}>
              E-mail (через запятую)
              <textarea
                className={styles.input}
                rows={3}
                value={assignEmails}
                onChange={(e) => setAssignEmails(e.target.value)}
                placeholder="contractor@mail.ru"
              />
            </label>
            {contractors.length > 0 ? (
              <div className={tables.contractorChips}>
                {contractors.map((c) => {
                  const on = parseAssignEmails().includes(c.emailNorm);
                  return (
                    <button
                      key={c.emailNorm}
                      type="button"
                      className={on ? tables.chipOn : tables.chip}
                      onClick={() => toggleContractorEmail(c.emailNorm)}
                      title={c.profile.contractorCompanyName || c.emailNorm}
                    >
                      {c.profile.contractorCompanyName.trim() || c.emailNorm}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className={tables.editorActionBar}>
              <button
                type="button"
                className={tables.actionBtnPrimary}
                onClick={() => void handleAssign()}
              >
                Назначить выбранным
              </button>
              <button
                type="button"
                className={tables.actionBtnSecondary}
                onClick={() => void handleAssignAll()}
              >
                Всем подрядчикам
              </button>
            </div>
          </>
        ) : null}

        <div className={tables.editorFooter}>
          {selectedId ? (
            <button
              type="button"
              className={tables.actionBtnDanger}
              onClick={() => {
                if (!window.confirm("Удалить шаблон?")) return;
                removeFormTemplate(selectedId);
                startNewTemplate();
                void refresh();
              }}
            >
              Удалить шаблон
            </button>
          ) : (
            <span className={tables.editorFooterSpacer} aria-hidden />
          )}
          <button type="submit" className={tables.actionBtnPrimary}>
            Сохранить шаблон
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className={cx(tables.shell, isV2 && "admin-tables-v2")}>
      <div className={glass.glassStats}>
        {tablesKpiItems.map((stat) => (
          <div key={stat.id} className={glass.glassStatCard}>
            <span className={glass.glassStatValue}>{stat.value}</span>
            <span className={glass.glassStatLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={tables.topBar}>
        <div className={tables.nav}>
          {navBtn("workspace")}
          {navBtn("monitor", { iconOnly: true })}
          {navBtn("ai", { iconOnly: true })}
        </div>
      </div>

      <p className={styles.subtitle} style={{ margin: 0 }}>
        Шаблоны для подрядчиков, контроль заполнения и срезы для РАДОР.
      </p>

      {msg ? <p className={glass.glassMsg}>{msg}</p> : null}

      {view === "workspace" ? (
        <div className={cx(tables.workspace, tables.tablesWorkspace)}>
          <aside className={cx(tables.sidebar, isV2 && "admin-tables-aside")}>
            <div
              className={
                isV2 ? "admin-tables-sidebar-actions" : cx(tables.sidebarActions)
              }
            >
              {isV2 ? (
                <>
                  <button
                    type="button"
                    className="admin-tables-sidebar-action admin-tables-sidebar-create"
                    onClick={startNewTemplate}
                  >
                    <span className="admin-tables-sidebar-action-icon" aria-hidden>
                      <TablesIconPlus />
                    </span>
                    <span className="admin-tables-sidebar-action-label">Создать</span>
                  </button>
                  <button
                    type="button"
                    className="admin-tables-sidebar-action admin-tables-sidebar-import"
                    onClick={() => setImportModalOpen(true)}
                  >
                    <span className="admin-tables-sidebar-action-icon" aria-hidden>
                      <TablesIconImport />
                    </span>
                    <span className="admin-tables-sidebar-action-label">
                      Импорт из Excel
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={cx(styles.btnNeoPrimary, tables.sidebarActionBtn)}
                    onClick={startNewTemplate}
                  >
                    <span className={tables.sidebarActionIcon} aria-hidden>
                      <TablesIconPlus className={tables.sidebarActionSvg} />
                    </span>
                    <span className={tables.sidebarActionLabel}>+ Создать таблицу</span>
                  </button>
                  <button
                    type="button"
                    className={cx(styles.btnNeoGhost, tables.sidebarActionBtn)}
                    onClick={() => setImportModalOpen(true)}
                  >
                    <span className={tables.sidebarActionIcon} aria-hidden>
                      <TablesIconImport className={tables.sidebarActionSvg} />
                    </span>
                    <span className={tables.sidebarActionLabel}>Импорт из Excel</span>
                  </button>
                </>
              )}
            </div>
            <input
              className={tables.search}
              placeholder="Поиск шаблона…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
            <ul className={tables.templateList}>
              {filteredTemplates.length === 0 ? (
                <li className={styles.subtitle}>Нет шаблонов</li>
              ) : (
                filteredTemplates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={selectedId === t.id ? tables.templateItemActive : tables.templateItem}
                      onClick={() => loadTemplateToDraft(t)}
                    >
                      <div className={tables.templateTitle}>
                        {t.title}
                        {t.layout === "grid" ? " ⊞" : ""}
                        {t.owner === "rador" ? " · РАДОР" : ""}
                        {!t.active ? " · выкл." : ""}
                      </div>
                      <div className={tables.templateMeta}>
                        {t.columns.length} столб.
                        {t.deadlineAt
                          ? ` · до ${new Date(t.deadlineAt).toLocaleDateString("ru-RU")}`
                          : ""}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </aside>
          <div className={tables.editor}>
            <div className={tables.editorTabs}>
              {editorTabBtn("general", "Основное")}
              {editorTabBtn("columns", "Столбцы и данные")}
              {editorTabBtn("hints", "Подсказки")}
              {editorTabBtn("assign", "Отправить подрядчикам")}
            </div>
            {renderEditorBody()}
          </div>
        </div>
      ) : null}

      {view === "monitor" ? (
        <>
          <p className={styles.subtitle}>
            Заполнение по подрядчикам (в т.ч. таблицы РАДОР). Нажмите строку — просмотр ответов.
            В день срока — срез для РАДОР.
          </p>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.tableSpecList}`}>
              <thead>
                <tr>
                  <th>Таблица</th>
                  <th>Подрядчик</th>
                  <th className={styles.tableColCenter}>%</th>
                  <th className={styles.tableColCenter}>Сдано</th>
                </tr>
              </thead>
              <tbody>
                {monitoring.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Нет назначений.</td>
                  </tr>
                ) : (
                  monitoring.map((r) => (
                    <tr
                      key={`${r.templateId}-${r.contractorEmailNorm}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => void openSubmissionReview(r)}
                    >
                      <td>{r.templateTitle}</td>
                      <td>{r.contractorLabel}</td>
                      <td className={styles.tableColCenter}>{r.fillPercent}%</td>
                      <td className={styles.tableColCenter}>{r.submitted ? "да" : "нет"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {reviewTemplate ? (
            <FormSubmissionViewer
              template={reviewTemplate}
              submission={reviewSubmission}
              contractorLabel={reviewRow?.contractorLabel ?? ""}
              onClose={() => {
                setReviewRow(null);
                setReviewTemplate(null);
                setReviewSubmission(null);
              }}
            />
          ) : null}
          <div className={styles.rowBtns} style={{ marginTop: 12 }}>
            {store.templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={styles.btnNeoGhost}
                onClick={() => downloadMonitoringCsv(t)}
              >
                CSV: {t.title}
              </button>
            ))}
          </div>
          <h4 className={styles.sectionTitle} style={{ marginTop: 24 }}>
            Срезы по срокам
          </h4>
          {store.snapshots.length === 0 ? (
            <p className={styles.subtitle}>Появятся после наступления срока сдачи.</p>
          ) : (
            store.snapshots.map((s) => (
              <div
                key={s.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                <strong>{s.templateTitle}</strong> — {new Date(s.dueAt).toLocaleString("ru-RU")}
                <br />
                Подрядчиков: {s.summary.contractors}, сдано: {s.summary.submitted}, средний %:{" "}
                {s.summary.avgFillPercent}
              </div>
            ))
          )}
        </>
      ) : null}

      {importModalOpen
        ? createPortal(
            <div
              className={cx(tables.importOverlay, "admin-tables-import-overlay")}
              role="presentation"
              onClick={closeImportModal}
            >
              <div
                className={cx(tables.importDialog, "admin-tables-import-dialog")}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-tables-import-title"
                onClick={(event) => event.stopPropagation()}
              >
                <header className={tables.importDialogHead}>
                  <h2 id="admin-tables-import-title" className={tables.importDialogTitle}>
                    Импорт из Excel
                  </h2>
                  <button
                    type="button"
                    className={tables.importDialogClose}
                    onClick={closeImportModal}
                    aria-label="Закрыть"
                  >
                    ×
                  </button>
                </header>
                <div className={`${styles.form} ${tables.importDialogBody}`}>
                  <p className={styles.subtitle}>
                    Excel (.xlsx, .xls, .xlsm, .ods…), Word (.docx) или CSV/TSV. На сервере с
                    OPENAI_API_KEY ИИ сам находит лист и строку заголовков (значения ячеек не
                    переписываются).
                  </p>
                  <label className={styles.label}>
                    Название
                    <input
                      className={styles.input}
                      value={importTitle}
                      onChange={(e) => setImportTitle(e.target.value)}
                    />
                  </label>
                  <label className={styles.label}>
                    Файл
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.xlsb,.ods,.xltx,.xltm,.docx"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className={tables.importDialogFooter}>
                    <button
                      type="button"
                      className={tables.importDialogCancel}
                      onClick={closeImportModal}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className={cx(tables.importDialogSubmit, "admin-tables-import-submit")}
                      disabled={!importFile}
                      onClick={() => void handleImport()}
                    >
                      Импортировать
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {view === "ai" ? (
        <div className={tables.aiChat}>
          <div className={tables.editor}>
            <div className={aiReady ? tables.aiOk : tables.aiWarn}>
              {aiReady
                ? "Полноценный ИИ (OpenAI): анализ таблиц, распределение студентов, черновики шаблонов. Ответы деловые, без small talk."
                : "Подключите OPENAI_API_KEY на сервере и войдите в админку с включённым API."}
            </div>
            <textarea
              className={styles.input}
              rows={6}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Пример: предложи столбцы для отчёта по летней практике; или: кто не сдал таблицы с просрочкой?"
            />
            <div className={styles.rowBtns}>
              <button
                type="button"
                className={styles.btnNeoPrimary}
                disabled={aiBusy}
                onClick={() => void handleAiRun()}
              >
                {aiBusy ? "Думаю…" : "Спросить ИИ"}
              </button>
              <button type="button" className={styles.btnNeoGhost} disabled={!aiReply} onClick={handleAiExport}>
                CSV
              </button>
            </div>
            {aiReply ? <div className={tables.aiReply}>{aiReply}</div> : null}
          </div>
          <div className={tables.editor}>
            <h4 className={styles.sectionTitle}>База промптов</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
              {promptLib.prompts.map((p) => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    className={styles.btnNeoGhost}
                    style={{ width: "100%", textAlign: "left", fontSize: 12 }}
                    onClick={() => {
                      setAiPrompt(p.body);
                      setEditPromptId(p.id);
                      setPromptTitle(p.title);
                      setPromptBody(p.body);
                    }}
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
            <label className={styles.label}>
              Название
              <input className={styles.input} value={promptTitle} onChange={(e) => setPromptTitle(e.target.value)} />
            </label>
            <label className={styles.label}>
              Текст
              <textarea
                className={styles.input}
                rows={4}
                value={promptBody}
                onChange={(e) => setPromptBody(e.target.value)}
              />
            </label>
            <div className={styles.rowBtns}>
              <button type="button" className={styles.btnNeoPrimary} onClick={savePrompt}>
                Сохранить
              </button>
              {editPromptId ? (
                <button
                  type="button"
                  className={styles.btnSmallDanger}
                  onClick={() => {
                    removeAiPrompt(editPromptId);
                    setPromptLib(loadAiPromptLibrary());
                    setEditPromptId(null);
                  }}
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
