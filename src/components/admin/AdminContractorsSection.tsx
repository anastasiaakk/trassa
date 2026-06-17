import { type FormEvent, useCallback, useMemo, useState } from "react";
import { formatSubjectDisplayName } from "../../data/page2MapGeo";
import {
  addContractorOrganization,
  listMapContractorsForLoginPick,
  removeContractorOrganization,
} from "../../utils/contractorOrganizations";
import type { MapSubjectOrganization } from "../../utils/mapSubjectOrganizations";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";
import AdminSoftToolbar from "./AdminSoftToolbar";

function orgCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 0) return "список пуст";
  const word =
    mod10 === 1 && mod100 !== 11
      ? "организация"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "организации"
        : "организаций";
  return `${n} ${word}`;
}

type Props = {
  contractors: string[];
  onRefresh: () => void;
  mapSubjectOrgs: MapSubjectOrganization[];
  softUi: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

export default function AdminContractorsSection({
  contractors,
  onRefresh,
  mapSubjectOrgs,
  softUi,
  searchQuery,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [mapPickId, setMapPickId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const normQ = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normQ) return contractors;
    return contractors.filter((name) => name.toLowerCase().includes(normQ));
  }, [contractors, normQ]);

  const mapContractorsForPick = useMemo(
    () => listMapContractorsForLoginPick(mapSubjectOrgs, contractors),
    [mapSubjectOrgs, contractors],
  );

  const onAddManual = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setFeedback(null);
      void addContractorOrganization(manualName).then((res) => {
        if (res.ok) {
          setManualName("");
          onRefresh();
          setFeedback("Организация добавлена в список для подрядчиков.");
        } else {
          setFeedback(res.error);
        }
      });
    },
    [manualName, onRefresh],
  );

  const onAddFromMap = useCallback(() => {
    const pick = mapContractorsForPick.find((row) => row.entryId === mapPickId);
    if (!pick) {
      setFeedback("Выберите подрядчика из списка карты.");
      return;
    }
    setFeedback(null);
    void addContractorOrganization(pick.name).then((res) => {
      if (res.ok) {
        setMapPickId("");
        onRefresh();
        setFeedback(`«${pick.name}» добавлена в список для входа.`);
      } else {
        setFeedback(res.error);
      }
    });
  }, [mapPickId, mapContractorsForPick, onRefresh]);

  const onRemove = useCallback(
    (name: string) => {
      setFeedback(null);
      void removeContractorOrganization(name).then((res) => {
        if (res.ok) {
          onRefresh();
          setFeedback("Название удалено из списка.");
        } else {
          setFeedback(res.error);
        }
      });
    },
    [onRefresh],
  );

  return (
    <div className={cx(styles.section, softUi && "admin-soft-flat-section")}>
      <button
        type="button"
        className={styles.collapseTrigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`${styles.collapseChevron} ${open ? styles.collapseChevronOpen : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
          Организации подрядчиков
        </h3>
        <span className={styles.collapseMeta}>{orgCountLabel(contractors.length)}</span>
      </button>

      {open ? (
        <div className={styles.collapseBody}>
          {softUi ? (
            <AdminSoftToolbar
              searchValue={searchQuery}
              onSearchChange={onSearchChange}
              searchPlaceholder="Поиск организации…"
              matchCount={filtered.length}
              totalCount={contractors.length}
            />
          ) : null}

          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            Список для входа и регистрации в роли «Подрядчик». Без выбора организации из этого
            списка пользователь не попадёт в кабинет.
          </p>

          <div className={styles.orgsFromMapBlock}>
            <h4 className={styles.orgsFromMapTitle}>Добавить с карты</h4>
            <p className={styles.hint} style={{ marginBottom: 10 }}>
              Подрядчики из раздела «Карта» (тип «подрядчики» по субъектам), которых ещё нет в
              этом списке.
            </p>
            {mapContractorsForPick.length === 0 ? (
              <p className={styles.hint}>
                Все подрядчики с карты уже в списке для входа или на карте нет записей типа
                «подрядчики».
              </p>
            ) : (
              <div className={styles.form}>
                <label className={styles.label}>
                  Подрядчик на карте
                  <select
                    className={styles.input}
                    value={mapPickId}
                    onChange={(e) => setMapPickId(e.target.value)}
                  >
                    <option value="">Выберите из списка</option>
                    {mapContractorsForPick.map((row) => (
                      <option key={row.entryId} value={row.entryId}>
                        {row.name} — {formatSubjectDisplayName(row.subjectName)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.btnNeoPrimary}
                  disabled={!mapPickId}
                  onClick={onAddFromMap}
                >
                  Добавить выбранного
                </button>
              </div>
            )}
          </div>

          <form className={styles.form} onSubmit={onAddManual}>
            <label className={styles.label}>
              Новая организация вручную
              <input
                className={styles.input}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Полное наименование"
                maxLength={200}
              />
            </label>
            <button type="submit" className={styles.btnNeoPrimary}>
              Добавить в список
            </button>
          </form>

          {feedback ? <p className={glass.glassMsg}>{feedback}</p> : null}

          <div className={styles.tableWrap} style={{ marginTop: 16 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Название</th>
                  <th style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <span className={styles.hint}>
                        {normQ ? "Ничего не найдено." : "Список пуст — добавьте организации выше."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  filtered.map((name) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.btnSmall}
                          onClick={() => onRemove(name)}
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
  );
}
