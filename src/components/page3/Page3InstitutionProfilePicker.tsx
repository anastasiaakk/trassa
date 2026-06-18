import { cx } from "../../design-system/cabinetChromeClasses";
import type { Page3AuthState } from "../../hooks/usePage3Auth";
import styles from "../../pages/Page3.module.css";

type Page3InstitutionProfilePickerProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: Page3AuthState;
};

export default function Page3InstitutionProfilePicker({
  isV2,
  selectedRole,
  auth,
}: Page3InstitutionProfilePickerProps) {
  const { institutionProfile, setInstitutionProfile } = auth;

  if (selectedRole !== 3) return null;

  return (
    <div className={styles.loginProfileBlock} role="radiogroup" aria-label="Профиль входа">
      <span className={styles.loginLabel} id="page3-profile-label">
        Профиль кабинета
      </span>
      <div className={styles.loginProfileRow} aria-labelledby="page3-profile-label">
        <button
          type="button"
          role="radio"
          aria-checked={institutionProfile === "ado"}
          className={cx(
            styles.loginProfileBtn,
            isV2 && "page3-v2__profile-btn",
            institutionProfile === "ado" && styles.loginProfileBtnActive,
            isV2 && institutionProfile === "ado" && "page3-v2__profile-btn--active"
          )}
          onClick={() => setInstitutionProfile("ado")}
        >
          АДО
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={institutionProfile === "rador"}
          className={cx(
            styles.loginProfileBtn,
            isV2 && "page3-v2__profile-btn",
            institutionProfile === "rador" && styles.loginProfileBtnActive,
            isV2 && institutionProfile === "rador" && "page3-v2__profile-btn--active"
          )}
          onClick={() => setInstitutionProfile("rador")}
        >
          РАДОР
        </button>
      </div>
    </div>
  );
}
