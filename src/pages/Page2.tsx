import { useState, useCallback, useEffect, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DesktopDownloadPanel from "../components/DesktopDownloadPanel";
import { isAdminLoggedIn } from "../utils/adminAuth";
import { clearAdminReturnMark } from "../utils/adminReturnNavigation";
import { injectImagePreloads } from "../utils/imagePreload";
import { prefetchRoleSelectRoute } from "../utils/routePrefetch";
import { PAGE2_HEADER_LOGO_SRC } from "../assets/appIcons";
import { publicUrl } from "../utils/publicUrl";
import RussiaLeafletMap from "../components/RussiaLeafletMap";
import { formatSubjectDisplayName, type SubjectMarkerGeo } from "../data/page2MapGeo";
import { loadMapCategoryLabels } from "../utils/mapCategoryLabels";
import { loadMapSubjectOrganizations } from "../utils/mapSubjectOrganizations";
import AdminDashboard from "./AdminDashboard";
import AdminLoginPanel from "./AdminLoginPanel";
import styles from "./Page2.module.css";

type AdminSurface = "map" | "adminLogin" | "adminDashboard";

type AboutTab = "portal" | "download";
type SubjectPanelTab = "education" | "contractors" | null;

/** Страница 2 — карта подрядчиков (маршрут /services), интерактивная карта РФ (Leaflet + OSM). */

const PAGE2_HERO_IMAGE = publicUrl("page2-hero-navy.png");

const PAGE2_PRELOAD_IMAGES = [PAGE2_HEADER_LOGO_SRC, PAGE2_HERO_IMAGE] as const;

const Page2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => isAdminLoggedIn());
  const [adminSurface, setAdminSurface] = useState<AdminSurface>("map");
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectMarkerGeo | null>(null);
  const [subjectPanelTab, setSubjectPanelTab] = useState<SubjectPanelTab>(null);
  const [mapLabels, setMapLabels] = useState(() => loadMapCategoryLabels());
  const [subjectOrgs, setSubjectOrgs] = useState(() => loadMapSubjectOrganizations());
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutTab, setAboutTab] = useState<AboutTab>("portal");

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

  /** Возврат из кабинетов по быстрым ссылкам: /services?adminCabinet=1 → личный кабинет администратора */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("adminCabinet") !== "1") return;
    if (!isAdminLoggedIn()) {
      navigate({ pathname: "/services", search: "" }, { replace: true });
      return;
    }
    setAdminSurface("adminDashboard");
    clearAdminReturnMark();
    navigate({ pathname: "/services", search: "" }, { replace: true });
  }, [location.search, navigate]);

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
      setAdminSurface("adminDashboard");
    } else {
      setAdminSurface("adminLogin");
    }
  }, [adminLoggedIn]);

  const showMap = adminSurface === "map";
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

  return (
    <div
      className={styles.pageRoot}
      style={{ fontFamily: "Montserrat, sans-serif" }}
    >
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <span className={styles.portalLabel}>Цифровой портал</span>
          </div>
          <div className={styles.headerCenter}>
            <span className={styles.headerLogoWrap}>
              <img
                src={PAGE2_HEADER_LOGO_SRC}
                alt=""
                className={styles.headerLogo}
                decoding="async"
                fetchPriority="high"
              />
            </span>
          </div>
          <div className={styles.headerRight}>
            {showMap ? (
              <>
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
                <button type="button" className={styles.btnGradient} onClick={openAdminEntry}>
                  <span className={styles.btnText}>Админ-панель</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => setAdminSurface("map")}
              >
                <span className={styles.btnText}>К карте</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.mainInner}>
        {adminSurface === "adminLogin" ? (
          <AdminLoginPanel
            useParentPageBackground
            onSuccess={() => {
              setAdminLoggedIn(true);
              setAdminSurface("adminDashboard");
            }}
            onCancel={() => setAdminSurface("map")}
          />
        ) : null}
        {adminSurface === "adminDashboard" ? (
          <AdminDashboard
            useParentPageBackground
            onLogout={() => {
              setAdminLoggedIn(false);
              setAdminSurface("map");
            }}
          />
        ) : null}

        {showMap ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroLeft}>
                <h1 className={styles.heroTitle}>
                  Интерактивная карта подрядчиков по городам России
                </h1>
                <p className={styles.heroText}>
                  Нажмите на метку федерального округа, затем на метку субъекта — откроется информация
                  о подрядчиках в регионе. Карта построена на открытых данных и отображается у вас на устройстве
                  без обращения к картографическим API сторонних компаний.
                </p>
                <span className={styles.heroStatsGap} aria-hidden="true" />
                <div className={styles.statsCard}>
                  <div className={styles.statsRow}>
                    <div className={styles.statBlock}>
                      <span className={styles.statNum}>67</span>
                      <span className={styles.statLabel}>подрядчиков</span>
                    </div>
                    <div className={styles.statBlock}>
                      <span className={styles.statNum}>704</span>
                      <span className={styles.statLabel}>требуется человек</span>
                    </div>
                    <div className={styles.statBlock}>
                      <span className={styles.statNum}>874</span>
                      <span className={styles.statLabel}>готовы работать</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.heroRoad}>
                <img
                  src={PAGE2_HERO_IMAGE}
                  alt="Иллюстрация многополосной трассы"
                  className={styles.heroRoadImg}
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </section>

            <section className={styles.mapSection}>
              <div className={styles.mapHeader}>
                <span className={styles.mapTitle}>Карта подрядчиков</span>
                <span className={styles.mapHint}>
                  Нажмите на метку, чтобы увидеть список подрядчиков. Синие крупные точки —
                  федеральные округа; после выбора округа появляются голубые метки субъектов.
                </span>
              </div>

              <div className={`${styles.mapLayout} ${subjectPanelTab ? styles.mapLayoutWithAside : ""}`}>
                <div className={styles.mapCanvas}>
                  <RussiaLeafletMap
                    selectedDistrict={selectedDistrict}
                    onToggleDistrict={toggleDistrictFromMap}
                    onSubjectClick={handleSubjectClick}
                    activeSubjectName={selectedSubject?.name ?? null}
                    activeCategory={subjectPanelTab}
                    onCategoryChange={handlePanelTabChange}
                    educationLabel={mapLabels.education}
                    contractorsLabel={mapLabels.contractors}
                  />
                </div>
                {subjectPanelTab ? (
                  <aside className={styles.subjectAside}>
                    <div className={styles.subjectAsideHead}>
                      <h3 className={styles.subjectAsideTitle}>
                        {subjectDisplayName ? `Регион: ${subjectDisplayName}` : "Выберите субъект на карте"}
                      </h3>
                      <p className={styles.subjectAsideHint}>
                        {subjectPanelTab === "education" ? mapLabels.education : mapLabels.contractors}
                      </p>
                    </div>

                    {subjectName ? (
                      (() => {
                        const rows = subjectPanelTab === "education" ? educationList : contractorList;
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
                      <div className={styles.subjectEmpty}>Панель заполняется после выбора субъекта.</div>
                    )}
                  </aside>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
        </div>
      </main>

      {showMap && aboutOpen ? (
        <div
          className={styles.aboutOverlay}
          role="presentation"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className={styles.aboutSheet}
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
                className={`${styles.aboutTabBtn} ${aboutTab === "portal" ? styles.aboutTabBtnActive : ""}`}
                onClick={() => setAboutTab("portal")}
              >
                О портале
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aboutTab === "download"}
                className={`${styles.aboutTabBtn} ${aboutTab === "download" ? styles.aboutTabBtnActive : ""}`}
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
