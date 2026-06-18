import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { FormLayout, FormTemplate, FormTemplateSheet } from "../types/adminForms";
import type { FormMonitoringRow } from "../types/adminForms";
import type { FormSubmission } from "../types/adminForms";
import {
  assignTemplateToContractors,
  importTemplateFromCsv,
  listAllMonitoring,
  loadAdminFormsStore,
  saveAdminFormsStore,
  upsertFormTemplate,
  getFormSubmissionReview,
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
import { downloadAiResultCsv } from "../utils/adminFormsExport";
import {
  loadAiPromptLibrary,
  upsertAiPrompt,
} from "../utils/aiPromptsStorage";
import { sanitizeTemplateMergedHeaders } from "../utils/adminTablesTemplateUtils";
import { fetchFormsManageSubmission } from "../api/formsManageApi";
import { cloneSeedRows, templateLayout } from "../utils/adminFormsGrid";
import { usePortalDesign } from "../design-system/usePortalDesign";
import type { AdminTablesPanelView } from "../components/admin/AdminTablesPanelIcons";

export type AdminTablesEditorTab = "general" | "columns" | "hints" | "assign";

export function useAdminTablesPanel() {
  const isV2 = usePortalDesign() === "v2";
  const authApi = isAuthApiEnabled();
  const aiReady = authApi && Boolean(getAdminApiToken());

  const [view, setView] = useState<AdminTablesPanelView>("workspace");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<AdminTablesEditorTab>("general");
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

  const monitoring = useMemo(() => {
    void store;
    return listAllMonitoring();
  }, [store]);
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

  return {
    isV2,
    authApi,
    aiReady,
    view,
    setView,
    importModalOpen,
    setImportModalOpen,
    editorTab,
    setEditorTab,
    templateSearch,
    setTemplateSearch,
    msg,
    setMsg,
    store,
    setStore,
    selectedId,
    setSelectedId,
    draft,
    setDraft,
    assignEmails,
    setAssignEmails,
    importTitle,
    setImportTitle,
    importFile,
    setImportFile,
    aiPrompt,
    setAiPrompt,
    aiReply,
    setAiReply,
    aiBusy,
    setAiBusy,
    promptLib,
    setPromptLib,
    editPromptId,
    setEditPromptId,
    promptTitle,
    setPromptTitle,
    promptBody,
    setPromptBody,
    portalUsers,
    setPortalUsers,
    reviewRow,
    setReviewRow,
    reviewTemplate,
    setReviewTemplate,
    reviewSubmission,
    setReviewSubmission,
    columnsEditMode,
    setColumnsEditMode,
    selectedSheetId,
    setSelectedSheetId,
    refresh,
    reloadPortalUsers,
    contractors,
    syncStoreToServer,
    monitoring,
    avgFill,
    tablesKpiItems,
    filteredTemplates,
    selected,
    assignedCount,
    activeSheet,
    effectiveLayout,
    effectiveColumns,
    effectiveRows,
    updateSheetDraft,
    removeImportSheet,
    startNewTemplate,
    loadTemplateToDraft,
    handleSaveTemplate,
    handleGenerateHints,
    parseAssignEmails,
    handleAssign,
    handleAssignAll,
    toggleContractorEmail,
    openSubmissionReview,
    handleImport,
    handleAiRun,
    handleAiExport,
    savePrompt,
    closeImportModal,
  };
}
