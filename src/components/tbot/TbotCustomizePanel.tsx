import type { TBotAppearance } from "../tbotAppearance";
import { ACCESSORY_OPTIONS } from "./tbotConstants";
import type { TbotTheme } from "./tbotTheme";

type Props = {
  isDark: boolean;
  theme: TbotTheme;
  appearance: TBotAppearance;
  patchAppearance: (patch: Partial<TBotAppearance>) => void;
};

export function TbotCustomizePanel({ isDark, theme, appearance, patchAppearance }: Props) {
  const { muted, text } = theme;

  return (
    <div
      role="region"
      aria-label="Настройки внешнего вида Т-бота"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        padding: "12px 14px 14px",
        borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)"}`,
        flexShrink: 0,
        background: isDark ? "rgba(30, 41, 59, 0.55)" : "rgba(241, 245, 249, 0.95)",
        maxHeight: 220,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: muted,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Аксессуары
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ACCESSORY_OPTIONS.map((opt) => {
          const selected = appearance.accessory === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => patchAppearance({ accessory: opt.value })}
              style={{
                border: `1px solid ${
                  selected
                    ? isDark
                      ? "rgba(56, 189, 248, 0.55)"
                      : "rgba(37, 99, 235, 0.45)"
                    : isDark
                      ? "rgba(148,163,184,0.2)"
                      : "rgba(148,163,184,0.35)"
                }`,
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                background: selected
                  ? isDark
                    ? "rgba(56, 189, 248, 0.2)"
                    : "rgba(59, 130, 246, 0.14)"
                  : isDark
                    ? "rgba(15, 23, 42, 0.4)"
                    : "#fff",
                color: text,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
