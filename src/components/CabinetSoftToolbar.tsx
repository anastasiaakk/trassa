import { memo, useCallback } from "react";
import { ICON_AVATAR } from "../assets/appIcons";
import { IconBell, IconChat, IconLogout, IconMoon, IconProfile, IconSun } from "./icons/AppToolbarIcons";
import { TBotMascot } from "./TBotMascot";
import EditableProfileAvatar from "./EditableProfileAvatar";

export const CABINET_AI_CHAT_OPEN = "trassa-ai-chat-open";

type Props = {
  theme: "light" | "dark";
  onThemeToggle: (next: "light" | "dark") => void;
  onMessenger?: () => void;
  messengerUnread?: boolean;
  tbotUnread?: boolean;
  messengerLabel?: string;
  messengerActive?: boolean;
  onNotifications?: () => void;
  notificationsUnread?: boolean;
  notificationsLabel?: string;
  onOpenAi?: () => void;
  avatarEmail?: string;
  onProfile: () => void;
  onLogout: () => void;
};

function CabinetSoftToolbar({
  theme,
  onThemeToggle,
  onMessenger,
  messengerUnread = false,
  tbotUnread = false,
  messengerLabel = "Мессенджер",
  messengerActive = false,
  onNotifications,
  notificationsUnread: _notificationsUnread = false,
  notificationsLabel = "Уведомления",
  onOpenAi,
  avatarEmail,
  onProfile,
  onLogout,
}: Props) {
  const isLight = theme === "light";

  const openAi = useCallback(() => {
    if (onOpenAi) {
      onOpenAi();
      return;
    }
    window.dispatchEvent(new CustomEvent(CABINET_AI_CHAT_OPEN));
  }, [onOpenAi]);

  return (
    <div className="cabinet-soft-toolbar" aria-label="Панель действий">
      <div className="cabinet-soft-toolbar__theme" role="group" aria-label="Тема оформления">
        <button
          type="button"
          className={`cabinet-soft-toolbar__theme-btn${isLight ? " cabinet-soft-toolbar__theme-btn--active" : ""}`}
          aria-pressed={isLight}
          aria-label="Светлая тема"
          onClick={() => onThemeToggle("light")}
        >
          <IconSun size={18} />
        </button>
        <button
          type="button"
          className={`cabinet-soft-toolbar__theme-btn${!isLight ? " cabinet-soft-toolbar__theme-btn--active" : ""}`}
          aria-pressed={!isLight}
          aria-label="Тёмная тема"
          onClick={() => onThemeToggle("dark")}
        >
          <IconMoon size={18} />
        </button>
      </div>

      {onMessenger ? (
        <button
          type="button"
          className={`cabinet-soft-toolbar__glass-btn cabinet-soft-toolbar__glass-btn--messenger${messengerActive ? " cabinet-soft-toolbar__glass-btn--active" : ""}`}
          onClick={onMessenger}
          aria-label={messengerLabel}
          title={messengerLabel}
          aria-pressed={messengerActive}
        >
          <IconChat size={20} />
          {messengerUnread ? <span className="tbot-notify-dot" aria-hidden /> : null}
        </button>
      ) : null}

      {onNotifications ? (
        <button
          type="button"
          className="cabinet-soft-toolbar__glass-btn"
          onClick={onNotifications}
          aria-label={notificationsLabel}
          title={notificationsLabel}
        >
          <IconBell size={20} />
        </button>
      ) : null}

      <button
        type="button"
        className="cabinet-soft-toolbar__ai-btn"
        onClick={openAi}
        aria-label={
          tbotUnread ? "Открыть чат с Т-ботом — есть непрочитанные в мессенджере" : "Открыть чат с Т-ботом"
        }
        title={tbotUnread ? "Т-бот — есть новые сообщения в мессенджере" : "Т-бот — ассистент портала"}
      >
        <TBotMascot
          mood="happy"
          size={34}
          withFloat={false}
          appearance={{ accessory: "none" }}
        />
        {tbotUnread ? <span className="tbot-notify-dot" aria-hidden /> : null}
      </button>

      <EditableProfileAvatar
        emailNorm={avatarEmail}
        fallbackSrc={ICON_AVATAR}
        wrapClassName="cabinet-soft-toolbar__avatar-wrap"
        rootClassName="cabinet-soft-toolbar__glass-btn cabinet-soft-toolbar__avatar-btn"
        imgClassName="cabinet-soft-toolbar__avatar-img"
        photoImgClassName="cabinet-soft-toolbar__avatar-img--photo"
        displayName="Профиль"
        imgSize={44}
        toolbarGlass
        emptyIcon={<IconProfile size={18} />}
        onClick={onProfile}
      />

      <button
        type="button"
        className="cabinet-soft-toolbar__glass-btn cabinet-soft-toolbar__glass-btn--logout"
        onClick={onLogout}
        aria-label="Выйти"
        title="Выйти / сменить роль"
      >
        <IconLogout size={18} />
      </button>
    </div>
  );
}

export default memo(CabinetSoftToolbar);
