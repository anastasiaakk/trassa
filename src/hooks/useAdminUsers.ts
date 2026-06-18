import { useCallback, useEffect, useState } from "react";
import { authListUsers } from "../api/authApi";
import { listRegisteredUsers, type LocalUserRecord } from "../utils/localAuth";
import { isAuthApiEnabled } from "../utils/authMode";

function usersSnapshot(users: LocalUserRecord[]): string {
  return users.map((u) => `${u.emailNorm}:${u.createdAt}`).join("|");
}

/** Список пользователей портала для админки (локальный или API). */
export function useAdminUsers() {
  const apiEnabled = isAuthApiEnabled();
  const [users, setUsers] = useState<LocalUserRecord[]>(() =>
    apiEnabled ? [] : listRegisteredUsers(),
  );

  const refresh = useCallback(() => {
    if (apiEnabled) {
      void authListUsers().then((res) => {
        if (!res.ok) return;
        const next = res.users.map((u) => ({
          emailNorm: u.emailNorm,
          passwordHash: "",
          profile: u.profile,
          createdAt: u.createdAt,
        }));
        setUsers((prev) => (usersSnapshot(prev) === usersSnapshot(next) ? prev : next));
      });
      return;
    }
    const next = listRegisteredUsers();
    setUsers((prev) => (usersSnapshot(prev) === usersSnapshot(next) ? prev : next));
  }, [apiEnabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { users, refresh, apiEnabled };
}
