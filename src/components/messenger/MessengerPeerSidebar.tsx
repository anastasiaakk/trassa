import { getHoverTooltipPreset, HoverTooltip } from "../HoverTooltip";
import type { MessengerPeer } from "../../types/messenger";
import type { MessengerThemeStyles } from "./messengerTypes";

type Props = {
  peers: MessengerPeer[];
  activeId: string;
  byThread: Record<string, { id: string; author: string; text: string; attachments?: { kind: string; name: string }[] }[]>;
  hiddenForMe: Record<string, string[]>;
  myAuthorId: string;
  styles: MessengerThemeStyles;
  isDark: boolean;
  narrow: boolean;
  peerSettingsOpen: boolean;
  onSelectPeer: (id: string) => void;
  onOpenSettings: () => void;
};

export default function MessengerPeerSidebar({
  peers,
  activeId,
  byThread,
  hiddenForMe,
  myAuthorId,
  styles,
  isDark,
  narrow,
  peerSettingsOpen,
  onSelectPeer,
  onOpenSettings,
}: Props) {
  const tooltipPreset = getHoverTooltipPreset(isDark);

  return (
    <aside
      style={{
        borderRight: narrow ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.25)",
        borderBottom: narrow
          ? isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(148,163,184,0.25)"
          : "none",
        display: "flex",
        flexDirection: "column",
        background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.35)",
        maxHeight: narrow ? 320 : undefined,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "22px 20px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.2)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: styles.muted, marginBottom: 6 }}>
            ДИАЛОГИ
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: styles.text }}>Собеседники</h2>
          <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: styles.muted }}>
            Выберите контакт для переписки. Добавить или убрать людей можно в настройках списка.
          </p>
        </div>
        <HoverTooltip
          preset={tooltipPreset}
          isDark={isDark}
          content={<span style={{ whiteSpace: "nowrap" }}>Настроить список собеседников</span>}
          wrapperStyle={{ flexShrink: 0 }}
        >
          <button
            type="button"
            aria-label="Настройки списка собеседников"
            aria-expanded={peerSettingsOpen}
            onClick={onOpenSettings}
            style={{
              width: 42,
              height: 42,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.35)"}`,
              borderRadius: 14,
              background: styles.inputBg,
              boxShadow: styles.insetShadow,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              color: styles.muted,
              flexShrink: 0,
            }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </HoverTooltip>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: narrow ? 0 : undefined,
        }}
      >
        {peers.map((peer) => {
          const active = peer.id === activeId;
          const threadMsgs = byThread[peer.id] ?? [];
          const hide = new Set(hiddenForMe[peer.id] ?? []);
          const visibleThread = threadMsgs.filter((message) => !hide.has(message.id));
          const last = visibleThread.slice(-1)[0];
          const preview =
            last && last.text.trim()
              ? last.text
              : last?.attachments?.length
                ? last.attachments[0].kind === "image"
                  ? "📷 Фото"
                  : `📎 ${last.attachments[0].name}`
                : "";
          return (
            <button
              key={peer.id}
              type="button"
              onClick={() => onSelectPeer(peer.id)}
              style={{
                width: "100%",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: 18,
                padding: "14px 14px",
                fontFamily: "inherit",
                background: active ? styles.cardBg : "transparent",
                boxShadow: active ? styles.insetShadow : "none",
                color: styles.text,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                transition: "background 0.15s ease",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 14 }}>{peer.name}</span>
              <span style={{ fontSize: 11, color: styles.muted, fontWeight: 600 }}>{peer.role}</span>
              {last && preview ? (
                <span
                  style={{
                    fontSize: 11,
                    color: styles.muted,
                    marginTop: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: 0.9,
                  }}
                >
                  {last.author === myAuthorId ? "Вы: " : ""}
                  {preview}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
