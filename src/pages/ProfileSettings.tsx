import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  loadCabinetTheme,
  loadProfileSettings,
  type ProfileSettingsData,
} from "../profileSettingsStorage";
import { cx } from "../design-system/cabinetChromeClasses";
import { syncCabinetThemeDocument } from "../design-system/syncCabinetThemeDocument";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { buildCabinetChromeThemeV2 } from "../theme/cabinetPalettesV2";
import type { CabinetChromeStyles } from "../components/CabinetChromeLayout";
import { persistProfileToStores } from "../utils/profilePersist";
import {
  isContractorCabinetPath,
  readPortalRole,
  resolveCabinetBase,
  resolveProfileReturnPath,
} from "../utils/profileNavigation";
import {
  ADMIN_CABINET_SEARCH,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import { ICON_AVATAR } from "../assets/appIcons";
import EditableProfileAvatar from "../components/EditableProfileAvatar";
import SpecializationPicker from "../components/SpecializationPicker";
import { specializationTitle } from "../utils/specializationsStorage";

function ProfileSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const portalRole = readPortalRole();
  const fromPath = resolveProfileReturnPath(stateFrom);
  /** Поля кабинета подрядчика — только при входе из кабинета подрядчика (/page4). */
  const showContractorCabinetSection = isContractorCabinetPath(fromPath);
  /** Должность в профиле не редактируется для школьника и студента — роль задаётся категорией входа. */
  const showRoleLabelField =
    portalRole !== "0" &&
    portalRole !== "1" &&
    stateFrom !== "/cabinet-school" &&
    stateFrom !== "/cabinet-spo";
  const showStudentSpecialization = portalRole === "1" || stateFrom === "/cabinet-spo";

  const [form, setForm] = useState<ProfileSettingsData>(() => loadProfileSettings());
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isV2 = usePortalDesign() === "v2";
  /** Тема берётся из того же хранилища, что и переключатель в кабинете (Page5 / Page6). */
  const cabinetTheme = loadCabinetTheme();
  const isDark = cabinetTheme === "dark";

  const styles = useMemo((): CabinetChromeStyles => {
    if (isV2) return buildCabinetChromeThemeV2("/profile", isDark);
    return {
      pageBg: isDark ? "#0f172a" : "#e8edf5",
      text: isDark ? "#f8fafc" : "#1c2b45",
      muted: isDark ? "#a9bfe0" : "#5f728f",
      surfaceBg: isDark ? "#1c2b45" : "#f8fafc",
      cardBg: isDark ? "#16202f" : "#edf3fb",
      sectionBg: isDark ? "#1b2c47" : "#f7faff",
      inputBg: isDark ? "#172636" : "#eef3f8",
      buttonBg: "#243b74",
      buttonText: "#f8fafc",
      cardShadow: isDark
        ? "20px 20px 40px rgba(0, 0, 0, 0.35)"
        : "20px 20px 40px rgba(142, 154, 178, 0.16), -20px -20px 40px rgba(255, 255, 255, 0.9)",
      insetShadow: isDark
        ? "inset 8px 8px 18px rgba(0, 0, 0, 0.24)"
        : "inset 8px 8px 18px rgba(142, 154, 178, 0.16), inset -8px -8px 18px rgba(255, 255, 255, 0.8)",
      plaqueButtonBg: "",
      plaqueButtonText: "",
      plaqueButtonMuted: "",
      plaqueButtonBorder: "",
      plaqueButtonShadow: "",
      plaqueAccentGlow: "",
      plaqueAccentStripe: "",
      plaqueNavActiveBg: "",
      plaqueNavActiveText: "",
      plaqueNavActiveBorder: "",
      plaqueBadgeBg: "",
      plaqueBadgeText: "",
      heroScrimFrom: "",
      heroScrimTo: "",
      headerProfileBg: isDark ? "#14263b" : "#2d4366",
      panelBorder: "",
      tileBorder: "",
      progressTrack: "",
      progressFill: "",
      surfaceHighlight: "",
      controlBorder: "",
    };
  }, [isDark, isV2]);

  useEffect(() => {
    if (isV2) {
      syncCabinetThemeDocument(cabinetTheme);
      return;
    }
    document.body.style.backgroundColor = styles.pageBg;
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [isV2, cabinetTheme, styles.pageBg]);

  useEffect(() => {
    const base = resolveCabinetBase(fromPath);
    if (base === "/page4") void import("./ContractorCabinetPage");
    else if (base === "/page5") void import("./AssociationCabinetPage");
    else if (base === "/page6") void import("./AdoCabinetPage");
    else if (base === "/cabinet-school") void import("./CabinetSchool");
    else if (base === "/cabinet-spo") void import("./CabinetSpo");
  }, [fromPath]);

  const goBack = useCallback(() => {
    navigate(fromPath, { preventScrollReset: true });
  }, [navigate, fromPath]);

  const showReturnToAdmin = shouldShowReturnToAdminDashboard();
  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const handleSave = useCallback(() => {
    void (async () => {
      setSaveError(null);
      try {
        await persistProfileToStores(form);
        window.dispatchEvent(new Event("trassa-profile-saved"));
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2200);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Не удалось сохранить.");
      }
    })();
  }, [form]);

  const patch = useCallback((partial: Partial<ProfileSettingsData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <div
      className={cx(isV2 && "profile-v2 profile-v2__page")}
      style={
        isV2
          ? { color: styles.text }
          : {
              minHeight: "100vh",
              background: styles.pageBg,
              color: styles.text,
              fontFamily: "Inter, sans-serif",
              padding: "24px",
            }
      }
    >
      <div className={cx(isV2 && "profile-v2__inner")} style={isV2 ? undefined : { maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <header
          className={cx(isV2 && "profile-v2__header")}
          style={
            isV2
              ? undefined
              : {
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                  padding: "20px 24px",
                  borderRadius: 28,
                  background: styles.surfaceBg,
                  boxShadow: styles.cardShadow,
                }
          }
        >
          <div className={cx(isV2 && "profile-v2__header-row")} style={isV2 ? undefined : { display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              className={cx(isV2 && "profile-v2__ghost")}
              onClick={goBack}
              style={
                isV2
                  ? { color: styles.text, cursor: "pointer", fontFamily: "inherit" }
                  : {
                      border: "none",
                      cursor: "pointer",
                      borderRadius: 18,
                      padding: "12px 18px",
                      fontWeight: 700,
                      fontSize: 14,
                      color: styles.text,
                      background: styles.sectionBg,
                      boxShadow: styles.cardShadow,
                      fontFamily: "inherit",
                    }
              }
            >
              ← В кабинет
            </button>
            {showReturnToAdmin ? (
              <button
                type="button"
                className={cx(isV2 && "profile-v2__admin-back")}
                onClick={goToAdminCabinet}
                style={
                  isV2
                    ? undefined
                    : {
                        border: "none",
                        cursor: "pointer",
                        borderRadius: 18,
                        padding: "12px 18px",
                        fontWeight: 700,
                        fontSize: 14,
                        color: styles.buttonText,
                        background: styles.buttonBg,
                        boxShadow: styles.cardShadow,
                        fontFamily: "inherit",
                      }
                }
              >
                ← Кабинет администратора
              </button>
            ) : null}
            <h1 className={cx(isV2 && "profile-v2__title")} style={isV2 ? undefined : { margin: 0, fontSize: 22, fontWeight: 800 }}>
              Настройки профиля
            </h1>
          </div>
        </header>

        <div
          className={cx(isV2 && "profile-v2__banner")}
          style={
            isV2
              ? { boxShadow: styles.cardShadow }
              : {
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: 22,
                  borderRadius: 28,
                  background: isDark ? "#14263b" : "#2d4366",
                  color: "#f8fafc",
                  boxShadow: styles.cardShadow,
                }
          }
        >
          <EditableProfileAvatar
            emailNorm={form.email.trim().toLowerCase() || undefined}
            fallbackSrc={ICON_AVATAR}
            wrapClassName={isV2 ? "profile-v2__avatar-wrap" : "editable-profile-avatar__wrap"}
            rootClassName={isV2 ? "profile-v2__avatar" : "profile-legacy-avatar"}
            photoImgClassName="profile-v2__avatar-img--photo"
            imgClassName={isV2 ? "profile-v2__avatar-img" : "profile-legacy-avatar__img"}
            showFallbackWhenEmpty={!isV2}
            displayName={form.firstName.trim() || "Профиль"}
            showHint
            imgSize={72}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {form.firstName.trim() || "Имя не указано"}
            </div>
            {showContractorCabinetSection && form.contractorCompanyName.trim() ? (
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, fontWeight: 600 }}>
                {form.contractorCompanyName.trim()}
              </div>
            ) : null}
          </div>
        </div>

        {showContractorCabinetSection ? (
          <section
            className={cx(isV2 && "profile-v2__card")}
            style={
              isV2
                ? undefined
                : {
                    padding: 26,
                    borderRadius: 28,
                    background: styles.sectionBg,
                    boxShadow: styles.cardShadow,
                  }
            }
          >
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
              КАБИНЕТ ПОДРЯДЧИКА
            </h2>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Наименование организации</span>
              <input
                value={form.contractorCompanyName}
                onChange={(e) => patch({ contractorCompanyName: e.target.value })}
                placeholder="Как на главной странице кабинета подрядчика"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.5, color: styles.muted }}>
              Это наименование отображается на главной в кабинете подрядчика (без подстановки из примера — только ваш текст).
            </p>
          </section>
        ) : null}

        {showStudentSpecialization ? (
          <section
            className={cx(isV2 && "profile-v2__card")}
            style={
              isV2
                ? undefined
                : {
                    padding: 26,
                    borderRadius: 28,
                    background: styles.sectionBg,
                    boxShadow: styles.cardShadow,
                  }
            }
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: styles.muted,
              }}
            >
              СПЕЦИФИКАЦИЯ
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.5, color: styles.muted }}>
              Текущая: <strong>{specializationTitle(form.specializationId)}</strong>. Можно сменить
              направление — вы останетесь в своей подгруппе распределения.
            </p>
            <div style={{ color: styles.text }}>
              <SpecializationPicker
                value={form.specializationId ?? ""}
                onChange={(id) => patch({ specializationId: id })}
                label="Направление"
                hint="Выбор влияет на подгруппу студентов и предложения подрядчикам."
              />
            </div>
          </section>
        ) : null}

          <section
            className={cx(isV2 && "profile-v2__card")}
            style={
              isV2
                ? undefined
                : {
                    padding: 26,
                    borderRadius: 28,
                    background: styles.sectionBg,
                    boxShadow: styles.cardShadow,
                  }
            }
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
            ЛИЧНЫЕ ДАННЫЕ
          </h2>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Имя</span>
              <input
                value={form.firstName}
                onChange={(e) => patch({ firstName: e.target.value })}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Фамилия</span>
              <input
                value={form.lastName}
                onChange={(e) => patch({ lastName: e.target.value })}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            {showRoleLabelField ? (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Должность / роль в системе</span>
                <input
                  value={form.roleLabel}
                  onChange={(e) => patch({ roleLabel: e.target.value })}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "none",
                    fontSize: 15,
                    color: styles.text,
                    background: styles.inputBg,
                    boxShadow: styles.insetShadow,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </label>
            ) : null}
          </div>
        </section>

          <section
            className={cx(isV2 && "profile-v2__card")}
            style={
              isV2
                ? undefined
                : {
                    padding: 26,
                    borderRadius: 28,
                    background: styles.sectionBg,
                    boxShadow: styles.cardShadow,
                  }
            }
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
            КОНТАКТЫ
          </h2>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Электронная почта</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="например@mail.ru"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Телефон</span>
              <input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+7 …"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
          </div>
        </section>

          <section
            className={cx(isV2 && "profile-v2__card")}
            style={
              isV2
                ? undefined
                : {
                    padding: 26,
                    borderRadius: 28,
                    background: styles.sectionBg,
                    boxShadow: styles.cardShadow,
                  }
            }
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
            УВЕДОМЛЕНИЯ
          </h2>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={form.notifyEmail}
              onChange={(e) => patch({ notifyEmail: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 15 }}>Письма о заявках и документах на e-mail</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.notifyPush}
              onChange={(e) => patch({ notifyPush: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 15 }}>Мгновенные уведомления о мероприятиях</span>
          </label>
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            className={cx(isV2 && "profile-v2__save")}
            onClick={handleSave}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              padding: "14px 28px",
              fontWeight: 800,
              fontSize: 15,
              color: styles.buttonText,
              background: styles.buttonBg,
              boxShadow: isV2 ? undefined : styles.insetShadow,
              fontFamily: "inherit",
            }}
          >
            Сохранить
          </button>
          {saveError ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{saveError}</span>
          ) : null}
          {savedFlash ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>Изменения сохранены</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(ProfileSettings);
