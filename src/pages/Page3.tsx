import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { injectImagePreloads } from "../utils/imagePreload";
import {
  ADMIN_CABINET_SEARCH,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import { clearCabinetBetaPreview } from "../utils/cabinetBetaPreview";
import Page3AuthForm from "../components/page3/Page3AuthForm";
import Page3RoleCard from "../components/page3/Page3RoleCard";
import Page3RolePicker from "../components/page3/Page3RolePicker";
import Page3RoadBackground from "../components/page3/Page3RoadBackground";
import { PAGE3_PRELOAD_IMAGES, PAGE3_ROLE_ICONS } from "../config/page3Roles";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { usePage3Auth } from "../hooks/usePage3Auth";
import styles from "./Page3.module.css";

const Page3 = () => {
  const isV2 = usePortalDesign() === "v2";
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [roleHoverSuppressed, setRoleHoverSuppressed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const auth = usePage3Auth({
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
      import("./Page4"),
      import("./Page5"),
      import("./Page6"),
      import("./ProfileSettings"),
      import("./CabinetSchool"),
      import("./CabinetSpo"),
    ]);
    return injectImagePreloads(PAGE3_PRELOAD_IMAGES);
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
      PAGE3_ROLE_ICONS.map((icon, index) => (
        <Page3RoleCard
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
      <Page3RoadBackground isV2={isV2} />
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
              <Page3RolePicker
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
              <Page3AuthForm isV2={isV2} selectedRole={selectedRole} auth={auth} />
            </>
          )}
        </div>

        <div className={styles.decorRight} />
      </div>
    </div>
  );
};

export default Page3;
