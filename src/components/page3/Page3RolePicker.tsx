import type { ReactNode } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/Page3.module.css";

type Page3RolePickerProps = {
  isV2: boolean;
  roleHoverSuppressed: boolean;
  selectedRole: number | null;
  cards: ReactNode;
  onNext: () => void;
};

export default function Page3RolePicker({
  isV2,
  roleHoverSuppressed,
  selectedRole,
  cards,
  onNext,
}: Page3RolePickerProps) {
  return (
    <div className={styles.rolePickMain}>
      <div className={styles.titleBlock}>
        <h1 className={cx(styles.title, isV2 && "page3-v2__title")}>Выберите Роль</h1>
        <p className={cx(styles.subtitle, isV2 && "page3-v2__subtitle")}>
          Выберите категорию, соответствующую вашей деятельности
        </p>
      </div>

      <div className={cx(styles.cardsRow, roleHoverSuppressed && styles.cardsRowHoverSuppressed)}>
        {cards}
      </div>
      <div className={styles.nextSection}>
        {selectedRole !== null && (
          <button
            type="button"
            className={cx(styles.nextArrow, isV2 && "page3-v2__next")}
            onClick={onNext}
            aria-label="Далее"
          >
            <svg className={styles.nextArrowIcon} viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M13.025 5.4 19.65 12l-6.625 6.6-1.4-1.4 4.275-4.25H5v-2h10.9l-4.275-4.25 1.4-1.4Z"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
