type IconProps = {
  size?: number;
  className?: string;
};

/** Солнце — светлая тема. */
export function IconSun({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Луна — тёмная тема. */
export function IconMoon({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Мессенджер / чат. */
export function IconChat({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-5 3.5V8.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 11.5h6M9 14.5h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Уведомления. */
export function IconBell({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Маленькая «искра» AI (угловой бейдж). */
export function IconSparkle({ size = 10, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M8 0.5 9.12 5.38 13.5 6.5 9.12 7.62 8 12.5 6.88 7.62 2.5 6.5 6.88 5.38 8 0.5Z"
      />
    </svg>
  );
}

/** Т-бот для фиолетовой кнопки — белый силуэт «мозга» с хвостом пузыря и фиолетовыми глазами. */
export function IconTBotMark({ size = 26, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#fff"
        d="M16 5.2c-4.8 0-8.8 3.4-8.8 7.6 0 2.4 1.1 4.6 2.9 6l-2.6 3.1c-.6.8.5 1.6 1.2 1l2.5-2.9h4.8c4.8 0 8.8-3.3 8.8-7.5S20.8 5.2 16 5.2Z"
      />
      <circle cx="12.4" cy="14.2" r="2" fill="#c4b5fd" />
      <circle cx="19.6" cy="14.2" r="2" fill="#c4b5fd" />
      <path
        fill="#fff"
        opacity="0.35"
        d="M13.2 7.8c1.2-.6 2.6-.4 3.5.5.8.8 1 2 .3 2.8-.5.6-1.3.5-1.9-.1-.7-.7-.6-1.7-.1-2.4.5-.6 1.3-.5 1.8.2Z"
      />
    </svg>
  );
}

/** @deprecated Используйте IconTBotMark */
export function IconAiBot({ size = 26, className }: IconProps) {
  return <IconTBotMark size={size} className={className} />;
}

/** Переключатель темы (inline — не зависит от public/tagjs). */
export function IconTheme({ size = 22, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6.87516 1.83349C5.23433 2.88766 4.12516 4.74849 4.12516 6.87516C4.12516 9.00182 5.23433 10.8627 6.90266 11.9168C4.0885 11.9168 1.8335 9.66182 1.8335 6.87516C1.8335 5.53802 2.36467 4.25566 3.31017 3.31016C4.25566 2.36466 5.53803 1.83349 6.87516 1.83349ZM17.481 3.20849L18.7918 4.51932L4.51933 18.7918L3.2085 17.481L17.481 3.20849ZM11.816 5.43599L10.4593 4.58349L9.13933 5.50016L9.52433 3.94182L8.25016 2.97016L9.85433 2.86016L10.386 1.34766L11.0002 2.84182L12.586 2.86932L11.3485 3.90516L11.816 5.43599ZM8.791 8.74516L7.72766 8.07599L6.701 8.79099L7.01266 7.58099L6.0135 6.82016L7.26016 6.73766L7.67266 5.55516L8.14016 6.71932L9.38683 6.74682L8.42433 7.54432L8.791 8.74516ZM17.4168 12.3752C17.4168 13.7123 16.8857 14.9947 15.9402 15.9402C14.9947 16.8856 13.7123 17.4168 12.3752 17.4168C11.2568 17.4168 10.221 17.0502 9.38683 16.436L16.436 9.38682C17.0502 10.221 17.4168 11.2568 17.4168 12.3752ZM13.3835 18.4068L15.9227 17.3527L15.7027 20.4235L13.3835 18.4068ZM17.3527 15.9318L18.4068 13.3927L20.4235 15.721L17.3527 15.9318ZM18.4068 11.3852L17.3618 8.83682L20.4235 9.05682L18.4068 11.3852ZM8.82766 17.3527L11.3668 18.4068L9.04766 20.4143L8.82766 17.3527Z"
        fill="currentColor"
      />
    </svg>
  );
}

const TOOLBAR_STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Профиль / пользователь — тот же stroke-набор, что чат / колокол. */
export function IconProfile({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" {...TOOLBAR_STROKE} />
      <path
        d="M6 20.5v-1.2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1.2"
        {...TOOLBAR_STROKE}
      />
    </svg>
  );
}

/** Выход — stroke, визуально в паре с IconProfile. */
export function IconLogout({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" {...TOOLBAR_STROKE} />
      <path d="M16 17l5-5-5-5" {...TOOLBAR_STROKE} />
      <path d="M21 12H9" {...TOOLBAR_STROKE} />
    </svg>
  );
}
