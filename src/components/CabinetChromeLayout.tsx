import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ProfileSettingsData } from "../profileSettingsStorage";
import { loadCabinetTheme, loadProfileSettings, saveCabinetTheme } from "../profileSettingsStorage";
import { AiChatBubble } from "./AiChatBubble";
import { getHoverTooltipPreset, HoverTooltip } from "./HoverTooltip";
import { Page5MessengerView } from "../pages/Page5MessengerView";
import { injectImagePreloads } from "../utils/imagePreload";
import { ensureMessengerUidInProfile } from "../utils/messengerInvite";
import {
  MESSENGER_PEERS_KEY,
  MESSENGER_STORE_KEY,
  saveMessengerStore,
} from "../utils/messengerStorage";
import { isMessengerHiddenForMe } from "../utils/messengerHiddenForMe";
import {
  applyMessengerInvitePayload,
  decodeMessengerInvite,
  MSGR_INVITE_PARAM,
} from "../utils/messengerInvite";
import {
  ADMIN_CABINET_SEARCH,
  clearAdminReturnMark,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import { buildCabinetChromeTheme } from "../theme/cabinetPalettes";
import {
  APP_LOGO_SRC,
  CABINET_CHROME_PRELOAD_IMAGES,
  CABINET_HERO_BG,
  ICON_AVATAR,
  ICON_LOGOUT,
  ICON_PROFILE_CHEVRON,
  ICON_SEARCH,
  ICON_THEME,
} from "../assets/appIcons";

export { CABINET_CHROME_PRELOAD_IMAGES };

export type CabinetSection = "dashboard" | "messenger";

const MSGR_SEEN_KEY = "trassa-msgr-seen";

function readMessengerSeenAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const n = Number(localStorage.getItem(MSGR_SEEN_KEY));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return Date.now();
}

function scanMessengerInboxUnread(seenAt: number): boolean {
  const myUid = ensureMessengerUidInProfile();
  try {
    const raw = localStorage.getItem("trassa-messenger-v1");
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<
      string,
      Array<{ author: string; createdAt: string; id?: string }>
    >;
    for (const tid of Object.keys(data)) {
      for (const m of data[tid] ?? []) {
        if (m.author !== myUid && new Date(m.createdAt).getTime() > seenAt) {
          if (m.id && isMessengerHiddenForMe(tid, m.id)) continue;
          return true;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

function injectMessengerTestIncoming(): void {
  try {
    let peerId = "p1";
    const pr = localStorage.getItem(MESSENGER_PEERS_KEY);
    if (pr) {
      const peers = JSON.parse(pr) as Array<{ id: string }>;
      if (Array.isArray(peers) && peers[0]?.id) peerId = peers[0].id;
    }
    const raw = localStorage.getItem(MESSENGER_STORE_KEY);
    const data = (raw ? JSON.parse(raw) : {}) as Record<
      string,
      Array<{ id: string; threadId: string; author: string; text: string; createdAt: string }>
    >;
    const arr = data[peerId] ?? [];
    const msg = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      threadId: peerId,
      author: peerId,
      text: "Привет! Это тестовое входящее — проверка индикатора на иконке мессенджера.",
      createdAt: new Date().toISOString(),
    };
    data[peerId] = [...arr, msg];
    saveMessengerStore(data as Record<string, unknown>);
  } catch {
    /* ignore */
  }
}

export type CabinetChromeStyles = {
  pageBg: string;
  text: string;
  muted: string;
  surfaceBg: string;
  cardBg: string;
  sectionBg: string;
  inputBg: string;
  buttonBg: string;
  buttonText: string;
  cardShadow: string;
  insetShadow: string;
  /** Плашки-кнопки: приглушённые — светлая тема холодный серо-голубой; тёмная — приподнятый сланец */
  plaqueButtonBg: string;
  plaqueButtonText: string;
  plaqueButtonMuted: string;
  plaqueButtonBorder: string;
  plaqueButtonShadow: string;
  /** Акцентная подсветка/штрих для плашек-кнопок (контент, не хедер) */
  plaqueAccentGlow: string;
  plaqueAccentStripe: string;
  /** Выбранный пункт навигации в боковой колонке */
  plaqueNavActiveBg: string;
  plaqueNavActiveText: string;
  plaqueNavActiveBorder: string;
  /** Метка-счётчик на фоне плашки (напр. «Главная») */
  plaqueBadgeBg: string;
  plaqueBadgeText: string;
  /** Затемнение героя (два стопа linear-gradient) */
  heroScrimFrom: string;
  heroScrimTo: string;
  /** Градиент блока профиля в шапке */
  headerProfileBg: string;
  /** Рамка крупных панелей (контент, списки) */
  panelBorder: string;
  /** Рамка карточек / плиток в сетке */
  tileBorder: string;
  /** Фон дорожки прогресса */
  progressTrack: string;
  /** Заливка прогресса (цвет или gradient) */
  progressFill: string;
  /** Светлая вставка на тёмном фоне (активный блок и т.п.) */
  surfaceHighlight: string;
  /** Рамка кнопок вторичного уровня, полей */
  controlBorder: string;
};

export type CabinetChromeContext = {
  styles: CabinetChromeStyles;
  layoutStyles: Record<string, CSSProperties>;
  isDark: boolean;
  profilePlaque: ProfileSettingsData;
  plaqueName: string;
};

type Props = {
  cabinetPath: string;
  children: (ctx: CabinetChromeContext) => ReactNode;
};

function CabinetChromeLayout({ cabinetPath, children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => loadCabinetTheme());
  const [profilePlaque, setProfilePlaque] = useState(() => loadProfileSettings());
  const [cabinetSection, setCabinetSection] = useState<CabinetSection>("dashboard");
  const [messengerSeenAt, setMessengerSeenAt] = useState(() => readMessengerSeenAt());
  const [messengerHasUnread, setMessengerHasUnread] = useState(() =>
    typeof window !== "undefined" ? scanMessengerInboxUnread(readMessengerSeenAt()) : false
  );
  const [messengerMountKey, setMessengerMountKey] = useState(0);
  const messengerEnabled = cabinetPath !== "/cabinet-school" && cabinetPath !== "/cabinet-spo";

  const isDark = theme === "dark";

  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const styles = useMemo(() => buildCabinetChromeTheme(cabinetPath, isDark), [cabinetPath, isDark]);

  useEffect(() => {
    saveCabinetTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncProfile = () => setProfilePlaque(loadProfileSettings());
    window.addEventListener("trassa-profile-saved", syncProfile);
    window.addEventListener("focus", syncProfile);
    return () => {
      window.removeEventListener("trassa-profile-saved", syncProfile);
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  useEffect(() => {
    return injectImagePreloads([...CABINET_CHROME_PRELOAD_IMAGES]);
  }, []);

  useEffect(() => {
    document.body.style.background = styles.pageBg;
  }, [styles.pageBg]);

  const recalcMessengerBadge = useCallback(() => {
    if (!messengerEnabled) {
      setMessengerHasUnread(false);
      return;
    }
    if (cabinetSection === "messenger") {
      setMessengerHasUnread(false);
      return;
    }
    setMessengerHasUnread(scanMessengerInboxUnread(messengerSeenAt));
  }, [cabinetSection, messengerSeenAt, messengerEnabled]);

  useEffect(() => {
    recalcMessengerBadge();
  }, [recalcMessengerBadge]);

  useEffect(() => {
    if (!messengerEnabled) return;
    const onUpd = () => recalcMessengerBadge();
    window.addEventListener("trassa-messenger-updated", onUpd);
    return () => window.removeEventListener("trassa-messenger-updated", onUpd);
  }, [recalcMessengerBadge, messengerEnabled]);

  useEffect(() => {
    if (!messengerEnabled) return;
    if (cabinetSection !== "messenger") return;
    const t = Date.now();
    try {
      localStorage.setItem(MSGR_SEEN_KEY, String(t));
    } catch {
      /* ignore */
    }
    setMessengerSeenAt(t);
    setMessengerHasUnread(false);
  }, [cabinetSection, messengerEnabled]);

  useEffect(() => {
    if (!messengerEnabled) return;
    const sp = new URLSearchParams(location.search);
    const t = sp.get(MSGR_INVITE_PARAM);
    if (!t) return;
    const data = decodeMessengerInvite(t);
    if (!data) {
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    applyMessengerInvitePayload(data);
    setCabinetSection("messenger");
    setMessengerMountKey((k) => k + 1);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate, messengerEnabled]);

  useEffect(() => {
    if (messengerEnabled) return;
    if (cabinetSection === "messenger") {
      setCabinetSection("dashboard");
    }
  }, [messengerEnabled, cabinetSection]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const goToProfile = useCallback(() => {
    navigate("/profile", { state: { from: location.pathname } });
  }, [navigate, location.pathname]);

  const goToRoleSelection = useCallback(() => {
    clearAdminReturnMark();
    navigate("/page3");
  }, [navigate]);

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const plaqueName = profilePlaque.firstName.trim() || "Пользователь";

  const mainRegion = useMemo(
    () => ({
      flex: 1,
      minHeight: 0,
      width: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
      boxSizing: "border-box" as const,
    }),
    []
  );

  const layoutStyles = useMemo<Record<string, CSSProperties>>(
    () => ({
      root: {
        minHeight: "100vh",
        background: styles.pageBg,
        color: styles.text,
        fontFamily: "\"Montserrat\", \"Segoe UI\", Roboto, Arial, sans-serif",
        padding: 24,
        transition: "background 0.35s ease, color 0.35s ease",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      },
      container: {
        maxWidth: 1400,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        flex: 1,
        minHeight: 0,
        width: "100%",
      },
      main: {
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: 30,
        alignItems: "start",
      },
      aside: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 28,
        borderRadius: 34,
        background: styles.sectionBg,
        boxShadow: styles.cardShadow,
        backdropFilter: "blur(22px) saturate(120%)",
        WebkitBackdropFilter: "blur(22px) saturate(120%)",
        border: styles.panelBorder,
      },
      sideCard: {
        borderRadius: 30,
        background: styles.cardBg,
        padding: 24,
        boxShadow: styles.cardShadow,
        color: styles.text,
        border: styles.tileBorder,
        backdropFilter: "blur(20px) saturate(118%)",
        WebkitBackdropFilter: "blur(20px) saturate(118%)",
      },
      sideBlock: {
        width: "100%",
        borderRadius: 30,
        padding: "22px 20px",
        minHeight: 112,
        background: `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`,
        border: styles.plaqueButtonBorder,
        color: styles.plaqueButtonText,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: `${styles.plaqueButtonShadow}, ${styles.plaqueAccentGlow}`,
        backdropFilter: "blur(24px) saturate(124%)",
        WebkitBackdropFilter: "blur(24px) saturate(124%)",
      },
      section: { display: "flex", flexDirection: "column", gap: 24, minWidth: 0 },
      heroCard: {
        borderRadius: 32,
        overflow: "hidden",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 28,
        backgroundImage:
          "linear-gradient(180deg, rgba(" +
          (isDark ? "15,23,42,0.65" : "46,69,108,0.55") +
          ") 0%, rgba(" +
          (isDark ? "15,23,42,0.65" : "34,56,88,0.55") +
          ") 100%), url('" +
          CABINET_HERO_BG +
          "')",
        backgroundSize: "115%",
        backgroundPosition: "center 40%",
        filter: "brightness(1.08)",
        boxShadow: styles.cardShadow,
        color: "#ffffff",
      },
      heroTag: {
        background: "rgba(255,255,255,0.16)",
        border: "1px solid rgba(255,255,255,0.24)",
        color: "#ffffff",
        borderRadius: 9999,
        padding: "10px 18px",
        cursor: "pointer",
      },
      heroButton: {
        background: "#ffffff",
        border: "none",
        borderRadius: 9999,
        padding: 12,
        cursor: "pointer",
      },
      heroTitle: {
        fontSize: 42,
        fontWeight: 800,
        lineHeight: 1.05,
        maxWidth: 520,
        color: "#ffffff",
      },
      heroTitleEmpty: {
        fontSize: 22,
        fontWeight: 600,
        lineHeight: 1.2,
        maxWidth: 480,
        color: "rgba(255,255,255,0.72)",
      },
      infoCard: {
        borderRadius: 30,
        padding: 26,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        color: styles.text,
        border: styles.tileBorder,
        backdropFilter: "blur(20px) saturate(115%)",
        WebkitBackdropFilter: "blur(20px) saturate(115%)",
      },
      infoLabel: {
        fontSize: 12,
        color: styles.muted,
        marginBottom: 8,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      },
      infoTitle: {
        fontSize: 28,
        fontWeight: 800,
        marginBottom: 10,
        letterSpacing: "-0.01em",
      },
      infoText: {
        fontSize: 14,
        color: styles.muted,
        lineHeight: 1.6,
      },
      actionCard: {
        width: "100%",
        borderRadius: 30,
        padding: "24px 22px",
        minHeight: 120,
        background: `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`,
        border: styles.plaqueButtonBorder,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: `${styles.plaqueButtonShadow}, ${styles.plaqueAccentGlow}`,
        color: styles.plaqueButtonText,
        backdropFilter: "blur(24px) saturate(124%)",
        WebkitBackdropFilter: "blur(24px) saturate(124%)",
      },
      recentPanel: {
        borderRadius: 34,
        padding: 28,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        display: "grid",
        gap: 22,
        border: styles.panelBorder,
        backdropFilter: "blur(20px) saturate(116%)",
        WebkitBackdropFilter: "blur(20px) saturate(116%)",
      },
      recentTitle: {
        fontSize: 22,
        fontWeight: 800,
        color: styles.text,
        letterSpacing: "-0.01em",
      },
    }),
    [styles, isDark]
  );

  const ctx = useMemo<CabinetChromeContext>(
    () => ({
      styles,
      layoutStyles,
      isDark,
      profilePlaque,
      plaqueName,
    }),
    [styles, layoutStyles, isDark, profilePlaque, plaqueName]
  );

  return (
    <div style={layoutStyles.root}>
      <div style={layoutStyles.container}>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 20,
            padding: "24px 28px",
            borderRadius: 32,
            background: styles.surfaceBg,
            boxShadow: styles.cardShadow,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            {shouldShowReturnToAdminDashboard() ? (
              <button
                type="button"
                onClick={goToAdminCabinet}
                style={{
                  border: "1px solid rgba(36, 59, 116, 0.35)",
                  background: styles.sectionBg,
                  color: styles.text,
                  borderRadius: 22,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: styles.insetShadow,
                  whiteSpace: "nowrap",
                }}
              >
                ← Кабинет администратора
              </button>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 22,
                background: styles.sectionBg,
                boxShadow: styles.insetShadow,
                minWidth: 200,
                height: 38,
              }}
            >
              <img
                decoding="async"
                src={ICON_SEARCH}
                alt=""
                style={{ width: 18, height: 18 }}
              />
              <input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Поиск…"
                style={{
                  width: 140,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: styles.text,
                  fontSize: 14,
                  lineHeight: "18px",
                  height: "100%",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              decoding="async"
              fetchPriority="high"
              src={APP_LOGO_SRC}
              alt="Логотип"
              style={{ width: 160, height: 26, objectFit: "contain" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
            {messengerEnabled ? (
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={
                  <span style={{ whiteSpace: "nowrap" }}>
                    {cabinetSection === "messenger"
                      ? "Свернуть мессенджер"
                      : messengerHasUnread
                        ? "Открыть мессенджер — есть непрочитанные"
                        : "Открыть мессенджер"}
                  </span>
                }
              >
                <div style={{ position: "relative", display: "inline-flex" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"))
                    }
                    aria-label="Мессенджер"
                    style={{
                      border: "none",
                      background:
                        cabinetSection === "messenger"
                          ? isDark
                            ? "rgba(79, 128, 243, 0.35)"
                            : "rgba(36, 59, 116, 0.92)"
                          : styles.buttonBg,
                      padding: 12,
                      borderRadius: "50%",
                      cursor: "pointer",
                      boxShadow:
                        cabinetSection === "messenger"
                          ? `${styles.insetShadow}, 0 0 0 2px rgba(79, 128, 243, 0.65)`
                          : styles.insetShadow,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                        stroke="#f8fafc"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {messengerHasUnread && cabinetSection !== "messenger" ? (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#f87171",
                        boxShadow: isDark
                          ? "0 0 0 2px #1c2b45, 0 2px 6px rgba(0,0,0,0.4)"
                          : "0 0 0 2px #f8fafc, 0 2px 6px rgba(15,23,42,0.2)",
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                </div>
              </HoverTooltip>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 22,
                background: isDark
                  ? "linear-gradient(145deg, #243b74 0%, #1f3363 48%, #1a2a52 100%)"
                  : "linear-gradient(145deg, #3d5a9e 0%, #2d4366 50%, #243b74 100%)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 26px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(146, 170, 224, 0.26)"
                  : "inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 22px rgba(36, 59, 116, 0.28), 0 0 0 1px rgba(255,255,255,0.2)",
              }}
            >
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>Светлая или тёмная тема оформления</span>}
              >
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  aria-label="Переключить тему"
                  style={{
                    border: "none",
                    background: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)",
                    padding: 8,
                    borderRadius: 12,
                    cursor: "pointer",
                    boxShadow: isDark
                      ? "inset 0 1px 0 rgba(255,255,255,0.18)"
                      : "inset 0 1px 0 rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    decoding="async"
                    src={ICON_THEME}
                    alt=""
                    style={{ width: 22, height: 22, display: "block" }}
                  />
                </button>
              </HoverTooltip>
              <button
                type="button"
                onClick={goToProfile}
                aria-label="Профиль"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "2px 4px",
                  fontFamily: "inherit",
                }}
              >
                <img
                  decoding="async"
                  fetchPriority="high"
                  src={ICON_AVATAR}
                  alt=""
                  width={30}
                  height={30}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {plaqueName}
                </span>
                <img
                  decoding="async"
                  src={ICON_PROFILE_CHEVRON}
                  alt=""
                  width={16}
                  height={16}
                  style={{ flexShrink: 0, display: "block" }}
                />
              </button>
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>Выйти / сменить роль</span>}
              >
                <button
                  type="button"
                  onClick={goToRoleSelection}
                  aria-label="Выйти"
                  style={{
                    border: "none",
                    background: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)",
                    padding: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: 12,
                    boxShadow: isDark
                      ? "inset 0 1px 0 rgba(255,255,255,0.18)"
                      : "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  <img decoding="async" src={ICON_LOGOUT} alt="" width={22} height={22} />
                </button>
              </HoverTooltip>
            </div>
          </div>
        </header>

        {cabinetSection === "messenger" ? (
          <main style={mainRegion}>
            <Page5MessengerView
              key={messengerMountKey}
              styles={styles}
              isDark={isDark}
              cabinetPath={cabinetPath}
            />
          </main>
        ) : (
          children(ctx)
        )}
      </div>
      <AiChatBubble isDark={isDark} />
    </div>
  );
}

export default memo(CabinetChromeLayout);
