import type { CSSProperties, PointerEvent, RefObject } from "react";
import { getHoverTooltipPreset, HoverTooltip } from "../HoverTooltip";
import type { MessengerAttachment, MessengerMessage, MessengerPeer } from "../../types/messenger";
import type { MessengerThemeStyles } from "./messengerTypes";
import MessengerMessageBubble from "./MessengerMessageBubble";

type Props = {
  peers: MessengerPeer[];
  activePeer?: MessengerPeer;
  activeId: string;
  messages: MessengerMessage[];
  visibleMessages: MessengerMessage[];
  myAuthorId: string;
  msgMenuId: string | null;
  draft: string;
  pendingAttachments: MessengerAttachment[];
  styles: MessengerThemeStyles;
  isDark: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  listEndRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onFilesSelected: (list: FileList | null) => void;
  onRemovePendingAttachment: (id: string) => void;
  onSend: () => void;
  onBubblePointerDown: (e: PointerEvent, message: MessengerMessage) => void;
  onBubblePointerMove: (e: PointerEvent) => void;
  onBubblePointerEnd: () => void;
  onCopy: (message: MessengerMessage) => void;
  onForward: (message: MessengerMessage) => void;
  onHideForMe: (threadId: string, messageId: string) => void;
  onDeleteForEveryone: (threadId: string, messageId: string) => void;
  formatTime: (iso: string) => string;
};

export default function MessengerThreadPanel({
  peers,
  activePeer,
  activeId,
  messages,
  visibleMessages,
  myAuthorId,
  msgMenuId,
  draft,
  pendingAttachments,
  styles,
  isDark,
  fileInputRef,
  listEndRef,
  onDraftChange,
  onFilesSelected,
  onRemovePendingAttachment,
  onSend,
  onBubblePointerDown,
  onBubblePointerMove,
  onBubblePointerEnd,
  onCopy,
  onForward,
  onHideForMe,
  onDeleteForEveryone,
  formatTime,
}: Props) {
  const tooltipPreset = getHoverTooltipPreset(isDark);

  const hintBox: CSSProperties = {
    fontSize: 10,
    color: styles.muted,
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 12,
    fontWeight: 600,
    lineHeight: 1.45,
    background: isDark ? "rgba(30, 41, 59, 0.35)" : "rgba(241, 245, 249, 0.85)",
    border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(148, 163, 184, 0.2)"}`,
  };

  if (peers.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: "48px 28px",
          textAlign: "center",
          color: styles.muted,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.55,
          background: styles.sectionBg,
        }}
      >
        Список собеседников пуст. Нажмите шестерёнку выше и добавьте контакт — затем можно писать и прикреплять файлы.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: "20px 24px",
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.2)",
          background: styles.cardBg,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, color: styles.text }}>{activePeer?.name ?? "—"}</div>
        <div style={{ fontSize: 12, color: styles.muted, fontWeight: 600, marginTop: 4 }}>
          {activePeer?.role ?? ""}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: styles.sectionBg,
        }}
      >
        {visibleMessages.length === 0 ? (
          <div style={{ color: styles.muted, fontSize: 14, textAlign: "center", marginTop: 40 }}>
            {messages.length > 0
              ? "Все сообщения в этом диалоге скрыты у вас или удалены."
              : "Напишите первое сообщение или прикрепите файл."}
          </div>
        ) : (
          visibleMessages.map((message) => (
            <MessengerMessageBubble
              key={message.id}
              message={message}
              mine={message.author === myAuthorId}
              menuOpen={msgMenuId === message.id}
              styles={styles}
              isDark={isDark}
              activeThreadId={activeId}
              formattedTime={formatTime(message.createdAt)}
              onPointerDown={onBubblePointerDown}
              onPointerMove={onBubblePointerMove}
              onPointerEnd={onBubblePointerEnd}
              onCopy={onCopy}
              onForward={onForward}
              onHideForMe={onHideForMe}
              onDeleteForEveryone={onDeleteForEveryone}
            />
          ))
        )}
        <div ref={listEndRef} />
      </div>

      <div
        style={{
          padding: "16px 20px 20px",
          borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.2)",
          background: styles.cardBg,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.rtf,application/pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => onFilesSelected(e.target.files)}
        />

        {pendingAttachments.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {pendingAttachments.map((attachment) => (
              <span
                key={attachment.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: isDark ? "rgba(79, 128, 243, 0.15)" : "rgba(36, 59, 116, 0.08)",
                  border: `1px solid ${isDark ? "rgba(79, 128, 243, 0.3)" : "rgba(36, 59, 116, 0.2)"}`,
                  color: styles.text,
                  maxWidth: "100%",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {attachment.kind === "image" ? "🖼 " : "📎 "}
                  {attachment.name}
                </span>
                <button
                  type="button"
                  aria-label="Убрать вложение"
                  onClick={() => onRemovePendingAttachment(attachment.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: styles.muted,
                    cursor: "pointer",
                    padding: 0,
                    margin: 0,
                    width: 22,
                    height: 22,
                    fontSize: 16,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontFamily: "inherit",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <HoverTooltip
            preset={tooltipPreset}
            isDark={isDark}
            content={<span>Прикрепить фото или документ</span>}
            wrapperStyle={{ flexShrink: 0, display: "flex", alignItems: "flex-end" }}
          >
            <button
              type="button"
              aria-label="Прикрепить файл"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 46,
                height: 46,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148, 163, 184, 0.35)"}`,
                borderRadius: 16,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: styles.muted,
              }}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </HoverTooltip>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Введите сообщение…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            style={{
              flex: 1,
              resize: "none",
              minHeight: 44,
              maxHeight: 120,
              padding: "12px 14px",
              borderRadius: 16,
              border: "none",
              fontSize: 14,
              color: styles.text,
              background: styles.inputBg,
              boxShadow: styles.insetShadow,
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.45,
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!draft.trim() && pendingAttachments.length === 0}
            style={{
              border: "none",
              cursor: draft.trim() || pendingAttachments.length > 0 ? "pointer" : "not-allowed",
              opacity: draft.trim() || pendingAttachments.length > 0 ? 1 : 0.45,
              borderRadius: 999,
              padding: "12px 22px",
              fontWeight: 800,
              fontSize: 14,
              color: styles.buttonText,
              background: styles.buttonBg,
              boxShadow: styles.insetShadow,
              fontFamily: "inherit",
              flexShrink: 0,
              alignSelf: "center",
            }}
          >
            Отправить
          </button>
        </div>
        <div style={hintBox}>
          Enter — отправить · Shift+Enter — новая строка · удерживайте сообщение — меню · вложения до ~1,8 МБ каждое
        </div>
      </div>
    </>
  );
}
