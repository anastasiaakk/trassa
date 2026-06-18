import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { FormLayout, FormMonitoringRow, FormTemplate, FormTemplateSheet } from "../types/adminForms";
import {
  importTemplateFromCsv,
  listAllMonitoring,
  loadAdminFormsStore,
  getFormSubmissionReview,
  removeFormTemplate,
  saveAdminFormsStore,
  upsertFormTemplate,
} from "../utils/adminFormsStorage";
import {
  assignFormsManage,
  fetchFormsManageStore,
  fetchFormsManageSubmission,
  canUseFormsManageApi,
  importFormsManageFile,
  putFormsManageStore,
} from "../api/formsManageApi";
import { authListUsers } from "../api/authApi";
import { isAuthApiEnabled } from "../utils/authMode";
import { listRegisteredUsers, type LocalUserRecord } from "../utils/localAuth";
import FormColumnEditor from "../components/admin/FormColumnEditor";
import FormGridEditor from "../components/admin/FormGridEditor";
import FormSubmissionViewer from "../components/forms/FormSubmissionViewer";
import { cloneSeedRows } from "../utils/adminFormsGrid";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import styles from "./AdminPanel.module.css";
import tables from "./AdminTablesPanel.module.css";

type Props = {
  layoutStyles: {
    section?: CSSProperties;
    recentTitle?: CSSProperties;
    subtitle?: CSSProperties;
  };
};

type HubTab = "manage" | "monitor";
type EditorTab = "general" | "columns" | "assign";

export default function RadorFormsHub({ layoutStyles }: Props) {
  const isV2 = usePortalDesign() === "v2";
  const authApi = isAuthApiEnabled();
  const canUseRemote = canUseFormsManageApi();

  const [hubTab, setHubTab] = useState<HubTab>("manage");
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const [msg, setMsg] = useState<string | null>(null);
  const [store, setStore] = useState(() => loadAdminFormsStore());
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Partial<FormTemplate>>({});
  const [assignEmails, setAssignEmails] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [portalUsers, setPortalUsers] = useState<LocalUserRecord[]>(() => listRegisteredUsers());
  const [reviewRow, setReviewRow] = useState<FormMonitoringRow | null>(null);
  const [reviewTemplate, setReviewTemplate] = useState<FormTemplate | null>(null);
  const [reviewSubmission, setReviewSubmission] = useState<
    import("../types/adminForms").FormSubmission | null
  >(null);
  const [columnsEditMode, setColumnsEditMode] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (canUseRemote) {
      const r = await fetchFormsManageStore();
      if (r.ok) {
        saveAdminFormsStore(r.store);
        setStore(loadAdminFormsStore());
        return;
      }
      const authHint =
        r.status === 401 ||
        r.status === 403 ||
        /вход|сессия|доступно|администратор/i.test(r.error);
      if (authHint) {
        setMsg(r.error);
      }
    }
    setStore(loadAdminFormsStore());
  }, [canUseRemote]);

  useEffect(() => {
    void refresh();
    const onChange = () => setStore(loadAdminFormsStore());
    window.addEventListener("trassa-admin-forms-changed", onChange);
    window.addEventListener("trassa-portal-state-synced", onChange);
    return () => {
      window.removeEventListener("trassa-admin-forms-changed", onChange);
      window.removeEventListener("trassa-portal-state-synced", onChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!authApi) return;
    void authListUsers().then((r) => {
      if (r.ok) {
        setPortalUsers(
          r.users.map((u) => ({
            emailNorm: u.emailNorm,
            passwordHash: "",
            profile: u.profile,
            createdAt: u.createdAt,
          }))
        );
      }
    });
  }, [authApi]);

  const contractors = useMemo(
    () =>
      portalUsers.filter(
        (u) =>
          u.profile.roleLabel.toLowerCase().includes("подряд") ||
          Boolean(u.profile.contractorCompanyName.trim())
      ),
    [portalUsers]
  );

  const monitoring = useMemo(() => {
    void store;
    return listAllMonitoring();
  }, [store]);

  const syncStoreToServer = useCallback(async (): Promise<boolean> => {
    if (!canUseRemote) return true;
    const r = await putFormsManageStore(loadAdminFormsStore());
    if (!r.ok) {
      setMsg(`Не удалось сохранить на сервере: ${r.error}`);
      return false;
    }
    return true;
  }, [canUseRemote]);

  const startNewTemplate = () => {
    setSelectedId("");
    setEditorTab("general");
    setDraft({
      title: "",
      description: "",
      columns: [{ id: `col-${Date.now()}`, title: "Поле", type: "text", required: true }],
      deadlineAt: null,
      active: true,
      aiFillHints: "",
      layout: "grid",
      owner: "rador",
      ownerLabel: "РАДОР",
    });
    setHubTab("manage");
    setColumnsEditMode(false);
    setSelectedSheetId(null);
  };

  const loadTemplateToDraft = (t: FormTemplate) => {
    setSelectedId(t.id);
    setDraft({ ...t });
    setEditorTab("general");
    setHubTab("manage");
    setColumnsEditMode(false);
    setSelectedSheetId(t.importSheets?.[0]?.id ?? null);
  };

  const activeSheet = useMemo<FormTemplateSheet | null>(() => {
    const sheets = draft.importSheets ?? [];
    if (sheets.length === 0) return null;
    if (selectedSheetId) {
      const picked = sheets.find((s) => s.id === selectedSheetId);
      if (picked) return picked;
    }
    return sheets[0] ?? null;
  }, [draft.importSheets, selectedSheetId]);

  const effectiveLayout: FormLayout = (activeSheet?.layout ?? draft.layout) === "form" ? "form" : "grid";
  const effectiveColumns = activeSheet?.columns ?? draft.columns ?? [];
  const effectiveRows = activeSheet?.seedRows ?? draft.seedRows ?? [];

  const updateSheetDraft = useCallback(
    (patch: { columns?: FormTemplateSheet["columns"]; seedRows?: FormTemplateSheet["seedRows"]; layout?: FormLayout }) => {
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
        : nextSheets.find((s) => s.id === selectedSheetId) ?? nextSheets[0];

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

  const handleSaveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    const title = (draft.title ?? "").trim();
    if (!title) {
      setMsg("Укажите название таблицы.");
      return;
    }
    const sheets = draft.importSheets ?? [];
    const primary = activeSheet ?? sheets[0];
    const columns = (primary?.columns ?? draft.columns ?? []).filter((c) => c.title.trim());
    if (columns.length === 0) {
      setMsg("Добавьте хотя бы один столбец.");
      return;
    }
    const layout: FormLayout =
      (primary?.layout ?? draft.layout) === "form" ? "form" : "grid";
    const importSheets = sheets.length > 1 ? sheets : undefined;
    const item = upsertFormTemplate({
      id: selectedId || undefined,
      title,
      description: (draft.description ?? "").trim(),
      columns,
      layout,
      seedRows: layout === "grid" ? (primary?.seedRows ?? draft.seedRows ?? []) : undefined,
      deadlineAt: draft.deadlineAt || null,
      active: draft.active !== false,
      aiFillHints: (draft.aiFillHints ?? "").trim(),
      owner: draft.owner ?? "rador",
      ownerLabel: draft.ownerLabel ?? "РАДОР",
      importSheets,
    });
    setSelectedId(item.id);
    setDraft(item);
    if (!(await syncStoreToServer())) return;
    await refresh();
    setMsg(`Таблица «${item.title}» сохранена.`);
  };

  const parseAssignEmails = () =>
    assignEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

  const handleAssign = async () => {
    if (!selectedId) {
      setMsg("Сначала сохраните и выберите таблицу.");
      return;
    }
    const emails = parseAssignEmails();
    if (emails.length === 0) {
      setMsg("Укажите e-mail подрядчиков или выберите из списка.");
      return;
    }
    if (!canUseRemote) {
      setMsg(
        "Отправка подрядчикам работает только через сервер. Войдите в портал учёткой РАДОР/организатора с включённым API."
      );
      return;
    }
    if (!(await syncStoreToServer())) return;
    const r = await assignFormsManage({ templateId: selectedId, contractorEmails: emails });
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    saveAdminFormsStore(r.store);
    setStore(loadAdminFormsStore());
    setMsg(`Отправлено подрядчикам (новых назначений: ${r.added}).`);
  };

  const handleAssignAll = async () => {
    const allEmails = contractors.map((c) => c.emailNorm.trim().toLowerCase()).filter(Boolean);
    if (allEmails.length === 0) {
      setMsg("Нет подрядчиков в базе. Добавьте их в админке или укажите e-mail вручную.");
      return;
    }
    setAssignEmails(allEmails.join(", "));
    if (!selectedId) {
      setMsg("Сначала сохраните таблицу.");
      return;
    }
    if (!canUseRemote) {
      setMsg(
        "Отправка подрядчикам работает только через сервер. Войдите в портал учёткой РАДОР/организатора с включённым API."
      );
      return;
    }
    if (!(await syncStoreToServer())) return;
    const r = await assignFormsManage({ templateId: selectedId, contractorEmails: allEmails });
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    saveAdminFormsStore(r.store);
    setStore(loadAdminFormsStore());
    setMsg(`Отправлено всем подрядчикам (новых: ${r.added}).`);
  };

  const handleImportFile = async (file: File) => {
    const title = importTitle.trim() || file.name.replace(/\.[^.]+$/, "");
    setImportBusy(true);
    setMsg(null);
    try {
      if (canUseRemote) {
        const r = await importFormsManageFile(file, title, "rador");
        if (!r.ok) {
          setMsg(r.error);
          return;
        }
        saveAdminFormsStore(r.store);
        setStore(r.store);
        loadTemplateToDraft(r.template);
        setEditorTab("columns");
        setColumnsEditMode(false);
        const rows = r.rowCount ?? r.template.seedRows?.length ?? 0;
        const sheet = r.sheetName ? ` · лист «${r.sheetName}»` : "";
        const aiNote = r.usedAi ? " · ИИ разобрал структуру" : "";
        const sheetsNote = r.sheetCount && r.sheetCount > 1 ? ` · вкладок: ${r.sheetCount}` : "";
        setMsg(`Импорт из Excel: «${r.template.title}»${sheet}${sheetsNote} (${rows} строк)${aiNote}.`);
        return;
      }
      const ext = file.name.toLowerCase();
      if (/\.(xlsx|xls|xlsm|ods|docx)$/i.test(ext)) {
        setMsg("Импорт Excel на сервере: включите API (VITE_USE_AUTH_API) и войдите в портал РАДОР.");
        return;
      }
      const text = await file.text();
      const t = importTemplateFromCsv(text, title, "rador");
      if (!t) {
        setMsg("Не удалось разобрать CSV. Первая строка — заголовки столбцов.");
        return;
      }
      await refresh();
      loadTemplateToDraft(t);
      setEditorTab("columns");
      setMsg(`Импортировано: «${t.title}».`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Не удалось импортировать файл.");
      if (e instanceof TypeError && String(e.message).includes("fetch")) {
        setMsg(
          "Сервер не ответил при импорте. Попробуйте меньший Excel (до 5 МБ) или обновите страницу (Ctrl+F5)."
        );
      }
    } finally {
      setImportBusy(false);
    }
  };

  const openSubmissionReview = async (row: FormMonitoringRow) => {
    setReviewRow(row);
    if (canUseRemote) {
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

  const assignedCount = selectedId
    ? store.assignments.filter((a) => a.templateId === selectedId).length
    : 0;

  const tabBtn = (id: HubTab, label: string) => (
    <button
      type="button"
      className={hubTab === id ? tables.navBtnActive : tables.navBtn}
      onClick={() => setHubTab(id)}
    >
      {label}
    </button>
  );

  const editorTabBtn = (id: EditorTab, label: string) => (
    <button
      type="button"
      className={editorTab === id ? tables.tabBtnActive : tables.tabBtn}
      onClick={() => setEditorTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cx(
        isV2 && "association-v2__shell",
        isV2 && "rador-forms-hub-v2",
        isV2 && "admin-tables-v2",
        isV2 && "pv2-card-l1"
      )}
      style={isV2 ? undefined : layoutStyles.section}
    >
      <div className={cx(isV2 && "association-v2__title")} style={isV2 ? undefined : layoutStyles.recentTitle}>
        Таблицы для подрядчиков
      </div>
      <p style={isV2 ? { margin: "8px 0 0", color: "var(--pv2-muted)", lineHeight: 1.5 } : layoutStyles.subtitle}>
        Создайте таблицу вручную или импортируйте из Excel, назначьте одному или всем подрядчикам,
        отслеживайте заполнение и просматривайте ответы.
      </p>

      {!authApi ? (
        <p className={styles.error} style={{ marginTop: 8 }}>
          Импорт Excel работает через сервер. В продакшен-сборке должен быть включён API (VITE_USE_AUTH_API).
          Локально доступен только CSV.
        </p>
      ) : null}

      <div className={tables.topBar} style={{ marginTop: 12 }}>
        <div className={tables.nav}>
          {tabBtn("manage", "Создание и рассылка")}
          {tabBtn("monitor", "Мониторинг и просмотр")}
        </div>
      </div>

      {msg ? <p className={styles.subtitle} style={{ color: "#f87171", marginTop: 8 }}>{msg}</p> : null}

      {hubTab === "manage" ? (
        <div className={cx(tables.workspace, tables.tablesWorkspace)} style={{ marginTop: 12 }}>
          <aside className={tables.sidebar}>
            <div className={styles.rowBtns} style={{ flexDirection: "column", gap: 8 }}>
              <button type="button" className={styles.btnNeoPrimary} onClick={startNewTemplate}>
                + Создать таблицу
              </button>
              <button
                type="button"
                className={styles.btnNeoGhost}
                disabled={importBusy}
                onClick={() => importInputRef.current?.click()}
              >
                {importBusy ? "Импорт…" : "Импорт из Excel"}
              </button>
              <input
                ref={importInputRef}
                type="file"
                hidden
                accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.xlsb,.ods,.xltx,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleImportFile(f);
                }}
              />
            </div>
            <input
              className={tables.search}
              placeholder="Название при импорте (необяз.)"
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
            />
            <ul className={tables.templateList}>
              {store.templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={selectedId === t.id ? tables.templateItemActive : tables.templateItem}
                    onClick={() => loadTemplateToDraft(t)}
                  >
                    <div className={tables.templateTitle}>
                      {t.title}
                      {t.owner === "rador" ? " · РАДОР" : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className={tables.editor}>
            <div className={tables.editorTabs}>
              {editorTabBtn("general", "Основное")}
              {editorTabBtn("columns", "Столбцы и данные")}
              {editorTabBtn("assign", "Отправить подрядчикам")}
            </div>
            {!draft.columns?.length && !draft.title && !selectedId ? (
              <div className={tables.emptyState}>
                Нажмите «Создать таблицу» или «Импорт из Excel».
              </div>
            ) : (
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
                      />
                    </label>
                    <label className={styles.label}>
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
                            deadlineAt: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          })
                        }
                      />
                    </label>
                    <div className={styles.rowBtns} style={{ marginTop: 16 }}>
                      <button type="submit" className={styles.btnNeoPrimary}>
                        Сохранить таблицу
                      </button>
                      {selectedId ? (
                        <button
                          type="button"
                          className={styles.btnSmallDanger}
                          onClick={async () => {
                            if (!window.confirm("Удалить таблицу?")) return;
                            removeFormTemplate(selectedId);
                            if (!(await syncStoreToServer())) return;
                            startNewTemplate();
                            await refresh();
                            setMsg("Таблица удалена.");
                          }}
                        >
                          Удалить таблицу
                        </button>
                      ) : null}
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
                                  ? effectiveRows?.length
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
                        className={columnsEditMode ? styles.btnNeoPrimary : styles.btnNeoGhost}
                        onClick={() => setColumnsEditMode((v) => !v)}
                      >
                        {columnsEditMode ? "Завершить редактирование" : "Изменить"}
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
                    {(draft.importSheets?.length ?? 0) > 1 ? (
                      <div className={tables.sheetTabsBar} role="tablist" aria-label="Листы таблицы">
                        <span className={tables.sheetTabsBarLabel}>Листы</span>
                        <div className={tables.sheetTabsScroll}>
                          {(draft.importSheets ?? []).map((sheet) => {
                            const isActive =
                              (activeSheet?.id ?? draft.importSheets?.[0]?.id) === sheet.id;
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
                                  onClick={() => setSelectedSheetId(sheet.id)}
                                >
                                  {sheet.title}
                                </button>
                                <button
                                  type="button"
                                  className={tables.sheetTabClose}
                                  title="Удалить лист"
                                  aria-label={`Удалить лист ${sheet.title}`}
                                  onClick={() => removeImportSheet(sheet.id)}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <FormGridEditor
                      columns={effectiveColumns}
                      rows={effectiveRows}
                      readOnly={!columnsEditMode}
                      onChange={(seedRows) => updateSheetDraft({ seedRows })}
                      isV2={isV2}
                    />
                  </div>
                ) : null}
                  </>
                ) : null}
                {editorTab === "assign" ? (
                  <>
                    <p className={styles.subtitle}>
                      Назначено: <strong>{assignedCount}</strong>
                    </p>
                    <textarea
                      className={styles.input}
                      rows={3}
                      value={assignEmails}
                      onChange={(e) => setAssignEmails(e.target.value)}
                      placeholder="e-mail подрядчиков через запятую"
                    />
                    <div className={tables.contractorChips}>
                      {contractors.map((c) => {
                        const on = parseAssignEmails().includes(c.emailNorm);
                        return (
                          <button
                            key={c.emailNorm}
                            type="button"
                            className={on ? tables.chipOn : tables.chip}
                            onClick={() => {
                              const set = new Set(parseAssignEmails());
                              if (set.has(c.emailNorm)) set.delete(c.emailNorm);
                              else set.add(c.emailNorm);
                              setAssignEmails(Array.from(set).join(", "));
                            }}
                          >
                            {c.profile.contractorCompanyName.trim() || c.emailNorm}
                          </button>
                        );
                      })}
                    </div>
                    <div className={styles.rowBtns}>
                      <button
                        type="button"
                        className={styles.btnNeoPrimary}
                        onClick={() => void handleAssign()}
                      >
                        Отправить выбранным
                      </button>
                      <button
                        type="button"
                        className={styles.btnNeoGhost}
                        onClick={() => void handleAssignAll()}
                      >
                        Всем подрядчикам
                      </button>
                    </div>
                  </>
                ) : null}
              </form>
            )}
          </div>
        </div>
      ) : null}

      {hubTab === "monitor" ? (
        <>
          <p style={layoutStyles.subtitle}>
            Нажмите на строку, чтобы увидеть, как подрядчик заполнил таблицу.
          </p>
          <table style={{ width: "100%", fontSize: 13, marginTop: 8, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 6 }}>Таблица</th>
                <th style={{ textAlign: "left", padding: 6 }}>Подрядчик</th>
                <th style={{ textAlign: "center", padding: 6 }}>%</th>
                <th style={{ textAlign: "center", padding: 6 }}>Сдано</th>
              </tr>
            </thead>
            <tbody>
              {monitoring.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 8 }}>
                    Нет назначений.
                  </td>
                </tr>
              ) : (
                monitoring.map((r) => (
                  <tr
                    key={`${r.templateId}-${r.contractorEmailNorm}`}
                    style={{
                      cursor: "pointer",
                      background:
                        reviewRow?.templateId === r.templateId &&
                        reviewRow?.contractorEmailNorm === r.contractorEmailNorm
                          ? isV2
                            ? "rgba(43, 100, 253, 0.12)"
                            : "rgba(0, 212, 165, 0.12)"
                          : undefined,
                    }}
                    onClick={() => void openSubmissionReview(r)}
                  >
                    <td style={{ padding: 6 }}>{r.templateTitle}</td>
                    <td style={{ padding: 6 }}>{r.contractorLabel}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{r.fillPercent}%</td>
                    <td style={{ padding: 6, textAlign: "center" }}>
                      {r.submitted ? "да" : "нет"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              layoutStyles={layoutStyles}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
