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

const APP_VERSION = "0.2.4";

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
  if (count === 0) return "СЃРїРёСЃРѕРє РїСѓСЃС‚";
  return `${count} ${ruPlural(count, "РѕСЂРіР°РЅРёР·Р°С†РёСЏ", "РѕСЂРіР°РЅРёР·Р°С†РёРё", "РѕСЂРіР°РЅРёР·Р°С†РёР№")}`;
}

function usersListSummary(count: number): string {
  if (count === 0) return "РЅРµС‚ Р·Р°РїРёСЃРµР№";
  return `${count} ${ruPlural(count, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ", "РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ", "РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№")}`;
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
          setDataMessage(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ СЃРµСЂРІРµСЂР°: ${r.error}`);
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

  const deleteUser = useCallback(
    async (u: LocalUserRecord) => {
      const label = u.profile.email || u.emailNorm;
      if (
        !window.confirm(
          `РЈРґР°Р»РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ ${label}?\nР’С…РѕРґ РїРѕ СЌС‚РѕРјСѓ Р°РґСЂРµСЃСѓ СЃС‚Р°РЅРµС‚ РЅРµРІРѕР·РјРѕР¶РµРЅ. РЎРІСЏР·Р°РЅРЅС‹Рµ РґР°РЅРЅС‹Рµ (РІ С‚.С‡. РїСЂРѕС„РѕСЂРёРµРЅС‚Р°С†РёСЏ) Р±СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹. Р”РµР№СЃС‚РІРёРµ РЅРµРѕР±СЂР°С‚РёРјРѕ.`
        )
      ) {
        return;
      }
      const r = authApiMode
        ? await authAdminDeleteUser(u.emailNorm)
        : deleteRegisteredUser(u.emailNorm);
      if (!r.ok) {
        setDataMessage(r.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ.");
        return;
      }
      setDataMessage(`РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ ${label} СѓРґР°Р»С‘РЅ.`);
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
          setDataMessage(r.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ.");
          return;
        }
      } else if (!adminOverrideUserProfile(editing.emailNorm, editForm)) {
        setDataMessage("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ.");
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
        setPwMessage("РџР°СЂРѕР»СЊ РѕР±РЅРѕРІР»С‘РЅ.");
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
          setMaintenanceMsg(`РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅР° СЃРµСЂРІРµСЂРµ: ${r.error}`);
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
          setMaintenanceMsg(`РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅР° СЃРµСЂРІРµСЂРµ: ${r.error}`);
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
        setOrgListMsg("РћСЂРіР°РЅРёР·Р°С†РёСЏ РґРѕР±Р°РІР»РµРЅР° РІ СЃРїРёСЃРѕРє РґР»СЏ РїРѕРґСЂСЏРґС‡РёРєРѕРІ.");
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
      setOrgListMsg("РќР°Р·РІР°РЅРёРµ СѓРґР°Р»РµРЅРѕ РёР· СЃРїРёСЃРєР°.");
    },
    [refreshContractorOrgs]
  );

  const handleAdminPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAdminPwMsg(null);
      const r = await updateAdminPassword(adminOldPw, adminNewPw);
      if (r.ok) {
        setAdminPwMsg("РџР°СЂРѕР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РёР·РјРµРЅС‘РЅ.");
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
      setMapLabelsMsg("РќР°Р·РІР°РЅРёСЏ СЂР°Р·РґРµР»РѕРІ РЅР° РєР°СЂС‚Рµ СЃРѕС…СЂР°РЅРµРЅС‹.");
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
      setMapOrgMsg("Р—Р°РїРёСЃСЊ РґРѕР±Р°РІР»РµРЅР°.");
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
      setMapOrgMsg("Р—Р°РїРёСЃСЊ РѕР±РЅРѕРІР»РµРЅР°.");
    },
    [editingMapKind, editingMapName, editingMapOrgId, editingMapSubject, refreshMapOrgs]
  );

  const handleDeleteMapOrg = useCallback(
    (row: MapSubjectOrganization) => {
      if (!window.confirm(`РЈРґР°Р»РёС‚СЊ Р·Р°РїРёСЃСЊ В«${row.name}В»?`)) return;
      removeMapSubjectOrganization(row.id);
      if (editingMapOrgId === row.id) {
        setEditingMapOrgId(null);
      }
      refreshMapOrgs();
      setMapOrgMsg("Р—Р°РїРёСЃСЊ СѓРґР°Р»РµРЅР°.");
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
            <p className={styles.cabinetKicker}>Р›РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</p>
            <h2 className={styles.cabinetTitle}>
              Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ, {cabinet.displayName}!
            </h2>
            <p className={styles.cabinetEmail}>{adminEmail ?? ""}</p>
          </div>
          <div className={styles.cabinetHeroActions}>
            <button type="button" className={styles.btnNeoDanger} onClick={handleLogout}>
              Р’С‹Р№С‚Рё
            </button>
          </div>
        </header>

        <div className={`${styles.neoCard} ${styles.cabinetCard}`}>
        <h3 className={styles.dashboardSectionHeading}>РЈРїСЂР°РІР»РµРЅРёРµ РїРѕСЂС‚Р°Р»РѕРј</h3>
        <p className={styles.subtitleNeo}>
          РќР°СЃС‚СЂРѕР№РєРё РЅРёР¶Рµ РїСЂРёРјРµРЅСЏСЋС‚СЃСЏ СЃСЂР°Р·Сѓ РїРѕСЃР»Рµ СЃРѕС…СЂР°РЅРµРЅРёСЏ.
        </p>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>РўРµС…РЅРёС‡РµСЃРєРёРµ СЂР°Р±РѕС‚С‹</h3>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            РџСЂРё РІРєР»СЋС‡РµРЅРёРё РѕСЃС‚Р°Р»СЊРЅС‹Рµ СЃС‚СЂР°РЅРёС†С‹ РїРѕСЂС‚Р°Р»Р° РЅРµРґРѕСЃС‚СѓРїРЅС‹. Р Р°Р·РґРµР» В«РљР°СЂС‚Р°
            РїРѕРґСЂСЏРґС‡РёРєРѕРІВ» (/services) РѕСЃС‚Р°С‘С‚СЃСЏ РѕС‚РєСЂС‹С‚С‹Рј РґР»СЏ РІС…РѕРґР° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.
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
              <span>Р РµР¶РёРј С‚РµС…РЅРёС‡РµСЃРєРёС… СЂР°Р±РѕС‚</span>
            </label>
          </div>
          <textarea
            className={styles.textarea}
            value={maintenance.message}
            onChange={(e) => updateMaintenanceMessage(e.target.value)}
            placeholder="РўРµРєСЃС‚ РґР»СЏ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№"
          />
          {maintenanceMsg ? <p className={styles.error}>{maintenanceMsg}</p> : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Р¤РѕРЅРѕРІР°СЏ Р°РЅРёРјР°С†РёСЏ</h3>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            Р›РµРїРµСЃС‚РєРё Рё СЌС„С„РµРєС‚С‹ РЅР° С„РѕРЅРµ РІСЃРµС… СЃС‚СЂР°РЅРёС† РїРѕСЂС‚Р°Р»Р°. РР·РјРµРЅРµРЅРёРµ
            РїСЂРёРјРµРЅСЏРµС‚СЃСЏ СЃСЂР°Р·Сѓ, РІ С‚РѕРј С‡РёСЃР»Рµ РІ РґСЂСѓРіРёС… РѕС‚РєСЂС‹С‚С‹С… РІРєР»Р°РґРєР°С….
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
                ["off", "Р’С‹РєР»СЋС‡РµРЅРѕ"],
                ["spring", "Р’РµСЃРЅР° вЂ” Р»РµРїРµСЃС‚РєРё СЏР±Р»РѕРЅРё"],
                ["summer", "Р›РµС‚Рѕ вЂ” Р·РµР»С‘РЅС‹Рµ Р»РёСЃС‚СЊСЏ"],
                ["autumn", "РћСЃРµРЅСЊ вЂ” РѕРїР°РґР°СЋС‰Р°СЏ Р»РёСЃС‚РІР°"],
                ["winter", "Р—РёРјР° вЂ” СЃРЅРµР¶РёРЅРєРё"],
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
              в–¶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              РћСЂРіР°РЅРёР·Р°С†РёРё РїРѕРґСЂСЏРґС‡РёРєРѕРІ
            </h3>
            <span className={styles.collapseMeta}>{orgListSummary(contractorOrgs.length)}</span>
          </button>
          {orgsOpen ? (
            <div className={styles.collapseBody}>
              <p className={styles.subtitle} style={{ marginBottom: 12 }}>
                РЎРїРёСЃРѕРє РґР»СЏ РІС…РѕРґР° Рё СЂРµРіРёСЃС‚СЂР°С†РёРё РІ СЂРѕР»Рё В«РџРѕРґСЂСЏРґС‡РёРєВ». Р‘РµР· РІС‹Р±РѕСЂР° РѕСЂРіР°РЅРёР·Р°С†РёРё РёР· СЌС‚РѕРіРѕ СЃРїРёСЃРєР°
                РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РїРѕРїР°РґС‘С‚ РІ РєР°Р±РёРЅРµС‚.
              </p>
              <form className={styles.form} onSubmit={handleAddContractorOrg}>
                <label className={styles.label}>
                  РќРѕРІР°СЏ РѕСЂРіР°РЅРёР·Р°С†РёСЏ
                  <input
                    className={styles.input}
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="РџРѕР»РЅРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ"
                    maxLength={200}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Р”РѕР±Р°РІРёС‚СЊ РІ СЃРїРёСЃРѕРє
                </button>
              </form>
              {orgListMsg ? <p className={styles.okMsg}>{orgListMsg}</p> : null}
              <div className={styles.tableWrap} style={{ marginTop: 16 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>РќР°Р·РІР°РЅРёРµ</th>
                      <th style={{ width: 120 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {contractorOrgs.length === 0 ? (
                      <tr>
                        <td colSpan={2}>
                          <span className={styles.hint}>РЎРїРёСЃРѕРє РїСѓСЃС‚ вЂ” РґРѕР±Р°РІСЊС‚Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё РІС‹С€Рµ.</span>
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
                              РЈРґР°Р»РёС‚СЊ
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
                в–¶
              </span>
              <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
                РћР±РЅРѕРІР»РµРЅРёРµ РїСЂРёР»РѕР¶РµРЅРёСЏ (.exe)
              </h3>
              <span className={styles.collapseMeta}>
                {publishedVersion ? `РѕРїСѓР±Р»РёРєРѕРІР°РЅР° v${publishedVersion}` : "РЅРµ РѕРїСѓР±Р»РёРєРѕРІР°РЅРѕ"}
              </span>
            </button>
            {releaseOpen ? (
              <div className={styles.collapseBody}>
                <p className={styles.subtitle} style={{ marginBottom: 12 }}>
                  <strong>Р”Р°РЅРЅС‹Рµ РїРѕСЂС‚Р°Р»Р°</strong> (РєР°СЂС‚Р°, РґРѕРєСѓРјРµРЅС‚С‹, РєР°Р»РµРЅРґР°СЂСЊ) Сѓ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РѕР±РЅРѕРІР»СЏСЋС‚СЃСЏ
                  СЃР°РјРё РєР°Р¶РґС‹Рµ ~25 СЃРµРєСѓРЅРґ.
                  <br />
                  <strong>РќРѕРІР°СЏ РІРµСЂСЃРёСЏ РїСЂРѕРіСЂР°РјРјС‹</strong>: СЃРѕР±РµСЂРёС‚Рµ СѓСЃС‚Р°РЅРѕРІС‰РёРє, Р·Р°РіСЂСѓР·РёС‚Рµ РЅР° GitHub (РёР»Рё РґСЂСѓРіРѕР№
                  https), СѓРєР°Р¶РёС‚Рµ РІРµСЂСЃРёСЋ Рё СЃСЃС‹Р»РєСѓ РЅРёР¶Рµ Рё РЅР°Р¶РјРёС‚Рµ В«РћРїСѓР±Р»РёРєРѕРІР°С‚СЊВ». РџСЂРѕРіСЂР°РјРјС‹ РїСЂРѕРІРµСЂСЏСЋС‚ РѕР±РЅРѕРІР»РµРЅРёРµ
                  СЂР°Р· РІ СЃСѓС‚РєРё Рё РїСЂРё РІРѕР·РІСЂР°С‚Рµ РІ РѕРєРЅРѕ.
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
                          `Р’РµСЂСЃРёСЏ ${res.manifest.version} РѕРїСѓР±Р»РёРєРѕРІР°РЅР°. РџРѕР»СЊР·РѕРІР°С‚РµР»Рё СѓРІРёРґСЏС‚ РїСЂРµРґР»РѕР¶РµРЅРёРµ РѕР±РЅРѕРІРёС‚СЊСЃСЏ РїСЂРё СЃР»РµРґСѓСЋС‰РµР№ РїСЂРѕРІРµСЂРєРµ.`
                        );
                      } else {
                        setReleaseMsg(res.error);
                      }
                    });
                  }}
                >
                  <label className={styles.label}>
                    Р’РµСЂСЃРёСЏ (РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РІС‹С€Рµ СѓСЃС‚Р°РЅРѕРІР»РµРЅРЅРѕР№ Сѓ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№)
                    <input
                      className={styles.input}
                      value={releaseVersion}
                      onChange={(e) => setReleaseVersion(e.target.value)}
                      placeholder="0.2.1"
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    РЎСЃС‹Р»РєР° РЅР° СѓСЃС‚Р°РЅРѕРІС‰РёРє (https)
                    <input
                      className={styles.input}
                      value={releaseSetupUrl}
                      onChange={(e) => setReleaseSetupUrl(e.target.value)}
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    Р§С‚Рѕ РЅРѕРІРѕРіРѕ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)
                    <textarea
                      className={styles.input}
                      rows={3}
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                    />
                  </label>
                  <button type="submit" className={styles.btnNeoPrimary} disabled={releaseBusy}>
                    {releaseBusy ? "РџСѓР±Р»РёРєР°С†РёСЏвЂ¦" : "РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ РѕР±РЅРѕРІР»РµРЅРёРµ"}
                  </button>
                </form>
                {releaseMsg ? <p className={styles.okMsg}>{releaseMsg}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {authApiMode && isPortalSyncEnabled() ? (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РїРѕСЂС‚Р°Р»Р°</h3>
            <p className={styles.subtitle}>
              Р’СЃРµ СѓСЃС‚Р°РЅРѕРІР»РµРЅРЅС‹Рµ РїСЂРёР»РѕР¶РµРЅРёСЏ Рё Р±СЂР°СѓР·РµСЂС‹ РёСЃРїРѕР»СЊР·СѓСЋС‚ РѕРґРЅСѓ Р±Р°Р·Сѓ РЅР° СЃРµСЂРІРµСЂРµ. Р•СЃР»Рё РґР°РЅРЅС‹Рµ
              РѕСЃС‚Р°Р»РёСЃСЊ С‚РѕР»СЊРєРѕ РЅР° СЌС‚РѕРј РєРѕРјРїСЊСЋС‚РµСЂРµ, Р·Р°РіСЂСѓР·РёС‚Рµ РёС… РѕРґРёРЅ СЂР°Р·.
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
                        ? `РќР° СЃРµСЂРІРµСЂ Р·Р°РіСЂСѓР¶РµРЅРѕ РєР»СЋС‡РµР№: ${res.imported}.`
                        : "РќР° СЃРµСЂРІРµСЂРµ СѓР¶Рµ РµСЃС‚СЊ Р°РєС‚СѓР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ (РЅРѕРІС‹С… РєР»СЋС‡РµР№ РЅРµС‚)."
                    );
                  } else {
                    setSyncMessage(res.error);
                  }
                });
              }}
            >
              {syncBusy ? "Р—Р°РіСЂСѓР·РєР°вЂ¦" : "РЎРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°С‚СЊ РґР°РЅРЅС‹Рµ СЃ СЃРµСЂРІРµСЂРѕРј"}
            </button>
            {syncMessage ? <p className={styles.okMsg}>{syncMessage}</p> : null}
          </div>
        ) : null}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Р”Р°РЅРЅС‹Рµ РєР°Р±РёРЅРµС‚РѕРІ</h3>
          <p className={styles.subtitle}>
            РћС‡РёСЃС‚РєР° РґРµРјРѕ-РґР°РЅРЅС‹С…. Р”РµР№СЃС‚РІРёРµ РЅРµРѕР±СЂР°С‚РёРјРѕ.
          </p>
          <div className={styles.rowBtns}>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                clearSharedCalendarEvents();
                setDataMessage("РћР±С‰РёР№ РєР°Р»РµРЅРґР°СЂСЊ РјРµСЂРѕРїСЂРёСЏС‚РёР№ РѕС‡РёС‰РµРЅ.");
              }}
            >
              РћС‡РёСЃС‚РёС‚СЊ РѕР±С‰РёР№ РєР°Р»РµРЅРґР°СЂСЊ
            </button>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                resetMessengerLocalData();
                setDataMessage("Р”Р°РЅРЅС‹Рµ РјРµСЃСЃРµРЅРґР¶РµСЂР° СЃР±СЂРѕС€РµРЅС‹.");
              }}
            >
              РЎР±СЂРѕСЃРёС‚СЊ РјРµСЃСЃРµРЅРґР¶РµСЂ
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
              в–¶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РєР°СЂС‚С‹
            </h3>
            <span className={styles.collapseMeta}>
              {mapEducationRows.length + mapContractorRows.length} Р·Р°РїРёСЃРµР№
            </span>
          </button>
          {mapEditingOpen ? (
            <div className={styles.collapseBody}>
              <h4 className={styles.sectionTitle}>РќР°Р·РІР°РЅРёСЏ СЂР°Р·РґРµР»РѕРІ РЅР° РєР°СЂС‚Рµ</h4>
              <p className={styles.subtitle}>
                Р­С‚Рё РЅР°Р·РІР°РЅРёСЏ РїРѕРєР°Р·С‹РІР°СЋС‚СЃСЏ РІ РїР»Р°С€РєРµ РЅР°Рґ СЃСѓР±СЉРµРєС‚РѕРј Рё РІ РїСЂР°РІРѕР№ РїР°РЅРµР»Рё РєР°СЂС‚С‹ РїРѕРґСЂСЏРґС‡РёРєРѕРІ.
              </p>
              <form className={styles.form} onSubmit={handleMapLabelsSave}>
                <label className={styles.label}>
                  РќР°Р·РІР°РЅРёРµ Р±Р»РѕРєР° Р’РЈР— / РЎРџРћ
                  <input
                    className={styles.input}
                    value={mapLabels.education}
                    onChange={(e) => setMapLabels({ ...mapLabels, education: e.target.value })}
                    placeholder="Р’РЈР— / РЎРџРћ"
                    maxLength={80}
                  />
                </label>
                <label className={styles.label}>
                  РќР°Р·РІР°РЅРёРµ Р±Р»РѕРєР° РїРѕРґСЂСЏРґС‡РёРєРѕРІ
                  <input
                    className={styles.input}
                    value={mapLabels.contractors}
                    onChange={(e) => setMapLabels({ ...mapLabels, contractors: e.target.value })}
                    placeholder="РџРѕРґСЂСЏРґС‡РёРєРё"
                    maxLength={80}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  РЎРѕС…СЂР°РЅРёС‚СЊ РЅР°Р·РІР°РЅРёСЏ
                </button>
                {mapLabelsMsg ? <p className={styles.okMsg}>{mapLabelsMsg}</p> : null}
              </form>

              <h4 className={styles.sectionTitle} style={{ marginTop: 14 }}>
                РћСЂРіР°РЅРёР·Р°С†РёРё РїРѕ СЃСѓР±СЉРµРєС‚Р°Рј РґР»СЏ РєР°СЂС‚С‹
              </h4>
              <p className={styles.subtitle}>
                Р¤РѕСЂРјР°С‚ СЃС‚СЂРѕРєРё: СЃСѓР±СЉРµРєС‚, С‚РёРї (Р’РЈР—/РЎРџРћ РёР»Рё РїРѕРґСЂСЏРґС‡РёРєРё), РЅР°РёРјРµРЅРѕРІР°РЅРёРµ. Р­С‚Рё РґР°РЅРЅС‹Рµ РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ СЃРїСЂР°РІР°
                РЅР° РєР°СЂС‚Рµ РїРѕСЃР»Рµ РІС‹Р±РѕСЂР° СЃСѓР±СЉРµРєС‚Р° Рё С‚РёРїР°.
              </p>

              <form className={styles.form} onSubmit={handleAddMapOrg}>
                <label className={styles.label}>
                  РЎСѓР±СЉРµРєС‚
                  <select
                    className={styles.input}
                    value={newMapSubject}
                    onChange={(e) => setNewMapSubject(e.target.value)}
                  >
                    <option value="">Р’С‹Р±РµСЂРёС‚Рµ СЃСѓР±СЉРµРєС‚</option>
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {formatSubjectDisplayName(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.label}>
                  РўРёРї
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
                  РќР°РёРјРµРЅРѕРІР°РЅРёРµ
                  <input
                    className={styles.input}
                    value={newMapName}
                    onChange={(e) => setNewMapName(e.target.value)}
                    placeholder="Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РѕСЂРіР°РЅРёР·Р°С†РёРё"
                    maxLength={240}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Р”РѕР±Р°РІРёС‚СЊ СЃС‚СЂРѕРєСѓ
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
                в–¶
              </span>
              <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>{mapLabels.education}</h4>
              <span className={styles.collapseMeta}>{mapEducationRows.length}</span>
            </button>
            {mapEducationOpen ? (
              <div className={styles.tableWrap} style={{ marginTop: 10 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>РЎСѓР±СЉРµРєС‚</th>
                      <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
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
                            РР·РјРµРЅРёС‚СЊ
                          </button>{" "}
                          <button type="button" className={styles.btnSmallDanger} onClick={() => handleDeleteMapOrg(row)}>
                            РЈРґР°Р»РёС‚СЊ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {mapEducationRows.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          <span className={styles.hint}>РЎРїРёСЃРѕРє РїСѓСЃС‚.</span>
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
                в–¶
              </span>
              <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>{mapLabels.contractors}</h4>
              <span className={styles.collapseMeta}>{mapContractorRows.length}</span>
            </button>
            {mapContractorsOpen ? (
              <div className={styles.tableWrap} style={{ marginTop: 10 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>РЎСѓР±СЉРµРєС‚</th>
                      <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
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
                            РР·РјРµРЅРёС‚СЊ
                          </button>{" "}
                          <button type="button" className={styles.btnSmallDanger} onClick={() => handleDeleteMapOrg(row)}>
                            РЈРґР°Р»РёС‚СЊ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {mapContractorRows.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          <span className={styles.hint}>РЎРїРёСЃРѕРє РїСѓСЃС‚.</span>
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
                Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ СЃС‚СЂРѕРєРё
              </h4>
              <label className={styles.label}>
                РЎСѓР±СЉРµРєС‚
                <select
                  className={styles.input}
                  value={editingMapSubject}
                  onChange={(e) => setEditingMapSubject(e.target.value)}
                >
                  <option value="">Р’С‹Р±РµСЂРёС‚Рµ СЃСѓР±СЉРµРєС‚</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatSubjectDisplayName(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                РўРёРї
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
                РќР°РёРјРµРЅРѕРІР°РЅРёРµ
                <input
                  className={styles.input}
                  value={editingMapName}
                  onChange={(e) => setEditingMapName(e.target.value)}
                  maxLength={240}
                />
              </label>
              <div className={styles.rowBtns} style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => setEditingMapOrgId(null)}
                >
                  РћС‚РјРµРЅР°
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
              в–¶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              РџРѕР»СЊР·РѕРІР°С‚РµР»Рё РїРѕСЂС‚Р°Р»Р°
            </h3>
            <span className={styles.collapseMeta}>{usersListSummary(users.length)}</span>
          </button>
          {usersOpen ? (
            <div className={styles.collapseBody}>
          {legacy && !authApiMode ? (
            <p className={styles.hint}>
              Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РїРѕРєР° РЅРµС‚ вЂ” РЅР° СЃС‚СЂР°РЅРёС†Рµ РІС…РѕРґР°
              РґРѕРїСѓСЃРєР°РµС‚СЃСЏ РїСЂРµР¶РЅРёР№ РґРµРјРѕ-РІС…РѕРґ СЃ Р»СЋР±С‹Рј Р»РѕРіРёРЅРѕРј Рё РїР°СЂРѕР»РµРј.
            </p>
          ) : null}
          {authApiMode ? (
            <p className={styles.hint}>
              РЎРїРёСЃРѕРє РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ Р·Р°РіСЂСѓР¶Р°РµС‚СЃСЏ СЃ СЃРµСЂРІРµСЂР°. Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РїСЂРѕС„РёР»СЏ Рё СѓРґР°Р»РµРЅРёРµ РІС‹РїРѕР»РЅСЏСЋС‚СЃСЏ
              РЅР° СЃРµСЂРІРµСЂРЅРѕР№ СЃС‚РѕСЂРѕРЅРµ. РЎР±СЂРѕСЃ РїР°СЂРѕР»СЏ РїРѕРєР° РґРѕСЃС‚СѓРїРµРЅ С‚РѕР»СЊРєРѕ РІ Р»РѕРєР°Р»СЊРЅРѕРј СЂРµР¶РёРјРµ.
            </p>
          ) : null}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Р­Р»РµРєС‚СЂРѕРЅРЅР°СЏ РїРѕС‡С‚Р°</th>
                  <th>РРјСЏ</th>
                  <th>Р”РѕР»Р¶РЅРѕСЃС‚СЊ</th>
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
                          РџСЂР°РІРёС‚СЊ
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
                            РџР°СЂРѕР»СЊ
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.btnSmallDanger}
                          onClick={() => void deleteUser(u)}
                        >
                          РЈРґР°Р»РёС‚СЊ
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
                РџСЂРѕС„РёР»СЊ: {editing.emailNorm}
              </h4>
              <label className={styles.label}>
                РРјСЏ
                <input
                  className={styles.input}
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Р¤Р°РјРёР»РёСЏ
                <input
                  className={styles.input}
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Р”РѕР»Р¶РЅРѕСЃС‚СЊ / СЂРѕР»СЊ РІ СЃРёСЃС‚РµРјРµ
                <input
                  className={styles.input}
                  value={editForm.roleLabel}
                  onChange={(e) =>
                    setEditForm({ ...editForm, roleLabel: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                РўРµР»РµС„РѕРЅ
                <input
                  className={styles.input}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </label>
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                РћСЂРіР°РЅРёР·Р°С†РёСЏ (РїРѕРґСЂСЏРґС‡РёРє)
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
                РЈРІРµРґРѕРјР»РµРЅРёСЏ e-mail
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
                  РЎРѕС…СЂР°РЅРёС‚СЊ
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => {
                    setEditing(null);
                    setEditForm(null);
                  }}
                >
                  РћС‚РјРµРЅР°
                </button>
              </div>
            </form>
          ) : null}

          {!authApiMode && pwUserEmail ? (
            <form className={styles.form} style={{ marginTop: 16 }} onSubmit={setUserPassword}>
              <h4 className={styles.sectionTitle}>
                РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ РґР»СЏ {pwUserEmail}
              </h4>
              <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
              <label className={styles.label}>
                РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ
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
                    pwMessage.includes("РѕР±РЅРѕРІР»С‘РЅ") ? styles.okMsg : styles.error
                  }
                >
                  {pwMessage}
                </p>
              ) : null}
              <div className={styles.rowBtns}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  РЈСЃС‚Р°РЅРѕРІРёС‚СЊ РїР°СЂРѕР»СЊ
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => setPwUserEmail(null)}
                >
                  РћС‚РјРµРЅР°
                </button>
              </div>
            </form>
          ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>РЎРјРµРЅР° РїР°СЂРѕР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</h3>
          <form className={styles.form} onSubmit={handleAdminPassword}>
            <label className={styles.label}>
              РўРµРєСѓС‰РёР№ РїР°СЂРѕР»СЊ
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={adminOldPw}
                onChange={(e) => setAdminOldPw(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ
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
                  adminPwMsg.includes("РёР·РјРµРЅС‘РЅ") ? styles.okMsg : styles.error
                }
              >
                {adminPwMsg}
              </p>
            ) : null}
            <button type="submit" className={styles.btnNeoPrimaryNeutral}>
              РЎРјРµРЅРёС‚СЊ РїР°СЂРѕР»СЊ
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Р‘С‹СЃС‚СЂС‹Рµ СЃСЃС‹Р»РєРё</h3>
          <div className={styles.links}>
            <Link to="/page3" onClick={markNavigationFromAdminDashboard}>
              Р’С…РѕРґ РІ РєР°Р±РёРЅРµС‚С‹ (СЂРѕР»Рё)
            </Link>
            <Link to="/cabinet-school" onClick={markNavigationFromAdminDashboard}>
              РљР°Р±РёРЅРµС‚ С€РєРѕР»СЊРЅРёРєР°
            </Link>
            <Link to="/cabinet-spo" onClick={markNavigationFromAdminDashboard}>
              РљР°Р±РёРЅРµС‚ СЃС‚СѓРґРµРЅС‚Р°
            </Link>
            <Link to="/page4" onClick={markNavigationFromAdminDashboard}>
              РџРѕРґСЂСЏРґС‡РёРє
            </Link>
            <Link to="/page5" onClick={markNavigationFromAdminDashboard}>
              Р РђР”РћР 
            </Link>
            <Link to="/page6" onClick={markNavigationFromAdminDashboard}>
              РђР”Рћ
            </Link>
            <Link to="/profile" onClick={markNavigationFromAdminDashboard}>
              РќР°СЃС‚СЂРѕР№РєРё РїСЂРѕС„РёР»СЏ
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

