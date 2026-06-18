import type { CabinetChromeStyles } from "../CabinetChromeLayout";
import type { ContractorFormsState } from "../../hooks/useContractorForms";
import type { CabinetAccentTheme } from "../../theme/cabinetAccentTheme";
import { templateLayout } from "../../utils/adminFormsGrid";
import { cx } from "../../design-system/cabinetChromeClasses";
import { formatDeadlineRu } from "../../utils/contractorFormsViewUtils";
import css from "../../pages/ContractorFormsView.module.css";

type Props = {
  forms: ContractorFormsState;
  styles: CabinetChromeStyles;
  theme: CabinetAccentTheme;
};

export default function ContractorFormsTemplateList({ forms, styles, theme }: Props) {
  const { templates, activeId, setActiveId, initialLoading } = forms;

  return (
    <>
      {initialLoading && templates.length === 0 ? (
        <p style={{ fontSize: 13, color: styles.muted, margin: "0 0 12px" }}>Загрузка…</p>
      ) : null}
      {templates.length === 0 ? (
        <div
          className={css.empty}
          style={{
            color: styles.muted,
            background: styles.sectionBg,
            boxShadow: styles.insetShadow,
          }}
        >
          Нет назначенных таблиц.
        </div>
      ) : (
        <ul className={css.templateList}>
          {templates.map((t) => {
            const selected = activeId === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={cx(css.templateBtn, selected && "contractor-forms__templateBtn--active")}
                  onClick={() => setActiveId((id) => (id === t.id ? "" : t.id))}
                  style={{
                    border: `1px solid ${selected ? styles.buttonBg : theme.navyBorder}`,
                    background: selected ? styles.sectionBg : styles.cardBg,
                    boxShadow: selected
                      ? `${styles.insetShadow}, 0 0 0 1px ${styles.buttonBg}`
                      : styles.cardShadow,
                  }}
                >
                  <div className={css.templateTitle} style={{ color: styles.text }}>
                    {t.title}
                    {(t.importSheets?.length ?? 0) > 1 ? (
                      <span style={{ fontWeight: 600, color: styles.muted }}>
                        {" "}
                        · {t.importSheets!.length} листа
                      </span>
                    ) : templateLayout(t) === "grid" ? (
                      <span style={{ fontWeight: 600, color: styles.muted }}> · таблица</span>
                    ) : null}
                  </div>
                  {t.deadlineAt ? (
                    <div className={css.templateMeta} style={{ color: theme.accent }}>
                      Срок сдачи: до {formatDeadlineRu(t.deadlineAt)}
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
