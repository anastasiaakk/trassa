import FormSubmissionViewer from "../forms/FormSubmissionViewer";
import { downloadMonitoringCsv } from "../../utils/adminFormsExport";
import type { useAdminTablesPanel } from "../../hooks/useAdminTablesPanel";
import styles from "../../pages/AdminPanel.module.css";

type Panel = ReturnType<typeof useAdminTablesPanel>;

type Props = {
  panel: Panel;
};

export default function AdminTablesMonitorSection({ panel }: Props) {
  const {
    monitoring,
    openSubmissionReview,
    reviewTemplate,
    reviewSubmission,
    reviewRow,
    setReviewRow,
    setReviewTemplate,
    setReviewSubmission,
    store,
  } = panel;

  return (
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
  );
}
