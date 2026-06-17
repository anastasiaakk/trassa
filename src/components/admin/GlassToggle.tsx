import styles from "./AdminGlass.module.css";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  subLabel?: string;
  id?: string;
  disabled?: boolean;
  tone?: "dark" | "map";
};

export default function GlassToggle({
  checked,
  onChange,
  label,
  subLabel,
  id,
  disabled = false,
  tone = "dark",
}: Props) {
  const inputId = id ?? `glass-toggle-${label.replace(/\s+/g, "-")}`;
  return (
    <label
      className={`${styles.glassToggleRow} ${tone === "map" ? styles.glassToggleRowMap : ""}`}
      htmlFor={inputId}
    >
      <span className={styles.glassToggleText}>
        <span className={styles.glassToggleLabel}>{label}</span>
        {subLabel ? <span className={styles.glassToggleSub}>{subLabel}</span> : null}
      </span>
      <span className={styles.glassToggleTrack}>
        <input
          id={inputId}
          type="checkbox"
          className={styles.glassToggleInput}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.glassToggleThumb} aria-hidden />
      </span>
    </label>
  );
}
