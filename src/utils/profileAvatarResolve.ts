import { parseProfileAvatarPresetId } from "./profileAvatarPresets";

const BRAND_LOGO_MARKERS = ["u4te4tx0", "lt3gp5do", "k21ztar3"];

function normPath(value: string): string {
  return value.split("?")[0].toLowerCase();
}

/** Логотип портала (синий квадрат) — не пользовательский аватар. */
export function isBrandLogoAvatarValue(
  value: string | null | undefined,
  fallbackSrc?: string,
): boolean {
  if (!value) return false;
  if (parseProfileAvatarPresetId(value)) return false;

  const norm = normPath(value);
  if (fallbackSrc) {
    const fb = normPath(fallbackSrc);
    if (norm === fb) return true;
    const tail = fb.split("/").pop();
    if (tail && norm.endsWith(tail)) return true;
  }
  if (BRAND_LOGO_MARKERS.some((m) => norm.includes(m))) return true;
  if (value.startsWith("data:image/svg")) return true;
  return false;
}

/** Фото или пресет — показываем в тулбаре; логотип и пустота — иконка как у «Выход». */
export function resolveToolbarAvatar(
  stored: string | null | undefined,
  fallbackSrc?: string,
): string | null {
  if (!stored || isBrandLogoAvatarValue(stored, fallbackSrc)) return null;
  if (parseProfileAvatarPresetId(stored)) return stored;
  if (stored.startsWith("data:image/")) return stored;
  return null;
}
