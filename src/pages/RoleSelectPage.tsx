import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { injectImagePreloads } from "../utils/imagePreload";
import {
  ADMIN_CABINET_SEARCH,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import { clearCabinetBetaPreview } from "../utils/cabinetBetaPreview";
import RoleSelectAuthForm from "../components/roleSelect/RoleSelectAuthForm";
import RoleSelectRoleCard from "../components/roleSelect/RoleSelectRoleCard";
import RoleSelectRolePicker from "../components/roleSelect/RoleSelectRolePicker";
import RoleSelectRoadBackground from "../components/roleSelect/RoleSelectRoadBackground";
import { ROLE_SELECT_PRELOAD_IMAGES, ROLE_SELECT_ROLE_ICONS } from "../config/roleSelectRoles";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { useRoleSelectAuth } from "../hooks/useRoleSelectAuth";
import styles from "./RoleSelectPage.module.css";

const RoleSelectPage = () => {
  const isV2 = usePortalDesign() === "v2";
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [roleHoverSuppressed, setRoleHoverSuppressed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const auth = useRoleSelectAuth({
    selectedRole,
    showLogin,
    navigate,
    setIsNavigating,
  });

  const goToPage2 = useCallback(() => {
    navigate("/services");
  }, [navigate]);

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  useEffect(() => {
    void Promise.all([
      import("./ContractorCabinetPage"),
      import("./AssociationCabinetPage"),
      import("./AdoCabinetPage"),
      import("./ProfileSettings"),
      import("./CabinetSchool"),
      import("./CabinetSpo"),
    ]);
    return injectImagePreloads(ROLE_SELECT_PRELOAD_IMAGES);
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
    };
  }, []);

  const handleRoleSelect = useCallback((index: number) => {
    setSelectedRole((prev) => {
      const next = prev === index ? null : index;
      queueMicrotask(() => {
        setRoleHoverSuppressed(prev === index);
      });
      return next;
    });
  }, []);

  const handleRoleCardLeave = useCallback(() => {
    setRoleHoverSuppressed(false);
  }, []);

  const handleNext = useCallback(() => {
    if (selectedRole === null) return;
    setShowLogin(true);
  }, [selectedRole]);

  const { resetAuth } = auth;

  const handleBackToRoles = useCallback(() => {
    clearCabinetBetaPreview();
    setShowLogin(false);
    setSelectedRole(null);
    setRoleHoverSuppressed(false);
    try {
      sessionStorage.removeItem("trassaPortalRole");
    } catch {
      /* ignore */
    }
    resetAuth();
  }, [resetAuth]);

  const cards = useMemo(
    () =>
      ROLE_SELECT_ROLE_ICONS.map((icon, index) => (
        <RoleSelectRoleCard
          key={index}
          icon={icon}
          index={index}
          isSelected={selectedRole === index}
          isV2={isV2}
          onSelect={handleRoleSelect}
          onLeave={handleRoleCardLeave}
        />
      )),
    [selectedRole, handleRoleSelect, handleRoleCardLeave, isV2]
  );

  const backRow = (
    <div
      className={styles.backToPage2Wrap}
      style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
    >
      {!showLogin ? (
        <button type="button" className={cx(styles.backToPage2, isV2 && "page3-v2__back")} onClick={goToPage2}>
          ← Назад
        </button>
      ) : (
        <button
          type="button"
          className={cx(styles.backToPage2, isV2 && "page3-v2__back")}
          onClick={handleBackToRoles}
        >
          ← К выбору роли
        </button>
      )}
      {shouldShowReturnToAdminDashboard() ? (
        <button
          type="button"
          className={cx(styles.backToPage2, isV2 && "page3-v2__back")}
          onClick={goToAdminCabinet}
        >
          ← Кабинет администратора
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={cx(styles.pageRoot, isNavigating && styles.pageRootNavigating, isV2 && "page3-v2")}
    >
      <RoleSelectRoadBackground isV2={isV2} />
      <div
        className={cx(
          styles.hero,
          showLogin ? styles.heroAuthStep : styles.heroRolePick,
          isV2 && "page3-v2__role-tab page3-v2__role-panel"
        )}
      >
        <div className={cx(styles.decorLeft, isV2 && "page3-v2__decor")} />

        <div
          className={`${styles.content} ${showLogin ? styles.contentAuthStep : styles.contentRolePick}`}
        >
          {!showLogin ? (
            <>
              {backRow}
              <RoleSelectRolePicker
                isV2={isV2}
                roleHoverSuppressed={roleHoverSuppressed}
                selectedRole={selectedRole}
                cards={cards}
                onNext={handleNext}
              />
            </>
          ) : (
            <>
              {backRow}
              <RoleSelectAuthForm isV2={isV2} selectedRole={selectedRole} auth={auth} />
            </>
          )}
        </div>

        <div className={styles.decorRight} />
      </div>
    </div>
  );
};

export default RoleSelectPage;
