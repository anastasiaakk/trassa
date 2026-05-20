import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ProfileSettingsData } from "../profileSettingsStorage";
import {
  adminOverrideUserProfile,
  deleteRegisteredUser,
  isLegacyLoginAllowed,
  listRegisteredUsers,
  resetPasswordForEmail,
  type LocalUserRecord,
} from "../utils/localAuth";
import { authAdminDeleteUser, authAdminUpdateUser, authListUsers } from "../api/authApi";
import { isAuthApiEnabled } from "../utils/authMode";
import {
  getAdminCabinetInfo,
  getAdminSessionEmail,
  logoutAdmin,
  updateAdminPassword,
} from "../utils/adminAuth";
import {
  loadMaintenanceState,
  saveMaintenanceState,
} from "../utils/maintenanceMode";
import {
  loadSeasonBackground,
  saveSeasonBackground,
  type SeasonMode,
} from "../utils/seasonBackground";
import {
  clearSharedCalendarEvents,
  resetMessengerLocalData,
} from "../utils/adminDemoData";
import { PASSWORD_RULES_SHORT, validatePasswordPolicy } from "../utils/passwordPolicy";
import { formatSubjectDisplayName, SUBJECT_MARKERS_GEO } from "../data/page2MapGeo";
import {
  addContractorOrganization,
  loadContractorOrganizations,
  removeContractorOrganization,
} from "../utils/contractorOrganizations";
import { loadMapCategoryLabels, saveMapCategoryLabels } from "../utils/mapCategoryLabels";
import {
  addMapSubjectOrganization,
  loadMapSubjectOrganizations,
  removeMapSubjectOrganization,
  updateMapSubjectOrganization,
  type MapOrgKind,
  type MapSubjectOrganization,
} from "../utils/mapSubjectOrganizations";
import { markNavigationFromAdminDashboard } from "../utils/adminReturnNavigation";
import {
  isPortalSyncEnabled,
  migrateLocalPortalStateToServer,
} from "../utils/portalSync";
import { fetchAppUpdateManifest, publishAppUpdate } from "../api/appUpdateApi";
import { TRASSA_SETUP_DOWNLOAD_URL } from "../config/desktopRelease";
import styles from "./AdminPanel.module.css";

const APP_VERSION = "0.2.9";

type Props = {
  onLogout: () => void;
  useParentPageBackground?: boolean;
};

function profileToForm(p: ProfileSettingsData): ProfileSettingsData {
  return { ...p };
}

function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function orgListSummary(count: number): string {
  if (count === 0) return "список пуст";
  return `${count} ${ruPlural(count, "организация", "организации", "организаций")}`;
}

function usersListSummary(count: number): string {
  if (count === 0) return "нет записей";
  return `${count} ${ruPlural(count, "пользователь", "пользователя", "пользователей")}`;
}

export default function AdminDashboard({
  onLogout,
  useParentPageBackground = false,
}: Props) {
  const authApiMode = isAuthApiEnabled();

  useEffect(() => {
    if (!authApiMode || !isPortalSyncEnabled()) return;
    void fetchAppUpdateManifest().then((res) => {
      if (res.ok) {
        setPublishedVersion(res.manifest.version);
        setReleaseVersion(res.manifest.version);
        setReleaseSetupUrl(res.manifest.setupUrl);
        setReleaseNotes(res.manifest.releaseNotes);
      }
    });
  }, [authApiMode]);
  const adminEmail = useMemo(() => getAdminSessionEmail(), []);
  const cabinet = useMemo(() => getAdminCabinetInfo(adminEmail), [adminEmail]);
  const [users, setUsers] = useState<LocalUserRecord[]>(() =>
    authApiMode ? [] : listRegisteredUsers()
  );
  const [maintenance, setMaintenance] = useState(loadMaintenanceState);
  const [seasonBg, setSeasonBg] = useState<SeasonMode>(loadSeasonBackground);
  const [editing, setEditing] = useState<LocalUserRecord | null>(null);
  const [editForm, setEditForm] = useState<ProfileSettingsData | null>(null);
  const [pwUserEmail, setPwUserEmail] = useState<string | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState(APP_VERSION);
  const [releaseSetupUrl, setReleaseSetupUrl] = useState(TRASSA_SETUP_DOWNLOAD_URL);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [releaseMsg, setReleaseMsg] = useState<string | null>(null);
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);
  const [adminOldPw, setAdminOldPw] = useState("");
  const [adminNewPw, setAdminNewPw] = useState("");
  const [adminPwMsg, setAdminPwMsg] = useState<string | null>(null);
  const [contractorOrgs, setContractorOrgs] = useState<string[]>(() => loadContractorOrganizations());
  const [newOrgName, setNewOrgName] = useState("");
  const [orgListMsg, setOrgListMsg] = useState<string | null>(null);
  const [mapLabels, setMapLabels] = useState(() => loadMapCategoryLabels());
  const [mapLabelsMsg, setMapLabelsMsg] = useState<string | null>(null);
  const [mapOrgRows, setMapOrgRows] = useState<MapSubjectOrganization[]>(() => loadMapSubjectOrganizations());
  const [mapOrgMsg, setMapOrgMsg] = useState<string | null>(null);
  const [newMapSubject, setNewMapSubject] = useState("");
  const [newMapKind, setNewMapKind] = useState<MapOrgKind>("education");
  const [newMapName, setNewMapName] = useState("");
  const [editingMapOrgId, setEditingMapOrgId] = useState<string | null>(null);
  const [editingMapSubject, setEditingMapSubject] = useState("");
  const [editingMapKind, setEditingMapKind] = useState<MapOrgKind>("education");
  const [editingMapName, setEditingMapName] = useState("");
  const [mapEducationOpen, setMapEducationOpen] = useState(true);
  const [mapContractorsOpen, setMapContractorsOpen] = useState(true);
  const [mapEditingOpen, setMapEditingOpen] = useState(false);
  const [orgsOpen, setOrgsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const subjectOptions = useMemo(
    () => Array.from(new Set(SUBJECT_MARKERS_GEO.map((x) => x.name))).sort((a, b) => a.localeCompare(b, "ru")),
    []
  );
  const mapEducationRows = useMemo(
    () => mapOrgRows.filter((x) => x.kind === "education"),
    [mapOrgRows]
  );
  const mapContractorRows = useMemo(
    () => mapOrgRows.filter((x) => x.kind === "contractors"),
    [mapOrgRows]
  );

  useEffect(() => {
    if (editing !== null || pwUserEmail !== null) {
      setUsersOpen(true);
    }
  }, [editing, pwUserEmail]);

  const refreshContractorOrgs = useCallback(() => {
    setContractorOrgs(loadContractorOrganizations());
  }, []);

  const refreshMapOrgs = useCallback(() => {
    setMapOrgRows(loadMapSubjectOrganizations());
  }, []);

  const refreshUsers = useCallback(() => {
    if (authApiMode) {
      void authListUsers().then((r) => {
        if (!r.ok) {
          setDataMessage(`Не удалось загрузить пользователей с сервера: ${r.error}`);
          return;
        }
        const mapped: LocalUserRecord[] = r.users.map((u) => ({
          emailNorm: u.emailNorm,
          passwordHash: "",
          profile: u.profile,
          createdAt: u.createdAt,
        }));
        setUsers(mapped);
      });
      return;
    }
    setUsers(listRegisteredUsers());
  }, [authApiMode]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  /** Автообновление списка пользователей с сервера между ноутбуками. */
  useEffect(() => {
    if (!authApiMode) return;
    const refresh = () => refreshUsers();
    const id = window.setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authApiMode, refreshUsers]);

  const deleteUser = useCallback(
    async (u: LocalUserRecord) => {
      const label = u.profile.email || u.emailNorm;
      if (
        !window.confirm(
          `Удалить пользователя ${label}?\nВход по этому адресу станет невозможен. Связанные данные (в т.ч. профориентация) будут удалены. Действие необратимо.`
        )
      ) {
        return;
      }
      const r = authApiMode
        ? await authAdminDeleteUser(u.emailNorm)
        : deleteRegisteredUser(u.emailNorm);
      if (!r.ok) {
        setDataMessage(r.error ?? "Не удалось удалить пользователя.");
        return;
      }
      setDataMessage(`Пользователь ${label} удалён.`);
      if (editing?.emailNorm === u.emailNorm) {
        setEditing(null);
        setEditForm(null);
      }
      if (pwUserEmail === u.emailNorm) {
        setPwUserEmail(null);
        setPwMessage(null);
        setNewUserPassword("");
      }
      refreshUsers();
    },
    [authApiMode, editing?.emailNorm, pwUserEmail, refreshUsers]
  );

  const openEdit = useCallback((u: LocalUserRecord) => {
    setEditing(u);
    setEditForm(profileToForm(u.profile));
  }, []);

  const saveEdit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!editing || !editForm) return;
      if (authApiMode) {
        const r = await authAdminUpdateUser(editing.emailNorm, editForm);
        if (!r.ok) {
          setDataMessage(r.error ?? "Не удалось сохранить изменения пользователя.");
          return;
        }
      } else if (!adminOverrideUserProfile(editing.emailNorm, editForm)) {
        setDataMessage("Не удалось сохранить изменения пользователя.");
        return;
      }
      refreshUsers();
      setEditing(null);
      setEditForm(null);
    },
    [authApiMode, editForm, editing, refreshUsers]
  );

  const setUserPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!pwUserEmail) return;
      setPwMessage(null);
      const err = validatePasswordPolicy(newUserPassword);
      if (err) {
        setPwMessage(err);
        return;
      }
      const r = await resetPasswordForEmail(pwUserEmail, newUserPassword);
      if (r.ok) {
        setPwMessage("Пароль обновлён.");
        setNewUserPassword("");
        setPwUserEmail(null);
      } else {
        setPwMessage(r.error);
      }
    },
    [newUserPassword, pwUserEmail]
  );

  const toggleMaintenance = useCallback(
    (active: boolean) => {
      const next = { ...maintenance, active };
      setMaintenance(next);
      setMaintenanceMsg(null);
      void saveMaintenanceState(next).then((r) => {
        if (!r.ok) {
          setMaintenanceMsg(`Не удалось сохранить на сервере: ${r.error}`);
        }
      });
    },
    [maintenance]
  );

  const updateMaintenanceMessage = useCallback(
    (message: string) => {
      const next = { ...maintenance, message };
      setMaintenance(next);
      setMaintenanceMsg(null);
      void saveMaintenanceState(next).then((r) => {
        if (!r.ok) {
          setMaintenanceMsg(`Не удалось сохранить на сервере: ${r.error}`);
        }
      });
    },
    [maintenance]
  );

  const setSeasonBackground = useCallback((mode: SeasonMode) => {
    setSeasonBg(mode);
    saveSeasonBackground(mode);
  }, []);

  const handleAddContractorOrg = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setOrgListMsg(null);
      const r = addContractorOrganization(newOrgName);
      if (r.ok) {
        setNewOrgName("");
        refreshContractorOrgs();
        setOrgListMsg("Организация добавлена в список для подрядчиков.");
      } else {
        setOrgListMsg(r.error);
      }
    },
    [newOrgName, refreshContractorOrgs]
  );

  const handleRemoveContractorOrg = useCallback(
    (name: string) => {
      removeContractorOrganization(name);
      refreshContractorOrgs();
      setOrgListMsg("Название удалено из списка.");
    },
    [refreshContractorOrgs]
  );

  const handleAdminPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAdminPwMsg(null);
      const r = await updateAdminPassword(adminOldPw, adminNewPw);
      if (r.ok) {
        setAdminPwMsg("Пароль администратора изменён.");
        setAdminOldPw("");
        setAdminNewPw("");
      } else {
        setAdminPwMsg(r.error);
      }
    },
    [adminNewPw, adminOldPw]
  );

  const handleMapLabelsSave = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      saveMapCategoryLabels(mapLabels);
      setMapLabels(loadMapCategoryLabels());
      setMapLabelsMsg("Названия разделов на карте сохранены.");
    },
    [mapLabels]
  );

  const startEditMapOrg = useCallback((row: MapSubjectOrganization) => {
    setEditingMapOrgId(row.id);
    setEditingMapSubject(row.subjectName);
    setEditingMapKind(row.kind);
    setEditingMapName(row.name);
    setMapOrgMsg(null);
  }, []);

  const handleAddMapOrg = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setMapOrgMsg(null);
      const r = addMapSubjectOrganization({
        subjectName: newMapSubject,
        kind: newMapKind,
        name: newMapName,
      });
      if (!r.ok) {
        setMapOrgMsg(r.error);
        return;
      }
      setNewMapName("");
      setMapEducationOpen(newMapKind === "education" ? true : mapEducationOpen);
      setMapContractorsOpen(newMapKind === "contractors" ? true : mapContractorsOpen);
      refreshMapOrgs();
      setMapOrgMsg("Запись добавлена.");
    },
    [mapContractorsOpen, mapEducationOpen, newMapKind, newMapName, newMapSubject, refreshMapOrgs]
  );

  const handleSaveMapOrg = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!editingMapOrgId) return;
      setMapOrgMsg(null);
      const r = updateMapSubjectOrganization(editingMapOrgId, {
        subjectName: editingMapSubject,
        kind: editingMapKind,
        name: editingMapName,
      });
      if (!r.ok) {
        setMapOrgMsg(r.error);
        return;
      }
      setEditingMapOrgId(null);
      setEditingMapName("");
      refreshMapOrgs();
      setMapOrgMsg("Запись обновлена.");
    },
    [editingMapKind, editingMapName, editingMapOrgId, editingMapSubject, refreshMapOrgs]
  );

  const handleDeleteMapOrg = useCallback(
    (row: MapSubjectOrganization) => {
      if (!window.confirm(`Удалить запись «${row.name}»?`)) return;
      removeMapSubjectOrganization(row.id);
      if (editingMapOrgId === row.id) {
        setEditingMapOrgId(null);
      }
      refreshMapOrgs();
      setMapOrgMsg("Запись удалена.");
    },
    [editingMapOrgId, refreshMapOrgs]
  );

  const handleLogout = useCallback(() => {
    logoutAdmin();
    onLogout();
  }, [onLogout]);

  const legacy = isLegacyLoginAllowed();

  return (
    <div
      className={`${styles.cabinetPage} ${styles.cabinetDashboard} ${styles.themeLogin} ${useParentPageBackground ? styles.cabinetPageEmbed : ""}`}
    >
      <div
        className={`${styles.cabinetBg} ${useParentPageBackground ? styles.cabinetBgTransparent : ""}`}
        aria-hidden
      />

      <div className={styles.shell}>
        <header className={styles.cabinetHero}>
          <div className={styles.cabinetHeroText}>
            <p className={styles.cabinetKicker}>Личный кабинет администратора</p>
            <h2 className={styles.cabinetTitle}>
              Здравствуйте, {cabinet.displayName}!
            </h2>
            <p className={styles.cabinetEmail}>{adminEmail ?? ""}</p>
          </div>
          <div className={styles.cabinetHeroActions}>
            <button type="button" className={styles.btnNeoDanger} onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>

        <div className={`${styles.neoCard} ${styles.cabinetCard}`}>
        <h3 className={styles.dashboardSectionHeading}>Управление порталом</h3>
        <p className={styles.subtitleNeo}>
          Настройки ниже применяются сразу после сохранения.
        </p>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Технические работы</h3>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            При включении остальные страницы портала недоступны. Раздел «Карта
            подрядчиков» (/services) остаётся открытым для входа администратора.
          </p>
          <div className={styles.toggleRow}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={maintenance.active}
                onChange={(e) => toggleMaintenance(e.target.checked)}
              />
              <span>Режим технических работ</span>
            </label>
          </div>
          <textarea
            className={styles.textarea}
            value={maintenance.message}
            onChange={(e) => updateMaintenanceMessage(e.target.value)}
            placeholder="Текст для пользователей"
          />
          {maintenanceMsg ? <p className={styles.error}>{maintenanceMsg}</p> : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Фоновая анимация</h3>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            Лепестки и эффекты на фоне всех страниц портала. Изменение
            применяется сразу, в том числе в других открытых вкладках.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {(
              [
                ["off", "Выключено"],
                ["spring", "Весна — лепестки яблони"],
                ["summer", "Лето — зелёные листья"],
                ["autumn", "Осень — опадающая листва"],
                ["winter", "Зима — снежинки"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#2a3f5f",
                }}
              >
                <input
                  type="radio"
                  name="season-bg"
                  checked={seasonBg === value}
                  onChange={() => setSeasonBackground(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.collapseTrigger}
            aria-expanded={orgsOpen}
            onClick={() => setOrgsOpen((v) => !v)}
          >
            <span
              className={`${styles.collapseChevron} ${orgsOpen ? styles.collapseChevronOpen : ""}`}
              aria-hidden
            >
              ▶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              Организации подрядчиков
            </h3>
            <span className={styles.collapseMeta}>{orgListSummary(contractorOrgs.length)}</span>
          </button>
          {orgsOpen ? (
            <div className={styles.collapseBody}>
              <p className={styles.subtitle} style={{ marginBottom: 12 }}>
                Список для входа и регистрации в роли «Подрядчик». Без выбора организации из этого списка
                пользователь не попадёт в кабинет.
              </p>
              <form className={styles.form} onSubmit={handleAddContractorOrg}>
                <label className={styles.label}>
                  Новая организация
                  <input
                    className={styles.input}
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Полное наименование"
                    maxLength={200}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Добавить в список
                </button>
              </form>
              {orgListMsg ? <p className={styles.okMsg}>{orgListMsg}</p> : null}
              <div className={styles.tableWrap} style={{ marginTop: 16 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th style={{ width: 120 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {contractorOrgs.length === 0 ? (
                      <tr>
                        <td colSpan={2}>
                          <span className={styles.hint}>Список пуст — добавьте организации выше.</span>
                        </td>
                      </tr>
                    ) : (
                      contractorOrgs.map((name) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleRemoveContractorOrg(name)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {authApiMode && isPortalSyncEnabled() ? (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.collapseTrigger}
              aria-expanded={releaseOpen}
              onClick={() => setReleaseOpen((v) => !v)}
            >
              <span
                className={`${styles.collapseChevron} ${releaseOpen ? styles.collapseChevronOpen : ""}`}
                aria-hidden
              >
                ▶
              </span>
              <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
                Обновление приложения (.exe)
              </h3>
              <span className={styles.collapseMeta}>
                {publishedVersion ? `опубликована v${publishedVersion}` : "не опубликовано"}
              </span>
            </button>
            {releaseOpen ? (
              <div className={styles.collapseBody}>
                <p className={styles.subtitle} style={{ marginBottom: 12 }}>
                  <strong>Данные портала</strong> (карта, документы, календарь) у пользователей обновляются
                  сами каждые ~25 секунд.
                  <br />
                  <strong>Новая версия программы</strong>: соберите установщик, загрузите на GitHub (или другой
                  https), укажите версию и ссылку ниже и нажмите «Опубликовать». Программы проверяют обновление
                  раз в сутки и при возврате в окно.
                </p>
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setReleaseBusy(true);
                    setReleaseMsg(null);
                    void publishAppUpdate({
                      version: releaseVersion.trim(),
                      setupUrl: releaseSetupUrl.trim(),
                      releaseNotes: releaseNotes.trim(),
                    }).then((res) => {
                      setReleaseBusy(false);
                      if (res.ok) {
                        setPublishedVersion(res.manifest.version);
                        setReleaseMsg(
                          `Версия ${res.manifest.version} опубликована. Пользователи увидят предложение обновиться при следующей проверке.`
                        );
                      } else {
                        setReleaseMsg(res.error);
                      }
                    });
                  }}
                >
                  <label className={styles.label}>
                    Версия (должна быть выше установленной у пользователей)
                    <input
                      className={styles.input}
                      value={releaseVersion}
                      onChange={(e) => setReleaseVersion(e.target.value)}
                      placeholder="0.2.1"
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    Ссылка на установщик (https)
                    <input
                      className={styles.input}
                      value={releaseSetupUrl}
                      onChange={(e) => setReleaseSetupUrl(e.target.value)}
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    Что нового (необязательно)
                    <textarea
                      className={styles.input}
                      rows={3}
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                    />
                  </label>
                  <button type="submit" className={styles.btnNeoPrimary} disabled={releaseBusy}>
                    {releaseBusy ? "Публикация…" : "Опубликовать обновление"}
                  </button>
                </form>
                {releaseMsg ? <p className={styles.okMsg}>{releaseMsg}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {authApiMode && isPortalSyncEnabled() ? (
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
                setSyncMessage(null);
                void migrateLocalPortalStateToServer().then((res) => {
                  setSyncBusy(false);
                  if (res.ok) {
                    setSyncMessage(
                      res.imported > 0
                        ? `На сервер загружено ключей: ${res.imported}.`
                        : "На сервере уже есть актуальные данные (новых ключей нет)."
                    );
                  } else {
                    setSyncMessage(res.error);
                  }
                });
              }}
            >
              {syncBusy ? "Загрузка…" : "Синхронизировать данные с сервером"}
            </button>
            {syncMessage ? <p className={styles.okMsg}>{syncMessage}</p> : null}
          </div>
        ) : null}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Данные кабинетов</h3>
          <p className={styles.subtitle}>
            Очистка демо-данных. Действие необратимо.
          </p>
          <div className={styles.rowBtns}>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                clearSharedCalendarEvents();
                setDataMessage("Общий календарь мероприятий очищен.");
              }}
            >
              Очистить общий календарь
            </button>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                resetMessengerLocalData();
                setDataMessage("Данные мессенджера сброшены.");
              }}
            >
              Сбросить мессенджер
            </button>
          </div>
          {dataMessage ? <p className={styles.okMsg}>{dataMessage}</p> : null}
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.collapseTrigger}
            aria-expanded={mapEditingOpen}
            onClick={() => setMapEditingOpen((v) => !v)}
          >
            <span
              className={`${styles.collapseChevron} ${mapEditingOpen ? styles.collapseChevronOpen : ""}`}
              aria-hidden
            >
              ▶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              Редактирование карты
            </h3>
            <span className={styles.collapseMeta}>
              {mapEducationRows.length + mapContractorRows.length} записей
            </span>
          </button>
          {mapEditingOpen ? (
            <div className={styles.collapseBody}>
              <h4 className={styles.sectionTitle}>Названия разделов на карте</h4>
              <p className={styles.subtitle}>
                Эти названия показываются в плашке над субъектом и в правой панели карты подрядчиков.
              </p>
              <form className={styles.form} onSubmit={handleMapLabelsSave}>
                <label className={styles.label}>
                  Название блока ВУЗ / СПО
                  <input
                    className={styles.input}
                    value={mapLabels.education}
                    onChange={(e) => setMapLabels({ ...mapLabels, education: e.target.value })}
                    placeholder="ВУЗ / СПО"
                    maxLength={80}
                  />
                </label>
                <label className={styles.label}>
                  Название блока подрядчиков
                  <input
                    className={styles.input}
                    value={mapLabels.contractors}
                    onChange={(e) => setMapLabels({ ...mapLabels, contractors: e.target.value })}
                    placeholder="Подрядчики"
                    maxLength={80}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Сохранить названия
                </button>
                {mapLabelsMsg ? <p className={styles.okMsg}>{mapLabelsMsg}</p> : null}
              </form>

              <h4 className={styles.sectionTitle} style={{ marginTop: 14 }}>
                Организации по субъектам для карты
              </h4>
              <p className={styles.subtitle}>
                Формат строки: субъект, тип (ВУЗ/СПО или подрядчики), наименование. Эти данные отображаются справа
                на карте после выбора субъекта и типа.
              </p>

              <form className={styles.form} onSubmit={handleAddMapOrg}>
                <label className={styles.label}>
                  Субъект
                  <select
                    className={styles.input}
                    value={newMapSubject}
                    onChange={(e) => setNewMapSubject(e.target.value)}
                  >
                    <option value="">Выберите субъект</option>
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {formatSubjectDisplayName(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.label}>
                  Тип
                  <select
                    className={styles.input}
                    value={newMapKind}
                    onChange={(e) => setNewMapKind(e.target.value as MapOrgKind)}
                  >
                    <option value="education">{mapLabels.education}</option>
                    <option value="contractors">{mapLabels.contractors}</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Наименование
                  <input
                    className={styles.input}
                    value={newMapName}
                    onChange={(e) => setNewMapName(e.target.value)}
                    placeholder="Введите название организации"
                    maxLength={240}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Добавить строку
                </button>
              </form>

              {mapOrgMsg ? <p className={styles.okMsg}>{mapOrgMsg}</p> : null}

              <div className={styles.section} style={{ marginTop: 14 }}>
            <button
              type="button"
              className={styles.collapseTrigger}
              aria-expanded={mapEducationOpen}
              onClick={() => setMapEducationOpen((v) => !v)}
            >
              <span
                className={`${styles.collapseChevron} ${mapEducationOpen ? styles.collapseChevronOpen : ""}`}
                aria-hidden
              >
                ▶
              </span>
              <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>{mapLabels.education}</h4>
              <span className={styles.collapseMeta}>{mapEducationRows.length}</span>
            </button>
            {mapEducationOpen ? (
              <div className={styles.tableWrap} style={{ marginTop: 10 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Субъект</th>
                      <th>Наименование</th>
                      <th style={{ width: 180 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {mapEducationRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatSubjectDisplayName(row.subjectName)}</td>
                        <td>{row.name}</td>
                        <td>
                          <button type="button" className={styles.btnSmall} onClick={() => startEditMapOrg(row)}>
                            Изменить
                          </button>{" "}
                          <button type="button" className={styles.btnSmallDanger} onClick={() => handleDeleteMapOrg(row)}>
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                    {mapEducationRows.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          <span className={styles.hint}>Список пуст.</span>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
              </div>

              <div className={styles.section} style={{ marginTop: 12 }}>
            <button
              type="button"
              className={styles.collapseTrigger}
              aria-expanded={mapContractorsOpen}
              onClick={() => setMapContractorsOpen((v) => !v)}
            >
              <span
                className={`${styles.collapseChevron} ${mapContractorsOpen ? styles.collapseChevronOpen : ""}`}
                aria-hidden
              >
                ▶
              </span>
              <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>{mapLabels.contractors}</h4>
              <span className={styles.collapseMeta}>{mapContractorRows.length}</span>
            </button>
            {mapContractorsOpen ? (
              <div className={styles.tableWrap} style={{ marginTop: 10 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Субъект</th>
                      <th>Наименование</th>
                      <th style={{ width: 180 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {mapContractorRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatSubjectDisplayName(row.subjectName)}</td>
                        <td>{row.name}</td>
                        <td>
                          <button type="button" className={styles.btnSmall} onClick={() => startEditMapOrg(row)}>
                            Изменить
                          </button>{" "}
                          <button type="button" className={styles.btnSmallDanger} onClick={() => handleDeleteMapOrg(row)}>
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                    {mapContractorRows.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          <span className={styles.hint}>Список пуст.</span>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
              </div>

              {editingMapOrgId ? (
                <form className={styles.editGrid} style={{ marginTop: 14 }} onSubmit={handleSaveMapOrg}>
              <h4 className={styles.sectionTitle} style={{ gridColumn: "1 / -1" }}>
                Редактирование строки
              </h4>
              <label className={styles.label}>
                Субъект
                <select
                  className={styles.input}
                  value={editingMapSubject}
                  onChange={(e) => setEditingMapSubject(e.target.value)}
                >
                  <option value="">Выберите субъект</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatSubjectDisplayName(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Тип
                <select
                  className={styles.input}
                  value={editingMapKind}
                  onChange={(e) => setEditingMapKind(e.target.value as MapOrgKind)}
                >
                  <option value="education">{mapLabels.education}</option>
                  <option value="contractors">{mapLabels.contractors}</option>
                </select>
              </label>
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Наименование
                <input
                  className={styles.input}
                  value={editingMapName}
                  onChange={(e) => setEditingMapName(e.target.value)}
                  maxLength={240}
                />
              </label>
              <div className={styles.rowBtns} style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Сохранить изменения
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => setEditingMapOrgId(null)}
                >
                  Отмена
                </button>
              </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.collapseTrigger}
            aria-expanded={usersOpen}
            onClick={() => setUsersOpen((v) => !v)}
          >
            <span
              className={`${styles.collapseChevron} ${usersOpen ? styles.collapseChevronOpen : ""}`}
              aria-hidden
            >
              ▶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              Пользователи портала
            </h3>
            <span className={styles.collapseMeta}>{usersListSummary(users.length)}</span>
          </button>
          {usersOpen ? (
            <div className={styles.collapseBody}>
          {legacy && !authApiMode ? (
            <p className={styles.hint}>
              Зарегистрированных пользователей пока нет — на странице входа
              допускается прежний демо-вход с любым логином и паролем.
            </p>
          ) : null}
          {authApiMode ? (
            <p className={styles.hint}>
              Список пользователей загружается с сервера. Редактирование профиля и удаление выполняются
              на серверной стороне. Сброс пароля пока доступен только в локальном режиме.
            </p>
          ) : null}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Электронная почта</th>
                  <th>Имя</th>
                  <th>Должность</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.emailNorm}>
                    <td>{u.profile.email || u.emailNorm}</td>
                    <td>
                      {u.profile.firstName} {u.profile.lastName}
                    </td>
                    <td>{u.profile.roleLabel}</td>
                    <td>
                      <>
                        <button
                          type="button"
                          className={styles.btnSmall}
                          onClick={() => openEdit(u)}
                        >
                          Править
                        </button>{" "}
                        {!authApiMode ? (
                          <button
                            type="button"
                            className={styles.btnSmall}
                            onClick={() => {
                              setPwUserEmail(u.emailNorm);
                              setPwMessage(null);
                              setNewUserPassword("");
                            }}
                          >
                            Пароль
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.btnSmallDanger}
                          onClick={() => void deleteUser(u)}
                        >
                          Удалить
                        </button>
                      </>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && editForm ? (
            <form className={styles.editGrid} onSubmit={saveEdit}>
              <h4 className={styles.sectionTitle} style={{ gridColumn: "1 / -1" }}>
                Профиль: {editing.emailNorm}
              </h4>
              <label className={styles.label}>
                Имя
                <input
                  className={styles.input}
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Фамилия
                <input
                  className={styles.input}
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Должность / роль в системе
                <input
                  className={styles.input}
                  value={editForm.roleLabel}
                  onChange={(e) =>
                    setEditForm({ ...editForm, roleLabel: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Телефон
                <input
                  className={styles.input}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </label>
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Организация (подрядчик)
                <input
                  className={styles.input}
                  value={editForm.contractorCompanyName}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      contractorCompanyName: e.target.value,
                    })
                  }
                />
              </label>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={editForm.notifyEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notifyEmail: e.target.checked })
                  }
                />{" "}
                Уведомления e-mail
              </label>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={editForm.notifyPush}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notifyPush: e.target.checked })
                  }
                />{" "}
                Push
              </label>
              <div className={styles.rowBtns} style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Сохранить
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => {
                    setEditing(null);
                    setEditForm(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : null}

          {!authApiMode && pwUserEmail ? (
            <form className={styles.form} style={{ marginTop: 16 }} onSubmit={setUserPassword}>
              <h4 className={styles.sectionTitle}>
                Новый пароль для {pwUserEmail}
              </h4>
              <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
              <label className={styles.label}>
                Новый пароль
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </label>
              {pwMessage ? (
                <p
                  className={
                    pwMessage.includes("обновлён") ? styles.okMsg : styles.error
                  }
                >
                  {pwMessage}
                </p>
              ) : null}
              <div className={styles.rowBtns}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Установить пароль
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => setPwUserEmail(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Смена пароля администратора</h3>
          <form className={styles.form} onSubmit={handleAdminPassword}>
            <label className={styles.label}>
              Текущий пароль
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={adminOldPw}
                onChange={(e) => setAdminOldPw(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              Новый пароль
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={adminNewPw}
                onChange={(e) => setAdminNewPw(e.target.value)}
              />
            </label>
            <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
            {adminPwMsg ? (
              <p
                className={
                  adminPwMsg.includes("изменён") ? styles.okMsg : styles.error
                }
              >
                {adminPwMsg}
              </p>
            ) : null}
            <button type="submit" className={styles.btnNeoPrimaryNeutral}>
              Сменить пароль
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Быстрые ссылки</h3>
          <div className={styles.links}>
            <Link to="/page3" onClick={markNavigationFromAdminDashboard}>
              Вход в кабинеты (роли)
            </Link>
            <Link to="/cabinet-school" onClick={markNavigationFromAdminDashboard}>
              Кабинет школьника
            </Link>
            <Link to="/cabinet-spo" onClick={markNavigationFromAdminDashboard}>
              Кабинет студента
            </Link>
            <Link to="/page4" onClick={markNavigationFromAdminDashboard}>
              Подрядчик
            </Link>
            <Link to="/page5" onClick={markNavigationFromAdminDashboard}>
              РАДОР
            </Link>
            <Link to="/page6" onClick={markNavigationFromAdminDashboard}>
              АДО
            </Link>
            <Link to="/profile" onClick={markNavigationFromAdminDashboard}>
              Настройки профиля
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
