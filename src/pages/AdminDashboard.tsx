import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAuthApiEnabled } from "../utils/authMode";
import {
  getAdminCabinetInfo,
  getAdminSessionEmail,
  isAdminTabAllowed,
  logoutAdmin,
} from "../utils/adminAuth";
import { loadMaintenanceState } from "../utils/maintenanceMode";
import {
  buildAdminSearch,
  normalizeAdminSearch,
  readAdminRouteState,
  type AdminSectionId,
} from "../utils/adminRouteState";
import { isPortalSyncEnabled } from "../utils/portalSync";
import { buildCabinetV2SceneClasses, cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { formatKpiCount, kpiTrendFromCount } from "../utils/kpiCardHelpers";
import AdminSoftTopBar from "../components/admin/AdminSoftTopBar";
import { AdminNavIcon, type AdminNavSection } from "../components/admin/AdminNavIcons";
import { IconLogout, IconTheme } from "../components/icons/AppToolbarIcons";
import {
  AdminDevicesSection,
  AdminViolationsSection,
  AdminAccountPanelSection,
  AdminReleasePanelSection,
  AdminUsersPanelSection,
  AdminContractorsPanelSection,
  AdminMapPanelSection,
  AdminHomePanelSection,
  AdminSettingsPanelSection,
} from "../components/admin/AdminManagedSections";
import { loadAdminGlassPreferDark, saveAdminGlassPreferDark } from "../utils/adminGlassTheme";
import styles from "./AdminPanel.module.css";
import glass from "./AdminPanelGlass.module.css";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { useContractorOrganizations } from "../hooks/useContractorOrganizations";
import { useMapSubjectOrganizations } from "../hooks/useMapSubjectOrganizations";

const AdminTablesPanel = lazy(() => import("./AdminTablesPanel"));
const AdminSpecializationsPanel = lazy(() => import("./AdminSpecializationsPanel"));
const DesignSystemPreview = lazy(() => import("./DesignSystemPreview"));

const SECTION_HEADINGS: Record<AdminSectionId, string> = {
  home: "Главная",
  settings: "Настройки",
  designSystem: "Дизайн-система",
  users: "Пользователи",
  specs: "Спецификации",
  tables: "Таблицы",
  map: "Карта",
  orgs: "Подрядчики",
  release: "Обновления",
  devices: "Выход с устройств",
  violations: "Нарушения",
  account: "Аккаунт",
};

const adminPanelFallback = (
  <p className={styles.hint} style={{ padding: "1rem 0" }}>
    Загрузка раздела…
  </p>
);

type NavItem = { id: AdminSectionId; label: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

export type AdminDashboardProps = {
  onLogout: () => void;
  useParentPageBackground?: boolean;
  onBackToMap?: () => void;
};

export default function AdminDashboard({
  onLogout,
  useParentPageBackground = false,
  onBackToMap,
}: AdminDashboardProps) {
  const adminLocation = useLocation();
  const adminNavigate = useNavigate();
  const apiEnabled = isAuthApiEnabled();
  const { users, refresh: refreshUsers } = useAdminUsers();
  const { contractors, refresh: refreshContractors } = useContractorOrganizations();
  const { orgs: mapOrgs, refresh: refreshMapOrgs } = useMapSubjectOrganizations();

  const [preferLight, setPreferLight] = useState(() =>
    loadAdminGlassPreferDark(!useParentPageBackground),
  );
  const isLightMap = !preferLight;
  const glassVariant = isLightMap ? "map" : "dark";

  const toggleTheme = useCallback(() => {
    setPreferLight((prev) => {
      const next = !prev;
      saveAdminGlassPreferDark(next);
      return next;
    });
  }, []);

  const sessionEmail = getAdminSessionEmail();
  const cabinetInfo = useMemo(() => getAdminCabinetInfo(sessionEmail), [sessionEmail]);
  const portalDesign = usePortalDesign();
  const isPortalV2 = portalDesign === "v2";
  const isSoftUi = isPortalV2 && useParentPageBackground;

  const [maintenanceActive, setMaintenanceActive] = useState(
    () => loadMaintenanceState().active,
  );
  const [activeSection, setActiveSection] = useState<AdminSectionId>(
    () => readAdminRouteState(adminLocation.search).tab,
  );
  const [visitedSections, setVisitedSections] = useState<Set<AdminSectionId>>(
    () => new Set([readAdminRouteState(adminLocation.search).tab]),
  );
  const [softQuery, setSoftQuery] = useState("");
  const panelScrollRef = useRef<HTMLDivElement>(null);

  const flatNav = useMemo(() => {
    const items: NavItem[] = [
      { id: "home", label: "Главная" },
      { id: "settings", label: "Настройки" },
      { id: "designSystem", label: "Дизайн-система" },
      { id: "users", label: "Пользователи" },
      { id: "specs", label: "Спецификации" },
      { id: "tables", label: "Таблицы" },
      { id: "map", label: "Карта" },
      { id: "orgs", label: "Подрядчики" },
    ];
    if (apiEnabled && isPortalSyncEnabled()) {
      items.push({ id: "release", label: "Обновления" });
      items.push({ id: "devices", label: "Выход с устройств" });
      items.push({ id: "violations", label: "Нарушения" });
    }
    items.push({ id: "account", label: "Аккаунт" });
    return items;
  }, [apiEnabled]);

  const groupedNav = useMemo((): NavGroup[] => {
    const dataItems: NavItem[] = [
      { id: "users", label: "Пользователи" },
      { id: "specs", label: "Спецификации" },
      { id: "tables", label: "Таблицы" },
      { id: "map", label: "Карта" },
      { id: "orgs", label: "Подрядчики" },
    ];
    const systemItems: NavItem[] = [
      { id: "settings", label: "Настройки" },
      { id: "designSystem", label: "Дизайн-система" },
    ];
    if (apiEnabled && isPortalSyncEnabled()) {
      systemItems.push({ id: "release", label: "Обновления" });
      systemItems.push({ id: "devices", label: "Выход с устройств" });
      systemItems.push({ id: "violations", label: "Нарушения" });
    }
    systemItems.push({ id: "account", label: "Аккаунт" });
    return [
      { id: "main", label: "Основное", items: [{ id: "home", label: "Главная" }] },
      { id: "data", label: "Данные", items: dataItems },
      { id: "system", label: "Система", items: systemItems },
    ];
  }, [apiEnabled]);

  const filterNav = useCallback(
    (items: NavItem[]) => {
      const allowed = cabinetInfo.allowedTabIds;
      if (!allowed) return items;
      const set = new Set(allowed);
      return items.filter((item) => set.has(item.id));
    },
    [cabinetInfo.allowedTabIds],
  );

  const sidebarFlatNav = useMemo(() => filterNav(flatNav), [flatNav, filterNav]);
  const sidebarGroupedNav = useMemo(
    () =>
      groupedNav
        .map((group) => ({ ...group, items: filterNav(group.items) }))
        .filter((group) => group.items.length > 0),
    [groupedNav, filterNav],
  );

  useEffect(() => {
    const onMaintenance = () => setMaintenanceActive(loadMaintenanceState().active);
    window.addEventListener("trassa-maintenance-changed", onMaintenance);
    return () => window.removeEventListener("trassa-maintenance-changed", onMaintenance);
  }, []);

  useEffect(() => {
    setVisitedSections((prev) => {
      if (prev.has(activeSection)) return prev;
      const next = new Set(prev);
      next.add(activeSection);
      return next;
    });
  }, [activeSection]);

  useEffect(() => {
    panelScrollRef.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  useEffect(() => {
    void import("./AdminTablesPanel");
    void import("./AdminSpecializationsPanel");
    void import("./DesignSystemPreview");
  }, []);

  useEffect(() => {
    const route = readAdminRouteState(adminLocation.search);
    if (route.mode === "dashboard" && route.tab !== activeSection) {
      setActiveSection(route.tab);
      return;
    }
    if (route.mode !== "dashboard") return;
    const nextSearch = buildAdminSearch("dashboard", activeSection);
    if (normalizeAdminSearch(adminLocation.search) !== nextSearch) {
      adminNavigate({ pathname: "/services", search: nextSearch }, { replace: true });
    }
  }, [activeSection, adminLocation.search, adminNavigate]);

  useEffect(() => {
    if (activeSection === "release" && !(apiEnabled && isPortalSyncEnabled())) {
      setActiveSection("settings");
    }
    if (activeSection === "devices" && !(apiEnabled && isPortalSyncEnabled())) {
      setActiveSection("settings");
    }
    if (activeSection === "violations" && !(apiEnabled && isPortalSyncEnabled())) {
      setActiveSection("settings");
    }
  }, [activeSection, apiEnabled]);

  useEffect(() => {
    if (!isAdminTabAllowed(cabinetInfo.cabinetId, activeSection, sessionEmail)) {
      setActiveSection((cabinetInfo.allowedTabIds?.[0] ?? "home") as AdminSectionId);
    }
  }, [activeSection, cabinetInfo.cabinetId, cabinetInfo.allowedTabIds, sessionEmail]);

  useEffect(() => {
    setSoftQuery("");
  }, [activeSection]);

  const educationOrgs = useMemo(
    () => mapOrgs.filter((org) => org.kind === "education"),
    [mapOrgs],
  );
  const contractorMapOrgs = useMemo(
    () => mapOrgs.filter((org) => org.kind === "contractors"),
    [mapOrgs],
  );

  const kpiItems = useMemo(() => {
    const mapTotal = educationOrgs.length + contractorMapOrgs.length;
    const maintOn = maintenanceActive;
    return [
      {
        id: "users",
        label: "Пользователей",
        value: formatKpiCount(users.length),
        trend: kpiTrendFromCount(users.length),
        insight: "Учётные записи с регистрацией на портале.",
      },
      {
        id: "orgs",
        label: "Организаций подрядчиков",
        value: formatKpiCount(contractors.length),
        trend: kpiTrendFromCount(contractors.length),
        insight: "Справочник подрядчиков для кабинетов и карты.",
      },
      {
        id: "map",
        label: "Записей на карте",
        value: formatKpiCount(mapTotal),
        trend: kpiTrendFromCount(mapTotal),
        insight: "Объекты и организации на интерактивной карте.",
      },
      {
        id: "maint",
        label: "Тех. работы",
        value: maintOn ? "Вкл" : "Выкл",
        trend: maintOn ? ("down" as const) : ("up" as const),
        trendLabel: maintOn ? "активно" : "выкл",
        insight: maintOn
          ? "Пользователям показывается экран технических работ."
          : "Портал открыт для всех пользователей.",
      },
    ];
  }, [
    users.length,
    contractors.length,
    educationOrgs.length,
    contractorMapOrgs.length,
    maintenanceActive,
  ]);

  useEffect(() => {
    if (!apiEnabled) return;
    if (activeSection !== "users" && activeSection !== "home") return;
    const refresh = () => refreshUsers();
    const intervalId = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [apiEnabled, refreshUsers, activeSection]);

  const handleLogout = useCallback(() => {
    logoutAdmin();
    onLogout();
  }, [onLogout]);

  const chromeProps = {
    sectionClass: styles.section,
    titleClass: styles.sectionTitle,
    glassHintClass: styles.hint,
    errorClass: styles.error,
    btnPrimaryClass: styles.btnNeoPrimary,
    btnSecondaryClass: styles.btnNeoPrimaryNeutral,
  };

  const renderSectionContent = (section: AdminSectionId) => {
    switch (section) {
      case "home":
        return (
          <AdminHomePanelSection
            kpiItems={kpiItems}
            glassVariant={glassVariant}
            apiEnabled={apiEnabled}
            userCreatedAtList={users.map((u) => u.createdAt)}
            activeSection={activeSection}
          />
        );
      case "designSystem":
        return (
          <Suspense fallback={adminPanelFallback}>
            <DesignSystemPreview />
          </Suspense>
        );
      case "settings":
        return <AdminSettingsPanelSection glassTone={glassVariant} />;
      case "orgs":
        return (
          <AdminContractorsPanelSection
            contractors={contractors}
            onRefresh={refreshContractors}
            mapSubjectOrgs={mapOrgs}
            softUi={isSoftUi}
            searchQuery={softQuery}
            onSearchChange={setSoftQuery}
          />
        );
      case "release":
        return apiEnabled && isPortalSyncEnabled() ? <AdminReleasePanelSection /> : null;
      case "map":
        return (
          <AdminMapPanelSection
            mapOrgs={mapOrgs}
            onRefresh={refreshMapOrgs}
            softUi={isSoftUi}
            searchQuery={softQuery}
            onSearchChange={setSoftQuery}
            activeSection={activeSection}
          />
        );
      case "specs":
        return (
          <Suspense fallback={adminPanelFallback}>
            <AdminSpecializationsPanel />
          </Suspense>
        );
      case "tables":
        return (
          <Suspense fallback={adminPanelFallback}>
            <AdminTablesPanel />
          </Suspense>
        );
      case "users":
        return (
          <AdminUsersPanelSection
            users={users}
            onRefresh={refreshUsers}
            apiEnabled={apiEnabled}
            softUi={isSoftUi}
            searchQuery={softQuery}
            onSearchChange={setSoftQuery}
          />
        );
      case "devices":
        return <AdminDevicesSection {...chromeProps} />;
      case "violations":
        return <AdminViolationsSection {...chromeProps} />;
      case "account":
        return <AdminAccountPanelSection />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cx(
        styles.cabinetPage,
        styles.cabinetDashboard,
        glass.themeGlass,
        useParentPageBackground && styles.cabinetPageEmbed,
        useParentPageBackground && "admin-dashboard-embed",
        isLightMap && glass.themeGlassMap,
        isPortalV2 && "admin-dashboard--portal-v2",
        isSoftUi && "admin-v2-soft",
        isPortalV2 && buildCabinetV2SceneClasses(isLightMap),
        isPortalV2 && isLightMap && "admin-v2-scene--light",
        isPortalV2 && !isLightMap && "admin-v2-scene--dark",
      )}
    >
      <div
        className={`${styles.cabinetBg} ${useParentPageBackground && isLightMap ? styles.cabinetBgTransparent : ""}`}
        aria-hidden
      />
      <div className={cx(glass.glassShell, "admin-glass-shell")}>
        <div className={cx(glass.glassLayout, "admin-glass-layout")}>
          <aside
            className={cx(
              glass.glassSidebar,
              "admin-glass-sidebar",
              isPortalV2 && "admin-v2-sidebar-col",
            )}
            aria-label="Разделы админ-панели"
          >
            {isSoftUi ? (
              <nav className={cx(glass.glassNav, "admin-v2-soft-nav")}>
                {sidebarGroupedNav.map((group) => (
                  <div key={group.id} className="admin-v2-soft-nav-group">
                    <p className="admin-v2-soft-nav-label">{group.label}</p>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={cx(
                          glass.glassNavBtn,
                          "admin-v2-soft-nav-btn",
                          activeSection === item.id && glass.glassNavBtnActive,
                          activeSection === item.id && "admin-v2-nav-active",
                        )}
                        aria-current={activeSection === item.id ? "page" : undefined}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <span className="admin-v2-soft-nav-icon-wrap" aria-hidden>
                          <AdminNavIcon
                            section={item.id as AdminNavSection}
                            className="admin-v2-soft-nav-icon"
                            size={20}
                          />
                        </span>
                        <span className="admin-v2-soft-nav-text">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            ) : (
              <nav className={glass.glassNav}>
                {sidebarFlatNav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cx(
                      glass.glassNavBtn,
                      activeSection === item.id && glass.glassNavBtnActive,
                      isPortalV2 && activeSection === item.id && "admin-v2-nav-active",
                    )}
                    aria-current={activeSection === item.id ? "page" : undefined}
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
          </aside>

          <div
            className={cx(
              glass.glassPanel,
              isSoftUi && "admin-glass-panel",
              isPortalV2 && !isSoftUi && "admin-v2-panel",
              isPortalV2 && !isSoftUi && "pv2-card-l1",
              isPortalV2 && isLightMap && !isSoftUi && "admin-v2-panel--light pv2-accent-edge",
            )}
          >
            {!isSoftUi ? (
              <header className={glass.glassPanelHead}>
                <div className={glass.glassPanelIntro}>
                  <p className={glass.glassPanelGreeting}>
                    Здравствуйте,{" "}
                    {cabinetInfo.orgLabel
                      ? `${cabinetInfo.displayName} · ${cabinetInfo.orgLabel}`
                      : cabinetInfo.displayName}
                    !
                  </p>
                  <h1 className={glass.glassPanelTitle}>{SECTION_HEADINGS[activeSection]}</h1>
                  {sessionEmail ? (
                    <p className={glass.glassPanelEmail}>{sessionEmail}</p>
                  ) : null}
                </div>
                <div className={glass.glassPanelHeadActions}>
                  <button
                    type="button"
                    className={`${glass.glassBtnTheme} ${preferLight ? glass.glassBtnThemeActive : ""}`}
                    onClick={toggleTheme}
                    aria-label={preferLight ? "Светлая тема" : "Тёмная тема"}
                    title={preferLight ? "Светлая тема" : "Тёмная тема"}
                  >
                    <IconTheme className={glass.glassBtnThemeIcon} />
                  </button>
                  <button
                    type="button"
                    className={glass.glassBtnLogout}
                    onClick={handleLogout}
                    aria-label="Выйти"
                    title="Выйти"
                  >
                    <IconLogout className={glass.glassBtnLogoutIcon} />
                  </button>
                </div>
              </header>
            ) : null}

            <div className={glass.glassPanelScroll} ref={panelScrollRef}>
              {isSoftUi ? (
                <AdminSoftTopBar
                  displayName={
                    cabinetInfo.orgLabel
                      ? `${cabinetInfo.displayName} · ${cabinetInfo.orgLabel}`
                      : cabinetInfo.displayName
                  }
                  email={sessionEmail}
                  sectionTitle={SECTION_HEADINGS[activeSection]}
                  preferLight={preferLight}
                  onThemeToggle={toggleTheme}
                  onLogout={handleLogout}
                  onBackToMap={onBackToMap}
                />
              ) : null}
              <div className={isSoftUi ? "admin-soft-content-card" : undefined}>
                {Array.from(visitedSections).map((sectionId) => (
                  <div
                    key={sectionId}
                    className={styles.adminSectionPane}
                    hidden={sectionId !== activeSection}
                    aria-hidden={sectionId !== activeSection}
                  >
                    {renderSectionContent(sectionId)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
