import { memo, useMemo } from "react";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { useTbotChat } from "../hooks/useTbotChat";
import { BattleshipMiniGame } from "./BattleshipMiniGame";
import { getHoverTooltipPreset } from "./HoverTooltip";
import { TbotChatPanel } from "./tbot/TbotChatPanel";
import { TbotFab } from "./tbot/TbotFab";
import { TbotTipToast } from "./tbot/TbotTipToast";
import { getTbotTheme } from "./tbot/tbotTheme";

type Props = {
  isDark: boolean;
};

export const AiChatBubble = memo(function AiChatBubble({ isDark }: Props) {
  const isV2 = usePortalDesign() === "v2";
  const chat = useTbotChat();
  const theme = useMemo(() => getTbotTheme(isDark), [isDark]);
  const tooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  return (
    <>
      {chat.open ? (
        <TbotChatPanel
          isDark={isDark}
          isV2={isV2}
          theme={theme}
          tooltipPreset={tooltipPreset}
          panelLeft={chat.panelLeft}
          panelTop={chat.panelTop}
          panelDragging={chat.panelDragging}
          onPanelHeaderPointerDown={chat.onPanelHeaderPointerDown}
          displayMood={chat.displayMood}
          appearance={chat.appearance}
          customizeOpen={chat.customizeOpen}
          setCustomizeOpen={chat.setCustomizeOpen}
          patchAppearance={chat.patchAppearance}
          tbotAiLabel={chat.tbotAiLabel}
          setOpen={chat.setOpen}
          setMiniGameOpen={chat.setMiniGameOpen}
          messages={chat.messages}
          pending={chat.pending}
          scrollRef={chat.scrollRef}
          listEndRef={chat.listEndRef}
          updateScrollState={chat.updateScrollState}
          showJumpLatest={chat.showJumpLatest}
          scrollToBottom={chat.scrollToBottom}
          draft={chat.draft}
          setDraft={chat.setDraft}
          send={chat.send}
        />
      ) : null}

      <BattleshipMiniGame
        isOpen={chat.miniGameOpen}
        onClose={() => chat.setMiniGameOpen(false)}
        isDark={isDark}
      />

      {chat.tipToast ? (
        <TbotTipToast
          tipToast={chat.tipToast}
          setTipToast={chat.setTipToast}
          tipToastTimerRef={chat.tipToastTimerRef}
          pos={chat.pos}
          isDark={isDark}
          theme={theme}
        />
      ) : null}

      <TbotFab
        pos={chat.pos}
        dragging={chat.dragging}
        displayMood={chat.displayMood}
        appearance={chat.appearance}
        showNotifyDot={chat.showNotifyDot}
        tipToast={chat.tipToast}
        onBubblePointerDown={chat.onBubblePointerDown}
        isDark={isDark}
        isV2={isV2}
        tooltipPreset={tooltipPreset}
        theme={theme}
      />
    </>
  );
});
