import type { CSSProperties } from "react";
import type { CabinetChromeStyles } from "../CabinetChromeLayout";
import type { ContractorFormsState } from "../../hooks/useContractorForms";
import type { CabinetAccentTheme } from "../../theme/cabinetAccentTheme";
import FormGridEditor from "../admin/FormGridEditor";
import { cx } from "../../design-system/cabinetChromeClasses";
import { downloadFormTemplateCsv } from "../../utils/adminFormsExport";
import { ATTACH_ACCEPT, formatDeadlineRu } from "../../utils/contractorFormsViewUtils";
import css from "../../pages/ContractorFormsView.module.css";
import sheetTabs from "../../pages/AdminTablesPanel.module.css";

type Props = {
  forms: ContractorFormsState;
  styles: CabinetChromeStyles;
  theme: CabinetAccentTheme;
  isDark: boolean;
  isV2: boolean;
};

export default function ContractorFormsEditor({ forms, styles, theme, isDark, isV2 }: Props) {
  const {
    active,
    activeId,
    activeSheet,
    activeSheetId,
    attachBusy,
    attachFileName,
    attachInputRef,
    cells,
    effectiveColumns,
    fillPercent,
    gridEditorKey,
    gridRows,
    gridSlotRef,
    handleAttachFile,
    handleClearAttachedFile,
    handleSave,
    hasSheetTabs,
    importSheets,
    isGrid,
    onCellChange,
    onGridRowsChange,
    persist,
    selectSheet,
  } = forms;

  if (!active) return null;

  const inputStyle: CSSProperties = {
    marginTop: 4,
    background: theme.inputBg,
    color: styles.text,
    border: `1px solid ${theme.inputBorder}`,
  };

  return (
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
                    onCellChange(col.id, e.target.value === "" ? "" : Number(e.target.value))
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
  );
}
