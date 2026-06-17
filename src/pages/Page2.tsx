import { useState, useCallback, useEffect, memo, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DesktopDownloadPanel from "../components/DesktopDownloadPanel";
import { isAdminLoggedIn } from "../utils/adminAuth";
import { clearAdminReturnMark } from "../utils/adminReturnNavigation";
import {
  adminSurfaceFromRoute,
  buildAdminSearch,
  readAdminRouteState,
  routeModeFromSurface,
  type AdminSectionId,
  type Page2AdminSurface,
} from "../utils/adminRouteState";
import { injectImagePreloads } from "../utils/imagePreload";
import { prefetchRoleSelectRoute } from "../utils/routePrefetch";
import {
  ICON_PAGE2_CONTRACTORS,
  ICON_PAGE2_PROJECTS,
  ICON_PAGE2_STATISTICS,
  ICON_SEARCH,
  PAGE2_HEADER_LOGO_SRC,
} from "../assets/appIcons";
import Page2StatCardV2 from "../components/Page2StatCardV2";
import Page2StatMonitorPopup from "../components/Page2StatMonitorPopup";
import { formatSubjectDisplayName, type SubjectMarkerGeo } from "../data/page2MapGeo";
import { loadMapCategoryLabels } from "../utils/mapCategoryLabels";
import { loadMapSubjectOrganizations } from "../utils/mapSubjectOrganizations";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import styles from "./Page2.module.css";

const RussiaLeafletMap = lazy(() => import("../components/RussiaLeafletMap"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminLoginPanel = lazy(() => import("./AdminLoginPanel"));

const adminPanelFallback = (
  <div
    style={{
      minHeight: "40vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-ui)",
      color: "var(--pv2-muted, #5c6b8a)",
    }}
  >
    Загрузка панели…
  </div>
);

const mapFallback = (
  <div
    className={styles.mapCanvas}
    style={{
      minHeight: 320,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-ui)",
      color: "var(--pv2-muted, #5c6b8a)",
    }}
  >
    Загрузка карты…
  </div>
);

type AdminSurface = Page2AdminSurface;

type AboutTab = "portal" | "download";
type SubjectPanelTab = "education" | "contractors" | null;

/** Страница 2 — карта подрядчиков (маршрут /services), интерактивная карта РФ (Leaflet + OSM). */

const PAGE2_PRELOAD_IMAGES = [
  PAGE2_HEADER_LOGO_SRC,
  ICON_PAGE2_CONTRACTORS,
  ICON_PAGE2_STATISTICS,
  ICON_PAGE2_PROJECTS,
] as const;

const PAGE2_STATS = [
  {
    id: "regions",
    tag: "Подрядчики",
    value: "67",
    label: "С нами уже работают",
    spark: [52, 58, 61, 64, 66, 67, 67],
  },
  {
    id: "contractors",
    tag: "Статистика",
    value: "704",
    label: "Требуется человек",
    spark: [520, 580, 610, 650, 680, 695, 704],
  },
  {
    id: "projects",
    tag: "Проекты",
    value: "874",
    label: "Готовы работать",
    spark: [640, 700, 760, 800, 830, 860, 874],
  },
  {
    id: "response",
    tag: "Сервис",
    value: "28с",
    label: "Среднее время отклика",
    spark: [42, 38, 35, 32, 30, 29, 28],
  },
] as const;

const Page2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isV2 = usePortalDesign() === "v2";
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => isAdminLoggedIn());
  const [adminSurface, setAdminSurface] = useState<AdminSurface>(() => {
    const route = readAdminRouteState(location.search);
    return adminSurfaceFromRoute(route.mode, isAdminLoggedIn());
  });

  const applyAdminSurface = useCallback(
    (surface: AdminSurface, tab?: AdminSectionId) => {
      setAdminSurface(surface);
      const route = readAdminRouteState(location.search);
      const mode = routeModeFromSurface(surface);
      const tabToUse =
        tab ?? (mode === "dashboard" ? route.tab : "home");
      const search = buildAdminSearch(mode, tabToUse);
      navigate(
        { pathname: "/services", search },
        { replace: true }
      );
    },
    [location.search, navigate]
  );
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectMarkerGeo | null>(null);
  const [subjectPanelTab, setSubjectPanelTab] = useState<SubjectPanelTab>(null);
  const [mapLabels, setMapLabels] = useState(() => loadMapCategoryLabels());
  const [subjectOrgs, setSubjectOrgs] = useState(() => loadMapSubjectOrganizations());
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutTab, setAboutTab] = useState<AboutTab>("portal");
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [monitorStatId, setMonitorStatId] = useState<string | null>(null);
  const monitorStat = PAGE2_STATS.find((item) => item.id === monitorStatId) ?? null;

  useEffect(() => {
    const onFocus = () => setAdminLoggedIn(isAdminLoggedIn());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    prefetchRoleSelectRoute();
    return injectImagePreloads(PAGE2_PRELOAD_IMAGES);
  }, []);

  useEffect(() => {
    const sync = () => setMapLabels(loadMapCategoryLabels());
    window.addEventListener("trassa-map-category-labels-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("trassa-map-category-labels-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    const sync = () => setSubjectOrgs(loadMapSubjectOrganizations());
    window.addEventListener("trassa-map-subject-organizations-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("trassa-map-subject-organizations-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  /** /services?about=download | portal — открыть окно «О нас» (редирект с /download) */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("about")) return;
    const raw = params.get("about");
    const tab: AboutTab = raw === "download" ? "download" : "portal";
    setAboutTab(tab);
    setAboutOpen(true);
    params.delete("about");
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  }, [location.search, location.pathname, navigate]);

  /** Возврат из кабинетов: ?adminCabinet=1 → кабинет администратора в панели */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("adminCabinet") !== "1") return;
    clearAdminReturnMark();
    if (!isAdminLoggedIn()) {
      applyAdminSurface("adminLogin");
      return;
    }
    applyAdminSurface("adminDashboard", "account");
  }, [location.search, applyAdminSurface]);

  /** Обновление страницы / назад-вперёд: восстановить админку из URL */
  useEffect(() => {
    const route = readAdminRouteState(location.search);
    const surface = adminSurfaceFromRoute(route.mode, adminLoggedIn);
    setAdminSurface((prev) => (prev === surface ? prev : surface));
  }, [location.search, adminLoggedIn]);

  const toggleDistrictFromMap = useCallback((districtId: number) => {
    setSelectedDistrict((prev) => {
      const next = prev === districtId ? null : districtId;
      if (next === null) {
        setSelectedSubject(null);
        setSubjectPanelTab(null);
      }
      return next;
    });
  }, []);

  const handleSubjectClick = useCallback((subject: SubjectMarkerGeo) => {
    setSelectedSubject(subject);
  }, []);

  const handlePanelTabChange = useCallback((tab: Exclude<SubjectPanelTab, null>) => {
    setSubjectPanelTab(tab);
  }, []);

  const openAdminEntry = useCallback(() => {
    if (adminLoggedIn) {
      const route = readAdminRouteState(location.search);
      applyAdminSurface("adminDashboard", route.mode === "dashboard" ? route.tab : "home");
    } else {
      applyAdminSurface("adminLogin");
    }
  }, [adminLoggedIn, location.search, applyAdminSurface]);

  const showMap = adminSurface === "map";
  const adminOpen = adminSurface !== "map";
  const subjectName = selectedSubject?.name ?? null;
  const subjectDisplayName = subjectName ? formatSubjectDisplayName(subjectName) : null;
  const educationList = subjectName
    ? subjectOrgs
        .filter((x) => x.subjectName === subjectName && x.kind === "education")
        .map((x) => x.name)
    : [];
  const contractorList = subjectName
    ? subjectOrgs
        .filter((x) => x.subjectName === subjectName && x.kind === "contractors")
        .map((x) => x.name)
    : [];

  useEffect(() => {
    setSubjectSearchQuery("");
  }, [subjectName, subjectPanelTab]);

  const filterSubjectRows = useCallback(
    (rows: string[]) => {
      const q = subjectSearchQuery.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter((item) => item.toLowerCase().includes(q));
    },
    [subjectSearchQuery],
  );

  return (
    <div
      className={cx(styles.pageRoot, isV2 && "page2-v2-scene", adminOpen && "page2-root--admin")}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {!adminOpen ? (
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerLeft}>
              <span className={styles.portalLabel}>Цифровой портал</span>
            </div>
            <div className={styles.headerCenter}>
              <span className={styles.headerLogoWrap}>
                <img
                  src={PAGE2_HEADER_LOGO_SRC}
                  alt="ТрассА"
                  className={styles.headerLogo}
                  decoding="async"
                  fetchPriority="high"
                />
              </span>
            </div>
            <div className={styles.headerRight}>
              <button
                type="button"
                className={styles.linkAbout}
                onClick={() => {
                  setAboutTab("portal");
                  setAboutOpen(true);
                }}
              >
                О нас
              </button>
              <button type="button" className={styles.btnOutline} onClick={() => navigate("/page3")}>
                <span className={styles.btnText}>Войти</span>
              </button>
              <button
                type="button"
                className={cx(styles.btnGradient, isV2 && "page2-v2__btn-primary")}
                onClick={openAdminEntry}
              >
                <span className={styles.btnText}>Админ-панель</span>
              </button>
            </div>
          </div>
        </header>
      ) : null}

      <main className={cx(styles.main, adminOpen && "page2-main--admin")}>
        <div className={cx(styles.mainInner, adminOpen && "page2-main-inner--admin")}>
          {adminSurface === "adminLogin" ? (
            <Suspense fallback={adminPanelFallback}>
              <AdminLoginPanel
                useParentPageBackground
                onSuccess={() => {
                  setAdminLoggedIn(true);
                  const route = readAdminRouteState(location.search);
                  applyAdminSurface(
                    "adminDashboard",
                    route.mode === "dashboard" ? route.tab : "home"
                  );
                }}
                onCancel={() => applyAdminSurface("map")}
              />
            </Suspense>
          ) : null}
          {adminSurface === "adminDashboard" ? (
            <Suspense fallback={adminPanelFallback}>
              <AdminDashboard
                useParentPageBackground
                onBackToMap={() => applyAdminSurface("map")}
                onLogout={() => {
                  setAdminLoggedIn(false);
                  applyAdminSurface("map");
                }}
              />
            </Suspense>
          ) : null}

          {showMap ? (
            <>
              <section
                className={cx(styles.overviewCard, isV2 && "page2-v2__overview")}
                aria-label="О портале и показатели"
              >
                <div className={styles.overviewIntro}>
                  <h1 className={styles.overviewTitle}>
                    Интерактивная карта подрядчиков по городам России
                  </h1>
                  <p className={styles.overviewText}>
                    Единая платформа для поиска, мониторинга и управления подрядчиками в дорожной
                    отрасли. Контроль загрузки, статусов и эффективности в одном окне.
                  </p>
                </div>
                <div className={styles.overviewStats}>
                  {PAGE2_STATS.map((stat) =>
                    isV2 ? (
                      <Page2StatCardV2
                        key={stat.id}
                        stat={stat}
                        monitorOpen={monitorStatId === stat.id}
                        onOpenMonitor={() => setMonitorStatId(stat.id)}
                      />
                    ) : (
                      <article key={stat.id} className={styles.statItem}>
                        <span className={styles.statTag}>{stat.tag}</span>
                        <div className={styles.statContent}>
                          <span className={styles.statNum}>{stat.value}</span>
                          <p className={styles.statLabel}>{stat.label}</p>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <section className={cx(styles.mapSection, isV2 && "page2-v2-map-stage")}>
                <div className={cx(styles.mapPanel, isV2 && "page2-v2__map-panel")}>
                  <div className={styles.mapFrame}>
                    <p className={cx(styles.mapHint, isV2 && "page2-v2-map-hint")}>
                      Выберите округ на карте, затем субъект — откроется список организаций
                    </p>
                    <div
                      className={`${styles.mapLayout} ${subjectPanelTab ? styles.mapLayoutWithAside : ""}`}
                    >
                      <div className={styles.mapCanvas}>
                        <Suspense fallback={mapFallback}>
                          <RussiaLeafletMap
                            isV2={isV2}
                            selectedDistrict={selectedDistrict}
                            onToggleDistrict={toggleDistrictFromMap}
                            onSubjectClick={handleSubjectClick}
                            activeSubjectName={selectedSubject?.name ?? null}
                            activeCategory={subjectPanelTab}
                            onCategoryChange={handlePanelTabChange}
                            educationLabel={mapLabels.education}
                            contractorsLabel={mapLabels.contractors}
                          />
                        </Suspense>
                      </div>
                      {subjectPanelTab ? (
                        <aside className={cx(styles.subjectAside, isV2 && "page2-v2__subject-panel")}>
                          {isV2 ? (
                            <div className={styles.subjectAsideGlass}>
                              <label className={styles.subjectSearchWrap}>
                                <img
                                  src={ICON_SEARCH}
                                  alt=""
                                  className={styles.subjectSearchIcon}
                                  aria-hidden
                                />
                                <input
                                  type="search"
                                  className={styles.subjectSearch}
                                  placeholder={
                                    subjectPanelTab === "education"
                                      ? "Поиск организаций"
                                      : "Поиск подрядчиков"
                                  }
                                  value={subjectSearchQuery}
                                  onChange={(event) => setSubjectSearchQuery(event.target.value)}
                                />
                              </label>
                              <div className={styles.subjectField}>
                                <span className={styles.subjectFieldLabel}>Раздел</span>
                                <p className={styles.subjectControlPill}>
                                  {subjectPanelTab === "education"
                                    ? mapLabels.education
                                    : mapLabels.contractors}
                                </p>
                              </div>
                              <div className={styles.subjectField}>
                                <span className={styles.subjectFieldLabel}>Регион</span>
                                <p className={styles.subjectControlPill}>
                                  {subjectDisplayName ?? "—"}
                                </p>
                              </div>
                              {subjectName ? (
                                (() => {
                                  const rows =
                                    subjectPanelTab === "education"
                                      ? educationList
                                      : contractorList;
                                  const filteredRows = filterSubjectRows(rows);
                                  if (filteredRows.length === 0) {
                                    return (
                                      <div className={styles.subjectEmpty}>
                                        В этом разделе для выбранного субъекта пока нет
                                        организаций.
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className={styles.subjectList}>
                                      {filteredRows.map((item) => (
                                        <div key={item} className={styles.subjectListItem}>
                                          {item}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className={styles.subjectEmpty}>
                                  Панель заполняется после выбора субъекта.
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className={styles.subjectAsideHead}>
                                <h3 className={styles.subjectAsideTitle}>
                                  {subjectDisplayName
                                    ? `Регион: ${subjectDisplayName}`
                                    : "Выберите субъект на карте"}
                                </h3>
                                <p className={styles.subjectAsideHint}>
                                  {subjectPanelTab === "education"
                                    ? mapLabels.education
                                    : mapLabels.contractors}
                                </p>
                              </div>

                              {subjectName ? (
                                (() => {
                                  const rows =
                                    subjectPanelTab === "education"
                                      ? educationList
                                      : contractorList;
                                  if (rows.length === 0) {
                                    return (
                                      <div className={styles.subjectEmpty}>
                                        Для выбранного субъекта пока нет записей в этом разделе.
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className={styles.subjectList}>
                                      {rows.map((item) => (
                                        <div key={item} className={styles.subjectListItem}>
                                          {item}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className={styles.subjectEmpty}>
                                  Панель заполняется после выбора субъекта.
                                </div>
                              )}
                            </>
                          )}
                        </aside>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>

      {isV2 ? (
        <Page2StatMonitorPopup
          stat={monitorStat}
          open={monitorStatId !== null}
          onClose={() => setMonitorStatId(null)}
        />
      ) : null}

      {showMap && aboutOpen ? (
        <div
          className={styles.aboutOverlay}
          role="presentation"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className={cx(styles.aboutSheet, isV2 && "page2-v2__about-sheet")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.aboutClose}
              onClick={() => setAboutOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className={styles.aboutTabs} role="tablist" aria-label="Разделы">
              <button
                type="button"
                role="tab"
                aria-selected={aboutTab === "portal"}
                className={cx(
                  styles.aboutTabBtn,
                  aboutTab === "portal" && styles.aboutTabBtnActive,
                  aboutTab === "portal" && isV2 && "page2-v2__about-tab--active"
                )}
                onClick={() => setAboutTab("portal")}
              >
                О портале
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aboutTab === "download"}
                className={cx(
                  styles.aboutTabBtn,
                  aboutTab === "download" && styles.aboutTabBtnActive,
                  aboutTab === "download" && isV2 && "page2-v2__about-tab--active"
                )}
                onClick={() => setAboutTab("download")}
              >
                Скачать приложение
              </button>
            </div>
            <div className={styles.aboutBody}>
              {aboutTab === "portal" ? (
                <div>
                  <h2 id="about-dialog-title" className={styles.aboutPortalTitle}>
                    Цифровой портал «ТрассА»
                  </h2>
                  <p className={styles.aboutPortalText}>
                    Комплексное решение для управления персоналом и развития практик в дорожной отрасли: роли
                    сотрудников, обучение, документооборот и взаимодействие участников на одной площадке.
                  </p>
                  <p className={styles.aboutPortalText}>
                    На странице «Карта подрядчиков» вы можете ориентироваться по регионам и находить партнёров по
                    субъектам РФ.
                  </p>
                </div>
              ) : (
                <DesktopDownloadPanel embedded />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default memo(Page2);
