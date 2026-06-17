import { cx } from "../../design-system/cabinetChromeClasses";
import type { MessengerMessage, MessengerPeer } from "../../types/messenger";
import type { MessengerThemeStyles } from "./messengerTypes";

type Props = {
  message: MessengerMessage;
  peers: MessengerPeer[];
  activeId: string;
  styles: MessengerThemeStyles;
  isDark: boolean;
  isV2: boolean;
  onClose: () => void;
  onForwardTo: (message: MessengerMessage, targetThreadId: string) => void;
};

export default function MessengerForwardDialog({
  message,
  peers,
  activeId,
  styles,
  isDark,
  isV2,
  onClose,
  onForwardTo,
}: Props) {
  const otherPeers = peers.filter((peer) => peer.id !== activeId);

  return (
    <div
      role="presentation"
      className={cx(isV2 && "messenger-v2__overlay")}
      style={overlayStyle(isDark)}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="messenger-forward-title"
        className={cx(isV2 && "messenger-v2__dialog")}
        onClick={(e) => e.stopPropagation()}
        style={dialogStyle(styles, isDark)}
      >
        <div style={{ position: "relative", marginBottom: 14, paddingRight: 36 }}>
          <button type="button" aria-label="Закрыть" onClick={onClose} style={closeBtnStyle(styles, isDark)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <h2 id="messenger-forward-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, paddingRight: 4 }}>
            Переслать в чат
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: styles.muted }}>
            Выберите собеседника — сообщение появится у вас в том диалоге.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {otherPeers.length === 0 ? (
            <div style={{ fontSize: 13, color: styles.muted, fontWeight: 600, padding: "12px 0", textAlign: "center" }}>
              Нет других диалогов — добавьте контакт в настройках.
            </div>
          ) : (
            otherPeers.map((peer) => (
              <button
                key={peer.id}
                type="button"
                onClick={() => onForwardTo(message, peer.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.22)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  background: styles.sectionBg,
                  color: styles.text,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>{peer.name}</div>
                <div style={{ fontSize: 11, color: styles.muted, fontWeight: 600, marginTop: 2 }}>{peer.role}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function overlayStyle(isDark: boolean) {
  return {
    position: "fixed" as const,
    inset: 0,
    zIndex: 12002,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };
}

function dialogStyle(styles: MessengerThemeStyles, isDark: boolean) {
  return {
    width: "min(400px, 100%)",
    maxHeight: "min(420px, calc(100vh - 32px))",
    overflow: "auto" as const,
    borderRadius: 22,
    padding: "20px 18px 18px",
    background: styles.cardBg,
    color: styles.text,
    boxShadow: styles.cardShadow,
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.25)",
    fontFamily: "inherit",
  };
}

function closeBtnStyle(styles: MessengerThemeStyles, isDark: boolean) {
  return {
    position: "absolute" as const,
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    boxSizing: "border-box" as const,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    padding: 0,
    margin: 0,
    color: styles.muted,
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    zIndex: 1,
  };
}
