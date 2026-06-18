import type { RefObject } from "react";
import { formatMsgTime, type TbotMsg } from "./tbotConstants";
import type { TbotTheme } from "./tbotTheme";

type Props = {
  isDark: boolean;
  theme: TbotTheme;
  messages: TbotMsg[];
  pending: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  listEndRef: RefObject<HTMLDivElement | null>;
  updateScrollState: () => void;
  showJumpLatest: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

export function TbotMessageList({
  isDark,
  theme,
  messages,
  pending,
  scrollRef,
  listEndRef,
  updateScrollState,
  showJumpLatest,
  scrollToBottom,
}: Props) {
  const { muted, text, userBubble, aiBubbleBg, aiBubbleBorder } = theme;

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 220, display: "flex", flexDirection: "column" }}>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px 14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          scrollbarWidth: "thin",
          scrollbarColor: isDark ? "rgba(56,189,248,0.35) transparent" : "rgba(100,116,139,0.4) transparent",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: muted,
            marginBottom: 4,
          }}
        >
          Диалог · ТрассА
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.role === "user" ? "flex-end" : "flex-start",
              gap: 6,
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
                maxWidth: "94%",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  background:
                    m.role === "user"
                      ? isDark
                        ? "rgba(96, 165, 250, 0.25)"
                        : "rgba(37, 99, 235, 0.15)"
                      : isDark
                        ? "rgba(56, 189, 248, 0.15)"
                        : "rgba(59, 130, 246, 0.12)",
                  color: m.role === "user" ? "#bfdbfe" : "#38bdf8",
                  border: `1px solid ${m.role === "user" ? "rgba(96,165,250,0.3)" : "rgba(56,189,248,0.25)"}`,
                }}
              >
                {m.role === "user" ? "Вы" : "Т"}
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: m.role === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                  background: m.role === "user" ? userBubble : aiBubbleBg,
                  color: m.role === "user" ? "#f8fafc" : text,
                  border: m.role === "user" ? "none" : aiBubbleBorder,
                  fontSize: 14,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow:
                    m.role === "user"
                      ? "0 8px 24px rgba(37, 99, 235, 0.25)"
                      : isDark
                        ? "0 4px 16px rgba(0,0,0,0.2)"
                        : "0 4px 14px rgba(15, 23, 42, 0.06)",
                }}
              >
                {m.text}
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                color: muted,
                paddingLeft: m.role === "user" ? 0 : 36,
                paddingRight: m.role === "user" ? 36 : 0,
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {formatMsgTime(m.ts)}
            </div>
          </div>
        ))}

        {pending ? (
          <div
            style={{
              alignSelf: "flex-start",
              marginLeft: 36,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 16,
              background: isDark ? "rgba(30, 41, 59, 0.85)" : "rgba(241, 245, 249, 0.95)",
              border: aiBubbleBorder,
            }}
          >
            <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>Т-бот печатает</span>
            <span className="tbot-typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <style>{`
              .tbot-typing-dots { display: inline-flex; gap: 4px; align-items: center; }
              .tbot-typing-dots span {
                width: 6px; height: 6px; border-radius: 50%;
                background: ${isDark ? "#38bdf8" : "#3b82f6"};
                animation: tbot-dot 1.2s ease-in-out infinite;
              }
              .tbot-typing-dots span:nth-child(2) { animation-delay: 0.15s; }
              .tbot-typing-dots span:nth-child(3) { animation-delay: 0.3s; }
              @keyframes tbot-dot {
                0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
                30% { opacity: 1; transform: translateY(-3px); }
              }
            `}</style>
          </div>
        ) : null}
        <div ref={listEndRef} style={{ height: 1, flexShrink: 0 }} />
      </div>

      {showJumpLatest ? (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3,
            border: "none",
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            color: "#f8fafc",
            background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
            boxShadow: "0 8px 20px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>↓</span>
          К последнему
        </button>
      ) : null}
    </div>
  );
}
