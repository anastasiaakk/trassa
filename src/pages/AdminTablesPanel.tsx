import {
  ADMIN_TABLES_PANEL_NAV_LABELS,
  TablesIconAi,
  TablesIconMonitor,
  type AdminTablesPanelView,
} from "../components/admin/AdminTablesPanelIcons";
import AdminTablesWorkspaceSection from "../components/admin/AdminTablesWorkspaceSection";
import AdminTablesMonitorSection from "../components/admin/AdminTablesMonitorSection";
import AdminTablesAiSection from "../components/admin/AdminTablesAiSection";
import AdminTablesImportModal from "../components/admin/AdminTablesImportModal";
import { useAdminTablesPanel } from "../hooks/useAdminTablesPanel";
import styles from "./AdminPanel.module.css";
import glass from "./AdminPanelGlass.module.css";
import { cx } from "../design-system/cabinetChromeClasses";
import tables from "./AdminTablesPanel.module.css";

export default function AdminTablesPanel() {
  const panel = useAdminTablesPanel();
  const { isV2, view, setView, tablesKpiItems, msg } = panel;

  const navBtn = (id: AdminTablesPanelView, options?: { iconOnly?: boolean }) => {
    const label = ADMIN_TABLES_PANEL_NAV_LABELS[id];
    const iconOnly = options?.iconOnly ?? false;
    return (
      <button
        key={id}
        type="button"
        className={cx(
          view === id ? tables.navBtnActive : tables.navBtn,
          iconOnly && tables.navBtnIconOnly,
          isV2 && "admin-tables-nav-btn",
          isV2 && view === id && "admin-tables-nav-btn--active",
        )}
        onClick={() => setView(id)}
        title={label}
        aria-label={label}
        aria-current={view === id ? "page" : undefined}
      >
        {iconOnly ? (
          id === "monitor" ? (
            <TablesIconMonitor className={tables.navGlyph} />
          ) : id === "ai" ? (
            <TablesIconAi className={tables.navGlyph} />
          ) : (
            label
          )
        ) : (
          label
        )}
      </button>
    );
  };

  return (
    <div className={cx(tables.shell, isV2 && "admin-tables-v2")}>
      <div className={glass.glassStats}>
        {tablesKpiItems.map((stat) => (
          <div key={stat.id} className={glass.glassStatCard}>
            <span className={glass.glassStatValue}>{stat.value}</span>
            <span className={glass.glassStatLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={tables.topBar}>
        <div className={tables.nav}>
          {navBtn("workspace")}
          {navBtn("monitor", { iconOnly: true })}
          {navBtn("ai", { iconOnly: true })}
        </div>
      </div>

      <p className={styles.subtitle} style={{ margin: 0 }}>
        Шаблоны для подрядчиков, контроль заполнения и срезы для РАДОР.
      </p>

      {msg ? <p className={glass.glassMsg}>{msg}</p> : null}

      {view === "workspace" ? (
        <AdminTablesWorkspaceSection panel={panel} isV2={isV2} />
      ) : null}

      {view === "monitor" ? <AdminTablesMonitorSection panel={panel} /> : null}

      <AdminTablesImportModal panel={panel} />

      {view === "ai" ? <AdminTablesAiSection panel={panel} /> : null}
    </div>
  );
}
