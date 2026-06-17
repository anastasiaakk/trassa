import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { FormCellValue, FormColumn, FormGridRow } from "../../types/adminForms";
import { emptyGridRow } from "../../utils/adminFormsGrid";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/AdminPanel.module.css";

type Props = {
  columns: FormColumn[];
  rows: FormGridRow[];
  onChange: (rows: FormGridRow[]) => void;
  readOnly?: boolean;
  /** Только заполнение ячеек — без «+ Строка» и удаления (для подрядчика). */
  lockStructure?: boolean;
  maxRows?: number;
  isV2?: boolean;
};

type GridCellProps = {
  col: FormColumn;
  value: FormCellValue | undefined;
  readOnly: boolean;
  isV2: boolean;
  onChange: (v: FormCellValue) => void;
};

const GridCell = memo(function GridCell({ col, value, readOnly, isV2, onChange }: GridCellProps) {
  if (col.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  if (col.type === "date") {
    return (
      <input
        type="date"
        className={cx(styles.formGridCellInput, isV2 && "formGridCellInput")}
        style={{ minWidth: 120 }}
        value={String(value ?? "")}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (col.type === "number" || col.type === "percent") {
    return (
      <input
        type="number"
        className={cx(styles.formGridCellInput, isV2 && "formGridCellInput")}
        style={{ minWidth: 80 }}
        value={value === undefined ? "" : String(value)}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    );
  }
  return (
    <input
      type="text"
      className={cx(styles.formGridCellInput, isV2 && "formGridCellInput")}
      value={String(value ?? "")}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
    />
  );
});

function cellView(col: FormColumn, value: FormCellValue | undefined) {
  if (value === undefined || value === null || value === "") return "";
  if (col.type === "checkbox") return value === true ? "Да" : "Нет";
  return String(value);
}

type GridRowProps = {
  row: FormGridRow;
  rowIdx: number;
  indexedColumns: Array<{ col: FormColumn; width: number }>;
  indexWidth: number;
  actionWidth: number;
  indexColClassName: string | undefined;
  canEditStructure: boolean;
  readOnly: boolean;
  isV2: boolean;
  maxRows: number;
  rowsLength: number;
  onUpdateCell: (rowIdx: number, colId: string, value: FormCellValue) => void;
  onDuplicateRow: (rowIdx: number) => void;
  onRemoveRow: (rowIdx: number) => void;
};

const GridRow = memo(function GridRow({
  row,
  rowIdx,
  indexedColumns,
  indexWidth,
  actionWidth,
  indexColClassName,
  canEditStructure,
  readOnly,
  isV2,
  maxRows,
  rowsLength,
  onUpdateCell,
  onDuplicateRow,
  onRemoveRow,
}: GridRowProps) {
  return (
    <tr>
      <td className={indexColClassName} style={{ width: indexWidth, minWidth: indexWidth }}>
        {rowIdx + 1}
      </td>
      {indexedColumns.map(({ col, width }) => (
        <td key={col.id} style={{ width, minWidth: width }}>
          {readOnly ? (
            <span>{cellView(col, row.cells[col.id])}</span>
          ) : (
            <GridCell
              col={col}
              value={row.cells[col.id]}
              readOnly={readOnly}
              isV2={isV2}
              onChange={(v) => onUpdateCell(rowIdx, col.id, v)}
            />
          )}
        </td>
      ))}
      {canEditStructure ? (
        <td style={{ whiteSpace: "nowrap", width: actionWidth, minWidth: actionWidth }}>
          <button
            type="button"
            className={styles.btnNeoGhost}
            title="Дублировать строку"
            style={{ marginRight: 4, padding: "4px 8px", fontSize: 11 }}
            disabled={rowsLength >= maxRows}
            onClick={() => onDuplicateRow(rowIdx)}
          >
            ⧉
          </button>
          <button
            type="button"
            className={styles.btnSmallDanger}
            title="Удалить строку"
            disabled={rowsLength <= 1}
            onClick={() => onRemoveRow(rowIdx)}
          >
            ×
          </button>
        </td>
      ) : null}
    </tr>
  );
});

export default function FormGridEditor({
  columns,
  rows,
  onChange,
  readOnly = false,
  lockStructure = false,
  maxRows = 500,
  isV2 = false,
}: Props) {
  const MIN_INDEX_COL_WIDTH = 52;
  const MIN_ACTION_COL_WIDTH = 90;
  const MIN_DATA_COL_WIDTH = 120;
  const canEditStructure = !readOnly && !lockStructure;
  const indexColClassName = isV2 ? undefined : styles.formGridStickyCol;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const rowsRef = useRef(rows);
  const onChangeRef = useRef(onChange);
  rowsRef.current = rows;
  onChangeRef.current = onChange;

  const getDefaultColumnWidth = useCallback((col: FormColumn): number => {
    if (col.type === "checkbox") return 120;
    if (col.type === "date") return 150;
    if (col.type === "number" || col.type === "percent") return 140;
    return 220;
  }, []);

  const getColumnWidth = useCallback(
    (key: string, fallback: number): number => {
      return columnWidths[key] ?? fallback;
    },
    [columnWidths]
  );

  const setColumnWidth = useCallback((key: string, width: number, min: number) => {
    const normalized = Math.max(min, Math.round(width));
    setColumnWidths((prev) => {
      if (prev[key] === normalized) return prev;
      return { ...prev, [key]: normalized };
    });
  }, []);

  const stopResize = useCallback(() => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    setIsResizing(false);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const active = resizeRef.current;
      if (!active) return;
      const delta = event.clientX - active.startX;
      const next = active.startWidth + delta;
      const min =
        active.key === "__index"
          ? MIN_INDEX_COL_WIDTH
          : active.key === "__actions"
            ? MIN_ACTION_COL_WIDTH
            : MIN_DATA_COL_WIDTH;
      setColumnWidth(active.key, next, min);
    },
    [setColumnWidth]
  );

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [onPointerMove, stopResize]);

  const beginResize = useCallback(
    (key: string, event: ReactPointerEvent<HTMLSpanElement>, fallbackWidth: number, min: number) => {
      event.preventDefault();
      event.stopPropagation();
      const startWidth = getColumnWidth(key, fallbackWidth);
      resizeRef.current = { key, startX: event.clientX, startWidth: Math.max(min, startWidth) };
      setIsResizing(true);
    },
    [getColumnWidth]
  );

  const indexedColumns = useMemo(
    () =>
      columns.map((col) => ({
        col,
        width: getColumnWidth(col.id, getDefaultColumnWidth(col)),
      })),
    [columns, getColumnWidth, getDefaultColumnWidth]
  );

  const indexWidth = getColumnWidth("__index", MIN_INDEX_COL_WIDTH);
  const actionWidth = getColumnWidth("__actions", MIN_ACTION_COL_WIDTH);

  const updateCell = useCallback((rowIdx: number, colId: string, value: FormCellValue) => {
    const prev = rowsRef.current;
    const next = [...prev];
    next[rowIdx] = { ...next[rowIdx], cells: { ...next[rowIdx].cells, [colId]: value } };
    onChangeRef.current(next);
  }, []);

  const removeRow = useCallback((rowIdx: number) => {
    const prev = rowsRef.current;
    if (prev.length <= 1) return;
    onChangeRef.current(prev.filter((_, i) => i !== rowIdx));
  }, []);

  const duplicateRow = useCallback(
    (rowIdx: number) => {
      const prev = rowsRef.current;
      if (prev.length >= maxRows) return;
      const src = prev[rowIdx];
      const copy = {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cells: { ...src.cells },
      };
      const next = [...prev];
      next.splice(rowIdx + 1, 0, copy);
      onChangeRef.current(next);
    },
    [maxRows]
  );

  const onPasteTable = (e: ClipboardEvent) => {
    if (readOnly || lockStructure) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.split("\t"))
      .filter((cells) => cells.some((c) => c.trim()));
    if (lines.length === 0) return;
    const parsed = lines.map((cells, i) => {
      const row = emptyGridRow();
      row.id = `paste-${Date.now()}-${i}`;
      columns.forEach((col, ci) => {
        const raw = cells[ci]?.trim() ?? "";
        if (!raw) return;
        if (col.type === "checkbox") {
          row.cells[col.id] = /^(1|да|yes|true)$/i.test(raw);
        } else if (col.type === "number" || col.type === "percent") {
          const n = Number(raw.replace(",", "."));
          row.cells[col.id] = Number.isFinite(n) ? n : raw;
        } else {
          row.cells[col.id] = raw;
        }
      });
      return row;
    });
    onChangeRef.current([...rowsRef.current, ...parsed].slice(0, maxRows));
  };

  if (columns.length === 0) {
    return <p className={styles.subtitle}>Добавьте столбцы в шаблоне.</p>;
  }

  return (
    <div className={cx(styles.formGridWrap, isV2 && "form-grid-v2", isResizing && styles.formGridResizing)}>
      {!readOnly && !lockStructure ? (
        <p className={styles.subtitle} style={{ margin: "0 0 8px", fontSize: 12 }}>
          Вставка из Excel: скопируйте ячейки и нажмите Ctrl+V в таблице.
        </p>
      ) : null}
      <div className={cx(styles.formGridScroll, isV2 && "formGridScroll")}>
        <table className={cx(styles.formGridTable, isV2 && "formGridTable")} onPaste={onPasteTable}>
          <colgroup>
            <col style={{ width: indexWidth, minWidth: indexWidth }} />
            {indexedColumns.map(({ col, width }) => (
              <col key={col.id} style={{ width, minWidth: width }} />
            ))}
            {canEditStructure ? <col style={{ width: actionWidth, minWidth: actionWidth }} /> : null}
          </colgroup>
          <thead>
            <tr>
              <th className={indexColClassName} style={{ width: indexWidth, minWidth: indexWidth }}>
                #
                <span
                  className={styles.formGridResizeHandle}
                  role="separator"
                  aria-label="Изменить ширину колонки"
                  onPointerDown={(event) => beginResize("__index", event, indexWidth, MIN_INDEX_COL_WIDTH)}
                />
              </th>
              {indexedColumns.map(({ col, width }) => (
                <th key={col.id} title={col.title} style={{ width, minWidth: width }}>
                  {col.title}
                  {col.required !== false ? " *" : ""}
                  <span
                    className={styles.formGridResizeHandle}
                    role="separator"
                    aria-label={`Изменить ширину колонки ${col.title}`}
                    onPointerDown={(event) => beginResize(col.id, event, width, MIN_DATA_COL_WIDTH)}
                  />
                </th>
              ))}
              {canEditStructure ? (
                <th style={{ width: actionWidth, minWidth: actionWidth }}>
                  <span
                    className={styles.formGridResizeHandle}
                    role="separator"
                    aria-label="Изменить ширину колонки действий"
                    onPointerDown={(event) => beginResize("__actions", event, actionWidth, MIN_ACTION_COL_WIDTH)}
                  />
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <GridRow
                key={row.id}
                row={row}
                rowIdx={rowIdx}
                indexedColumns={indexedColumns}
                indexWidth={indexWidth}
                actionWidth={actionWidth}
                indexColClassName={indexColClassName}
                canEditStructure={canEditStructure}
                readOnly={readOnly}
                isV2={isV2}
                maxRows={maxRows}
                rowsLength={rows.length}
                onUpdateCell={updateCell}
                onDuplicateRow={duplicateRow}
                onRemoveRow={removeRow}
              />
            ))}
          </tbody>
        </table>
      </div>
      {canEditStructure && rows.length < maxRows ? (
        <button
          type="button"
          className={styles.btnNeoGhost}
          style={{ marginTop: 10 }}
          onClick={() => onChangeRef.current([...rowsRef.current, emptyGridRow()])}
        >
          + Строка
        </button>
      ) : null}
    </div>
  );
}
