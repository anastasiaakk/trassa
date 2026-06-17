import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  adminDeleteDevice,
  adminGetDeviceLocation,
  adminListDeviceVisits,
  adminListDevices,
  adminSaveDeviceNote,
  adminSetDeviceBanned,
  adminSetDevicePersonal,
  type PortalDeviceLocation,
  type PortalDeviceRecord,
  type PortalDeviceVisitRecord,
} from "../../api/deviceAccessApi";
import { isAuthApiEnabled } from "../../utils/authMode";
import { getTrassaDeviceId } from "../../utils/deviceId";
import { primaryModelFromLabel } from "../../utils/iphoneModels";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const AdminDeviceGeoMap = lazy(() => import("./AdminDeviceGeoMap"));

function formatGeoAccuracy(): string {
  return "по IP (город, приблизительно)";
}

function visitCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} визитов`;
  if (mod10 === 1) return `${n} визит`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} визита`;
  return `${n} визитов`;
}

type DeviceTab = "all" | "personal";

type Props = {
  glassHintClass?: string;
  errorClass?: string;
  btnPrimaryClass?: string;
  btnSecondaryClass?: string;
};

export default function AdminDevicesPanel({
  glassHintClass = "",
  errorClass = "",
  btnPrimaryClass = "",
  btnSecondaryClass = "",
}: Props) {
  const [devices, setDevices] = useState<PortalDeviceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visitsByDevice, setVisitsByDevice] = useState<
    Record<string, PortalDeviceVisitRecord[]>
  >({});
  const [visitsLoadingId, setVisitsLoadingId] = useState<string | null>(null);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [noteSavingId, setNoteSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeviceTab>("all");
  const [personalBusyId, setPersonalBusyId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [locationByDevice, setLocationByDevice] = useState<
    Record<string, PortalDeviceLocation | null | undefined>
  >({});
  const [locationHintByDevice, setLocationHintByDevice] = useState<Record<string, string>>({});
  const [locationLoadingId, setLocationLoadingId] = useState<string | null>(null);

  const apiOn = isAuthApiEnabled();
  const currentDeviceId = getTrassaDeviceId();

  const reload = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    setError(null);
    const r = await adminListDevices();
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const mapped = r.devices.map((d) => ({
      ...d,
      adminNote: d.adminNote ?? "",
      visitCount: typeof d.visitCount === "number" ? d.visitCount : 0,
      personal: Boolean(d.personal),
    }));
    setDevices(mapped);
    setNoteDraft(
      Object.fromEntries(mapped.map((d) => [d.id, d.adminNote]))
    );
    setLocationByDevice({});
    setLocationHintByDevice({});
  }, [apiOn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const byTab =
      activeTab === "personal"
        ? devices.filter((d) => d.personal)
        : devices.filter((d) => !d.personal);
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((d) => {
      const hay = [
        d.label,
        d.userEmail ?? "",
        d.ipLast,
        d.id,
        d.userAgent,
        d.adminNote ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [devices, query, activeTab]);

  const personalCount = useMemo(
    () => devices.filter((d) => d.personal).length,
    [devices]
  );
  const generalCount = useMemo(
    () => devices.filter((d) => !d.personal).length,
    [devices]
  );

  const locationFromRecord = (
    d: PortalDeviceRecord
  ): PortalDeviceLocation | null => {
    if (d.geoLat == null || d.geoLng == null) return null;
    if (!Number.isFinite(d.geoLat) || !Number.isFinite(d.geoLng)) return null;
    return {
      lat: d.geoLat,
      lng: d.geoLng,
      accuracyM: d.geoAccuracyM ?? 25_000,
      updatedAt: d.geoUpdatedAt ?? null,
      source: "ip",
      ip: d.ipLast,
    };
  };

  const loadLocation = async (deviceId: string, device?: PortalDeviceRecord) => {
    if (locationByDevice[deviceId] !== undefined) return;
    const cached = device ? locationFromRecord(device) : null;
    if (cached) {
      setLocationByDevice((prev) => ({ ...prev, [deviceId]: cached }));
      return;
    }
    setLocationLoadingId(deviceId);
    const r = await adminGetDeviceLocation(deviceId);
    setLocationLoadingId(null);
    if (!r.ok) {
      setLocationHintByDevice((prev) => ({
        ...prev,
        [deviceId]: r.error,
      }));
      setLocationByDevice((prev) => ({ ...prev, [deviceId]: null }));
      return;
    }
    setLocationByDevice((prev) => ({ ...prev, [deviceId]: r.location }));
    if (r.hint) {
      setLocationHintByDevice((prev) => ({ ...prev, [deviceId]: r.hint! }));
    }
  };

  const openDevice = (device: PortalDeviceRecord) => {
    const willExpand = expandedId !== device.id;
    setExpandedId(willExpand ? device.id : null);
    if (willExpand) {
      void loadVisits(device.id);
      void loadLocation(device.id, device);
    }
  };

  const loadVisits = async (deviceId: string) => {
    if (visitsByDevice[deviceId]) return;
    setVisitsLoadingId(deviceId);
    setVisitsError(null);
    const r = await adminListDeviceVisits(deviceId);
    setVisitsLoadingId(null);
    if (!r.ok) {
      setVisitsError(r.error);
      return;
    }
    setVisitsByDevice((prev) => ({ ...prev, [deviceId]: r.visits }));
  };

  const toggleVisits = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return;
    openDevice(device);
  };

  const saveNote = async (deviceId: string) => {
    const text = noteDraft[deviceId] ?? "";
    setNoteSavingId(deviceId);
    setError(null);
    const r = await adminSaveDeviceNote(deviceId, text);
    setNoteSavingId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setNotice("Заметка сохранена.");
    void reload();
  };

  const toggleBan = async (device: PortalDeviceRecord) => {
    setBusyId(device.id);
    setError(null);
    const r = await adminSetDeviceBanned(device.id, !device.banned);
    setBusyId(null);
    if (!r.ok) {
      setError(r.error);
      setNotice(null);
      return;
    }
    setError(null);
    if (device.banned) {
      if (r.affected > 1) {
        setNotice(`Доступ разрешён на ${r.affected} устройствах этого пользователя.`);
      } else {
        setNotice("Доступ разрешён.");
      }
    } else {
      setNotice("Доступ запрещён для выбранного устройства.");
    }
    void reload();
  };

  const togglePersonal = async (device: PortalDeviceRecord) => {
    const next = !device.personal;
    setPersonalBusyId(device.id);
    setError(null);
    const r = await adminSetDevicePersonal(device.id, next);
    setPersonalBusyId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setNotice(next ? "Устройство перенесено в «Личные»." : "Устройство возвращено в общий список.");
    if (expandedId === device.id) setExpandedId(null);
    void reload();
  };

  const removeDevice = async (device: PortalDeviceRecord) => {
    const model = device.displayModel ?? primaryModelFromLabel(device.displayLabel ?? device.label);
    const ok = window.confirm(
      `Удалить устройство «${model}»?\n\nБудут удалены запись и история визитов. При следующем входе с этого браузера устройство появится снова.`
    );
    if (!ok) return;
    setDeleteBusyId(device.id);
    setError(null);
    const r = await adminDeleteDevice(device.id);
    setDeleteBusyId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setNotice("Устройство удалено.");
    if (expandedId === device.id) setExpandedId(null);
    setVisitsByDevice((prev) => {
      const next = { ...prev };
      delete next[device.id];
      return next;
    });
    void reload();
  };

  if (!apiOn) {
    return (
      <p className={glassHintClass}>
        Учёт устройств доступен при включённом API (<code>VITE_USE_AUTH_API=true</code>).
      </p>
    );
  }

  return (
    <div className="admin-devices-panel">
      <p className={glassHintClass}>
        Одна строка — <strong>одно устройство</strong> (один браузер/телефон с уникальным ID).
        В поле <strong>Заметка</strong> можно записать, чьё это устройство и кто им пользуется.
        Свои телефоны и компьютеры можно перенести во вкладку <strong>Личные устройства</strong>.
        Нажмите на название устройства или «Последний визит», чтобы открыть карту с местоположением
        и историю входов. Координаты определяются автоматически при входе в портал по IP-адресу
        (примерно: город или регион).
        Новый визит фиксируется, если с прошлого прошло более 5 минут. Запрет — для выбранного
        устройства; <strong>Разрешить</strong> снимает блокировку со всех устройств пользователя с
        тем же e-mail.
      </p>

      <div className="admin-devices-panel__tabs" role="tablist" aria-label="Разделы устройств">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "all"}
          className={[
            "admin-devices-panel__tab",
            activeTab === "all" ? "admin-devices-panel__tab--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            setActiveTab("all");
            setExpandedId(null);
            setNotice(null);
          }}
        >
          Все устройства
          <span className="admin-devices-panel__tab-count">{generalCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "personal"}
          className={[
            "admin-devices-panel__tab",
            activeTab === "personal" ? "admin-devices-panel__tab--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            setActiveTab("personal");
            setExpandedId(null);
            setNotice(null);
          }}
        >
          Личные устройства
          <span className="admin-devices-panel__tab-count">{personalCount}</span>
        </button>
      </div>

      <div className="admin-devices-panel__toolbar">
        <input
          type="search"
          className="admin-devices-panel__search"
          placeholder="Поиск: email, IP, заметка…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={btnSecondaryClass}
          onClick={() => void reload()}
          disabled={loading}
        >
          {loading ? "Обновление…" : "Обновить"}
        </button>
      </div>

      {error ? <p className={errorClass}>{error}</p> : null}
      {notice && !error ? <p className={glassHintClass}>{notice}</p> : null}
      {visitsError ? <p className={errorClass}>{visitsError}</p> : null}

      <div className="admin-devices-panel__table-wrap">
        <table className="admin-devices-panel__table">
          <thead>
            <tr>
              <th>Устройство</th>
              <th>Заметка</th>
              <th>Пользователь</th>
              <th>IP</th>
              <th>Последний визит</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-devices-panel__empty">
                  {loading
                    ? "Загрузка…"
                    : activeTab === "personal"
                      ? "Личных устройств пока нет — перенесите сюда свои телефоны и компьютеры."
                      : "Устройств пока нет — откройте портал с браузера."}
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const isCurrent = d.id === currentDeviceId;
                const expanded = expandedId === d.id;
                const visits = visitsByDevice[d.id];
                const visitCount = d.visitCount ?? 0;

                return (
                  <Fragment key={d.id}>
                    <tr
                      className={[
                        d.banned ? "admin-devices-panel__row--banned" : "",
                        isCurrent ? "admin-devices-panel__row--current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                    >
                      <td>
                        <button
                          type="button"
                          className="admin-devices-panel__device-open"
                          onClick={() => openDevice(d)}
                          aria-expanded={expanded}
                        >
                        <div className="admin-devices-panel__model-head">
                          {d.displayModel ?? primaryModelFromLabel(d.displayLabel ?? d.label)}
                        </div>
                        <div
                          className="admin-devices-panel__label admin-devices-panel__label--full"
                          title={d.displayLabel ?? d.label}
                        >
                          {d.displayLabel ?? d.label}
                        </div>
                        {isCurrent ? (
                          <span className="admin-devices-panel__badge admin-devices-panel__badge--here">
                            Это ваше устройство
                          </span>
                        ) : null}
                        <div className="admin-devices-panel__meta" title={d.userAgent}>
                          ID: {d.id.slice(0, 8)}…
                        </div>
                        <div className="admin-devices-panel__meta">
                          Первый визит: {formatWhen(d.firstSeenAt)}
                        </div>
                        {d.geoLat != null && d.geoLng != null ? (
                          <span className="admin-devices-panel__badge admin-devices-panel__badge--geo">
                            Место по IP
                          </span>
                        ) : null}
                        </button>
                      </td>
                      <td className="admin-devices-panel__note-cell">
                        <label className="admin-devices-panel__note-label" htmlFor={`device-note-${d.id}`}>
                          Заметка администратора
                        </label>
                        <textarea
                          id={`device-note-${d.id}`}
                          className="admin-devices-panel__note-input"
                          rows={3}
                          placeholder="Например: телефон Иванова, отдел кадров…"
                          value={noteDraft[d.id] ?? ""}
                          onChange={(e) =>
                            setNoteDraft((prev) => ({
                              ...prev,
                              [d.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className={btnSecondaryClass}
                          disabled={
                            noteSavingId === d.id ||
                            (noteDraft[d.id] ?? "") === (d.adminNote ?? "")
                          }
                          onClick={() => void saveNote(d.id)}
                        >
                          {noteSavingId === d.id ? "Сохранение…" : "Сохранить"}
                        </button>
                      </td>
                      <td>{d.userEmail ?? "—"}</td>
                      <td>{d.ipLast}</td>
                      <td>
                        <div>{formatWhen(d.lastSeenAt)}</div>
                        <button
                          type="button"
                          className="admin-devices-panel__visits-toggle"
                          onClick={() => toggleVisits(d.id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? "▲ Скрыть" : "▼"}{" "}
                          {visitCount > 0
                            ? visitCountLabel(visitCount)
                            : "История визитов"}
                        </button>
                      </td>
                      <td>
                        {d.banned ? (
                          <span className="admin-devices-panel__badge admin-devices-panel__badge--ban">
                            Запрещён
                          </span>
                        ) : (
                          <span className="admin-devices-panel__badge admin-devices-panel__badge--ok">
                            Разрешён
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="admin-devices-panel__actions">
                          <button
                            type="button"
                            className={d.banned ? btnPrimaryClass : btnSecondaryClass}
                            disabled={busyId === d.id}
                            onClick={() => void toggleBan(d)}
                          >
                            {busyId === d.id
                              ? "…"
                              : d.banned
                                ? "Разрешить"
                                : "Запретить"}
                          </button>
                          <button
                            type="button"
                            className={btnSecondaryClass}
                            disabled={personalBusyId === d.id}
                            onClick={() => void togglePersonal(d)}
                          >
                            {personalBusyId === d.id
                              ? "…"
                              : d.personal
                                ? "В общий список"
                                : "В личные"}
                          </button>
                          <button
                            type="button"
                            className="admin-devices-panel__btn-delete"
                            disabled={deleteBusyId === d.id}
                            onClick={() => void removeDevice(d)}
                          >
                            {deleteBusyId === d.id ? "…" : "Удалить"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr key={`${d.id}-visits`} className="admin-devices-panel__row--visits">
                        <td colSpan={7}>
                          <div className="admin-devices-panel__visits-panel">
                            <p className="admin-devices-panel__visits-title">
                              Местоположение устройства
                            </p>
                            {locationLoadingId === d.id ? (
                              <p className="admin-devices-panel__meta">Загрузка карты…</p>
                            ) : locationByDevice[d.id] ? (
                              <>
                                <p className="admin-devices-panel__geo-meta">
                                  {locationByDevice[d.id]!.placeLabel
                                    ? `${locationByDevice[d.id]!.placeLabel} · `
                                    : ""}
                                  IP {locationByDevice[d.id]!.ip ?? d.ipLast} · {formatGeoAccuracy()}
                                  {locationByDevice[d.id]!.updatedAt
                                    ? ` · ${formatWhen(locationByDevice[d.id]!.updatedAt!)}`
                                    : ""}
                                </p>
                                <Suspense
                                  fallback={
                                    <p className="admin-devices-panel__meta">Карта…</p>
                                  }
                                >
                                  <AdminDeviceGeoMap
                                    lat={locationByDevice[d.id]!.lat}
                                    lng={locationByDevice[d.id]!.lng}
                                    accuracyM={locationByDevice[d.id]!.accuracyM}
                                    label={
                                      d.displayModel ??
                                      primaryModelFromLabel(d.displayLabel ?? d.label)
                                    }
                                  />
                                </Suspense>
                                <a
                                  className="admin-devices-panel__geo-link"
                                  href={`https://www.openstreetmap.org/?mlat=${locationByDevice[d.id]!.lat}&mlon=${locationByDevice[d.id]!.lng}#map=17/${locationByDevice[d.id]!.lat}/${locationByDevice[d.id]!.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Открыть в OpenStreetMap
                                </a>
                              </>
                            ) : (
                              <p className="admin-devices-panel__meta">
                                {locationHintByDevice[d.id] ??
                                  "Координаты пока неизвестны. Попросите пользователя открыть портал с этого устройства — местоположение подставится автоматически."}
                              </p>
                            )}
                            <p className="admin-devices-panel__visits-title admin-devices-panel__visits-title--spaced">
                              Входы в портал с этого устройства
                            </p>
                            {visitsLoadingId === d.id ? (
                              <p className="admin-devices-panel__meta">Загрузка…</p>
                            ) : visits && visits.length > 0 ? (
                              <ul className="admin-devices-panel__visits-list">
                                {visits.map((v, idx) => (
                                  <li key={v.id}>
                                    <span className="admin-devices-panel__visit-time">
                                      {formatWhen(v.seenAt)}
                                    </span>
                                    {idx === 0 ? (
                                      <span className="admin-devices-panel__badge admin-devices-panel__badge--here">
                                        последний
                                      </span>
                                    ) : null}
                                    <span className="admin-devices-panel__meta">
                                      IP: {v.ip || "—"}
                                      {v.userEmail ? ` · ${v.userEmail}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="admin-devices-panel__meta">
                                Визитов в журнале пока нет. Откройте портал с этого устройства —
                                новые входы появятся здесь (сессия — раз в 5+ минут).
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
