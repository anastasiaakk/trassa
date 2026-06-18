import { createPortal } from "react-dom";
import type { useAdminTablesPanel } from "../../hooks/useAdminTablesPanel";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/AdminPanel.module.css";
import tables from "../../pages/AdminTablesPanel.module.css";

type Panel = ReturnType<typeof useAdminTablesPanel>;

type Props = {
  panel: Panel;
};

export default function AdminTablesImportModal({ panel }: Props) {
  const {
    importModalOpen,
    closeImportModal,
    importTitle,
    setImportTitle,
    importFile,
    setImportFile,
    handleImport,
  } = panel;

  if (!importModalOpen) return null;

  return createPortal(
    <div
      className={cx(tables.importOverlay, "admin-tables-import-overlay")}
      role="presentation"
      onClick={closeImportModal}
    >
      <div
        className={cx(tables.importDialog, "admin-tables-import-dialog")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-tables-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={tables.importDialogHead}>
          <h2 id="admin-tables-import-title" className={tables.importDialogTitle}>
            Импорт из Excel
          </h2>
          <button
            type="button"
            className={tables.importDialogClose}
            onClick={closeImportModal}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>
        <div className={`${styles.form} ${tables.importDialogBody}`}>
          <p className={styles.subtitle}>
            Excel (.xlsx, .xls, .xlsm, .ods…), Word (.docx) или CSV/TSV. На сервере с
            OPENAI_API_KEY ИИ сам находит лист и строку заголовков (значения ячеек не
            переписываются).
          </p>
          <label className={styles.label}>
            Название
            <input
              className={styles.input}
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Файл
            <input
              type="file"
              accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.xlsb,.ods,.xltx,.xltm,.docx"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className={tables.importDialogFooter}>
            <button
              type="button"
              className={tables.importDialogCancel}
              onClick={closeImportModal}
            >
              Отмена
            </button>
            <button
              type="button"
              className={cx(tables.importDialogSubmit, "admin-tables-import-submit")}
              disabled={!importFile}
              onClick={() => void handleImport()}
            >
              Импортировать
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
