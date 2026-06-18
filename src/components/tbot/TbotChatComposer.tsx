import type { TbotTheme } from "./tbotTheme";

type Props = {
  isDark: boolean;
  theme: TbotTheme;
  draft: string;
  setDraft: (value: string) => void;
  pending: boolean;
  send: () => void;
};

export function TbotChatComposer({ isDark, theme, draft, setDraft, pending, send }: Props) {
  const { muted, text, insetShadow } = theme;

  return (
    <div
      style={{
        padding: "14px 14px 16px",
        borderTop: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.22)"}`,
        background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.95)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          padding: "4px 4px 4px 14px",
          borderRadius: 16,
          background: isDark ? "rgba(30, 41, 59, 0.65)" : "#fff",
          boxShadow: insetShadow,
          border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(148, 163, 184, 0.25)"}`,
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Сообщение для Т-бота…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          style={{
            flex: 1,
            resize: "none",
            border: "none",
            borderRadius: 12,
            padding: "10px 0",
            minHeight: 44,
            maxHeight: 120,
            fontSize: 14,
            fontFamily: "inherit",
            color: text,
            background: "transparent",
            outline: "none",
            lineHeight: 1.45,
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || pending}
          aria-label="Отправить"
          style={{
            alignSelf: "stretch",
            minWidth: 48,
            margin: 4,
            border: "none",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 18,
            cursor: draft.trim() && !pending ? "pointer" : "not-allowed",
            opacity: draft.trim() && !pending ? 1 : 0.4,
            background:
              draft.trim() && !pending
                ? "linear-gradient(145deg, #2563eb 0%, #4f46e5 100%)"
                : isDark
                  ? "rgba(71, 85, 105, 0.5)"
                  : "rgba(148, 163, 184, 0.4)",
            color: "#f8fafc",
            fontFamily: "inherit",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            boxShadow: draft.trim() && !pending ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
          }}
        >
          ➤
        </button>
      </div>
      <div
        style={{
          fontSize: 10,
          color: muted,
          marginTop: 10,
          paddingLeft: 4,
          fontWeight: 600,
          lineHeight: 1.45,
          padding: "8px 10px",
          borderRadius: 12,
          background: isDark ? "rgba(30, 41, 59, 0.35)" : "rgba(241, 245, 249, 0.85)",
          border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(148, 163, 184, 0.2)"}`,
        }}
      >
        Enter — отправить · Shift+Enter — новая строка
      </div>
    </div>
  );
}
