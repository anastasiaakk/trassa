import styles from "./AdminGlass.module.css";

export type GlassSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: readonly GlassSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  tone?: "dark" | "map";
};

export default function GlassSegment<T extends string>({
  options,
  value,
  onChange,
  label,
  tone = "dark",
}: Props<T>) {
  const map = tone === "map";
  return (
    <div className={styles.glassSegmentBlock}>
      {label ? (
        <span className={`${styles.glassCardLabel} ${map ? styles.glassCardLabelMap : ""}`}>
          {label}
        </span>
      ) : null}
      <div
        className={`${styles.glassSegment} ${map ? styles.glassSegmentMap : ""}`}
        role="group"
        aria-label={label}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`${styles.glassSegmentBtn} ${value === opt.value ? styles.glassSegmentBtnActive : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
