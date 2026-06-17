import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PORTAL_KV } from "../../config/portalKeys";
import { fetchPortalKv } from "../../api/portalApi";
import { getAdminApiToken } from "../../api/adminApi";
import { isAuthApiEnabled } from "../../utils/authMode";
import { clearSharedCalendarEvents, resetMessengerLocalData } from "../../utils/adminDemoData";
import { loadMaintenanceState, saveMaintenanceState } from "../../utils/maintenanceMode";
import { isPortalSyncEnabled, migrateLocalPortalStateToServer, pushPortalKvWithAck } from "../../utils/portalSync";
import { getPortalDesign, setPortalDesign } from "../../design-system/portalDesign";
import { setPage2BackgroundMode, type Page2BackgroundMode } from "../../design-system/page2BackgroundMode";
import {
  applyMyDesignPreset,
  captureCurrentDesignPreset,
  formatMyDesignPresetWhen,
  loadMyDesignPreset,
  saveMyDesignPresetLocal,
  type PortalMyDesignPreset,
} from "../../design-system/portalDesignMyPreset";
import { usePortalDesign } from "../../design-system/usePortalDesign";
import { usePage2BackgroundMode } from "../../design-system/usePage2BackgroundMode";
import {
  getUiSoundsEnabled,
  isDesktopShell,
  setUiSoundsEnabled,
  UI_SOUNDS_CHANGED,
} from "../../utils/desktopUiFeedback";
import Page2BackgroundModePicker from "./Page2BackgroundModePicker";
import AdminPresentationPanel from "./AdminPresentationPanel";
import GlassToggle from "./GlassToggle";
import GlassCard from "./GlassCard";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";

type Props = {
  glassTone: "map" | "dark";
};

export default function AdminSettingsSection({ glassTone }: Props) {
  const apiEnabled = isAuthApiEnabled();
  const portalDesign = usePortalDesign();
  const portalV2 = portalDesign === "v2";
  const page2Bg = usePage2BackgroundMode();
  const desktopShell = isDesktopShell();

  const [maintenance, setMaintenance] = useState(loadMaintenanceState);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [designMessage, setDesignMessage] = useState<string | null>(null);
  const [designSuccess, setDesignSuccess] = useState(false);
  const [designBusy, setDesignBusy] = useState(false);
  const [presetSavedAt, setPresetSavedAt] = useState(
    () => loadMyDesignPreset()?.savedAt ?? null,
  );
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState<string | null>(null);
  const [uiSounds, setUiSounds] = useState(() => getUiSoundsEnabled());
  const [tab, setTab] = useState<"general" | "presentation">("general");

  useEffect(() => {
    const onSounds = () => setUiSounds(getUiSoundsEnabled());
    window.addEventListener(UI_SOUNDS_CHANGED, onSounds);
    return () => window.removeEventListener(UI_SOUNDS_CHANGED, onSounds);
  }, []);

  const pushDesignPreset = useCallback(
    async (preset: PortalMyDesignPreset) => {
      if (!apiEnabled || !isPortalSyncEnabled()) return { ok: true as const };
      if (!getAdminApiToken()) {
        return { ok: false as const, error: "Нет токена администратора. Выйдите и войдите снова." };
      }
      const r1 = await pushPortalKvWithAck(PORTAL_KV.MY_DESIGN_PRESET, preset);
      if (!r1.ok) return r1;
      const r2 = await pushPortalKvWithAck(PORTAL_KV.PORTAL_DESIGN, preset.portalDesign);
      if (!r2.ok) return r2;
      const r3 = await pushPortalKvWithAck(PORTAL_KV.PAGE2_BG_MODE, preset.page2BgMode);
      if (!r3.ok) return r3;
      const r4 = await pushPortalKvWithAck(PORTAL_KV.SEASON_BG, preset.seasonBg);
      return r4.ok ? { ok: true as const } : r4;
    },
    [apiEnabled],
  );

  const onSaveCurrentDesign = useCallback(async () => {
    if (
      !window.confirm(
        "Сохранить дизайн, который сейчас на экране?\n\nЗапомнятся: legacy/v2, фон Page2, сезонная анимация. На ПК разработчика для CSS: npm run design:pin.",
      )
    ) {
      return;
    }
    setDesignBusy(true);
    setDesignMessage(null);
    setDesignSuccess(false);
    const preset = captureCurrentDesignPreset();
    saveMyDesignPresetLocal(preset);
    setPresetSavedAt(preset.savedAt);
    const res = await pushDesignPreset(preset);
    setDesignBusy(false);
    if (!res.ok) {
      setDesignMessage(
        `Сохранено на этом устройстве (${formatMyDesignPresetWhen(preset.savedAt)}). Сервер: ${res.error}`,
      );
      return;
    }
    setDesignSuccess(true);
    setDesignMessage(
      `Ваш дизайн сохранён (${formatMyDesignPresetWhen(preset.savedAt)}): ${preset.portalDesign}, фон Page2 — ${preset.page2BgMode}.`,
    );
  }, [pushDesignPreset]);

  const onRestoreDesign = useCallback(async () => {
    let preset = loadMyDesignPreset();
    if (!preset && apiEnabled && isPortalSyncEnabled()) {
      const remote = await fetchPortalKv(PORTAL_KV.MY_DESIGN_PRESET);
      if (remote.ok && remote.value && typeof remote.value === "object") {
        const v = remote.value as PortalMyDesignPreset;
        if (v.version === 1 && v.savedAt && v.portalDesign && v.page2BgMode && v.seasonBg) {
          preset = v;
          saveMyDesignPresetLocal(preset);
          setPresetSavedAt(preset.savedAt);
        }
      }
    }
    if (!preset) {
      setDesignMessage(
        "Сначала нажмите «Сохранить мой текущий дизайн», пока вид вас устраивает. Для файлов CSS: npm run design:pin.",
      );
      setDesignSuccess(false);
      return;
    }
    if (
      !window.confirm(
        `Вернуть сохранённый дизайн от ${formatMyDesignPresetWhen(preset.savedAt)}?\n\n${preset.portalDesign}, Page2: ${preset.page2BgMode}, сезон: ${preset.seasonBg}.`,
      )
    ) {
      return;
    }
    setDesignBusy(true);
    setDesignMessage(null);
    setDesignSuccess(false);
    applyMyDesignPreset(preset);
    const res = await pushDesignPreset(preset);
    setDesignBusy(false);
    if (!res.ok) {
      setDesignMessage(`Применено локально. Сервер: ${res.error}`);
      return;
    }
    setDesignSuccess(true);
    setDesignMessage(`Ваш сохранённый дизайн восстановлен (${formatMyDesignPresetWhen(preset.savedAt)}).`);
  }, [apiEnabled, pushDesignPreset]);

  const onPortalDesignToggle = useCallback(
    async (enabled: boolean) => {
      const next = enabled ? "v2" : "legacy";
      const prev = getPortalDesign();
      setPortalDesign(next);
      setDesignMessage(null);
      setDesignSuccess(false);
      if (!apiEnabled || !isPortalSyncEnabled()) {
        setDesignMessage("Сохранено только на этом устройстве (API выключен).");
        return;
      }
      if (!getAdminApiToken()) {
        setPortalDesign(prev);
        setDesignMessage("Нет сессии API администратора. Выйдите из админки и войдите снова.");
        return;
      }
      const res = await pushPortalKvWithAck(PORTAL_KV.PORTAL_DESIGN, next);
      if (!res.ok) {
        setPortalDesign(prev);
        setDesignMessage(`Не сохранено на сервере: ${res.error}`);
        return;
      }
      setDesignSuccess(true);
      setDesignMessage(
        next === "v2"
          ? "Дизайн v2 включён для всех устройств."
          : "Классический дизайн (legacy) для всех устройств.",
      );
    },
    [apiEnabled],
  );

  const onPage2BgChange = useCallback(
    async (mode: Page2BackgroundMode) => {
      setPage2BackgroundMode(mode);
      setDesignMessage(null);
      setDesignSuccess(false);
      if (!apiEnabled || !isPortalSyncEnabled()) return;
      if (!getAdminApiToken()) {
        setDesignMessage("Нет сессии API администратора. Выйдите из админки и войдите снова.");
        return;
      }
      const res = await pushPortalKvWithAck(PORTAL_KV.PAGE2_BG_MODE, mode);
      if (!res.ok) setDesignMessage(res.error);
    },
    [apiEnabled],
  );

  const onMaintenanceToggle = useCallback((active: boolean) => {
    const next = { ...maintenance, active };
    setMaintenance(next);
    setMaintenanceError(null);
    void saveMaintenanceState(next).then((res) => {
      if (!res.ok) setMaintenanceError(`Не удалось сохранить на сервере: ${res.error}`);
    });
  }, [maintenance]);

  const onMaintenanceMessage = useCallback((message: string) => {
    const next = { ...maintenance, message };
    setMaintenance(next);
    setMaintenanceError(null);
    void saveMaintenanceState(next).then((res) => {
      if (!res.ok) setMaintenanceError(`Не удалось сохранить на сервере: ${res.error}`);
    });
  }, [maintenance]);

  return (
    <>
      <div className="admin-settings-tabs" role="tablist" aria-label="Разделы настроек">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "general"}
          className={`admin-settings-tabs__tab${tab === "general" ? " admin-settings-tabs__tab--active" : ""}`}
          onClick={() => setTab("general")}
        >
          Общие
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "presentation"}
          className={`admin-settings-tabs__tab${tab === "presentation" ? " admin-settings-tabs__tab--active" : ""}`}
          onClick={() => setTab("presentation")}
        >
          Презентация
        </button>
      </div>

      {tab === "presentation" ? (
        <AdminPresentationPanel
          glassHintClass={styles.hint}
          errorClass={styles.error}
          btnPrimaryClass={styles.btnNeoPrimary}
          btnSecondaryClass={styles.btnNeoPrimaryNeutral}
        />
      ) : (
        <>
          <div className={glass.glassGrid}>
            <GlassCard tone={glassTone}>
              <GlassToggle
                tone={glassTone}
                label="Режим технических работ"
                subLabel="Страницы портала недоступны, кроме карты /services"
                checked={maintenance.active}
                onChange={onMaintenanceToggle}
              />
              <textarea
                className={glass.glassTextarea}
                value={maintenance.message}
                onChange={(e) => onMaintenanceMessage(e.target.value)}
                placeholder="Текст для пользователей"
              />
              {maintenanceError ? <p className={styles.error}>{maintenanceError}</p> : null}
            </GlassCard>

            <GlassCard tone={glassTone}>
              <GlassToggle
                tone={glassTone}
                id="admin-portal-design-v2"
                label="Новый дизайн портала (glass v2)"
                subLabel="Teal/cyan glass для кабинетов, входа и главной. Выключено — классический бордо/синий (legacy). Синхронизируется на все устройства через сервер."
                checked={portalV2}
                onChange={(v) => void onPortalDesignToggle(v)}
              />
              <div className={styles.rowBtns} style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className={styles.btnNeoPrimary}
                  disabled={designBusy}
                  onClick={() => void onSaveCurrentDesign()}
                >
                  {designBusy ? "Сохранение…" : "Сохранить мой текущий дизайн"}
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  disabled={designBusy}
                  onClick={() => void onRestoreDesign()}
                >
                  {designBusy ? "Восстановление…" : "Вернуть мой сохранённый дизайн"}
                </button>
              </div>
              <p className={styles.subtitle} style={{ marginTop: 8, marginBottom: 0 }}>
                {presetSavedAt
                  ? `Закладка: ${formatMyDesignPresetWhen(presetSavedAt)}. Файлы стилей в проекте: npm run design:pin / design:restore-pin.`
                  : "Пока нет сохранённой закладки — настройте вид и нажмите «Сохранить»."}
              </p>
              {designMessage ? (
                <p className={designSuccess ? glass.glassMsg : styles.error}>{designMessage}</p>
              ) : null}
              <p className={styles.subtitle} style={{ marginTop: 12, marginBottom: 0 }}>
                Применяется на ПК, в браузере и на телефоне (~3 с). Превью компонентов:{" "}
                <Link to="/design-preview">/design-preview</Link>
              </p>
              <Page2BackgroundModePicker
                tone={glassTone}
                value={page2Bg}
                onChange={(mode) => void onPage2BgChange(mode)}
              />
              {desktopShell && portalV2 ? (
                <GlassToggle
                  tone={glassTone}
                  id="admin-ui-sounds"
                  label="Звук при нажатии в dock"
                  subLabel="Короткий клик в desktop-приложении «ТрассА» при переключении разделов в нижней панели."
                  checked={uiSounds}
                  onChange={setUiSoundsEnabled}
                />
              ) : null}
            </GlassCard>
          </div>

          {apiEnabled && isPortalSyncEnabled() ? (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Синхронизация портала</h3>
              <p className={styles.subtitle}>
                Все установленные приложения и браузеры используют одну базу на сервере. Если данные
                остались только на этом компьютере, загрузите их один раз.
              </p>
              <button
                type="button"
                className={styles.btnNeoGhost}
                disabled={syncBusy}
                onClick={() => {
                  setSyncBusy(true);
                  setSyncFeedback(null);
                  void migrateLocalPortalStateToServer().then((res) => {
                    setSyncBusy(false);
                    setSyncFeedback(
                      res.ok
                        ? res.imported > 0
                          ? `На сервер загружено ключей: ${res.imported}.`
                          : "На сервере уже есть актуальные данные (новых ключей нет)."
                        : res.error,
                    );
                  });
                }}
              >
                {syncBusy ? "Загрузка…" : "Синхронизировать данные с сервером"}
              </button>
              {syncFeedback ? <p className={glass.glassMsg}>{syncFeedback}</p> : null}
            </div>
          ) : null}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Данные кабинетов</h3>
            <p className={styles.subtitle}>Очистка демо-данных. Действие необратимо.</p>
            <div className={styles.rowBtns}>
              <button
                type="button"
                className={styles.btnNeoGhost}
                onClick={() => {
                  clearSharedCalendarEvents();
                  setDemoFeedback("Общий календарь мероприятий очищен.");
                }}
              >
                Очистить общий календарь
              </button>
              <button
                type="button"
                className={styles.btnNeoGhost}
                onClick={() => {
                  resetMessengerLocalData();
                  setDemoFeedback("Данные мессенджера сброшены.");
                }}
              >
                Сбросить мессенджер
              </button>
            </div>
            {demoFeedback ? <p className={glass.glassMsg}>{demoFeedback}</p> : null}
          </div>
        </>
      )}
    </>
  );
}
