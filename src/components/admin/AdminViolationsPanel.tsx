import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminClearViolations,
  adminDeleteViolation,
  adminListViolations,
  type PortalViolationRecord,
} from "../../api/violationsApi";
import { adminSetDeviceBanned } from "../../api/deviceAccessApi";
import { isAuthApiEnabled } from "../../utils/authMode";
import { saveViolationsGuardState } from "../../utils/violationsGuardMode";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function whoLabel(v: PortalViolationRecord): string {
  if (v.userName?.trim()) return v.userName.trim();
  if (v.userEmail?.trim()) return v.userEmail.trim();
  if (v.userId) return `Пользователь ${v.userId.slice(0, 8)}…`;
  return "Гость (без входа)";
}

import { primaryModelFromLabel } from "../../utils/iphoneModels";

type Props = {
  glassHintClass?: string;
  errorClass?: string;
  btnPrimaryClass?: string;
  btnSecondaryClass?: string;
};

export default function AdminViolationsPanel({
  glassHintClass = "",
  errorClass = "",
  btnPrimaryClass = "",
  btnSecondaryClass = "",
}: Props) {
  const [items, setItems] = useState<PortalViolationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [query, setQuery] = useState("");
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [guardEnabled, setGuardEnabled] = useState(true);
  const [guardSaving, setGuardSaving] = useState(false);

  const apiOn = isAuthApiEnabled();

  const reload = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    setError(null);
    const r = await adminListViolations();
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setItems(r.violations);
    setSmsConfigured(r.smsConfigured);
    setGuardEnabled(r.guardEnabled);
  }, [apiOn]);

  const toggleGuard = async () => {
    const next = !guardEnabled;
    setGuardSaving(true);
    setError(null);
    setNotice(null);
    const r = await saveViolationsGuardState({ enabled: next });
    setGuardSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setGuardEnabled(next);
    setNotice(next ? "Защита от нарушений включена." : "Защита от нарушений выключена.");
  };

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((v) => {
      const hay = [
        v.kindLabel,
        v.deviceLabel,
        v.userEmail,
        v.userName,
        v.deviceId,
        v.ip,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const recentIds = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return new Set(
      items
        .filter((v) => new Date(v.createdAt).getTime() >= cutoff)
        .map((v) => v.id)
    );
  }, [items]);

  const toggleBan = async (v: PortalViolationRecord) => {
    const banned = Boolean(v.deviceBanned);
    setBusyDeviceId(v.deviceId);
    setError(null);
    setNotice(null);
    const r = await adminSetDeviceBanned(v.deviceId, !banned);
    setBusyDeviceId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (!banned) {
      setNotice(`Доступ запрещён для устройства «${primaryModelFromLabel(v.deviceLabel)}».`);
    } else if (r.affected > 1) {
      setNotice(`Доступ разрешён на ${r.affected} устройствах пользователя.`);
    } else {
      setNotice("Доступ к порталу разрешён.");
    }
    void reload();
  };

  const removeOne = async (v: PortalViolationRecord) => {
    if (!window.confirm("Удалить эту запись из журнала нарушений?")) return;
    setBusyDeleteId(v.id);
    setError(null);
    setNotice(null);
    const r = await adminDeleteViolation(v.id);
    setBusyDeleteId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setNotice("Запись удалена.");
    void reload();
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    if (
      !window.confirm(
        `Удалить все записи журнала (${items.length})? Это действие нельзя отменить.`
      )
    ) {
      return;
    }
    setClearing(true);
    setError(null);
    setNotice(null);
    const r = await adminClearViolations();
    setClearing(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setNotice(`Удалено записей: ${r.deleted}.`);
    void reload();
  };

  if (!apiOn) {
    return (
      <p className={glassHintClass}>
        Журнал нарушений доступен при включённом API на сервере.
      </p>
    );
  }

  return (
    <div className="admin-violations-panel">
      <p className={`admin-violations-panel__hint ${glassHintClass}`}>
        Срабатывает только при нажатии громкости (часть сочетания «питание + громкость»
        на Android). Без лишних срабатываний при обычном просмотре.{" "}
        {smsConfigured ? (
          <span className="admin-violations-panel__sms-ok">SMS включены.</span>
        ) : (
          <span className="admin-violations-panel__sms-off">
            SMS: ADMIN_ALERT_PHONES + SMSC_* на сервере.
          </span>
        )}
      </p>

      <div className="admin-violations-panel__guard">
        <label className="admin-violations-panel__guard-toggle">
          <input
            type="checkbox"
            checked={guardEnabled}
            disabled={guardSaving || loading}
            onChange={() => void toggleGuard()}
          />
          <span className="admin-violations-panel__guard-ui" aria-hidden />
          <span className="admin-violations-panel__guard-label">
            {guardEnabled ? "Защита включена" : "Защита выключена"}
          </span>
        </label>
        <p className="admin-violations-panel__guard-note">
          {guardEnabled
            ? "Пользователи видят предупреждение при попытке снимка экрана; события пишутся в журнал."
            : "Предупреждения и запись в журнал отключены для всех клиентов портала."}
        </p>
      </div>

      <div className="admin-violations-panel__toolbar">
        <input
          type="search"
          className="admin-devices-panel__search"
          placeholder="Поиск: пользователь, устройство, тип…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск нарушений"
        />
        <button
          type="button"
          className={btnSecondaryClass}
          onClick={() => void reload()}
          disabled={loading}
        >
          {loading ? "Обновление…" : "Обновить"}
        </button>
        <button
          type="button"
          className="admin-violations-panel__btn-clear"
          onClick={() => void clearAll()}
          disabled={loading || clearing || items.length === 0}
        >
          {clearing ? "Удаление…" : "Очистить журнал"}
        </button>
      </div>

      {error ? <p className={errorClass}>{error}</p> : null}
      {notice && !error ? <p className={glassHintClass}>{notice}</p> : null}

      <div className="admin-violations-panel__table-wrap">
        <table className="admin-violations-panel__table">
          <thead>
            <tr>
              <th>Когда</th>
              <th>Пользователь</th>
              <th>Устройство</th>
              <th>Действие</th>
              <th>Браузер</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-violations-panel__empty">
                  {loading ? "Загрузка…" : "Нарушений пока нет."}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr
                  key={v.id}
                  className={[
                    recentIds.has(v.id) ? "admin-violations-panel__row--new" : "",
                    v.deviceBanned ? "admin-violations-panel__row--banned" : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined}
                >
                  <td>{formatWhen(v.createdAt)}</td>
                  <td>
                    <div className="admin-violations-panel__who">{whoLabel(v)}</div>
                    {v.userEmail && v.userName ? (
                      <div className="admin-violations-panel__meta">{v.userEmail}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className="admin-violations-panel__who">
                      {primaryModelFromLabel(v.deviceLabel)}
                    </div>
                    <div className="admin-violations-panel__meta" title={v.deviceId}>
                      {v.deviceLabel}
                    </div>
                    {v.deviceBanned ? (
                      <span className="admin-violations-panel__badge-ban">Заблокировано</span>
                    ) : null}
                  </td>
                  <td>
                    <strong>{v.kindLabel}</strong>
                    <div className="admin-violations-panel__meta">IP: {v.ip || "—"}</div>
                  </td>
                  <td>{v.browser || "—"}</td>
                  <td className="admin-violations-panel__actions">
                    <div className="admin-violations-panel__actions-inner">
                      <button
                        type="button"
                        className={v.deviceBanned ? btnSecondaryClass : btnPrimaryClass}
                        disabled={busyDeviceId === v.deviceId}
                        onClick={() => void toggleBan(v)}
                      >
                        {busyDeviceId === v.deviceId
                          ? "…"
                          : v.deviceBanned
                            ? "Разрешить"
                            : "Запретить"}
                      </button>
                      <button
                        type="button"
                        className="admin-violations-panel__btn-delete"
                        disabled={busyDeleteId === v.id}
                        onClick={() => void removeOne(v)}
                      >
                        {busyDeleteId === v.id ? "…" : "Удалить"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
