import { useState } from "react";
import type { FormColumn, FormColumnType } from "../../types/adminForms";
import col from "./FormColumnEditor.module.css";

type Props = {
  columns: FormColumn[];
  onChange: (columns: FormColumn[]) => void;
  readOnly?: boolean;
};

function newColumn(): FormColumn {
  return {
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "Поле",
    type: "text",
    required: true,
  };
}

function typeLabel(type: FormColumnType): string {
  if (type === "number") return "Число";
  if (type === "date") return "Дата";
  if (type === "percent") return "%";
  if (type === "checkbox") return "Да/нет";
  return "Текст";
}

export default function FormColumnEditor({ columns, onChange, readOnly = false }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const updateCol = (idx: number, patch: Partial<FormColumn>) => {
    const next = [...columns];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const moveColumn = (from: number, to: number) => {
    if (from === to || to < 0 || to >= columns.length) return;
    const next = [...columns];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className={col.root}>
      <p className={col.hint}>
        {readOnly
          ? "Режим просмотра: структура столбцов без редактирования."
          : "Перетащите строку за ⋮⋮, чтобы изменить порядок столбцов."}
      </p>
      {readOnly
        ? columns.map((c, idx) => (
            <div key={c.id} className={`${col.row} ${col.rowReadonly}`}>
              <div className={col.readonlyCell}>
                <div className={col.readonlyMuted}>Столбец {idx + 1}</div>
                <div className={col.readonlyTitle}>{c.title || `Без названия ${idx + 1}`}</div>
              </div>
              <div className={col.readonlyCell}>
                <div className={col.readonlyMuted}>Тип</div>
                <div>{typeLabel(c.type)}</div>
              </div>
              <div className={col.readonlyCell}>
                {c.required !== false ? "Обязательный" : "Необязательный"}
              </div>
            </div>
          ))
        : columns.map((c, idx) => (
            <div
              key={c.id}
              draggable
              className={col.row}
              style={{
                opacity: dragIdx === idx ? 0.55 : 1,
                border:
                  dragIdx === idx ? "2px dashed rgba(43, 100, 253, 0.45)" : undefined,
              }}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx === null) return;
                moveColumn(dragIdx, idx);
                setDragIdx(null);
              }}
              onDragEnd={() => setDragIdx(null)}
            >
              <button
                type="button"
                className={col.dragHandle}
                title="Перетащить"
                aria-label="Перетащить столбец"
                draggable
                onDragStart={() => setDragIdx(idx)}
              >
                ⋮⋮
              </button>
              <div className={col.field}>
                <span className={col.fieldLabel}>Заголовок</span>
                <input
                  className={col.input}
                  value={c.title}
                  onChange={(e) => updateCol(idx, { title: e.target.value })}
                />
              </div>
              <div className={col.field}>
                <span className={col.fieldLabel}>Тип</span>
                <select
                  className={col.select}
                  value={c.type}
                  onChange={(e) => updateCol(idx, { type: e.target.value as FormColumnType })}
                >
                  <option value="text">Текст</option>
                  <option value="number">Число</option>
                  <option value="date">Дата</option>
                  <option value="percent">%</option>
                  <option value="checkbox">Да/нет</option>
                </select>
              </div>
              <label className={col.required}>
                <input
                  type="checkbox"
                  checked={c.required !== false}
                  onChange={(e) => updateCol(idx, { required: e.target.checked })}
                />
                Обяз.
              </label>
              <button
                type="button"
                className={col.deleteBtn}
                onClick={() => onChange(columns.filter((_, i) => i !== idx))}
                title="Удалить столбец"
                aria-label="Удалить столбец"
              >
                ×
              </button>
            </div>
          ))}
      {!readOnly ? (
        <button type="button" className={col.addBtn} onClick={() => onChange([...columns, newColumn()])}>
          + Столбец
        </button>
      ) : null}
    </div>
  );
}
