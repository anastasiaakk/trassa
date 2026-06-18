import styles from "../../pages/RoleSelectPage.module.css";

type RoleSelectPasswordEyeButtonProps = {
  showPassword: boolean;
  onToggle: () => void;
};

export default function RoleSelectPasswordEyeButton({ showPassword, onToggle }: RoleSelectPasswordEyeButtonProps) {
  return (
    <button
      type="button"
      className={styles.loginEyeBtn}
      onClick={onToggle}
      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
    >
      <svg className={styles.loginEyeIcon} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 6c3.79 0 7.17 1.94 9 5-1.83 3.06-5.21 5-9 5s-7.17-1.94-9-5c1.83-3.06 5.21-5 9-5zm0 2.5A4.5 4.5 0 0 0 7.5 13 4.5 4.5 0 0 0 12 17.5 4.5 4.5 0 0 0 16.5 13 4.5 4.5 0 0 0 12 8.5zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
        />
        {showPassword ? (
          <line
            x1="4"
            y1="4"
            x2="20"
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </button>
  );
}
