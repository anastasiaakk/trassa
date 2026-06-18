import type { FormLayout } from "../../types/adminForms";
import FormColumnEditor from "../admin/FormColumnEditor";
import FormGridEditor from "../admin/FormGridEditor";
import { cloneSeedRows } from "../../utils/adminFormsGrid";
import { removeFormTemplate } from "../../utils/adminFormsStorage";
import type { useAdminTablesPanel } from "../../hooks/useAdminTablesPanel";
import styles from "../../pages/AdminPanel.module.css";
import tables from "../../pages/AdminTablesPanel.module.css";

type Panel = ReturnType<typeof useAdminTablesPanel>;

type Props = {
  panel: Panel;
  isV2: boolean;
};

export default function AdminTablesEditorBody({ panel, isV2 }: Props) {
  const {
    selectedId,
    draft,
    setDraft,
    editorTab,
    effectiveLayout,
    effectiveColumns,
    effectiveRows,
    columnsEditMode,
    setColumnsEditMode,
    updateSheetDraft,
    activeSheet,
    setSelectedSheetId,
    removeImportSheet,
    aiReady,
    aiBusy,
    handleGenerateHints,
    assignedCount,
    selected,
    assignEmails,
    setAssignEmails,
    contractors,
    parseAssignEmails,
    toggleContractorEmail,
    handleAssign,
    handleAssignAll,
    handleSaveTemplate,
    startNewTemplate,
    refresh,
  } = panel;

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
}
