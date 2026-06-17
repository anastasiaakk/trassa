import { memo, useMemo } from "react";
import type { Page5ThemeStyles } from "./Page5EventsView";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { useNarrowMessenger } from "../hooks/useNarrowMessenger";
import { useMessengerState } from "../hooks/useMessengerState";
import MessengerInviteToastBanner from "../components/messenger/MessengerInviteToastBanner";
import MessengerPeerSidebar from "../components/messenger/MessengerPeerSidebar";
import MessengerThreadPanel from "../components/messenger/MessengerThreadPanel";
import MessengerForwardDialog from "../components/messenger/MessengerForwardDialog";
import MessengerPeerSettingsDialog from "../components/messenger/MessengerPeerSettingsDialog";

export type { MessengerAttachment, MessengerMessage, MessengerPeer } from "../types/messenger";

type Props = {
  styles: Page5ThemeStyles;
  isDark: boolean;
  /** Маршрут кабинета для ссылки-приглашения, например /page5 или /page6 */
  cabinetPath?: string;
};

export const Page5MessengerView = memo(function Page5MessengerView({ styles, isDark, cabinetPath }: Props) {
  const isV2 = usePortalDesign() === "v2";
  const narrow = useNarrowMessenger();
  const m = useMessengerState(cabinetPath);

  const shellStyle = useMemo(
    () => ({
      borderRadius: 28,
      background: styles.sectionBg,
      boxShadow: styles.cardShadow,
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.88)",
      padding: 0,
      display: narrow ? ("flex" as const) : ("grid" as const),
      flexDirection: narrow ? ("column" as const) : undefined,
      gridTemplateColumns: narrow ? undefined : "minmax(240px, 320px) minmax(0, 1fr)",
      flex: 1,
      minHeight: 0,
      width: "100%",
      overflow: "hidden" as const,
    }),
    [styles, isDark, narrow],
  );

  return (
    <section className={cx(isV2 && "messenger-v2")} style={shellStyle}>
      {m.inviteToast ? (
        <MessengerInviteToastBanner toast={m.inviteToast} styles={styles} isDark={isDark} narrow={narrow} />
      ) : null}

      <MessengerPeerSidebar
        peers={m.peers}
        activeId={m.activeId}
        byThread={m.byThread}
        hiddenForMe={m.hiddenForMe}
        myAuthorId={m.myAuthorId}
        styles={styles}
        isDark={isDark}
        narrow={narrow}
        peerSettingsOpen={m.peerSettingsOpen}
        onSelectPeer={m.setActiveId}
        onOpenSettings={() => m.setPeerSettingsOpen(true)}
      />

      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, minWidth: 0 }}>
        <MessengerThreadPanel
          peers={m.peers}
          activePeer={m.activePeer}
          activeId={m.activeId}
          messages={m.messages}
          visibleMessages={m.visibleMessages}
          myAuthorId={m.myAuthorId}
          msgMenuId={m.msgMenuId}
          draft={m.draft}
          pendingAttachments={m.pendingAttachments}
          styles={styles}
          isDark={isDark}
          fileInputRef={m.fileInputRef}
          listEndRef={m.listEndRef}
          onDraftChange={m.setDraft}
          onFilesSelected={m.onFilesSelected}
          onRemovePendingAttachment={m.removePendingAttachment}
          onSend={m.send}
          onBubblePointerDown={m.onBubblePointerDown}
          onBubblePointerMove={m.onBubblePointerMove}
          onBubblePointerEnd={m.onBubblePointerEnd}
          onCopy={m.copyMessageToClipboard}
          onForward={(message) => {
            m.setForwardPickMsg(message);
            m.setMsgMenuId(null);
          }}
          onHideForMe={m.hideMessageForMe}
          onDeleteForEveryone={m.deleteMessageForEveryone}
          formatTime={m.formatTime}
        />
      </div>

      {m.forwardPickMsg ? (
        <MessengerForwardDialog
          message={m.forwardPickMsg}
          peers={m.peers}
          activeId={m.activeId}
          styles={styles}
          isDark={isDark}
          isV2={isV2}
          onClose={() => m.setForwardPickMsg(null)}
          onForwardTo={m.confirmForwardToPeer}
        />
      ) : null}

      {m.peerSettingsOpen ? (
        <MessengerPeerSettingsDialog
          peers={m.peers}
          styles={styles}
          isDark={isDark}
          isV2={isV2}
          inviteCopied={m.inviteCopied}
          invitePasteField={m.invitePasteField}
          invitePasteError={m.invitePasteError}
          invitePasteApplied={m.invitePasteApplied}
          newName={m.newName}
          newRole={m.newRole}
          onClose={() => m.setPeerSettingsOpen(false)}
          onCopyInviteLink={() => void m.copyInviteLink()}
          onInvitePasteChange={m.setInvitePasteField}
          onClearInvitePasteError={() => m.setInvitePasteError(null)}
          onApplyPastedInvite={m.applyPastedFriendInvite}
          onNewNameChange={m.setNewName}
          onNewRoleChange={m.setNewRole}
          onAddPeer={m.addPeer}
          onRemovePeer={m.removePeer}
        />
      ) : null}
    </section>
  );
});
