import { useMemo, useState, type CSSProperties } from "react";
import type { FormSubmission, FormTemplate, FormTemplateSheet } from "../../types/adminForms";
import { templateLayout } from "../../utils/adminFormsGrid";
import {
  buildSheetDraftsFromSubmission,
  sheetAsTemplate,
  templateHasSheetTabs,
} from "../../utils/formSheetUtils";
import FormGridEditor from "../admin/FormGridEditor";
import styles from "../../pages/AdminPanel.module.css";
import sheetTabs from "../../pages/AdminTablesPanel.module.css";

type Props = {
  template: FormTemplate;
  submission: FormSubmission | null;
  contractorLabel: string;
  onClose: () => void;
  layoutStyles?: {
    section?: CSSProperties;
    subtitle?: CSSProperties;
  };
};

function SheetFields({
  template,
  sheet,
  submission,
}: {
  template: FormTemplate;
  sheet: FormTemplateSheet;
  submission: FormSubmission;
}) {
  const slice = { ...template, ...sheetAsTemplate(template, sheet) };
  const layout = templateLayout(slice);
  const drafts = buildSheetDraftsFromSubmission(template, submission);
  const data = drafts[sheet.id] ?? { cells: {}, rows: [] };

  const columns = sheet.columns ?? [];
  if (layout === "grid") {
    return (
      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <FormGridEditor
          columns={columns}
          rows={data.rows ?? []}
          onChange={() => {}}
          readOnly
          lockStructure
        />
      </div>
    );
  }

  return (
    <dl style={{ marginTop: 12, display: "grid", gap: 10 }}>
      {columns.map((col) => (
        <div key={col.id}>
          <dt style={{ fontSize: 12, opacity: 0.75 }}>{col.title}</dt>
          <dd style={{ margin: "4px 0 0", fontSize: 14 }}>{String(data.cells[col.id] ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function FormSubmissionViewer({
  template,
  submission,
  contractorLabel,
  onClose,
  layoutStyles,
}: Props) {
  const hasTabs = templateHasSheetTabs(template);
  const sheets = template.importSheets ?? [];
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(sheets[0]?.id ?? null);

  const activeSheet = useMemo(() => {
    if (!hasTabs) return null;
    if (selectedSheetId) {
      const picked = sheets.find((s) => s.id === selectedSheetId);
      if (picked) return picked;
    }
    return sheets[0] ?? null;
  }, [hasTabs, sheets, selectedSheetId]);

  const layout = templateLayout(template);
  const submitted = Boolean(submission?.submittedAt);

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 14,
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(103,232,249,0.2)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 16 }}>{template.title}</strong>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            {contractorLabel}
            {submitted
              ? ` · сдано ${new Date(submission!.submittedAt!).toLocaleString("ru-RU")}`
              : " · черновик / не сдано"}
            {submission?.updatedAt
              ? ` · изменено ${new Date(submission.updatedAt).toLocaleString("ru-RU")}`
              : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Закрыть
        </button>
      </div>

      {!submission ? (
        <p style={{ ...layoutStyles?.subtitle, marginTop: 12 }}>Подрядчик ещё не начинал заполнение.</p>
      ) : hasTabs && activeSheet ? (
        <>
          <div className={sheetTabs.sheetTabsBar} role="tablist" aria-label="Листы таблицы" style={{ marginTop: 12 }}>
            <span className={sheetTabs.sheetTabsBarLabel}>Листы</span>
            <div className={sheetTabs.sheetTabsScroll}>
              {sheets.map((sheet) => {
                const isActive = (activeSheet?.id ?? sheets[0]?.id) === sheet.id;
                return (
                  <div
                    key={sheet.id}
                    className={`${sheetTabs.sheetTab} ${isActive ? sheetTabs.sheetTabActive : ""}`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <button
                      type="button"
                      className={sheetTabs.sheetTabLabel}
                      onClick={() => setSelectedSheetId(sheet.id)}
                    >
                      {sheet.title}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <SheetFields template={template} sheet={activeSheet} submission={submission} />
        </>
      ) : layout === "grid" ? (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <FormGridEditor
            columns={template.columns}
            rows={submission.rows ?? []}
            onChange={() => {}}
            readOnly
            lockStructure
          />
        </div>
      ) : (
        <dl style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {template.columns.map((col) => (
            <div key={col.id}>
              <dt style={{ fontSize: 12, opacity: 0.75 }}>{col.title}</dt>
              <dd style={{ margin: "4px 0 0", fontSize: 14 }}>
                {String(submission.cells[col.id] ?? "—")}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {template.description ? (
        <p className={styles.subtitle} style={{ marginTop: 12, marginBottom: 0 }}>
          {template.description}
        </p>
      ) : null}
    </div>
  );
}
