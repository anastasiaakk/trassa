import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import FormGridEditor from "../components/admin/FormGridEditor";
import type { CabinetChromeStyles } from "../components/CabinetChromeLayout";
import type { FormCellValue, FormGridRow, FormSubmission, FormTemplate, FormTemplateSheet } from "../types/adminForms";
import {
  fetchContractorAssignedForms,
  fetchContractorFormAlerts,
  fillContractorFormFromFile,
  markFormAlertReadApi,
  saveContractorFormSubmission,
} from "../api/formsApi";
import type { FormAlert } from "../types/formAlerts";
import {
  listContractorAlerts,
  markFormAlertRead,
  markAllContractorAlertsRead,
} from "../utils/formAlertsStorage";
import {
  getFormTemplate,
  listContractorAssignments,
  loadAdminFormsStore,
  saveFormSubmission,
} from "../utils/adminFormsStorage";
import {
  initialSubmissionRows,
  submissionFillPercent,
  templateLayout,
} from "../utils/adminFormsGrid";
import { loadProfileSettings } from "../profileSettingsStorage";
import { isAuthApiEnabled } from "../utils/authMode";
import { cx, type CabinetChromeClassNames } from "../design-system/cabinetChromeClasses";
import Page4V2PageContent from "../components/cabinet-v2/Page4V2PageContent";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { page4V2PanelStyle } from "../utils/page4V2PanelStyle";

const PAGE_LEDE = "Шаблоны от администратора. Заполните до срока сдачи.";
import { buildCabinetAccentTheme } from "../theme/cabinetAccentTheme";
import { downloadFormTemplateCsv } from "../utils/adminFormsExport";
import {
  fillFormFromCsvTextLocal,
  readFileAsBase64,
  csvDestroyedClientMessage,
  csvTextLooksLikeCyrillicDestroyed,
  readCsvFileText,
} from "../utils/formFillFromFileLocal";
import {
  buildSheetDraftsFromSubmission,
  emptySheetCells,
  mergeSheetDraftsWithActive,
  primarySheetPayload,
  sheetAsTemplate,
  submissionFillPercentAllSheets,
  templateHasSheetTabs,
} from "../utils/formSheetUtils";
import css from "./ContractorFormsView.module.css";
import sheetTabs from "./AdminTablesPanel.module.css";

const ATTACH_ACCEPT =
  ".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.xlsb,.ods,.xltx,.xltm,.docx";

type Props = {
  styles: CabinetChromeStyles;
  layoutStyles: Record<string, CSSProperties>;
  cn?: CabinetChromeClassNames;
  isDark?: boolean;
  isV2?: boolean;
};

function formatDeadlineRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ContractorFormsView = memo(function ContractorFormsView({
  styles,
  layoutStyles,
  cn,
  isDark = false,
  isV2: isV2Prop = false,
}: Props) {
  const isV2 = isV2Prop === true || usePortalDesign() === "v2";
  const emailNorm = useMemo(
    () => loadProfileSettings().email.trim().toLowerCase(),
    []
  );
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [activeId, setActiveId] = useState("");
  const [cells, setCells] = useState<Record<string, FormCellValue>>({});
  const [gridRows, setGridRows] = useState<FormGridRow[]>([]);
  const [sheetDrafts, setSheetDrafts] = useState<Record<string, { cells: Record<string, FormCellValue>; rows?: FormGridRow[] }>>({});
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [alerts, setAlerts] = useState<FormAlert[]>([]);
  const assignedFetchRef = useRef(0);
  const hasLoadedAssignedRef = useRef(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const gridSlotRef = useRef<HTMLDivElement>(null);
  const importGuardUntilRef = useRef(0);
  const userEditUntilRef = useRef(0);
  const [gridEditorKey, setGridEditorKey] = useState(0);
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachFileName, setAttachFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 9000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const theme = useMemo(() => buildCabinetAccentTheme(isDark, isV2), [isDark, isV2]);

  const syncAlertsFromLocal = useCallback(() => {
    if (!emailNorm) {
      setAlerts([]);
      return;
    }
    setAlerts(listContractorAlerts(emailNorm).filter((a) => !a.read).slice(0, 12));
  }, [emailNorm]);

  const reloadAlerts = useCallback(
    async (opts?: { fromApi?: boolean }) => {
      if (!emailNorm) {
        setAlerts([]);
        return;
      }
      if (!opts?.fromApi && isAuthApiEnabled()) {
        syncAlertsFromLocal();
        return;
      }
      if (isAuthApiEnabled()) {
        const r = await fetchContractorFormAlerts();
        if (r.ok) {
          setAlerts(r.alerts.filter((a) => !a.read).slice(0, 12));
          return;
        }
      }
      syncAlertsFromLocal();
    },
    [emailNorm, syncAlertsFromLocal]
  );

  const refreshAssigned = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      const showSpinner = !silent && !hasLoadedAssignedRef.current;
      if (showSpinner) setInitialLoading(true);

      const reqId = ++assignedFetchRef.current;
      try {
        if (isAuthApiEnabled()) {
          const r = await fetchContractorAssignedForms();
          if (reqId !== assignedFetchRef.current) return;
          if (r.ok) {
            setTemplates(r.templates);
            setSubmissions(r.submissions);
            hasLoadedAssignedRef.current = true;
          }
          return;
        }
        const store = loadAdminFormsStore();
        const assigned = listContractorAssignments(emailNorm).map((a) => a.templateId);
        setTemplates(store.templates.filter((t) => t.active && assigned.includes(t.id)));
        setSubmissions(
          store.submissions.filter(
            (s) => s.contractorEmailNorm === emailNorm && assigned.includes(s.templateId)
          )
        );
        hasLoadedAssignedRef.current = true;
      } finally {
        if (reqId === assignedFetchRef.current && showSpinner) {
          setInitialLoading(false);
        }
      }
    },
    [emailNorm]
  );

  useEffect(() => {
    void refreshAssigned();
    void reloadAlerts({ fromApi: true });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleAssignedRefresh = () => {
      if (Date.now() < userEditUntilRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (Date.now() < userEditUntilRef.current) return;
        void refreshAssigned({ silent: true });
      }, 1500);
    };

    const onAlertsChange = () => syncAlertsFromLocal();
    const onFormsChange = () => scheduleAssignedRefresh();

    window.addEventListener("trassa-form-alerts-changed", onAlertsChange);
    window.addEventListener("trassa-admin-forms-changed", onFormsChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("trassa-form-alerts-changed", onAlertsChange);
      window.removeEventListener("trassa-admin-forms-changed", onFormsChange);
    };
  }, [refreshAssigned, reloadAlerts, syncAlertsFromLocal]);

  const dismissAlert = (id: string) => {
    if (isAuthApiEnabled()) {
      void markFormAlertReadApi(id).then(() => void reloadAlerts({ fromApi: true }));
      return;
    }
    markFormAlertRead(id);
    void reloadAlerts();
  };

  const dismissAllAlerts = () => {
    if (isAuthApiEnabled()) {
      void Promise.all(alerts.map((a) => markFormAlertReadApi(a.id))).then(() =>
        void reloadAlerts({ fromApi: true })
      );
      return;
    }
    markAllContractorAlertsRead(emailNorm);
    void reloadAlerts();
  };

  const active = activeId
    ? templates.find((t) => t.id === activeId) ?? getFormTemplate(activeId)
    : undefined;
  const hasSheetTabs = active ? templateHasSheetTabs(active) : false;
  const importSheets = active?.importSheets ?? [];

  const activeSheet = useMemo<FormTemplateSheet | null>(() => {
    if (!active || !hasSheetTabs) return null;
    if (selectedSheetId) {
      const picked = importSheets.find((s) => s.id === selectedSheetId);
      if (picked) return picked;
    }
    return importSheets[0] ?? null;
  }, [active, hasSheetTabs, importSheets, selectedSheetId]);

  const effectiveTemplate = useMemo(() => {
    if (!active) return undefined;
    if (activeSheet) return { ...active, ...sheetAsTemplate(active, activeSheet) };
    return active;
  }, [active, activeSheet]);

  const isGrid = effectiveTemplate ? templateLayout(effectiveTemplate) === "grid" : false;
  const effectiveColumns = effectiveTemplate?.columns ?? [];

  const loadSheetIntoEditor = useCallback(
    (
      template: FormTemplate,
      sheet: FormTemplateSheet,
      data?: { cells: Record<string, FormCellValue>; rows?: FormGridRow[] }
    ) => {
      const slice = { ...template, ...sheetAsTemplate(template, sheet) };
      if (templateLayout(slice) === "grid") {
        setGridRows(data?.rows?.length ? data.rows : initialSubmissionRows(slice));
        setCells({});
      } else {
        setCells(data?.cells ?? emptySheetCells(sheet));
        setGridRows([]);
      }
    },
    []
  );

  const applySubmission = useCallback(
    (sub: FormSubmission | undefined, template?: FormTemplate) => {
      if (!template) return;
      if (templateHasSheetTabs(template)) {
        const drafts = buildSheetDraftsFromSubmission(template, sub);
        const firstSheet = template.importSheets?.[0];
        setSheetDrafts(drafts);
        setSelectedSheetId(firstSheet?.id ?? null);
        if (firstSheet) loadSheetIntoEditor(template, firstSheet, drafts[firstSheet.id]);
        else {
          setCells({});
          setGridRows([]);
        }
        return;
      }
      setSheetDrafts({});
      setSelectedSheetId(null);
      if (templateLayout(template) === "grid") {
        setGridRows(sub?.rows?.length ? sub.rows : initialSubmissionRows(template));
        setCells({});
      } else {
        setCells((sub?.cells ?? {}) as Record<string, FormCellValue>);
        setGridRows([]);
      }
    },
    [loadSheetIntoEditor]
  );

  const activeSubmissionStamp = useMemo(() => {
    const sub = submissions.find(
      (s) => s.templateId === activeId && s.contractorEmailNorm === emailNorm
    );
    return sub ? `${sub.updatedAt}:${sub.submittedAt ?? ""}` : "";
  }, [submissions, activeId, emailNorm]);

  useEffect(() => {
    importGuardUntilRef.current = 0;
    userEditUntilRef.current = 0;
    setSelectedSheetId(null);
    setSheetDrafts({});
    setAttachFileName(null);
    if (attachInputRef.current) attachInputRef.current.value = "";
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !emailNorm) return;
    if (Date.now() < importGuardUntilRef.current) return;
    if (Date.now() < userEditUntilRef.current) return;
    const tmpl = templates.find((t) => t.id === activeId) ?? getFormTemplate(activeId);
    if (!tmpl) return;
    const sub = submissions.find(
      (s) => s.templateId === activeId && s.contractorEmailNorm === emailNorm
    );
    applySubmission(sub, tmpl);
  }, [activeId, emailNorm, activeSubmissionStamp, submissions, templates, applySubmission]);

  const activeSheetId = activeSheet?.id ?? selectedSheetId ?? importSheets[0]?.id ?? null;

  const selectSheet = useCallback(
    (sheetId: string) => {
      if (!active || !hasSheetTabs || sheetId === activeSheetId) return;
      const sheets = active.importSheets ?? [];
      const nextSheet = sheets.find((s) => s.id === sheetId);
      if (!nextSheet) return;
      const merged = mergeSheetDraftsWithActive(
        active,
        sheetDrafts,
        activeSheetId,
        isGrid ? { cells: {}, rows: gridRows } : { cells: { ...cells } }
      );
      setSheetDrafts(merged);
      setSelectedSheetId(sheetId);
      loadSheetIntoEditor(active, nextSheet, merged[sheetId]);
      setGridEditorKey((k) => k + 1);
    },
    [active, hasSheetTabs, activeSheetId, sheetDrafts, isGrid, gridRows, cells, loadSheetIntoEditor]
  );

  const buildSavePayload = useCallback(() => {
    if (!active) return null;
    if (hasSheetTabs) {
      const merged = mergeSheetDraftsWithActive(
        active,
        sheetDrafts,
        activeSheetId,
        isGrid ? { cells: {}, rows: gridRows } : { cells: { ...cells } }
      );
      const primary = primarySheetPayload(active, merged);
      return { cells: primary.cells, rows: primary.rows, sheets: merged };
    }
    return isGrid ? { cells: {} as Record<string, FormCellValue>, rows: gridRows } : { cells: { ...cells } };
  }, [active, hasSheetTabs, sheetDrafts, activeSheetId, isGrid, gridRows, cells]);

  const markUserEditing = useCallback(() => {
    userEditUntilRef.current = Date.now() + 60_000;
  }, []);

  const onGridRowsChange = useCallback(
    (next: FormGridRow[]) => {
      markUserEditing();
      setGridRows(next);
      if (hasSheetTabs && activeSheetId) {
        setSheetDrafts((prev) => ({ ...prev, [activeSheetId]: { cells: {}, rows: next } }));
      }
    },
    [markUserEditing, hasSheetTabs, activeSheetId]
  );

  const onCellChange = useCallback(
    (colId: string, value: FormCellValue) => {
      markUserEditing();
      setCells((prev) => {
        const next = { ...prev, [colId]: value };
        if (hasSheetTabs && activeSheetId) {
          setSheetDrafts((drafts) => ({ ...drafts, [activeSheetId]: { cells: next } }));
        }
        return next;
      });
    },
    [markUserEditing, hasSheetTabs, activeSheetId]
  );

  const fillPercentRaw = useMemo(() => {
    if (!active) return 0;
    if (hasSheetTabs) {
      const merged = mergeSheetDraftsWithActive(
        active,
        sheetDrafts,
        activeSheetId,
        isGrid ? { cells: {}, rows: gridRows } : { cells: { ...cells } }
      );
      return submissionFillPercentAllSheets(active, merged);
    }
    return submissionFillPercent(active, isGrid ? { cells: {}, rows: gridRows } : { cells });
  }, [active, hasSheetTabs, sheetDrafts, activeSheetId, isGrid, gridRows, cells]);
  const [fillPercent, setFillPercent] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setFillPercent(fillPercentRaw), 120);
    return () => window.clearTimeout(id);
  }, [fillPercentRaw]);

  const persist = async (submit: boolean) => {
    if (!activeId || !active) return;
    const payload = buildSavePayload();
    if (!payload) return;
    if (isAuthApiEnabled()) {
      const r = await saveContractorFormSubmission(activeId, payload, submit);
      if (!r.ok) {
        setMsgIsError(true);
        setMsg(r.error);
        return;
      }
    } else {
      saveFormSubmission(activeId, emailNorm, payload, submit);
    }
    setMsgIsError(false);
    setMsg(submit ? "Таблица отправлена." : "Черновик сохранён.");
    userEditUntilRef.current = 0;
    void refreshAssigned({ silent: true });
  };

  const handleSave = (submit: boolean) => (e: FormEvent) => {
    e.preventDefault();
    void persist(submit);
  };

  const normalizeImportedCell = (v: unknown): FormCellValue => {
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean" || typeof v === "number") return v;
    return String(v);
  };

  const normalizeImportedRows = (rows: FormGridRow[]): FormGridRow[] =>
    rows.map((r) => ({
      id: r.id,
      cells: Object.fromEntries(
        Object.entries(r.cells ?? {}).map(([k, v]) => [k, normalizeImportedCell(v)])
      ),
    }));

  const handleAttachFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !active || !activeId || !effectiveTemplate) return;
      setAttachFileName(file.name);
      setAttachBusy(true);
      setMsg(null);
      setMsgIsError(false);
      const name = file.name.toLowerCase();
      const isTextTable = name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv");

      if (isTextTable) {
        const previewText = await readCsvFileText(file);
        if (csvTextLooksLikeCyrillicDestroyed(previewText)) {
          setMsgIsError(true);
          setMsg(csvDestroyedClientMessage(file.name, previewText));
          setAttachBusy(false);
          return;
        }
      }

      const gridMode = templateLayout(effectiveTemplate) === "grid";
      const draft = gridMode
        ? { cells: {} as Record<string, FormCellValue>, rows: gridRows }
        : { cells };

      const syncImportedToSheetDraft = (
        next: { cells: Record<string, FormCellValue>; rows?: FormGridRow[] }
      ) => {
        if (hasSheetTabs && activeSheetId) {
          setSheetDrafts((prev) => ({ ...prev, [activeSheetId]: next }));
        }
      };

      const applyImported = (data: {
        cells: Record<string, FormCellValue>;
        rows?: FormGridRow[];
        message: string;
      }) => {
        importGuardUntilRef.current = Date.now() + 8000;
        const countFilled = (cells: Record<string, FormCellValue>) =>
          Object.values(cells).filter((v) => v !== "" && v !== null && v !== undefined).length;
        const filledCells = data.rows
          ? data.rows.reduce((n, r) => n + countFilled(r.cells ?? {}), 0)
          : countFilled(data.cells);

        if (gridMode) {
          if (data.rows?.length) {
            const rows = normalizeImportedRows(data.rows);
            setGridRows(rows);
            setCells({});
            syncImportedToSheetDraft({ cells: {}, rows });
            setGridEditorKey((k) => k + 1);
          } else if (Object.keys(data.cells).length > 0) {
            setGridRows((prev) => {
              const base = prev.length ? prev : initialSubmissionRows(effectiveTemplate);
              const rows = base.map((r, i) =>
                i === 0
                  ? {
                      ...r,
                      cells: {
                        ...r.cells,
                        ...Object.fromEntries(
                          Object.entries(data.cells).map(([k, v]) => [k, normalizeImportedCell(v)])
                        ),
                      },
                    }
                  : r
              );
              syncImportedToSheetDraft({ cells: {}, rows });
              return rows;
            });
            setGridEditorKey((k) => k + 1);
          } else {
            setMsgIsError(true);
            setMsg(
              "Не удалось заполнить таблицу. Первая строка файла должна совпадать со «Скачать шаблон»."
            );
            return;
          }
        } else {
          const nextCells =
            Object.keys(data.cells).length > 0
              ? data.cells
              : data.rows?.[0]?.cells
                ? Object.fromEntries(
                    Object.entries(data.rows[0].cells).map(([k, v]) => [
                      k,
                      normalizeImportedCell(v),
                    ])
                  )
                : {};
          setCells(nextCells as Record<string, FormCellValue>);
          syncImportedToSheetDraft({ cells: nextCells as Record<string, FormCellValue> });
        }
        setMsgIsError(false);
        setMsg(
          filledCells > 0
            ? `${data.message} Заполнено ячеек: ${filledCells}.`
            : data.message
        );
      };

      const importCsvLocally = async () => {
        const text = await readCsvFileText(file);
        const r = fillFormFromCsvTextLocal(effectiveTemplate, text, draft, file.name);
        if (!r.ok) {
          setMsgIsError(true);
          setMsg(r.error);
          return false;
        }
        applyImported({ cells: r.cells, rows: r.rows, message: r.message });
        return true;
      };

      try {
        if (isAuthApiEnabled()) {
          const dataBase64 = await readFileAsBase64(file);
          const r = await fillContractorFormFromFile(activeId, file.name, dataBase64, draft);
          if (r.ok) {
            applyImported({
              cells: r.data.cells as Record<string, FormCellValue>,
              rows: r.data.rows,
              message: r.data.message,
            });
            return;
          }
          if (name.endsWith(".csv") || name.endsWith(".txt")) {
            const localOk = await importCsvLocally();
            if (localOk) return;
          }
          setMsgIsError(true);
          setMsg(r.error);
          return;
        }

        if (name.endsWith(".csv") || name.endsWith(".txt")) {
          await importCsvLocally();
          return;
        }

        setMsgIsError(true);
        setMsg(
          "Таблицы Excel (.xlsx, .xls, .xlsm, .ods и др.) обрабатываются на сервере. Войдите через API (VITE_USE_AUTH_API) или прикрепьте CSV."
        );
      } catch (e) {
        setMsgIsError(true);
        setMsg(e instanceof Error ? e.message : "Не удалось прочитать файл.");
      } finally {
        setAttachBusy(false);
        if (attachInputRef.current) attachInputRef.current.value = "";
      }
    },
    [active, activeId, effectiveTemplate, gridRows, cells, hasSheetTabs, activeSheetId]
  );

  const handleClearAttachedFile = useCallback(() => {
    if (!active || !effectiveTemplate) return;
    importGuardUntilRef.current = Date.now() + 5000;

    const gridSlot = gridSlotRef.current;
    const lockedGridHeight = gridSlot?.offsetHeight ?? 0;
    if (gridSlot && lockedGridHeight > 0) {
      gridSlot.style.minHeight = `${lockedGridHeight}px`;
    }

    setAttachFileName(null);
    if (attachInputRef.current) attachInputRef.current.value = "";
    setMsgIsError(false);
    setMsg("Данные из прикреплённого файла убраны.");

    if (templateLayout(effectiveTemplate) === "grid") {
      setGridRows((prev) => {
        const base =
          prev.length > 0
            ? prev
            : initialSubmissionRows(effectiveTemplate).map((r) => ({ id: r.id, cells: { ...r.cells } }));
        const rows = base.map((r) => ({ id: r.id, cells: {} }));
        if (hasSheetTabs && activeSheetId) {
          setSheetDrafts((drafts) => ({ ...drafts, [activeSheetId]: { cells: {}, rows } }));
        }
        return rows;
      });
      setCells({});
    } else {
      const cleared = Object.fromEntries(
        effectiveColumns.map((c) => [c.id, "" as FormCellValue])
      ) as Record<string, FormCellValue>;
      setCells(cleared);
      if (hasSheetTabs && activeSheetId) {
        setSheetDrafts((drafts) => ({ ...drafts, [activeSheetId]: { cells: cleared } }));
      }
      setGridRows([]);
    }

    if (gridSlot && lockedGridHeight > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          gridSlot.style.minHeight = "";
        });
      });
    }
  }, [active, effectiveTemplate, effectiveColumns, hasSheetTabs, activeSheetId]);

  const inputStyle: CSSProperties = {
    marginTop: 4,
    background: theme.inputBg,
    color: styles.text,
    border: `1px solid ${theme.inputBorder}`,
  };

  const emailHint = (
    <p style={{ color: styles.text, fontSize: 14 }}>Укажите e-mail в настройках профиля.</p>
  );

  if (!emailNorm.includes("@")) {
    if (isV2) {
      return (
        <Page4V2PageContent
          title="Таблицы"
          lede={PAGE_LEDE}
          cn={cn}
          className="page4-v2__forms contractor-forms-v2"
        >
          {emailHint}
        </Page4V2PageContent>
      );
    }
    return <p style={{ padding: 16, color: styles.text, fontSize: 14 }}>Укажите e-mail в настройках профиля.</p>;
  }

  const body = (
    <>
      {alerts.length > 0 ? (
        <div
          className={css.alerts}
          style={{
            background: theme.accentSoft,
            border: `1px solid ${theme.accentBorder}`,
            boxShadow: isDark ? styles.insetShadow : styles.cardShadow,
          }}
        >
          <div className={css.alertsHead}>
            <strong className={css.alertsTitle} style={{ color: theme.accent }}>
              Уведомления
            </strong>
            <button
              type="button"
              className={css.btnReadAll}
              style={{
                background: styles.buttonBg,
                color: styles.buttonText,
                borderColor: isV2
                  ? isDark
                    ? "rgba(111, 149, 255, 0.2)"
                    : "rgba(43, 100, 253, 0.25)"
                  : isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(86, 6, 29, 0.15)",
                boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.35)" : "0 2px 8px rgba(10, 37, 64, 0.1)",
              }}
              onClick={dismissAllAlerts}
            >
              Прочитать все
            </button>
          </div>
          <ul className={css.alertList}>
            {alerts.map((a) => (
              <li
                key={a.id}
                className={css.alertItem}
                style={{
                  background: isDark ? "rgba(12, 20, 42, 0.5)" : "rgba(255, 255, 255, 0.72)",
                  border: `1px solid ${theme.navyBorder}`,
                }}
              >
                <span className={css.alertText} style={{ color: styles.text }}>
                  {a.message}
                </span>
                <button
                  type="button"
                  className={css.btnDismiss}
                  aria-label="Закрыть уведомление"
                  style={{
                    background: theme.dismissBg,
                    color: theme.dismissText,
                    border: `1px solid ${theme.accentBorder}`,
                  }}
                  onClick={() => dismissAlert(a.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {initialLoading && templates.length === 0 ? (
        <p style={{ fontSize: 13, color: styles.muted, margin: "0 0 12px" }}>Загрузка…</p>
      ) : null}
      {templates.length === 0 ? (
        <div
          className={css.empty}
          style={{
            color: styles.muted,
            background: styles.sectionBg,
            boxShadow: styles.insetShadow,
          }}
        >
          Нет назначенных таблиц.
        </div>
      ) : (
        <ul className={css.templateList}>
          {templates.map((t) => {
            const selected = activeId === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={cx(css.templateBtn, selected && "contractor-forms__templateBtn--active")}
                  onClick={() => setActiveId((id) => (id === t.id ? "" : t.id))}
                  style={{
                    border: `1px solid ${selected ? styles.buttonBg : theme.navyBorder}`,
                    background: selected ? styles.sectionBg : styles.cardBg,
                    boxShadow: selected
                      ? `${styles.insetShadow}, 0 0 0 1px ${styles.buttonBg}`
                      : styles.cardShadow,
                  }}
                >
                  <div className={css.templateTitle} style={{ color: styles.text }}>
                    {t.title}
                    {(t.importSheets?.length ?? 0) > 1 ? (
                      <span style={{ fontWeight: 600, color: styles.muted }}>
                        {" "}
                        · {t.importSheets!.length} листа
                      </span>
                    ) : templateLayout(t) === "grid" ? (
                      <span style={{ fontWeight: 600, color: styles.muted }}> · таблица</span>
                    ) : null}
                  </div>
                  {t.deadlineAt ? (
                    <div className={css.templateMeta} style={{ color: theme.accent }}>
                      Срок сдачи: до {formatDeadlineRu(t.deadlineAt)}
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {active ? (
          <form
            className={cx(css.formPanel, isV2 && "page4-v2__form-panel")}
            onSubmit={handleSave(false)}
            style={{
              background: styles.sectionBg,
              boxShadow: styles.insetShadow,
            }}
          >
          <div className={css.formHead}>
            <h3 className={css.formTitle} style={{ color: styles.text, margin: 0 }}>
              {active.title}
            </h3>
            <button
              type="button"
                className={cx(css.btnSecondary, isV2 && "page4-v2__secondary-btn")}
              style={{
                background: theme.btnGhostBg,
                color: theme.btnGhostText,
                border: `1px solid ${theme.btnGhostBorder}`,
              }}
              onClick={() => downloadFormTemplateCsv(active)}
            >
              Скачать шаблон
            </button>
          </div>
          {active.description ? (
            <p style={{ fontSize: 14, color: styles.muted, margin: "0 0 12px", lineHeight: 1.55 }}>
              {active.description}
            </p>
          ) : null}
          {active.deadlineAt ? (
            <p style={{ fontSize: 13, fontWeight: 700, color: theme.accent, margin: "0 0 12px" }}>
              Срок сдачи: до {formatDeadlineRu(active.deadlineAt)}
            </p>
          ) : null}
          {active.aiFillHints ? (
            <div
              className={css.hints}
              style={{
                background: theme.hintsBg,
                color: styles.text,
                border: `1px solid ${theme.navyBorder}`,
              }}
            >
              <strong style={{ color: theme.accent }}>Подсказки:</strong>
              {"\n"}
              {active.aiFillHints}
            </div>
          ) : null}
          <p className={css.progress} style={{ color: styles.muted }}>
            Заполнено: <strong style={{ color: styles.text }}>{fillPercent}%</strong>
            {isGrid ? (
              <>
                {" "}
                · строк: <strong style={{ color: styles.text }}>{gridRows.length}</strong>
              </>
            ) : null}
          </p>
          <div
            className={css.attachBlock}
            style={{
              background: theme.hintsBg,
              border: `1px solid ${theme.navyBorder}`,
            }}
          >
            <p className={css.attachLead} style={{ color: styles.muted }}>
              Заполнили таблицу? Прикрепите <strong style={{ color: styles.text }}>Excel</strong> (.xlsx, .xls,
              .xlsm, .ods), <strong style={{ color: styles.text }}>CSV</strong> или Word с таблицей. ИИ на сервере
              прочитает лист и подставит данные (нужен API и OPENAI_API_KEY). Не меняйте заголовки в первой строке.
            </p>
            <input
              ref={attachInputRef}
              type="file"
              accept={ATTACH_ACCEPT}
              tabIndex={-1}
              style={{ display: "none" }}
              onChange={(e) => void handleAttachFile(e.target.files?.[0])}
            />
            <div className={css.attachToolbar}>
              <button
                type="button"
                className={cx(css.btnSecondary, isV2 && "page4-v2__secondary-btn")}
                disabled={attachBusy}
                style={{
                  background: styles.buttonBg,
                  color: styles.buttonText,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(86, 6, 29, 0.2)"}`,
                  opacity: attachBusy ? 0.7 : 1,
                }}
                onClick={() => attachInputRef.current?.click()}
              >
                {attachBusy ? "Читаем файл…" : "Прикрепить файл"}
              </button>
              {attachFileName ? (
                <div
                  className={css.attachFileRow}
                  style={{
                    border: `1px solid ${theme.navyBorder}`,
                    background: isDark ? "rgba(12, 20, 42, 0.5)" : "rgba(255, 255, 255, 0.85)",
                  }}
                >
                  <span
                    className={css.attachFileName}
                    style={{ color: styles.text }}
                    title={attachFileName}
                  >
                    {attachFileName}
                  </span>
                  <button
                    type="button"
                    className={css.btnAttachRemove}
                    aria-label="Удалить прикреплённый файл"
                    title="Удалить файл"
                    disabled={attachBusy}
                    onClick={(e) => {
                    e.preventDefault();
                    handleClearAttachedFile();
                  }}
                  >
                    <svg className={css.attachRemoveIcon} viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM18 4h-4l-1-1h-4l-1 1H6v2h12V4z"
                      />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {isGrid ? (
            <div ref={gridSlotRef} className={css.gridSlot}>
              {hasSheetTabs ? (
                <div className={sheetTabs.sheetTabsBar} role="tablist" aria-label="Листы таблицы">
                  <span className={sheetTabs.sheetTabsBarLabel}>Листы</span>
                  <div className={sheetTabs.sheetTabsScroll}>
                    {importSheets.map((sheet) => {
                      const isActiveSheet = (activeSheet?.id ?? importSheets[0]?.id) === sheet.id;
                      return (
                        <div
                          key={sheet.id}
                          className={`${sheetTabs.sheetTab} ${isActiveSheet ? sheetTabs.sheetTabActive : ""}`}
                          role="tab"
                          aria-selected={isActiveSheet}
                        >
                          <button
                            type="button"
                            className={sheetTabs.sheetTabLabel}
                            onClick={() => selectSheet(sheet.id)}
                          >
                            {sheet.title}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <FormGridEditor
                key={`${activeId}-${activeSheetId ?? "base"}-${gridEditorKey}`}
                columns={effectiveColumns}
                rows={gridRows}
                onChange={onGridRowsChange}
                lockStructure
                isV2={isV2}
              />
            </div>
          ) : (
            <>
              {hasSheetTabs ? (
                <div
                  className={sheetTabs.sheetTabsBar}
                  role="tablist"
                  aria-label="Листы таблицы"
                  style={{ marginBottom: 12 }}
                >
                  <span className={sheetTabs.sheetTabsBarLabel}>Листы</span>
                  <div className={sheetTabs.sheetTabsScroll}>
                    {importSheets.map((sheet) => {
                      const isActiveSheet = (activeSheet?.id ?? importSheets[0]?.id) === sheet.id;
                      return (
                        <div
                          key={sheet.id}
                          className={`${sheetTabs.sheetTab} ${isActiveSheet ? sheetTabs.sheetTabActive : ""}`}
                          role="tab"
                          aria-selected={isActiveSheet}
                        >
                          <button
                            type="button"
                            className={sheetTabs.sheetTabLabel}
                            onClick={() => selectSheet(sheet.id)}
                          >
                            {sheet.title}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {effectiveColumns.map((col) => (
              <label key={col.id} className={css.fieldLabel}>
                <span className={css.fieldLabelText} style={{ color: styles.text }}>
                  {col.title}
                  {col.required !== false ? " *" : ""}
                </span>
                {col.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={cells[col.id] === true}
                    onChange={(e) => onCellChange(col.id, e.target.checked)}
                  />
                ) : col.type === "date" ? (
                  <input
                    type="date"
                    className={css.fieldInput}
                    style={inputStyle}
                    value={String(cells[col.id] ?? "")}
                    onChange={(e) => onCellChange(col.id, e.target.value)}
                  />
                ) : col.type === "number" || col.type === "percent" ? (
                  <input
                    type="number"
                    className={css.fieldInput}
                    style={inputStyle}
                    value={cells[col.id] === undefined ? "" : String(cells[col.id])}
                    onChange={(e) =>
                      onCellChange(
                        col.id,
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                ) : (
                  <input
                    className={css.fieldInput}
                    style={inputStyle}
                    value={String(cells[col.id] ?? "")}
                    onChange={(e) => onCellChange(col.id, e.target.value)}
                  />
                )}
              </label>
            ))}
            </>
          )}
          <div className={css.actions}>
            <button
              type="submit"
              className={cx(css.btnSecondary, isV2 && "page4-v2__secondary-btn")}
              style={{
                background: theme.btnGhostBg,
                color: theme.btnGhostText,
                border: `1px solid ${theme.btnGhostBorder}`,
              }}
            >
              Сохранить черновик
            </button>
            <button
              type="button"
              className={cx(css.btnPrimary, isV2 && "page4-v2__primary-btn")}
              style={{
                background: styles.buttonBg,
                color: styles.buttonText,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(86, 6, 29, 0.2)"}`,
              }}
              onClick={() => void persist(true)}
            >
              Отправить
            </button>
          </div>
        </form>
      ) : null}

      {msg ? (
        <div
          className={css.toastViewport}
          role={msgIsError ? "alert" : "status"}
          aria-live="polite"
        >
          <div
            className={css.toast}
            style={{
              color: msgIsError ? (isDark ? "#fce8ee" : "#8b1530") : styles.text,
              background: msgIsError
                ? isDark
                  ? "rgba(139, 21, 48, 0.92)"
                  : "rgba(254, 226, 226, 0.98)"
                : isDark
                  ? "rgba(36, 59, 116, 0.94)"
                  : "rgba(255, 255, 255, 0.98)",
              border: msgIsError
                ? `1px solid ${isDark ? "rgba(240, 168, 184, 0.45)" : "rgba(139, 21, 48, 0.25)"}`
                : `1px solid ${theme.navyBorder}`,
              boxShadow: isDark
                ? "0 12px 40px rgba(0, 0, 0, 0.45)"
                : "0 12px 32px rgba(26, 42, 82, 0.22)",
            }}
          >
            <p className={css.toastText}>{msg}</p>
            <button
              type="button"
              className={css.toastClose}
              aria-label="Закрыть"
              onClick={() => setMsg(null)}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (isV2) {
    return (
      <Page4V2PageContent
        title="Таблицы"
        lede={PAGE_LEDE}
        cn={cn}
        className="page4-v2__forms contractor-forms-v2"
      >
        {body}
      </Page4V2PageContent>
    );
  }

  return (
    <div className={cx(css.root, cn?.recentPanel)} style={page4V2PanelStyle(layoutStyles, false)}>
      <div className={cx(css.title, cn?.recentTitle)} style={layoutStyles.recentTitle ?? {}}>
        Таблицы
      </div>
      <p className={css.lead} style={{ color: styles.muted }}>
        {PAGE_LEDE}
      </p>
      {body}
    </div>
  );
});

export default ContractorFormsView;
