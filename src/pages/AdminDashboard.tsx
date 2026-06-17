// @ts-nocheck — recovered from production bundle
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { markNavigationFromAdminDashboard } from "../utils/adminReturnNavigation";
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
  readAdminRouteState,
  type AdminSectionId,
} from "../utils/adminRouteState";
import { isPortalSyncEnabled } from "../utils/portalSync";
import { buildCabinetV2SceneClasses, cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { formatKpiCount, kpiTrendFromCount } from "../utils/kpiCardHelpers";
import AdminSoftTopBar from "../components/admin/AdminSoftTopBar";
import AdminSoftToolbar from "../components/admin/AdminSoftToolbar";
import { PAGE2_HEADER_LOGO_SRC } from "../assets/appIcons";
import { AdminNavIcon, IconMapBack, type AdminNavSection } from "../components/admin/AdminNavIcons";
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
import AdminTablesPanel from "./AdminTablesPanel";
import AdminSpecializationsPanel from "./AdminSpecializationsPanel";
import DesignSystemPreview from "./DesignSystemPreview";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { useContractorOrganizations } from "../hooks/useContractorOrganizations";
import { useMapSubjectOrganizations } from "../hooks/useMapSubjectOrganizations";

const SECTION_HEADINGS = {
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

export default function AdminDashboard({ onLogout: l, useParentPageBackground: n = !1, onBackToMap: o }) {
  const adminLocation = useLocation();
  const adminNavigate = useNavigate();
  const i = isAuthApiEnabled(),
    { users: T, refresh: we } = useAdminUsers(),
    { contractors: Be, refresh: refreshContractors } = useContractorOrganizations(),
    { orgs: a, refresh: refreshMapOrgs } = useMapSubjectOrganizations(),
    [u, f] = useState(() => loadAdminGlassPreferDark(!n)),
    b = !u,
    C = b ? "map" : "dark",
    Z = () => {
      f((t) => {
        const d = !t;
        return (saveAdminGlassPreferDark(d), d);
      });
    };
  const H = getAdminSessionEmail(),
    x = useMemo(() => getAdminCabinetInfo(H), [H]),
    h = usePortalDesign(),
    v = h === "v2",
    V = v && n,
    [maintenanceActive, setMaintenanceActive] = useState(
      () => loadMaintenanceState().active,
    ),
    [I, st] = useState<AdminSectionId>(() => readAdminRouteState(adminLocation.search).tab),
    ra = useMemo(() => {
      const t = [
        { id: "home", label: "Главная" },
        { id: "settings", label: "Настройки" },
        { id: "designSystem", label: "Дизайн-система" },
        { id: "users", label: "Пользователи" },
        { id: "specs", label: "Спецификации" },
        { id: "tables", label: "Таблицы" },
        { id: "map", label: "Карта" },
        { id: "orgs", label: "Подрядчики" },
      ];
      return (
        i && isPortalSyncEnabled() && t.push({ id: "release", label: "Обновления" }),
        i && isPortalSyncEnabled() && t.push({ id: "devices", label: "Выход с устройств" }),
        i && isPortalSyncEnabled() && t.push({ id: "violations", label: "Нарушения" }),
        t.push({ id: "account", label: "Аккаунт" }),
        t
      );
    }, [i]),
    ia = useMemo(() => {
      const t = [
          { id: "users", label: "Пользователи" },
          { id: "specs", label: "Спецификации" },
          { id: "tables", label: "Таблицы" },
          { id: "map", label: "Карта" },
          { id: "orgs", label: "Подрядчики" },
        ],
        d = [
          { id: "settings", label: "Настройки" },
          { id: "designSystem", label: "Дизайн-система" },
        ];
      return (
        i && isPortalSyncEnabled() && d.push({ id: "release", label: "Обновления" }),
        i && isPortalSyncEnabled() && d.push({ id: "devices", label: "Выход с устройств" }),
        i && isPortalSyncEnabled() && d.push({ id: "violations", label: "Нарушения" }),
        d.push({ id: "account", label: "Аккаунт" }),
        [
          {
            id: "main",
            label: "Основное",
            items: [{ id: "home", label: "Главная" }],
          },
          { id: "data", label: "Данные", items: t },
          { id: "system", label: "Система", items: d },
        ]
      );
    }, [i]),
    sa = useMemo(() => {
      const allowed = x.allowedTabIds;
      if (!allowed) return ra;
      const set = new Set(allowed);
      return ra.filter((t) => set.has(t.id));
    }, [ra, x.allowedTabIds]),
    la = useMemo(() => {
      const allowed = x.allowedTabIds;
      if (!allowed) return ia;
      const set = new Set(allowed);
      return ia
        .map((t) => ({ ...t, items: t.items.filter((d) => set.has(d.id)) }))
        .filter((t) => t.items.length > 0);
    }, [ia, x.allowedTabIds]);
  const [softQuery, setSoftQuery] = useState("");
  useEffect(() => {
    const onMaintenance = () => setMaintenanceActive(loadMaintenanceState().active);
    window.addEventListener("trassa-maintenance-changed", onMaintenance);
    return () => window.removeEventListener("trassa-maintenance-changed", onMaintenance);
  }, []);
  (useEffect(() => {
    const route = readAdminRouteState(adminLocation.search);
    if (route.mode === "dashboard" && route.tab !== I) st(route.tab);
  }, [adminLocation.search]),
    useEffect(() => {
      const route = readAdminRouteState(adminLocation.search);
      if (route.mode !== "dashboard") return;
      const nextSearch = buildAdminSearch("dashboard", I);
      if ((adminLocation.search || "") !== nextSearch) {
        adminNavigate({ pathname: "/services", search: nextSearch }, { replace: true });
      }
    }, [I, adminLocation.search, adminNavigate]),
    useEffect(() => {
    I === "release" && !(i && isPortalSyncEnabled()) && st("settings");
    I === "devices" && !(i && isPortalSyncEnabled()) && st("settings");
    I === "violations" && !(i && isPortalSyncEnabled()) && st("settings");
  }, [I, i]),
    useEffect(() => {
      if (!isAdminTabAllowed(x.cabinetId, I, H)) {
        st(x.allowedTabIds?.[0] ?? "home");
      }
    }, [I, x.cabinetId, x.allowedTabIds, H]),
    useEffect(() => {
      // On tab switch, collapsible blocks should always start collapsed.
      setSoftQuery("");
    }, [I]));
  const Xe = useMemo(() => a.filter((t) => t.kind === "education"), [a]),
    Qe = useMemo(() => a.filter((t) => t.kind === "contractors"), [a]),
    St = useMemo(() => {
      const mapTotal = Xe.length + Qe.length;
      const maintOn = maintenanceActive;
      return [
        {
          id: "users",
          label: "Пользователей",
          value: formatKpiCount(T.length),
          trend: kpiTrendFromCount(T.length),
          insight: "Учётные записи с регистрацией на портале.",
        },
        {
          id: "orgs",
          label: "Организаций подрядчиков",
          value: formatKpiCount(Be.length),
          trend: kpiTrendFromCount(Be.length),
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
    }, [T.length, Be.length, Xe.length, Qe.length, maintenanceActive]);
  useEffect(() => {
    if (!i) return;
    const t = () => we(),
      d = window.setInterval(t, 5e3);
    return (
      window.addEventListener("focus", t),
      document.addEventListener("visibilitychange", t),
      () => {
        (window.clearInterval(d),
          window.removeEventListener("focus", t),
          document.removeEventListener("visibilitychange", t));
      }
    );
  }, [i, we]);
  const wt = useCallback(() => {
      (logoutAdmin(), l());
    }, [l]);
  return jsxs("div", {
    className: cx(
      styles.cabinetPage,
      styles.cabinetDashboard,
      glass.themeGlass,
      n && styles.cabinetPageEmbed,
      n && "admin-dashboard-embed",
      b && glass.themeGlassMap,
      v && "admin-dashboard--portal-v2",
      V && "admin-v2-soft",
      v && buildCabinetV2SceneClasses(!b),
      v && b && "admin-v2-scene--light",
      v && !b && "admin-v2-scene--dark",
    ),
    children: [
      jsx("div", {
        className: `${styles.cabinetBg} ${n && b ? styles.cabinetBgTransparent : ""}`,
        "aria-hidden": !0,
      }),
      jsx("div", {
        className: cx(glass.glassShell, "admin-glass-shell"),
        children: jsxs("div", {
          className: cx(glass.glassLayout, "admin-glass-layout"),
          children: [
            jsx("aside", {
              className: cx(
                glass.glassSidebar,
                "admin-glass-sidebar",
                v && "admin-v2-sidebar-col",
              ),
              "aria-label": "Разделы админ-панели",
              children: V
                ? jsx("nav", {
                        className: cx(glass.glassNav, "admin-v2-soft-nav"),
                        children: la.map((t) =>
                          jsxs(
                            "div",
                            {
                              className: "admin-v2-soft-nav-group",
                              children: [
                                jsx("p", {
                                  className: "admin-v2-soft-nav-label",
                                  children: t.label,
                                }),
                                t.items.map((d) =>
                                  jsxs(
                                    "button",
                                    {
                                      type: "button",
                                      className: cx(
                                        glass.glassNavBtn,
                                        "admin-v2-soft-nav-btn",
                                        I === d.id && glass.glassNavBtnActive,
                                        I === d.id && "admin-v2-nav-active",
                                      ),
                                      "aria-current":
                                        I === d.id ? "page" : void 0,
                                      onClick: () => st(d.id),
                                      children: [
                                        jsx("span", {
                                          className: "admin-v2-soft-nav-icon-wrap",
                                          "aria-hidden": !0,
                                          children: jsx(AdminNavIcon, {
                                            section: d.id,
                                            className: "admin-v2-soft-nav-icon",
                                            size: 20,
                                          }),
                                        }),
                                        jsx("span", {
                                          className: "admin-v2-soft-nav-text",
                                          children: d.label,
                                        }),
                                      ],
                                    },
                                    d.id,
                                  ),
                                ),
                              ],
                            },
                            t.id,
                          ),
                        ),
                      })
                : jsx("nav", {
                    className: glass.glassNav,
                    children: sa.map((t) =>
                      jsx(
                        "button",
                        {
                          type: "button",
                          className: cx(
                            glass.glassNavBtn,
                            I === t.id && glass.glassNavBtnActive,
                            v && I === t.id && "admin-v2-nav-active",
                          ),
                          "aria-current": I === t.id ? "page" : void 0,
                          onClick: () => st(t.id),
                          children: t.label,
                        },
                        t.id,
                      ),
                    ),
                  }),
            }),
            jsxs("div", {
              className: cx(
                glass.glassPanel,
                V && "admin-glass-panel",
                v && !V && "admin-v2-panel",
                v && !V && "pv2-card-l1",
                v && b && !V && "admin-v2-panel--light pv2-accent-edge",
              ),
              children: [
                V
                  ? null
                  : jsxs("header", {
                      className: glass.glassPanelHead,
                      children: [
                        jsxs("div", {
                          className: glass.glassPanelIntro,
                          children: [
                            jsxs("p", {
                              className: glass.glassPanelGreeting,
                              children: [
                                "Здравствуйте, ",
                                x.orgLabel ? `${x.displayName} · ${x.orgLabel}` : x.displayName,
                                "!",
                              ],
                            }),
                            jsx("h1", {
                              className: glass.glassPanelTitle,
                              children: SECTION_HEADINGS[I],
                            }),
                            H
                              ? jsx("p", {
                                  className: glass.glassPanelEmail,
                                  children: H,
                                })
                              : null,
                          ],
                        }),
                        jsxs("div", {
                          className: glass.glassPanelHeadActions,
                          children: [
                            jsx("button", {
                              type: "button",
                              className: `${glass.glassBtnTheme} ${u ? glass.glassBtnThemeActive : ""}`,
                              onClick: Z,
                              "aria-label": u ? "Светлая тема" : "Тёмная тема",
                              title: u ? "Светлая тема" : "Тёмная тема",
                              children: jsx(IconTheme, {
                                className: glass.glassBtnThemeIcon,
                              }),
                            }),
                            jsx("button", {
                              type: "button",
                              className: glass.glassBtnLogout,
                              onClick: wt,
                              "aria-label": "Выйти",
                              title: "Выйти",
                              children: jsx(IconLogout, {
                                className: glass.glassBtnLogoutIcon,
                              }),
                            }),
                          ],
                        }),
                      ],
                    }),
                jsxs("div", {
                  className: glass.glassPanelScroll,
                  children: [
                    V
                      ? jsx(AdminSoftTopBar, {
                          displayName: x.orgLabel
                            ? `${x.displayName} · ${x.orgLabel}`
                            : x.displayName,
                          email: H,
                          sectionTitle: SECTION_HEADINGS[I],
                          preferLight: u,
                          onThemeToggle: Z,
                          onLogout: wt,
                          onBackToMap: o,
                        })
                      : null,
                    jsx("div", {
                      className: V ? "admin-soft-content-card" : void 0,
                      children: [
                    I === "home"
                      ? jsx(AdminHomePanelSection, {
                          kpiItems: St,
                          glassVariant: C,
                          apiEnabled: i,
                          userCreatedAtList: T.map((u) => u.createdAt),
                          activeSection: I,
                        })
                      : null,
                    I === "designSystem" ? jsx(DesignSystemPreview, { glassTone: C }) : null,
                    I === "settings"
                      ? jsx(AdminSettingsPanelSection, { glassTone: C })
                      : null,
                    I === "orgs"
                      ? jsx(AdminContractorsPanelSection, {
                          contractors: Be,
                          onRefresh: refreshContractors,
                          mapSubjectOrgs: a,
                          softUi: V,
                          searchQuery: softQuery,
                          onSearchChange: setSoftQuery,
                        })
                      : null,
                    I === "release" && i && isPortalSyncEnabled()
                      ? jsx(AdminReleasePanelSection, {})
                      : null,
                    I === "map"
                      ? jsx(AdminMapPanelSection, {
                          mapOrgs: a,
                          onRefresh: refreshMapOrgs,
                          softUi: V,
                          searchQuery: softQuery,
                          onSearchChange: setSoftQuery,
                          activeSection: I,
                        })
                      : null,
                    I === "specs" ? jsx(AdminSpecializationsPanel, {}) : null,
                    I === "tables" ? jsx(AdminTablesPanel, {}) : null,
                    I === "users"
                      ? jsx(AdminUsersPanelSection, {
                          users: T,
                          onRefresh: we,
                          apiEnabled: i,
                          softUi: V,
                          searchQuery: softQuery,
                          onSearchChange: setSoftQuery,
                        })
                      : null,
                    I === "devices"
                      ? jsx(AdminDevicesSection, {
                          sectionClass: styles.section,
                          titleClass: styles.sectionTitle,
                          glassHintClass: styles.hint,
                          errorClass: styles.error,
                          btnPrimaryClass: styles.btnNeoPrimary,
                          btnSecondaryClass: styles.btnNeoPrimaryNeutral,
                        })
                      : null,
                    I === "violations"
                      ? jsx(AdminViolationsSection, {
                          sectionClass: styles.section,
                          titleClass: styles.sectionTitle,
                          glassHintClass: styles.hint,
                          errorClass: styles.error,
                          btnPrimaryClass: styles.btnNeoPrimary,
                          btnSecondaryClass: styles.btnNeoPrimaryNeutral,
                        })
                      : null,
                    I === "account" ? jsx(AdminAccountPanelSection, {}) : null,
                    ],
                  }),
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
