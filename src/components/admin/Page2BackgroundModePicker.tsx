import type { Page2BackgroundMode } from "../../design-system/page2BackgroundMode";
import styles from "./Page2BackgroundModePicker.module.css";

const OPTIONS: { id: Page2BackgroundMode; label: string; hint: string }[] = [
  {
    id: "video",
    label: "Видео (оригинал)",
    hint: "Файл page2-bg.mov — «плывущие» линии как сейчас.",
  },
  {
    id: "lines",
    label: "Линии (лёгкая)",
    hint: "SVG-анимация в палитре ТрассА, без загрузки видео.",
  },
  {
    id: "off",
    label: "Без анимации",
    hint: "Только спокойная светлая заливка, без видео и линий.",
  },
];

type Props = {
  value: Page2BackgroundMode;
  onChange: (mode: Page2BackgroundMode) => void;
  tone?: "dark" | "map";
  name?: string;
};

export default function Page2BackgroundModePicker({
  value,
  onChange,
  tone = "dark",
  name = "page2-bg-mode",
}: Props) {
  return (
    <fieldset className={`${styles.fieldset} ${tone === "map" ? styles.fieldsetMap : ""}`}>
      <legend className={styles.legend}>Фон карты (/services и админка)</legend>
      <div className={styles.list}>
        {OPTIONS.map((opt) => {
          const checked = value === opt.id;
          return (
            <label
              key={opt.id}
              className={`${styles.option} ${checked ? styles.optionChecked : ""}`}
            >
              <input
                type="radio"
                className={styles.input}
                name={name}
                value={opt.id}
                checked={checked}
                onChange={() => onChange(opt.id)}
              />
              <span className={styles.copy}>
                <span className={styles.label}>{opt.label}</span>
                <span className={styles.hint}>{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
