import { useEffect, useState } from "react";
import { fetchPublicSpecializations } from "../api/specializationsApi";
import { isAuthApiEnabled } from "../utils/authMode";
import { loadActiveSpecializations, type Specialization } from "../utils/specializationsStorage";
import styles from "../pages/Page3.module.css";

type Props = {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  required?: boolean;
};

export default function SpecializationPicker({
  value,
  onChange,
  disabled = false,
  label = "Спецификация",
  hint = "Выберите направление — от этого зависит подгруппа в системе распределения.",
  required = true,
}: Props) {
  const [list, setList] = useState<Specialization[]>(() => loadActiveSpecializations());

  useEffect(() => {
    if (!isAuthApiEnabled()) return;
    void fetchPublicSpecializations().then((r) => {
      if (r.ok && r.specializations.length > 0) {
        setList(r.specializations);
      }
    });
    const onChangeList = () => setList(loadActiveSpecializations());
    window.addEventListener("trassa-specializations-changed", onChangeList);
    return () => window.removeEventListener("trassa-specializations-changed", onChangeList);
  }, []);

  if (list.length === 0) {
    return (
      <p className={styles.loginHint} role="status">
        Список спецификаций пуст. Администратор должен добавить направления в панели управления.
      </p>
    );
  }

  return (
    <div className={styles.loginProfileBlock}>
      <span className={styles.loginLabel} id="spec-picker-label">
        {label}
        {required ? " *" : ""}
      </span>
      {hint ? <p className={styles.loginHint}>{hint}</p> : null}
      <div
        className={`${styles.loginProfileRow} ${styles.loginProfileRowSpec}`}
        role="radiogroup"
        aria-labelledby="spec-picker-label"
      >
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={value === s.id}
            disabled={disabled}
            className={`${styles.loginProfileBtn} ${value === s.id ? styles.loginProfileBtnActive : ""}`}
            onClick={() => onChange(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}
