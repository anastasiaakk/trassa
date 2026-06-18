import type { CabinetChromeStyles } from "../CabinetChromeLayout";
import type { ContractorFormsState } from "../../hooks/useContractorForms";
import type { CabinetAccentTheme } from "../../theme/cabinetAccentTheme";
import css from "../../pages/ContractorFormsView.module.css";

type Props = {
  forms: ContractorFormsState;
  styles: CabinetChromeStyles;
  theme: CabinetAccentTheme;
  isDark: boolean;
  isV2: boolean;
};

export default function ContractorFormsAlerts({ forms, styles, theme, isDark, isV2 }: Props) {
  const { alerts, dismissAlert, dismissAllAlerts } = forms;

  if (alerts.length === 0) return null;

  return (
    <div
      className={css.alerts}
      style={{
        background: theme.accentSoft,
        border: `1px solid ${theme.accentBorder}`,
        boxShadow: isDark ? styles.insetShadow : styles.cardShadow,
      }}
    >
      <div className={css.alertsHead}>
        <strong className={css.alertsTitle} style={{ color: theme.accent }}>
          Уведомления
        </strong>
        <button
          type="button"
          className={css.btnReadAll}
          style={{
            background: styles.buttonBg,
            color: styles.buttonText,
            borderColor: isV2
              ? isDark
                ? "rgba(111, 149, 255, 0.2)"
                : "rgba(43, 100, 253, 0.25)"
              : isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(86, 6, 29, 0.15)",
            boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.35)" : "0 2px 8px rgba(10, 37, 64, 0.1)",
          }}
          onClick={dismissAllAlerts}
        >
          Прочитать все
        </button>
      </div>
      <ul className={css.alertList}>
        {alerts.map((a) => (
          <li
            key={a.id}
            className={css.alertItem}
            style={{
              background: isDark ? "rgba(12, 20, 42, 0.5)" : "rgba(255, 255, 255, 0.72)",
              border: `1px solid ${theme.navyBorder}`,
            }}
          >
            <span className={css.alertText} style={{ color: styles.text }}>
              {a.message}
            </span>
            <button
              type="button"
              className={css.btnDismiss}
              aria-label="Закрыть уведомление"
              style={{
                background: theme.dismissBg,
                color: theme.dismissText,
                border: `1px solid ${theme.accentBorder}`,
              }}
              onClick={() => dismissAlert(a.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
