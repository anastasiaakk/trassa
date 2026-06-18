import type { RefObject } from "react";
import { BUBBLE } from "./tbotConstants";
import type { TbotTheme } from "./tbotTheme";

type Props = {
  tipToast: { title: string; text: string };
  setTipToast: (value: { title: string; text: string } | null) => void;
  tipToastTimerRef: RefObject<number | undefined>;
  pos: { left: number; top: number };
  isDark: boolean;
  theme: TbotTheme;
};

export function TbotTipToast({ tipToast, setTipToast, tipToastTimerRef, pos, isDark, theme }: Props) {
  const { muted, text } = theme;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: BUBBLE,
        height: BUBBLE,
        zIndex: 10042,
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            right: "calc(100% + 12px)",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 3,
            width: "max-content",
            maxWidth: "min(268px, calc(100vw - 88px))",
            padding: "10px 30px 10px 12px",
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.45,
            color: text,
            background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
            border: isDark ? "1px solid rgba(56, 189, 248, 0.28)" : "1px solid rgba(148, 163, 184, 0.4)",
            boxShadow: isDark
              ? "0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(56,189,248,0.12)"
              : "0 12px 28px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: muted, marginBottom: 4 }}>
            {tipToast.title}
          </div>
          <div style={{ wordBreak: "break-word" }}>{tipToast.text}</div>
          <button
            type="button"
            aria-label="Закрыть уведомление"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
              tipToastTimerRef.current = undefined;
              setTipToast(null);
            }}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 20,
              height: 20,
              boxSizing: "border-box",
              border: "none",
              borderRadius: 6,
              padding: 0,
              margin: 0,
              cursor: "pointer",
              background: isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)",
              color: muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
