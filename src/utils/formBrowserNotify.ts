import type { FormAlert } from "../types/formAlerts";

const TAG = "trassa-forms";

export function formNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestFormNotificationPermission(): Promise<boolean> {
  if (!formNotificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showFormBrowserNotification(alert: Pick<FormAlert, "message" | "templateTitle">): void {
  if (!formNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  try {
    const n = new Notification(alert.templateTitle || "Трасса — таблицы", {
      body: alert.message,
      tag: TAG,
      icon: "/favicon.ico",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}
