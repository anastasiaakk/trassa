import { cx } from "../../design-system/cabinetChromeClasses";
import type { TBotAppearance } from "../tbotAppearance";
import { TBotMascot, type TBotMood } from "../TBotMascot";
import { getHoverTooltipPreset, HoverTooltip } from "../HoverTooltip";

type HoverTooltipPreset = ReturnType<typeof getHoverTooltipPreset>;
import { BUBBLE, TBOT_ICON_TOOLTIP_DELAY_MS } from "./tbotConstants";
import type { TbotTheme } from "./tbotTheme";

type Props = {
  pos: { left: number; top: number };
  dragging: boolean;
  displayMood: TBotMood;
  appearance: TBotAppearance;
  showNotifyDot: boolean;
  tipToast: { title: string; text: string } | null;
  onBubblePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  isDark: boolean;
  isV2: boolean;
  tooltipPreset: HoverTooltipPreset;
  theme: TbotTheme;
};

export function TbotFab({
  pos,
  dragging,
  displayMood,
  appearance,
  showNotifyDot,
  tipToast,
  onBubblePointerDown,
  isDark,
  isV2,
  tooltipPreset,
  theme,
}: Props) {
  const { outerShadow } = theme;

  return (
    <HoverTooltip
      preset={tooltipPreset}
      isDark={isDark}
      showDelayMs={TBOT_ICON_TOOLTIP_DELAY_MS}
      content={
        <span style={{ maxWidth: 260, display: "block", lineHeight: 1.45 }}>
          Перетащите Т-бота. Клик — открыть или закрыть чат.
          {showNotifyDot ? " Есть непрочитанное: ответ Т-бота или сообщение в мессенджере." : ""}
          {tipToast ? " Слева от иконки — подсказка о новых сообщениях или ответе Т-бота." : ""}
        </span>
      }
      wrapperStyle={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: BUBBLE,
        height: BUBBLE,
        zIndex: 10041,
      }}
      wrapperClassName={isV2 ? "floating-widget-v2__fab-tbot-root" : undefined}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <button
          type="button"
          aria-label="Т-бот — перетащите или нажмите, чтобы открыть чат"
          className={cx(isV2 && "floating-widget-v2__fab-tbot")}
          onPointerDown={onBubblePointerDown}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "none",
            cursor: dragging ? "grabbing" : "grab",
            padding: 0,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(160deg, #1e293b 0%, #334155 40%, #0f172a 100%)",
            boxShadow: `${outerShadow}, 0 0 0 2px rgba(56, 189, 248, 0.35) inset`,
            touchAction: "none",
          }}
        >
          <TBotMascot mood={displayMood} size={40} withFloat={!dragging} appearance={appearance} />
        </button>
        {showNotifyDot ? <span className="tbot-notify-dot" aria-hidden /> : null}
      </div>
    </HoverTooltip>
  );
}
