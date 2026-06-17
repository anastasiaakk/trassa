import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatSubjectDisplayName, SUBJECT_MARKERS_GEO } from "../../data/page2MapGeo";
import {
  loadMapCategoryLabels,
  saveMapCategoryLabels,
  type MapCategoryLabels,
} from "../../utils/mapCategoryLabels";
import {
  addMapSubjectOrganization,
  removeMapSubjectOrganization,
  updateMapSubjectOrganization,
  type MapOrgKind,
  type MapSubjectOrganization,
} from "../../utils/mapSubjectOrganizations";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";
import AdminSoftToolbar from "./AdminSoftToolbar";

type Props = {
  mapOrgs: MapSubjectOrganization[];
  onRefresh: () => void;
  softUi: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** Сброс внутреннего UI при смене вкладки админки. */
  activeSection: string;
};

export default function AdminMapSection({
  mapOrgs,
  onRefresh,
  softUi,
  searchQuery,
  onSearchChange,
  activeSection,
}: Props) {
  const [open, setOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [contractorsOpen, setContractorsOpen] = useState(false);
  const [softMapKind, setSoftMapKind] = useState("all");

  const [labels, setLabels] = useState<MapCategoryLabels>(() => loadMapCategoryLabels());
  const [labelsFeedback, setLabelsFeedback] = useState<string | null>(null);

  const [addSubject, setAddSubject] = useState("");
  const [addKind, setAddKind] = useState<MapOrgKind>("education");
  const [addName, setAddName] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editKind, setEditKind] = useState<MapOrgKind>("education");
  const [editName, setEditName] = useState("");

  const normQ = searchQuery.trim().toLowerCase();

  const subjectOptions = useMemo(
    () =>
      Array.from(new Set(SUBJECT_MARKERS_GEO.map((m) => m.name))).sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    [],
  );

  const educationRows = useMemo(
    () => mapOrgs.filter((row) => row.kind === "education"),
    [mapOrgs],
  );
  const contractorRows = useMemo(
    () => mapOrgs.filter((row) => row.kind === "contractors"),
    [mapOrgs],
  );

  const filterRow = useCallback(
    (row: MapSubjectOrganization) => {
      if (!normQ) return true;
      const subj = formatSubjectDisplayName(row.subjectName).toLowerCase();
      return (
        row.name.toLowerCase().includes(normQ) ||
        row.subjectName.toLowerCase().includes(normQ) ||
        subj.includes(normQ)
      );
    },
    [normQ],
  );

  const filteredEducation = useMemo(
    () => educationRows.filter(filterRow),
    [educationRows, filterRow],
  );
  const filteredContractors = useMemo(
    () => contractorRows.filter(filterRow),
    [contractorRows, filterRow],
  );

  const softMapFilterOptions = useMemo(
    () => [
      { value: "all", label: "Все типы" },
      { value: "education", label: labels.education || "ВУЗ / СПО" },
      { value: "contractors", label: labels.contractors || "Подрядчики" },
    ],
    [labels.education, labels.contractors],
  );

  useEffect(() => {
    setSoftMapKind("all");
    setOpen(false);
    setEducationOpen(false);
    setContractorsOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (editingId) setOpen(true);
  }, [editingId]);

  const onSaveLabels = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setLabelsFeedback(null);
      void saveMapCategoryLabels(labels).then((res) => {
        if (res.ok) {
          setLabels(loadMapCategoryLabels());
          setLabelsFeedback("Названия разделов на карте сохранены.");
        } else {
          setLabelsFeedback(res.error);
        }
      });
    },
    [labels],
  );

  const onAddRow = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setActionFeedback(null);
      void addMapSubjectOrganization({
        subjectName: addSubject,
        kind: addKind,
        name: addName,
      }).then((res) => {
        if (!res.ok) {
          setActionFeedback(res.error);
          return;
        }
        setAddName("");
        if (addKind === "education") setEducationOpen(true);
        if (addKind === "contractors") setContractorsOpen(true);
        onRefresh();
        setActionFeedback("Запись добавлена.");
      });
    },
    [addSubject, addKind, addName, onRefresh],
  );

  const startEdit = useCallback((row: MapSubjectOrganization) => {
    setEditingId(row.id);
    setEditSubject(row.subjectName);
    setEditKind(row.kind);
    setEditName(row.name);
    setActionFeedback(null);
  }, []);

  const onSaveEdit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!editingId) return;
      setActionFeedback(null);
      void updateMapSubjectOrganization(editingId, {
        subjectName: editSubject,
        kind: editKind,
        name: editName,
      }).then((res) => {
        if (!res.ok) {
          setActionFeedback(res.error);
          return;
        }
        setEditingId(null);
        setEditName("");
        onRefresh();
        setActionFeedback("Запись обновлена.");
      });
    },
    [editingId, editSubject, editKind, editName, onRefresh],
  );

  const onDelete = useCallback(
    (row: MapSubjectOrganization) => {
      if (!window.confirm(`Удалить запись «${row.name}»?`)) return;
      setActionFeedback(null);
      void removeMapSubjectOrganization(row.id).then((res) => {
        if (!res.ok) {
          setActionFeedback(res.error);
          return;
        }
        if (editingId === row.id) setEditingId(null);
        onRefresh();
        setActionFeedback("Запись удалена.");
      });
    },
    [editingId, onRefresh],
  );

  const renderTable = (rows: MapSubjectOrganization[]) => (
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3}>
                <span className={styles.hint}>
                  {normQ ? "Ничего не найдено." : "Список пуст."}
                </span>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{formatSubjectDisplayName(row.subjectName)}</td>
                <td>{row.name}</td>
                <td>
                  <button
                    type="button"
                    className={styles.btnSmall}
                    onClick={() => startEdit(row)}
                  >
                    Изменить
                  </button>{" "}
                  <button
                    type="button"
                    className={styles.btnSmallDanger}
                    onClick={() => onDelete(row)}
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
          Редактирование карты
        </h3>
        <span className={styles.collapseMeta}>
          {educationRows.length + contractorRows.length} записей
        </span>
      </button>

      {open ? (
        <div className={styles.collapseBody}>
          {softUi ? (
            <AdminSoftToolbar
              searchValue={searchQuery}
              onSearchChange={onSearchChange}
              searchPlaceholder="Поиск по субъекту или названию…"
              filterValue={softMapKind}
              filterOptions={softMapFilterOptions}
              onFilterChange={setSoftMapKind}
              filterAriaLabel="Тип"
              matchCount={
                softMapKind === "education"
                  ? filteredEducation.length
                  : softMapKind === "contractors"
                    ? filteredContractors.length
                    : filteredEducation.length + filteredContractors.length
              }
              totalCount={
                softMapKind === "education"
                  ? educationRows.length
                  : softMapKind === "contractors"
                    ? contractorRows.length
                    : educationRows.length + contractorRows.length
              }
            />
          ) : null}

          <h4 className={styles.sectionTitle}>Названия разделов на карте</h4>
          <p className={styles.subtitle}>
            Эти названия показываются в плашке над субъектом и в правой панели карты подрядчиков.
          </p>
          <form className={styles.form} onSubmit={onSaveLabels}>
            <label className={styles.label}>
              Название блока ВУЗ / СПО
              <input
                className={styles.input}
                value={labels.education}
                onChange={(e) => setLabels({ ...labels, education: e.target.value })}
                placeholder="ВУЗ / СПО"
                maxLength={80}
              />
            </label>
            <label className={styles.label}>
              Название блока подрядчиков
              <input
                className={styles.input}
                value={labels.contractors}
                onChange={(e) => setLabels({ ...labels, contractors: e.target.value })}
                placeholder="Подрядчики"
                maxLength={80}
              />
            </label>
            <button type="submit" className={styles.btnNeoPrimary}>
              Сохранить названия
            </button>
            {labelsFeedback ? <p className={glass.glassMsg}>{labelsFeedback}</p> : null}
          </form>

          <h4 className={styles.sectionTitle} style={{ marginTop: 14 }}>
            Организации по субъектам для карты
          </h4>
          <p className={styles.subtitle}>
            Формат строки: субъект, тип (ВУЗ/СПО или подрядчики), наименование. Эти данные
            отображаются справа на карте после выбора субъекта и типа.
          </p>
          <form className={styles.form} onSubmit={onAddRow}>
            <label className={styles.label}>
              Субъект
              <select
                className={styles.input}
                value={addSubject}
                onChange={(e) => setAddSubject(e.target.value)}
              >
                <option value="">Выберите субъект</option>
                {subjectOptions.map((name) => (
                  <option key={name} value={name}>
                    {formatSubjectDisplayName(name)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Тип
              <select
                className={styles.input}
                value={addKind}
                onChange={(e) => setAddKind(e.target.value as MapOrgKind)}
              >
                <option value="education">{labels.education}</option>
                <option value="contractors">{labels.contractors}</option>
              </select>
            </label>
            <label className={styles.label}>
              Наименование
              <input
                className={styles.input}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Введите название организации"
                maxLength={240}
              />
            </label>
            <button type="submit" className={styles.btnNeoPrimary}>
              Добавить строку
            </button>
          </form>

          {actionFeedback ? <p className={glass.glassMsg}>{actionFeedback}</p> : null}

          {!softUi || softMapKind === "all" || softMapKind === "education" ? (
            <div className={styles.section} style={{ marginTop: 14 }}>
              <button
                type="button"
                className={styles.collapseTrigger}
                aria-expanded={educationOpen}
                onClick={() => setEducationOpen((v) => !v)}
              >
                <span
                  className={`${styles.collapseChevron} ${educationOpen ? styles.collapseChevronOpen : ""}`}
                  aria-hidden
                >
                  ▶
                </span>
                <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
                  {labels.education}
                </h4>
                <span className={styles.collapseMeta}>{filteredEducation.length}</span>
              </button>
              {educationOpen ? renderTable(filteredEducation) : null}
            </div>
          ) : null}

          {!softUi || softMapKind === "all" || softMapKind === "contractors" ? (
            <div className={styles.section} style={{ marginTop: 12 }}>
              <button
                type="button"
                className={styles.collapseTrigger}
                aria-expanded={contractorsOpen}
                onClick={() => setContractorsOpen((v) => !v)}
              >
                <span
                  className={`${styles.collapseChevron} ${contractorsOpen ? styles.collapseChevronOpen : ""}`}
                  aria-hidden
                >
                  ▶
                </span>
                <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
                  {labels.contractors}
                </h4>
                <span className={styles.collapseMeta}>{filteredContractors.length}</span>
              </button>
              {contractorsOpen ? renderTable(filteredContractors) : null}
            </div>
          ) : null}

          {editingId ? (
            <form className={styles.editGrid} style={{ marginTop: 14 }} onSubmit={onSaveEdit}>
              <h4 className={styles.sectionTitle} style={{ gridColumn: "1 / -1" }}>
                Редактирование строки
              </h4>
              <label className={styles.label}>
                Субъект
                <select
                  className={styles.input}
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                >
                  <option value="">Выберите субъект</option>
                  {subjectOptions.map((name) => (
                    <option key={name} value={name}>
                      {formatSubjectDisplayName(name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Тип
                <select
                  className={styles.input}
                  value={editKind}
                  onChange={(e) => setEditKind(e.target.value as MapOrgKind)}
                >
                  <option value="education">{labels.education}</option>
                  <option value="contractors">{labels.contractors}</option>
                </select>
              </label>
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Наименование
                <input
                  className={styles.input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  onClick={() => setEditingId(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
