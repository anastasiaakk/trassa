import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { isAuthApiEnabled } from "../utils/authMode";
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

export function useContractorForms(emailNorm: string) {
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

  return {
    templates,
    activeId,
    setActiveId,
    cells,
    gridRows,
    msg,
    setMsg,
    msgIsError,
    initialLoading,
    alerts,
    attachInputRef,
    gridSlotRef,
    gridEditorKey,
    attachBusy,
    attachFileName,
    dismissAlert,
    dismissAllAlerts,
    active,
    hasSheetTabs,
    importSheets,
    activeSheet,
    effectiveTemplate,
    isGrid,
    effectiveColumns,
    activeSheetId,
    selectSheet,
    onGridRowsChange,
    onCellChange,
    fillPercent,
    persist,
    handleSave,
    handleAttachFile,
    handleClearAttachedFile,
  };
}

export type ContractorFormsState = ReturnType<typeof useContractorForms>;
