import { getHoverTooltipPreset, HoverTooltip } from "../HoverTooltip";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { MessengerPeer } from "../../types/messenger";
import type { MessengerThemeStyles } from "./messengerTypes";

type Props = {
  peers: MessengerPeer[];
  styles: MessengerThemeStyles;
  isDark: boolean;
  isV2: boolean;
  inviteCopied: boolean;
  invitePasteField: string;
  invitePasteError: string | null;
  invitePasteApplied: boolean;
  newName: string;
  newRole: string;
  onClose: () => void;
  onCopyInviteLink: () => void;
  onInvitePasteChange: (value: string) => void;
  onClearInvitePasteError: () => void;
  onApplyPastedInvite: () => void;
  onNewNameChange: (value: string) => void;
  onNewRoleChange: (value: string) => void;
  onAddPeer: () => void;
  onRemovePeer: (id: string) => void;
};

export default function MessengerPeerSettingsDialog({
  peers,
  styles,
  isDark,
  isV2,
  inviteCopied,
  invitePasteField,
  invitePasteError,
  invitePasteApplied,
  newName,
  newRole,
  onClose,
  onCopyInviteLink,
  onInvitePasteChange,
  onClearInvitePasteError,
  onApplyPastedInvite,
  onNewNameChange,
  onNewRoleChange,
  onAddPeer,
  onRemovePeer,
}: Props) {
  const tooltipPreset = getHoverTooltipPreset(isDark);

  return (
    <div
      role="presentation"
      className={cx(isV2 && "messenger-v2__overlay")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="messenger-peer-settings-title"
        className={cx(isV2 && "messenger-v2__dialog")}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(560px, calc(100vh - 32px))",
          overflow: "auto",
          borderRadius: 22,
          padding: "22px 20px 20px",
          background: styles.cardBg,
          color: styles.text,
          boxShadow: styles.cardShadow,
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.25)",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 id="messenger-peer-settings-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Настройки списка
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: styles.muted }}>
              Добавляйте и удаляйте собеседников здесь.
            </p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose} style={iconBtnStyle(styles, isDark)}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: "14px 14px",
            borderRadius: 14,
            background: styles.sectionBg,
            border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.22)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 8 }}>
            ПРИГЛАШЕНИЕ ПО ССЫЛКЕ
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12, lineHeight: 1.55, color: styles.muted }}>
            Скопируйте свою ссылку и отправьте другу — или вставьте ссылку друга ниже, чтобы добавить его к себе.
          </p>
          <button type="button" onClick={onCopyInviteLink} style={primaryBtnStyle(styles)}>
            {inviteCopied ? "Ссылка скопирована" : "Скопировать ссылку-приглашение"}
          </button>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>
            Ссылка друга (вставить)
          </label>
          <textarea
            value={invitePasteField}
            onChange={(e) => {
              onInvitePasteChange(e.target.value);
              onClearInvitePasteError();
            }}
            placeholder="Вставьте ссылку из буфера: Ctrl+V"
            rows={3}
            style={inputStyle(styles)}
          />
          {invitePasteError ? (
            <p style={{ margin: "0 0 8px", fontSize: 12, lineHeight: 1.45, color: "#f87171" }}>{invitePasteError}</p>
          ) : null}
          <button
            type="button"
            onClick={onApplyPastedInvite}
            disabled={!invitePasteField.trim()}
            style={{
              ...primaryBtnStyle(styles),
              cursor: invitePasteField.trim() ? "pointer" : "not-allowed",
              opacity: invitePasteField.trim() ? 1 : 0.5,
            }}
          >
            {invitePasteApplied ? "Друг добавлен в список" : "Добавить друга по вставленной ссылке"}
          </button>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 8 }}>
          НОВЫЙ КОНТАКТ
        </div>
        <input type="text" value={newName} onChange={(e) => onNewNameChange(e.target.value)} placeholder="Имя" style={{ ...inputStyle(styles), marginBottom: 8 }} />
        <input
          type="text"
          value={newRole}
          onChange={(e) => onNewRoleChange(e.target.value)}
          placeholder="Роль (необязательно)"
          style={{ ...inputStyle(styles), marginBottom: 12 }}
        />
        <button
          type="button"
          onClick={onAddPeer}
          disabled={!newName.trim()}
          style={{
            ...primaryBtnStyle(styles),
            marginBottom: 20,
            cursor: newName.trim() ? "pointer" : "not-allowed",
            opacity: newName.trim() ? 1 : 0.45,
          }}
        >
          Добавить собеседника
        </button>

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 10 }}>
          ТЕКУЩИЙ СПИСОК
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {peers.map((peer) => (
            <div
              key={peer.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 14,
                background: styles.sectionBg,
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.2)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{peer.name}</div>
                <div style={{ fontSize: 11, color: styles.muted, fontWeight: 600, marginTop: 2 }}>{peer.role}</div>
              </div>
              <HoverTooltip preset={tooltipPreset} isDark={isDark} content={<span>Удалить из списка</span>} wrapperStyle={{ flexShrink: 0 }}>
                <button type="button" aria-label={`Удалить ${peer.name}`} onClick={() => onRemovePeer(peer.id)} style={iconBtnStyle(styles, isDark)}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                </button>
              </HoverTooltip>
            </div>
          ))}
        </div>

        <button type="button" onClick={onClose} style={primaryBtnStyle(styles)}>
          Готово
        </button>
      </div>
    </div>
  );
}

function inputStyle(styles: MessengerThemeStyles) {
  return {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    fontSize: 13,
    fontFamily: "inherit",
    color: styles.text,
    background: styles.inputBg,
    boxShadow: styles.insetShadow,
    outline: "none",
  };
}

function primaryBtnStyle(styles: MessengerThemeStyles) {
  return {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    fontSize: 14,
    fontFamily: "inherit",
    cursor: "pointer",
    color: styles.buttonText,
    background: styles.buttonBg,
    boxShadow: styles.insetShadow,
    marginBottom: 14,
  };
}

function iconBtnStyle(styles: MessengerThemeStyles, isDark: boolean) {
  return {
    width: 30,
    height: 30,
    boxSizing: "border-box" as const,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    padding: 0,
    margin: 0,
    color: styles.muted,
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.15)",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
  };
}
