import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { fetchRadorFormAlerts, fetchRadorFormsDashboard, markFormAlertReadApi } from "../api/formsApi";
import { isAuthApiEnabled } from "../utils/authMode";
import type { FormDeadlineSnapshot, FormMonitoringRow } from "../types/adminForms";
import type { FormAlert } from "../types/formAlerts";
import { loadRadorFormsMonitoring, listAllMonitoring } from "../utils/adminFormsStorage";
import {
  countUnreadRadorAlerts,
  listRadorAlerts,
  markFormAlertRead,
} from "../utils/formAlertsStorage";

type Props = {
  layoutStyles: {
    section?: CSSProperties;
    recentTitle?: CSSProperties;
    subtitle?: CSSProperties;
  };
};

export default function AssociationFormsMonitoring({ layoutStyles }: Props) {
  const [snapshots, setSnapshots] = useState<FormDeadlineSnapshot[]>(
    () => loadRadorFormsMonitoring()?.snapshots ?? []
  );
  const [rows, setRows] = useState<FormMonitoringRow[]>(() => {
    const cached = loadRadorFormsMonitoring();
    return cached?.monitoring?.length ? cached.monitoring : listAllMonitoring();
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    () => loadRadorFormsMonitoring()?.updatedAt ?? null
  );
  const [alerts, setAlerts] = useState<FormAlert[]>(() => listRadorAlerts().slice(0, 30));
  const [alertsUnread, setAlertsUnread] = useState(() => countUnreadRadorAlerts());

  const syncLocal = useCallback(() => {
    const cached = loadRadorFormsMonitoring();
    if (cached) {
      setSnapshots(cached.snapshots ?? []);
      setRows(
        cached.monitoring?.length ? cached.monitoring : listAllMonitoring()
      );
      setUpdatedAt(cached.updatedAt ?? null);
    } else {
      setRows(listAllMonitoring());
    }
  }, []);

  const syncAlerts = useCallback(async () => {
    if (isAuthApiEnabled()) {
      const r = await fetchRadorFormAlerts();
      if (r.ok) {
        setAlerts(r.alerts.slice(0, 30));
        setAlertsUnread(r.unread);
        return;
      }
    }
    setAlerts(listRadorAlerts().slice(0, 30));
    setAlertsUnread(countUnreadRadorAlerts());
  }, []);

  const syncRemote = useCallback(async () => {
    if (!isAuthApiEnabled()) {
      syncLocal();
      return;
    }
    const r = await fetchRadorFormsDashboard();
    if (r.ok) {
      setSnapshots(r.data.snapshots);
      setRows(r.data.monitoring);
      setUpdatedAt(r.data.updatedAt);
      try {
        localStorage.setItem(
          "trassa-form-rador-monitoring-v1",
          JSON.stringify({
            updatedAt: r.data.updatedAt,
            snapshots: r.data.snapshots,
            monitoring: r.data.monitoring,
          })
        );
      } catch {
        /* ignore */
      }
      return;
    }
    syncLocal();
  }, [syncLocal]);

  useEffect(() => {
    void syncRemote();
    void syncAlerts();
    const onChange = () => {
      void syncRemote();
      void syncAlerts();
    };
    window.addEventListener("trassa-rador-forms-monitoring-changed", onChange);
    window.addEventListener("trassa-admin-forms-changed", onChange);
    window.addEventListener("trassa-portal-state-synced", onChange);
    window.addEventListener("trassa-form-alerts-changed", onChange);
    const id = window.setInterval(onChange, 30_000);
    return () => {
      window.removeEventListener("trassa-rador-forms-monitoring-changed", onChange);
      window.removeEventListener("trassa-admin-forms-changed", onChange);
      window.removeEventListener("trassa-portal-state-synced", onChange);
      window.removeEventListener("trassa-form-alerts-changed", onChange);
      window.clearInterval(id);
    };
  }, [syncRemote, syncAlerts]);

  const onMarkAlertRead = (id: string) => {
    if (isAuthApiEnabled()) {
      void markFormAlertReadApi(id).then(() => void syncAlerts());
      return;
    }
    markFormAlertRead(id);
    void syncAlerts();
  };

  return (
    <div style={layoutStyles.section}>
      <div style={layoutStyles.recentTitle}>Таблицы подрядчиков</div>
      <p style={layoutStyles.subtitle}>
        Процент заполнения и итоговые срезы на дату срока сдачи.
        {updatedAt ? ` Обновлено: ${new Date(updatedAt).toLocaleString("ru-RU")}.` : null}
      </p>
      {alerts.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <strong>
            Уведомления{alertsUnread > 0 ? ` (${alertsUnread} непрочит.)` : ""}
          </strong>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
            {alerts.map((a) => (
              <li
                key={a.id}
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: a.read ? "rgba(255,255,255,0.04)" : "rgba(0, 212, 165, 0.12)",
                  fontSize: 13,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: a.read ? 500 : 700 }}>{a.message}</div>
                  <div style={{ opacity: 0.75, marginTop: 4, fontSize: 12 }}>
                    {new Date(a.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                {!a.read ? (
                  <button
                    type="button"
                    onClick={() => onMarkAlertRead(a.id)}
                    style={{
                      flexShrink: 0,
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Прочитано
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <strong>Текущий прогресс</strong>
        {rows.length === 0 ? (
          <p style={{ fontSize: 14, marginTop: 8 }}>Данных пока нет.</p>
        ) : (
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
              {rows.map((r) => (
                <tr key={`${r.templateId}-${r.contractorEmailNorm}`}>
                  <td style={{ padding: 6 }}>{r.templateTitle}</td>
                  <td style={{ padding: 6 }}>{r.contractorLabel}</td>
                  <td style={{ padding: 6, textAlign: "center" }}>{r.fillPercent}%</td>
                  <td style={{ padding: 6, textAlign: "center" }}>
                    {r.submitted ? "да" : "нет"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <strong>Срезы по срокам</strong>
        {snapshots.length === 0 ? (
          <p style={{ fontSize: 14, marginTop: 8 }}>Срезов ещё не было.</p>
        ) : (
          snapshots.map((s) => (
            <div
              key={s.id}
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 700 }}>{s.templateTitle}</div>
              <div>
                Срок: {new Date(s.dueAt).toLocaleString("ru-RU")} · зафиксировано:{" "}
                {new Date(s.capturedAt).toLocaleString("ru-RU")}
              </div>
              <div>
                Подрядчиков: {s.summary.contractors}, сдано: {s.summary.submitted}, средний %:{" "}
                {s.summary.avgFillPercent}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
