import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAdminIncidents,
  fetchAdminIncidents,
  fetchAdminStats,
  type AdminIncidentEvent,
} from "../../api/adminMonitoringApi";
import { getAdminApiToken } from "../../api/adminApi";
import { buildEventsPerDay, type DailySeries } from "../../utils/adminChartData";
import {
  clearLocalClientEvents,
  listLocalClientEvents,
  listLocalClientEventTimes,
} from "../../utils/clientDiagnostics";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";
import AdminGlassAreaChart from "./AdminGlassAreaChart";
import type { AdminKpiItem } from "./adminKpiTypes";

const INCIDENT_KIND_LABELS: Record<string, string> = {
  error: "Ошибка",
  crash: "Сбой",
  rejection: "Промис",
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function pluralRecords(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "запись"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "записи"
        : "записей";
  return `${n} ${word}`;
}

type Props = {
  kpiItems: AdminKpiItem[];
  glassVariant: "map" | "dark";
  apiEnabled: boolean;
  userCreatedAtList: string[];
  activeSection: string;
};

export default function AdminHomeSection({
  kpiItems,
  glassVariant,
  apiEnabled,
  userCreatedAtList,
  activeSection,
}: Props) {
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [incidentsOpen, setIncidentsOpen] = useState(false);
  const [registrations, setRegistrations] = useState<DailySeries>(() =>
    buildEventsPerDay(userCreatedAtList, 14),
  );
  const [incidentsSeries, setIncidentsSeries] = useState<DailySeries>(() =>
    buildEventsPerDay(listLocalClientEventTimes(), 14),
  );
  const [incidents, setIncidents] = useState<AdminIncidentEvent[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [clearingIncidents, setClearingIncidents] = useState(false);
  const [incidentsFeedback, setIncidentsFeedback] = useState<string | null>(null);

  const monitoringMeta = useMemo(
    () => `польз. ${registrations.total} · сбоев ${incidentsSeries.total}`,
    [registrations.total, incidentsSeries.total],
  );

  const refreshCharts = useCallback(() => {
    const localRegs = buildEventsPerDay(userCreatedAtList, 14);
    const localIncidents = buildEventsPerDay(listLocalClientEventTimes(), 14);
    if (apiEnabled && getAdminApiToken()) {
      void fetchAdminStats(14).then((res) => {
        if (res.ok) {
          setRegistrations(res.stats.registrations);
          setIncidentsSeries(res.stats.incidents);
          return;
        }
        setRegistrations(localRegs);
        setIncidentsSeries(localIncidents);
      });
      return;
    }
    setRegistrations(localRegs);
    setIncidentsSeries(localIncidents);
  }, [apiEnabled, userCreatedAtList]);

  const loadIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    if (apiEnabled && getAdminApiToken()) {
      const res = await fetchAdminIncidents(150);
      if (res.ok) {
        setIncidents(res.events);
        setLoadingIncidents(false);
        return;
      }
      setIncidents(
        listLocalClientEvents(150).map((e) => ({
          id: e.id,
          kind: e.kind,
          message: e.message,
          createdAt: e.createdAt,
        })),
      );
      setLoadingIncidents(false);
      return;
    }
    setIncidents(
      listLocalClientEvents(150).map((e) => ({
        id: e.id,
        kind: e.kind,
        message: e.message,
        createdAt: e.createdAt,
      })),
    );
    setLoadingIncidents(false);
  }, [apiEnabled]);

  const onClearIncidents = useCallback(async () => {
    if (
      !window.confirm(
        "Очистить журнал сбоев? Все записи будут удалены без возможности восстановления.",
      )
    ) {
      return;
    }
    setClearingIncidents(true);
    setIncidentsFeedback(null);
    if (apiEnabled && getAdminApiToken()) {
      const res = await clearAdminIncidents();
      if (!res.ok) {
        setIncidentsFeedback(res.error);
        setClearingIncidents(false);
        return;
      }
    }
    clearLocalClientEvents();
    setIncidents([]);
    refreshCharts();
    await loadIncidents();
    setIncidentsFeedback("Журнал сбоев очищен.");
    setClearingIncidents(false);
  }, [apiEnabled, refreshCharts, loadIncidents]);

  useEffect(() => {
    refreshCharts();
  }, [refreshCharts]);

  useEffect(() => {
    if (activeSection !== "home") {
      setMonitoringOpen(false);
      setIncidentsOpen(false);
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "home" || !monitoringOpen) return;
    const id = window.setInterval(refreshCharts, 30_000);
    return () => window.clearInterval(id);
  }, [activeSection, monitoringOpen, refreshCharts]);

  useEffect(() => {
    if (activeSection !== "home" || !monitoringOpen || !incidentsOpen) return;
    void loadIncidents();
    const id = window.setInterval(() => void loadIncidents(), 30_000);
    return () => window.clearInterval(id);
  }, [activeSection, monitoringOpen, incidentsOpen, loadIncidents]);

  return (
    <>
      <div className={glass.glassStats}>
        {kpiItems.map((item) => (
          <div key={item.id} className={glass.glassStatCard}>
            <span className={glass.glassStatValue}>{item.value}</span>
            <span className={glass.glassStatLabel}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <button
          type="button"
          className={styles.collapseTrigger}
          aria-expanded={monitoringOpen}
          onClick={() => {
            setMonitoringOpen((open) => {
              const next = !open;
              if (next) refreshCharts();
              if (next && incidentsOpen) void loadIncidents();
              return next;
            });
          }}
        >
          <span
            className={`${styles.collapseChevron} ${monitoringOpen ? styles.collapseChevronOpen : ""}`}
            aria-hidden
          >
            ▶
          </span>
          <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>Мониторинг</h3>
          <span className={styles.collapseMeta}>{monitoringMeta}</span>
        </button>

        {monitoringOpen ? (
          <div className={styles.collapseBody}>
            <div className={glass.glassCharts}>
              <AdminGlassAreaChart
                variant={glassVariant}
                title="Зарегистрированные пользователи"
                meta={`всего ${registrations.total} · за 14 дней`}
                labels={registrations.labels}
                values={registrations.values}
                emptyHint="Пока нет зарегистрированных пользователей."
              />
              <AdminGlassAreaChart
                variant={glassVariant}
                title="Сбои и ошибки программы"
                meta={`всего ${incidentsSeries.total} · за 14 дней`}
                labels={incidentsSeries.labels}
                values={incidentsSeries.values}
                emptyHint="Сбоев не зафиксировано. Ошибки JS и необработанные промисы попадают сюда автоматически."
              />
            </div>

            <div className={glass.glassIncidentsBlock}>
              <button
                type="button"
                className={styles.collapseTrigger}
                aria-expanded={incidentsOpen}
                onClick={() => {
                  setIncidentsOpen((open) => {
                    const next = !open;
                    if (next) void loadIncidents();
                    return next;
                  });
                }}
              >
                <span
                  className={`${styles.collapseChevron} ${incidentsOpen ? styles.collapseChevronOpen : ""}`}
                  aria-hidden
                >
                  ▶
                </span>
                <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>Журнал сбоев</h4>
                <span className={styles.collapseMeta}>
                  {loadingIncidents ? "загрузка…" : pluralRecords(incidents.length)}
                </span>
              </button>

              {incidentsOpen ? (
                <div className={styles.collapseBody}>
                  <p className={styles.subtitle}>
                    Ошибки JavaScript и необработанные промисы с клиентов. При работе API данные
                    собираются на сервере, иначе — только в этом браузере.
                  </p>
                  <div className={styles.rowBtns}>
                    <button
                      type="button"
                      className={styles.btnNeoGhost}
                      disabled={loadingIncidents || clearingIncidents}
                      onClick={() => void loadIncidents()}
                    >
                      {loadingIncidents ? "Обновление…" : "Обновить журнал"}
                    </button>
                    <button
                      type="button"
                      className={styles.btnSmallDanger}
                      disabled={loadingIncidents || clearingIncidents || incidents.length === 0}
                      onClick={() => void onClearIncidents()}
                    >
                      {clearingIncidents ? "Очистка…" : "Очистить журнал"}
                    </button>
                  </div>
                  {incidentsFeedback ? (
                    <p className={glass.glassMsg}>{incidentsFeedback}</p>
                  ) : null}
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: 150 }}>Когда</th>
                          <th style={{ width: 100 }}>Тип</th>
                          <th>Сообщение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.length === 0 ? (
                          <tr>
                            <td colSpan={3}>Записей пока нет.</td>
                          </tr>
                        ) : (
                          incidents.map((row) => (
                            <tr key={row.id}>
                              <td>{formatWhen(row.createdAt)}</td>
                              <td>{INCIDENT_KIND_LABELS[row.kind] ?? row.kind}</td>
                              <td>{row.message}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
