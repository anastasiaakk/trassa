import { cx } from "../../design-system/cabinetChromeClasses";
import type { RoleSelectAuthState } from "../../hooks/useRoleSelectAuth";
import styles from "../../pages/RoleSelectPage.module.css";

type RoleSelectInstitutionProfilePickerProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: RoleSelectAuthState;
};

export default function RoleSelectInstitutionProfilePicker({
  isV2,
  selectedRole,
  auth,
}: RoleSelectInstitutionProfilePickerProps) {
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
            isV2 && "role-select-v2__profile-btn",
            institutionProfile === "ado" && styles.loginProfileBtnActive,
            isV2 && institutionProfile === "ado" && "role-select-v2__profile-btn--active"
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
            isV2 && "role-select-v2__profile-btn",
            institutionProfile === "rador" && styles.loginProfileBtnActive,
            isV2 && institutionProfile === "rador" && "role-select-v2__profile-btn--active"
          )}
          onClick={() => setInstitutionProfile("rador")}
        >
          РАДОР
        </button>
      </div>
    </div>
  );
}
