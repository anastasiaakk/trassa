import type { MessengerInviteToast } from "../../utils/messengerInviteToast";
import type { MessengerThemeStyles } from "./messengerTypes";

type Props = {
  toast: MessengerInviteToast;
  styles: MessengerThemeStyles;
  isDark: boolean;
  narrow: boolean;
};

export default function MessengerInviteToastBanner({ toast, styles, isDark, narrow }: Props) {
  return (
    <div
      role="status"
      style={{
        ...(narrow ? {} : { gridColumn: "1 / -1" }),
        padding: "12px 18px",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.45,
        color: styles.text,
        background: isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(36, 59, 116, 0.1)",
        borderBottom: isDark ? "1px solid rgba(56, 189, 248, 0.2)" : "1px solid rgba(36, 59, 116, 0.18)",
      }}
    >
      {toast.mode === "added"
        ? `Контакт «${toast.name}» добавлен по ссылке-приглашению.`
        : `Контакт «${toast.name}» уже был в списке.`}
    </div>
  );
}
