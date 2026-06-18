import type { CabinetChromeStyles } from "../CabinetChromeLayout";
import type { ContractorFormsState } from "../../hooks/useContractorForms";
import type { CabinetAccentTheme } from "../../theme/cabinetAccentTheme";
import css from "../../pages/ContractorFormsView.module.css";

type Props = {
  forms: ContractorFormsState;
  styles: CabinetChromeStyles;
  theme: CabinetAccentTheme;
  isDark: boolean;
};

export default function ContractorFormsToast({ forms, styles, theme, isDark }: Props) {
  const { msg, msgIsError, setMsg } = forms;

  if (!msg) return null;

  return (
    <div
      className={css.toastViewport}
      role={msgIsError ? "alert" : "status"}
      aria-live="polite"
    >
      <div
        className={css.toast}
        style={{
          color: msgIsError ? (isDark ? "#fce8ee" : "#8b1530") : styles.text,
          background: msgIsError
            ? isDark
              ? "rgba(139, 21, 48, 0.92)"
              : "rgba(254, 226, 226, 0.98)"
            : isDark
              ? "rgba(36, 59, 116, 0.94)"
              : "rgba(255, 255, 255, 0.98)",
          border: msgIsError
            ? `1px solid ${isDark ? "rgba(240, 168, 184, 0.45)" : "rgba(139, 21, 48, 0.25)"}`
            : `1px solid ${theme.navyBorder}`,
          boxShadow: isDark
            ? "0 12px 40px rgba(0, 0, 0, 0.45)"
            : "0 12px 32px rgba(26, 42, 82, 0.22)",
        }}
      >
        <p className={css.toastText}>{msg}</p>
        <button
          type="button"
          className={css.toastClose}
          aria-label="Закрыть"
          onClick={() => setMsg(null)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
