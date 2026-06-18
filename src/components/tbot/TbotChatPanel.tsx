import type { RefObject } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { TBotAppearance } from "../tbotAppearance";
import { getTBotMoodLabel, TBotMascot, type TBotMood } from "../TBotMascot";
import { getHoverTooltipPreset, HoverTooltip } from "../HoverTooltip";

type HoverTooltipPreset = ReturnType<typeof getHoverTooltipPreset>;
import { PANEL_H, PANEL_W, type TbotMsg } from "./tbotConstants";
import type { TbotTheme } from "./tbotTheme";
import { TbotChatComposer } from "./TbotChatComposer";
import { TbotCustomizePanel } from "./TbotCustomizePanel";
import { TbotMessageList } from "./TbotMessageList";

type Props = {
  isDark: boolean;
  isV2: boolean;
  theme: TbotTheme;
  tooltipPreset: HoverTooltipPreset;
  panelLeft: number;
  panelTop: number;
  panelDragging: boolean;
  onPanelHeaderPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  displayMood: TBotMood;
  appearance: TBotAppearance;
  customizeOpen: boolean;
  setCustomizeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  patchAppearance: (patch: Partial<TBotAppearance>) => void;
  tbotAiLabel: string | null;
  setOpen: (open: boolean) => void;
  setMiniGameOpen: (open: boolean) => void;
  messages: TbotMsg[];
  pending: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  listEndRef: RefObject<HTMLDivElement | null>;
  updateScrollState: () => void;
  showJumpLatest: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  draft: string;
  setDraft: (value: string) => void;
  send: () => void;
};

export function TbotChatPanel({
  isDark,
  isV2,
  theme,
  tooltipPreset,
  panelLeft,
  panelTop,
  panelDragging,
  onPanelHeaderPointerDown,
  displayMood,
  appearance,
  customizeOpen,
  setCustomizeOpen,
  patchAppearance,
  tbotAiLabel,
  setOpen,
  setMiniGameOpen,
  messages,
  pending,
  scrollRef,
  listEndRef,
  updateScrollState,
  showJumpLatest,
  scrollToBottom,
  draft,
  setDraft,
  send,
}: Props) {
  const { muted, text, card, cardBorder, outerShadow, headerBg } = theme;

  return (
    <div
      role="dialog"
      aria-label="Чат с Т-ботом"
      className={cx(isV2 && "floating-widget-v2__panel")}
      style={{
        position: "fixed",
        zIndex: 10040,
        left: panelLeft,
        top: panelTop,
        width: PANEL_W,
        maxWidth: "min(400px, calc(100vw - 20px))",
        maxHeight: `min(${PANEL_H}px, calc(100vh - 20px))`,
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        background: card,
        color: text,
        boxShadow: outerShadow,
        border: `1px solid ${cardBorder}`,
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        role="presentation"
        className={cx(isV2 && "floating-widget-v2__header")}
        onPointerDown={onPanelHeaderPointerDown}
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: headerBg,
          flexShrink: 0,
          cursor: panelDragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <HoverTooltip
            preset={tooltipPreset}
            isDark={isDark}
            content={<span style={{ whiteSpace: "nowrap" }}>Настроить облик Т-бота</span>}
            wrapperStyle={{ flexShrink: 0 }}
          >
            <button
              type="button"
              aria-label="Настроить аксессуары Т-бота"
              aria-expanded={customizeOpen}
              onClick={() => setCustomizeOpen((o) => !o)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                border: "none",
                borderRadius: 14,
                padding: 4,
                background: isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(59, 130, 246, 0.12)",
                boxShadow: isDark ? "inset 0 0 0 1px rgba(56,189,248,0.2)" : "none",
                cursor: "pointer",
                lineHeight: 0,
                flexShrink: 0,
              }}
            >
              <TBotMascot mood={displayMood} size={44} appearance={appearance} />
            </button>
          </HoverTooltip>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Т-бот</div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 600, marginTop: 2 }}>
              {getTBotMoodLabel(displayMood)}
              {tbotAiLabel ? ` · ${tbotAiLabel}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <HoverTooltip
            preset={tooltipPreset}
            isDark={isDark}
            content={<span style={{ whiteSpace: "nowrap" }}>Морской бой с Т-ботом</span>}
            wrapperStyle={{ flexShrink: 0 }}
          >
            <button
              type="button"
              aria-label="Открыть игру морской бой с ИИ"
              onClick={() => setMiniGameOpen(true)}
              onPointerDown={(ev) => ev.stopPropagation()}
              style={{
                border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(59, 130, 246, 0.25)"}`,
                background: isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(59, 130, 246, 0.08)",
                color: muted,
                width: 34,
                height: 34,
                borderRadius: 12,
                cursor: "pointer",
                padding: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                style={{ display: "block", pointerEvents: "none" }}
              >
                <path
                  d="M3 17c2.5-1.5 5.5-1.5 8 0s5.5 1.5 8 0"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  opacity={0.55}
                />
                <path
                  d="M4 14h16l-1.5 4H5.5L4 14z"
                  stroke="currentColor"
                  strokeWidth={1.35}
                  strokeLinejoin="round"
                  fill={isDark ? "rgba(56,189,248,0.12)" : "rgba(59,130,246,0.1)"}
                />
                <path d="M7 14V11h10v3" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
                <circle cx="12" cy="9" r="1.2" fill="currentColor" opacity={0.7} />
              </svg>
            </button>
          </HoverTooltip>
          <button
            type="button"
            onClick={() => setOpen(false)}
            onPointerDown={(ev) => ev.stopPropagation()}
            aria-label="Закрыть"
            style={{
              border: "none",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
              color: muted,
              width: 34,
              height: 34,
              borderRadius: 12,
              cursor: "pointer",
              padding: 0,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
              style={{ display: "block", pointerEvents: "none" }}
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {customizeOpen ? (
        <TbotCustomizePanel
          isDark={isDark}
          theme={theme}
          appearance={appearance}
          patchAppearance={patchAppearance}
        />
      ) : null}

      <TbotMessageList
        isDark={isDark}
        theme={theme}
        messages={messages}
        pending={pending}
        scrollRef={scrollRef}
        listEndRef={listEndRef}
        updateScrollState={updateScrollState}
        showJumpLatest={showJumpLatest}
        scrollToBottom={scrollToBottom}
      />

      <TbotChatComposer
        isDark={isDark}
        theme={theme}
        draft={draft}
        setDraft={setDraft}
        pending={pending}
        send={send}
      />
    </div>
  );
}
