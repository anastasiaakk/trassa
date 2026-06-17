import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  adminCreateDistributionProposal,
  adminDeleteSpecialization,
  adminMoveUserSpecialization,
  adminUpdateSpecialization,
  fetchAdminSpecializationSummary,
  type SpecializationSummaryPayload,
} from "../api/specializationsApi";
import { getAdminApiToken } from "../api/adminApi";
import { adminOverrideUserProfile, listRegisteredUsers } from "../utils/localAuth";
import { isAuthApiEnabled } from "../utils/authMode";
import {
  addDistributionProposal,
  addSpecialization,
  buildSpecializationBuckets,
  loadSpecializations,
  removeSpecialization,
  saveSpecializations,
  updateSpecialization,
  type Specialization,
} from "../utils/specializationsStorage";
import { getApiBase } from "../api/authApi";
import { downloadSpecializationsCsvLocal } from "../utils/specializationExport";
import styles from "./AdminPanel.module.css";
import glass from "./AdminPanelGlass.module.css";

function memberName(last: string, first: string, email: string): string {
  const n = `${last} ${first}`.trim();
  return n || email;
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    </svg>
  );
}

function CollapseSection({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        className={styles.collapseTrigger}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span
          className={`${styles.collapseChevron} ${open ? styles.collapseChevronOpen : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <h4 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>{title}</h4>
        {meta ? <span className={styles.collapseMeta}>{meta}</span> : null}
      </button>
      {open ? <div className={styles.collapseBody}>{children}</div> : null}
    </div>
  );
}

export default function AdminSpecializationsPanel() {
  const authApiMode = isAuthApiEnabled();
  const [specs, setSpecs] = useState<Specialization[]>(() => loadSpecializations());
  const [summary, setSummary] = useState<SpecializationSummaryPayload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeSpecId, setActiveSpecId] = useState<string>("");
  const [moveEmail, setMoveEmail] = useState("");
  const [moveSpecId, setMoveSpecId] = useState("");
  const [propStudent, setPropStudent] = useState("");
  const [propContractor, setPropContractor] = useState("");
  const [propNote, setPropNote] = useState("");
  const [addSpecOpen, setAddSpecOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const localSpecs = loadSpecializations();
    setSpecs(localSpecs);
    if (authApiMode && getAdminApiToken()) {
      const r = await fetchAdminSpecializationSummary();
      if (r.ok) {
        setSummary(r.summary);
        if (r.summary.specs.length > 0) {
          saveSpecializations(r.summary.specs);
          setSpecs(r.summary.specs);
        }
        return;
      }
      setMsg(r.error);
    }
    const users = listRegisteredUsers();
    const buckets = buildSpecializationBuckets(users);
    const students = users.filter((u) => u.profile.roleLabel.toLowerCase().includes("студент"));
    const contractors = users.filter(
      (u) =>
        u.profile.roleLabel.toLowerCase().includes("подряд") ||
        Boolean(u.profile.contractorCompanyName.trim())
    );
    const firstBucket = buckets[0];
    setSummary({
      specs: localSpecs,
      buckets: buckets.map((b) => ({
        specialization: b.specialization,
        counts: {
          students: b.students.length,
          contractors: b.contractors.length,
          total: b.students.length + b.contractors.length,
        },
        students: b.students.map((m) => ({
          emailNorm: m.emailNorm,
          firstName: m.profile.firstName,
          lastName: m.profile.lastName,
          email: m.profile.email,
          phone: m.profile.phone,
          roleLabel: m.profile.roleLabel,
          contractorCompanyName: m.profile.contractorCompanyName,
          specializationId: m.profile.specializationId,
          createdAt: m.createdAt,
          roleKind: "student" as const,
        })),
        contractors: b.contractors.map((m) => ({
          emailNorm: m.emailNorm,
          firstName: m.profile.firstName,
          lastName: m.profile.lastName,
          email: m.profile.email,
          phone: m.profile.phone,
          roleLabel: m.profile.roleLabel,
          contractorCompanyName: m.profile.contractorCompanyName,
          specializationId: m.profile.specializationId,
          createdAt: m.createdAt,
          roleKind: "contractor" as const,
        })),
      })),
      unassignedStudents: (firstBucket?.unassignedStudents ?? []).map((m) => ({
        emailNorm: m.emailNorm,
        firstName: m.profile.firstName,
        lastName: m.profile.lastName,
        email: m.profile.email,
        phone: m.profile.phone,
        roleLabel: m.profile.roleLabel,
        contractorCompanyName: m.profile.contractorCompanyName,
        specializationId: m.profile.specializationId ?? "",
        createdAt: m.createdAt,
        roleKind: "student" as const,
      })),
      unassignedContractors: (firstBucket?.unassignedContractors ?? []).map((m) => ({
        emailNorm: m.emailNorm,
        firstName: m.profile.firstName,
        lastName: m.profile.lastName,
        email: m.profile.email,
        phone: m.profile.phone,
        roleLabel: m.profile.roleLabel,
        contractorCompanyName: m.profile.contractorCompanyName,
        specializationId: m.profile.specializationId ?? "",
        createdAt: m.createdAt,
        roleKind: "contractor" as const,
      })),
      proposals: [],
      totals: {
        students: students.length,
        contractors: contractors.length,
      },
    });
  }, [authApiMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeSpecId && specs.length > 0) setActiveSpecId(specs[0].id);
  }, [activeSpecId, specs]);

  const activeBucket = useMemo(
    () => summary?.buckets.find((b) => b.specialization.id === activeSpecId),
    [summary, activeSpecId]
  );

  const handleAddSpec = (e: FormEvent) => {
    e.preventDefault();
    const r = addSpecialization(newTitle);
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    setNewTitle("");
    setMsg(`Добавлено: ${r.item.title}`);
    void refresh();
  };

  const handleMove = async (e: FormEvent) => {
    e.preventDefault();
    const email = moveEmail.trim().toLowerCase();
    if (!email || !moveSpecId) {
      setMsg("Укажите e-mail и спецификацию.");
      return;
    }
    if (authApiMode && getAdminApiToken()) {
      const r = await adminMoveUserSpecialization(email, moveSpecId);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
    } else {
      const users = listRegisteredUsers();
      const u = users.find((x) => x.emailNorm === email);
      if (!u) {
        setMsg("Пользователь не найден.");
        return;
      }
      adminOverrideUserProfile(email, { ...u.profile, specializationId: moveSpecId });
    }
    setMsg("Спецификация пользователя обновлена.");
    setMoveEmail("");
    void refresh();
  };

  const handleProposal = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSpecId) return;
    const student = propStudent.trim().toLowerCase();
    const contractor = propContractor.trim().toLowerCase();
    if (!student || !contractor) {
      setMsg("Выберите студента и подрядчика.");
      return;
    }
    if (authApiMode && getAdminApiToken()) {
      const r = await adminCreateDistributionProposal({
        specializationId: activeSpecId,
        studentEmailNorm: student,
        contractorEmailNorm: contractor,
        note: propNote,
      });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
    } else {
      addDistributionProposal({
        specializationId: activeSpecId,
        studentEmailNorm: student,
        contractorEmailNorm: contractor,
        note: propNote,
      });
    }
    setMsg("Предложение подрядчику зафиксировано.");
    setPropStudent("");
    setPropContractor("");
    setPropNote("");
    window.dispatchEvent(new CustomEvent("trassa-distribution-proposals-changed"));
    void refresh();
  };

  const handleToggleActive = async (spec: Specialization) => {
    const nextActive = !spec.active;
    if (authApiMode && getAdminApiToken()) {
      const r = await adminUpdateSpecialization(spec.id, { active: nextActive });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      const list = loadSpecializations().map((s) => (s.id === spec.id ? r.specialization : s));
      saveSpecializations(list);
      setSpecs(list);
    } else {
      const r = updateSpecialization(spec.id, { active: nextActive });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
    }
    if (!(authApiMode && getAdminApiToken())) {
      setSpecs(loadSpecializations());
    }
    void refresh();
  };

  const handleDeleteSpec = async (spec: Specialization) => {
    if (!window.confirm(`Удалить «${spec.title}»?`)) return;
    if (authApiMode && getAdminApiToken()) {
      const r = await adminDeleteSpecialization(spec.id);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      removeSpecialization(spec.id);
    } else {
      removeSpecialization(spec.id);
    }
    if (activeSpecId === spec.id) setActiveSpecId("");
    void refresh();
  };

  const handleExport = () => {
    if (authApiMode && getAdminApiToken()) {
      const base = getApiBase();
      const token = getAdminApiToken();
      void fetch(`${base}/api/admin/specializations/export.csv`, {
        headers: token ? { "X-Trassa-Admin-Token": token } : {},
        credentials: "include",
      })
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `trassa-specializations-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => downloadSpecializationsCsvLocal());
      return;
    }
    downloadSpecializationsCsvLocal();
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Спецификации и распределение</h3>
      <p className={styles.subtitle}>
        Подгруппы для студентов и подрядчиков («распределяющая шляпа»). Пользователи не попадают в чужие
        направления — только администраторы видят свод и переносят участников.
      </p>

      {summary ? (
          <div className={glass.glassStats} style={{ marginTop: 12 }}>
            <div className={glass.glassStatCard}>
              <span className={glass.glassStatValue}>{summary.totals.students}</span>
              <span className={glass.glassStatLabel}>Студентов</span>
            </div>
            <div className={glass.glassStatCard}>
              <span className={glass.glassStatValue}>{summary.totals.contractors}</span>
              <span className={glass.glassStatLabel}>Подрядчиков</span>
            </div>
            <div className={glass.glassStatCard}>
              <span className={glass.glassStatValue}>{summary.unassignedStudents.length}</span>
              <span className={glass.glassStatLabel}>Студентов без группы</span>
            </div>
            <div className={glass.glassStatCard}>
              <span className={glass.glassStatValue}>{summary.unassignedContractors.length}</span>
              <span className={glass.glassStatLabel}>Подрядчиков без группы</span>
            </div>
          </div>
      ) : null}

      <CollapseSection
        title="Новая спецификация"
        meta={`${specs.length} в справочнике`}
        open={addSpecOpen}
        onToggle={() => setAddSpecOpen((v) => !v)}
      >
        <form className={styles.form} onSubmit={handleAddSpec}>
          <label className={styles.label}>
            Название
            <input
              className={styles.input}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Например: Геодезия"
              maxLength={120}
            />
          </label>
          <button type="submit" className={styles.btnNeoPrimary}>
            Добавить
          </button>
        </form>
      </CollapseSection>

      <div className={styles.tableWrap} style={{ marginTop: 16 }}>
        <table className={`${styles.table} ${styles.tableSpecList}`}>
          <thead>
            <tr>
              <th>Спецификация</th>
              <th className={styles.tableColCenter}>Студенты</th>
              <th className={styles.tableColCenter}>Подрядчики</th>
              <th className={styles.tableColCenter}>Всего</th>
              <th className={styles.specActionsCol} aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {specs.map((s) => {
              const bucket = summary?.buckets.find((b) => b.specialization.id === s.id);
              const isSelected = activeSpecId === s.id;
              return (
                <tr
                  key={s.id}
                  className={isSelected ? styles.tableRowSelected : undefined}
                  onClick={() => setActiveSpecId(s.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <strong>{s.title}</strong>
                    {!s.active ? " (выкл.)" : ""}
                  </td>
                  <td className={styles.tableColCenter}>{bucket?.counts.students ?? 0}</td>
                  <td className={styles.tableColCenter}>{bucket?.counts.contractors ?? 0}</td>
                  <td className={styles.tableColCenter}>{bucket?.counts.total ?? 0}</td>
                  <td className={styles.specActionsCol} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.specActionGroup}>
                      <button
                        type="button"
                        className={`${styles.specSelectBtn} ${isSelected ? styles.specSelectBtnActive : ""}`}
                        aria-label={
                          isSelected ? `Выбрано: ${s.title}` : `Выбрать спецификацию: ${s.title}`
                        }
                        aria-pressed={isSelected}
                        title={isSelected ? "Выбрано для просмотра" : "Выбрать для просмотра"}
                        onClick={() => setActiveSpecId(s.id)}
                      >
                        <span className={styles.specSelectIcon} aria-hidden>
                          {isSelected ? "●" : "○"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.specIconBtn} ${s.active ? "" : styles.specIconBtnOff}`}
                        aria-label={
                          s.active
                            ? `Скрыть «${s.title}» из справочника`
                            : `Показать «${s.title}» в справочнике`
                        }
                        title={
                          s.active
                            ? "Скрыть из справочника при регистрации"
                            : "Снова показать в справочнике при регистрации"
                        }
                        onClick={() => void handleToggleActive(s)}
                      >
                        {s.active ? (
                          <IconEye className={styles.specIconSvg} />
                        ) : (
                          <IconEyeOff className={styles.specIconSvg} />
                        )}
                      </button>
                      <button
                        type="button"
                        className={styles.btnSmallDanger}
                        onClick={() => void handleDeleteSpec(s)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.rowBtns} style={{ marginTop: 16 }}>
        <button type="button" className={styles.btnNeoPrimary} onClick={() => void refresh()}>
          Обновить свод
        </button>
        <button type="button" className={styles.btnNeoGhost} onClick={handleExport}>
          Скачать Excel (CSV)
        </button>
      </div>

      {msg ? <p className={glass.glassMsg}>{msg}</p> : null}

      {activeBucket ? (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: 24 }}>
            {activeBucket.specialization.title}
          </h4>

          <CollapseSection
            title="Перенести пользователя в другую спецификацию"
            open={moveOpen}
            onToggle={() => setMoveOpen((v) => !v)}
          >
            <form className={styles.form} onSubmit={(e) => void handleMove(e)}>
              <label className={styles.label}>
                E-mail пользователя
                <input
                  className={styles.input}
                  value={moveEmail}
                  onChange={(e) => setMoveEmail(e.target.value)}
                  placeholder="student@mail.ru"
                />
              </label>
              <label className={styles.label}>
                Целевая спецификация
                <select
                  className={styles.input}
                  value={moveSpecId}
                  onChange={(e) => setMoveSpecId(e.target.value)}
                >
                  <option value="">—</option>
                  {specs.filter((s) => s.active).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={styles.btnNeoGhost}>
                Перенести
              </button>
            </form>
          </CollapseSection>

          <CollapseSection
            title="Предложить студента подрядчику"
            meta={activeBucket.specialization.title}
            open={proposalOpen}
            onToggle={() => setProposalOpen((v) => !v)}
          >
            <form className={styles.form} onSubmit={(e) => void handleProposal(e)}>
              <label className={styles.label}>
                Студент
                <select
                  className={styles.input}
                  value={propStudent}
                  onChange={(e) => setPropStudent(e.target.value)}
                >
                  <option value="">—</option>
                  {activeBucket.students.map((m) => (
                    <option key={m.emailNorm} value={m.emailNorm}>
                      {memberName(m.lastName, m.firstName, m.email)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Подрядчик
                <select
                  className={styles.input}
                  value={propContractor}
                  onChange={(e) => setPropContractor(e.target.value)}
                >
                  <option value="">—</option>
                  {activeBucket.contractors.map((m) => (
                    <option key={m.emailNorm} value={m.emailNorm}>
                      {memberName(m.lastName, m.firstName, m.email)} — {m.contractorCompanyName || "—"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Комментарий
                <input
                  className={styles.input}
                  value={propNote}
                  onChange={(e) => setPropNote(e.target.value)}
                  maxLength={300}
                />
              </label>
              <button type="submit" className={styles.btnNeoPrimary}>
                Зафиксировать предложение
              </button>
            </form>
          </CollapseSection>

          <div className={styles.tableWrap} style={{ marginTop: 16 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Роль</th>
                  <th>ФИО</th>
                  <th>E-mail</th>
                  <th>Организация</th>
                </tr>
              </thead>
              <tbody>
                {[...activeBucket.students, ...activeBucket.contractors].map((m) => (
                  <tr key={m.emailNorm}>
                    <td>{m.roleKind === "student" ? "Студент" : "Подрядчик"}</td>
                    <td>{memberName(m.lastName, m.firstName, m.email)}</td>
                    <td>{m.email}</td>
                    <td>{m.contractorCompanyName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {summary && (summary.unassignedStudents.length > 0 || summary.unassignedContractors.length > 0) ? (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: 24 }}>
            Без спецификации
          </h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Роль</th>
                  <th>ФИО</th>
                  <th>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {[...summary.unassignedStudents, ...summary.unassignedContractors].map((m) => (
                  <tr key={m.emailNorm}>
                    <td>{m.roleKind === "student" ? "Студент" : "Подрядчик"}</td>
                    <td>{memberName(m.lastName, m.firstName, m.email)}</td>
                    <td>{m.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
