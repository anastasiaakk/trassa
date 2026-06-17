import { useMemo, useState } from "react";
import type { LocalUserRecord } from "../../utils/localAuth";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/AdminPanel.module.css";
import AdminSoftToolbar from "./AdminSoftToolbar";
import AdminUsersPanel from "./AdminUsersPanel";

function userCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 0) return "нет записей";
  const word =
    mod10 === 1 && mod100 !== 11
      ? "пользователь"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "пользователя"
        : "пользователей";
  return `${n} ${word}`;
}

type Props = {
  users: LocalUserRecord[];
  onRefresh: () => void;
  apiEnabled: boolean;
  softUi: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

export default function AdminUsersSection({
  users,
  onRefresh,
  apiEnabled,
  softUi,
  searchQuery,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const normQ = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normQ) return users;
    return users.filter((user) => {
      const email = (user.profile.email || user.emailNorm).toLowerCase();
      const name = `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
      const role = (user.profile.roleLabel || "").toLowerCase();
      const spec = (user.profile.specializationId || "").toLowerCase();
      return (
        email.includes(normQ) ||
        name.includes(normQ) ||
        role.includes(normQ) ||
        spec.includes(normQ)
      );
    });
  }, [users, normQ]);

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
          Пользователи портала
        </h3>
        <span className={styles.collapseMeta}>{userCountLabel(users.length)}</span>
      </button>

      {open ? (
        <div className={styles.collapseBody}>
          {softUi ? (
            <AdminSoftToolbar
              searchValue={searchQuery}
              onSearchChange={onSearchChange}
              searchPlaceholder="Поиск по email, имени, роли…"
              matchCount={filtered.length}
              totalCount={users.length}
            />
          ) : null}
          <AdminUsersPanel
            users={filtered}
            searchQuery={searchQuery}
            apiEnabled={apiEnabled}
            softUi={softUi}
            onRefresh={onRefresh}
            onEditingActive={(active) => {
              if (active) setOpen(true);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
