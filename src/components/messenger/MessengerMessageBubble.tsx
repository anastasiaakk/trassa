import type { CSSProperties, PointerEvent } from "react";
import type { MessengerMessage } from "../../types/messenger";
import type { MessengerThemeStyles } from "./messengerTypes";

type Props = {
  message: MessengerMessage;
  mine: boolean;
  menuOpen: boolean;
  styles: MessengerThemeStyles;
  isDark: boolean;
  activeThreadId: string;
  formattedTime: string;
  onPointerDown: (e: PointerEvent, message: MessengerMessage) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerEnd: () => void;
  onCopy: (message: MessengerMessage) => void;
  onForward: (message: MessengerMessage) => void;
  onHideForMe: (threadId: string, messageId: string) => void;
  onDeleteForEveryone: (threadId: string, messageId: string) => void;
};

export default function MessengerMessageBubble({
  message,
  mine,
  menuOpen,
  styles,
  isDark,
  activeThreadId,
  formattedTime,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onCopy,
  onForward,
  onHideForMe,
  onDeleteForEveryone,
}: Props) {
  const menuBg = isDark ? "rgba(30, 41, 59, 0.98)" : "#ffffff";
  const menuBorder = isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(148, 163, 184, 0.35)";

  return (
    <div
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "min(100%, 420px)",
        position: "relative",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          role="group"
          aria-label="Сообщение, удерживайте для меню"
          onPointerDown={(e) => onPointerDown(e, message)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            padding: "12px 16px",
            borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: mine
              ? "linear-gradient(145deg, #2b64fd 0%, #5a86fd 100%)"
              : isDark
                ? "rgba(148, 163, 184, 0.14)"
                : "rgba(100, 116, 139, 0.12)",
            color: mine ? "#f8fafc" : styles.text,
            boxShadow: mine ? "0 8px 20px rgba(36, 59, 116, 0.25)" : styles.insetShadow,
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            minWidth: 0,
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {message.attachments?.length ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: message.text.trim() ? 10 : 0,
              }}
            >
              {message.attachments.map((attachment) =>
                attachment.kind === "image" && attachment.dataUrl ? (
                  <img
                    key={attachment.id}
                    src={attachment.dataUrl}
                    alt={attachment.name}
                    draggable={false}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 12,
                      display: "block",
                      objectFit: "cover",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <div
                    key={attachment.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: mine
                        ? "rgba(15, 23, 42, 0.25)"
                        : isDark
                          ? "rgba(15,23,42,0.35)"
                          : "rgba(241,245,249,0.95)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: mine ? "#e2e8f0" : styles.text,
                    }}
                  >
                    <span aria-hidden>📎</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{attachment.name}</span>
                  </div>
                ),
              )}
            </div>
          ) : null}
          {message.text.trim() ? message.text : null}
        </div>
        {menuOpen ? (
          <div
            role="menu"
            data-messenger-msg-menu-root
            style={{
              position: "absolute",
              top: "100%",
              marginTop: 6,
              [mine ? "right" : "left"]: 0,
              zIndex: 25,
              minWidth: 216,
              padding: 6,
              borderRadius: 14,
              background: menuBg,
              border: `1px solid ${menuBorder}`,
              boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.45)" : "0 12px 32px rgba(15,23,42,0.12)",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onCopy(message)}
              style={menuItemStyle(styles.text)}
            >
              Скопировать
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onForward(message)}
              style={menuItemStyle(styles.text)}
            >
              Переслать
            </button>
            <div
              style={{
                height: 1,
                margin: "4px 8px",
                background: isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.25)",
              }}
            />
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onHideForMe(activeThreadId, message.id)}
              style={menuItemStyle(styles.text)}
            >
              Удалить у меня
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onDeleteForEveryone(activeThreadId, message.id)}
              style={{
                ...menuItemStyle("#f87171"),
                background: isDark ? "rgba(248, 113, 113, 0.12)" : "rgba(248, 113, 113, 0.14)",
                marginTop: 2,
              }}
            >
              Удалить у всех
            </button>
          </div>
        ) : null}
      </div>
      <div
        style={{
          fontSize: 10,
          color: styles.muted,
          marginTop: 6,
          textAlign: mine ? "right" : "left",
          paddingLeft: mine ? 0 : 4,
          paddingRight: mine ? 4 : 0,
        }}
      >
        {formattedTime}
      </div>
    </div>
  );
}

function menuItemStyle(color: string): CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    background: "transparent",
    color,
  };
}
