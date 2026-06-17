import { useCallback, useEffect, useState } from "react";
import { authListUsers } from "../api/authApi";
import { listRegisteredUsers, type LocalUserRecord } from "../utils/localAuth";
import { isAuthApiEnabled } from "../utils/authMode";

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
        setUsers(
          res.users.map((u) => ({
            emailNorm: u.emailNorm,
            passwordHash: "",
            profile: u.profile,
            createdAt: u.createdAt,
          })),
        );
      });
      return;
    }
    setUsers(listRegisteredUsers());
  }, [apiEnabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { users, refresh, apiEnabled };
}
