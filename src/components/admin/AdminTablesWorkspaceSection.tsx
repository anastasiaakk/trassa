import {
  TablesIconImport,
  TablesIconPlus,
} from "./AdminTablesPanelIcons";
import type { AdminTablesEditorTab } from "../../hooks/useAdminTablesPanel";
import type { useAdminTablesPanel } from "../../hooks/useAdminTablesPanel";
import AdminTablesEditorBody from "./AdminTablesEditorBody";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/AdminPanel.module.css";
import tables from "../../pages/AdminTablesPanel.module.css";

type Panel = ReturnType<typeof useAdminTablesPanel>;

type Props = {
  panel: Panel;
  isV2: boolean;
};

export default function AdminTablesWorkspaceSection({ panel, isV2 }: Props) {
  const {
    editorTab,
    setEditorTab,
    startNewTemplate,
    setImportModalOpen,
    templateSearch,
    setTemplateSearch,
    filteredTemplates,
    selectedId,
    loadTemplateToDraft,
  } = panel;

  const editorTabBtn = (id: AdminTablesEditorTab, label: string) => (
    <button
      key={id}
      type="button"
      className={cx(
        editorTab === id ? tables.tabBtnActive : tables.tabBtn,
        isV2 && "admin-tables-tab-btn",
        isV2 && editorTab === id && "admin-tables-tab-btn--active",
      )}
      onClick={() => setEditorTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className={cx(tables.workspace, tables.tablesWorkspace)}>
      <aside className={cx(tables.sidebar, isV2 && "admin-tables-aside")}>
        <div
          className={
            isV2 ? "admin-tables-sidebar-actions" : cx(tables.sidebarActions)
          }
        >
          {isV2 ? (
            <>
              <button
                type="button"
                className="admin-tables-sidebar-action admin-tables-sidebar-create"
                onClick={startNewTemplate}
              >
                <span className="admin-tables-sidebar-action-icon" aria-hidden>
                  <TablesIconPlus />
                </span>
                <span className="admin-tables-sidebar-action-label">Создать</span>
              </button>
              <button
                type="button"
                className="admin-tables-sidebar-action admin-tables-sidebar-import"
                onClick={() => setImportModalOpen(true)}
              >
                <span className="admin-tables-sidebar-action-icon" aria-hidden>
                  <TablesIconImport />
                </span>
                <span className="admin-tables-sidebar-action-label">
                  Импорт из Excel
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={cx(styles.btnNeoPrimary, tables.sidebarActionBtn)}
                onClick={startNewTemplate}
              >
                <span className={tables.sidebarActionIcon} aria-hidden>
                  <TablesIconPlus className={tables.sidebarActionSvg} />
                </span>
                <span className={tables.sidebarActionLabel}>+ Создать таблицу</span>
              </button>
              <button
                type="button"
                className={cx(styles.btnNeoGhost, tables.sidebarActionBtn)}
                onClick={() => setImportModalOpen(true)}
              >
                <span className={tables.sidebarActionIcon} aria-hidden>
                  <TablesIconImport className={tables.sidebarActionSvg} />
                </span>
                <span className={tables.sidebarActionLabel}>Импорт из Excel</span>
              </button>
            </>
          )}
        </div>
        <input
          className={tables.search}
          placeholder="Поиск шаблона…"
          value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)}
        />
        <ul className={tables.templateList}>
          {filteredTemplates.length === 0 ? (
            <li className={styles.subtitle}>Нет шаблонов</li>
          ) : (
            filteredTemplates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={selectedId === t.id ? tables.templateItemActive : tables.templateItem}
                  onClick={() => loadTemplateToDraft(t)}
                >
                  <div className={tables.templateTitle}>
                    {t.title}
                    {t.layout === "grid" ? " ⊞" : ""}
                    {t.owner === "rador" ? " · РАДОР" : ""}
                    {!t.active ? " · выкл." : ""}
                  </div>
                  <div className={tables.templateMeta}>
                    {t.columns.length} столб.
                    {t.deadlineAt
                      ? ` · до ${new Date(t.deadlineAt).toLocaleDateString("ru-RU")}`
                      : ""}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>
      <div className={tables.editor}>
        <div className={tables.editorTabs}>
          {editorTabBtn("general", "Основное")}
          {editorTabBtn("columns", "Столбцы и данные")}
          {editorTabBtn("hints", "Подсказки")}
          {editorTabBtn("assign", "Отправить подрядчикам")}
        </div>
        <AdminTablesEditorBody panel={panel} isV2={isV2} />
      </div>
    </div>
  );
}
