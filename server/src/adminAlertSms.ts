/** Оповещение админа по SMS (опционально, через smsc.ru или webhook). */

const SMSC_LOGIN = process.env.SMSC_LOGIN?.trim() ?? "";
const SMSC_PASSWORD = process.env.SMSC_PASSWORD?.trim() ?? "";
const ADMIN_ALERT_PHONES = process.env.ADMIN_ALERT_PHONES?.trim() ?? "";
const SMS_WEBHOOK_URL = process.env.SMS_WEBHOOK_URL?.trim() ?? "";

const lastSmsByDevice = new Map<string, number>();
const SMS_DEVICE_COOLDOWN_MS = 5 * 60 * 1000;

function smsAllowedForDevice(deviceId: string): boolean {
  const now = Date.now();
  const prev = lastSmsByDevice.get(deviceId) ?? 0;
  if (now - prev < SMS_DEVICE_COOLDOWN_MS) return false;
  lastSmsByDevice.set(deviceId, now);
  return true;
}

async function sendViaSmsc(phones: string, message: string): Promise<boolean> {
  const url = new URL("https://smsc.ru/sys/send.php");
  url.searchParams.set("login", SMSC_LOGIN);
  url.searchParams.set("psw", SMSC_PASSWORD);
  url.searchParams.set("phones", phones);
  url.searchParams.set("mes", message);
  url.searchParams.set("fmt", "3");
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return false;
  const body = (await res.json()) as { error?: string };
  if (body.error) {
    console.warn("[sms] smsc:", body.error);
    return false;
  }
  return true;
}

async function sendViaWebhook(message: string): Promise<boolean> {
  const res = await fetch(SMS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message, phones: ADMIN_ALERT_PHONES.split(",") }),
    signal: AbortSignal.timeout(12_000),
  });
  return res.ok;
}

/** SMS админу о попытке нарушения (не чаще раза в 5 мин на устройство). */
export async function notifyAdminViolationSms(
  deviceId: string,
  message: string
): Promise<void> {
  if (!smsAllowedForDevice(deviceId)) return;

  const configured =
    (SMSC_LOGIN && SMSC_PASSWORD && ADMIN_ALERT_PHONES) || SMS_WEBHOOK_URL;
  if (!configured) {
    console.log("[sms] skip (ADMIN_ALERT_PHONES / SMSC_* / SMS_WEBHOOK_URL not set)");
    return;
  }

  const text = message.length > 160 ? `${message.slice(0, 157)}…` : message;

  try {
    if (SMS_WEBHOOK_URL) {
      await sendViaWebhook(text);
      return;
    }
    await sendViaSmsc(ADMIN_ALERT_PHONES, text);
  } catch (e) {
    console.warn("[sms] send failed:", e instanceof Error ? e.message : e);
  }
}

export function isAdminSmsConfigured(): boolean {
  return Boolean(
    (SMSC_LOGIN && SMSC_PASSWORD && ADMIN_ALERT_PHONES) || SMS_WEBHOOK_URL
  );
}
