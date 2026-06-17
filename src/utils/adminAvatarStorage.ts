import {
  type ProfileAvatarPresetId,
  isProfileAvatarPresetValue,
  presetStorageValue,
} from "./profileAvatarPresets";
import { isBrandLogoAvatarValue } from "./profileAvatarResolve";

const KEY_PREFIX = "trassa-admin-avatar-v1:";
const MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_PHOTO_PX = 256;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

/** Центральный кроп «как object-fit: cover» → круг в интерфейсе. */
export function squareAvatarDataUrl(img: HTMLImageElement, size = AVATAR_PHOTO_PX): string {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("empty image");
  const side = Math.min(w, h);
  const sx = Math.floor((w - side) / 2);
  const sy = Math.floor((h - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** Подготовить сохранённое фото: любой прямоугольник → квадрат по центру. */
export function normalizeAvatarPhotoDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl.startsWith("data:image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(null);
          return;
        }
        const maxSide = Math.max(w, h);
        if (w === h && maxSide <= AVATAR_PHOTO_PX + 8) {
          resolve(dataUrl);
          return;
        }
        resolve(squareAvatarDataUrl(img));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export const ADMIN_AVATAR_CHANGED = "trassa-admin-avatar-changed";

function storageKey(emailNorm: string): string {
  return `${KEY_PREFIX}${emailNorm}`;
}

function isStoredAvatarValue(raw: string): boolean {
  return raw.startsWith("data:image/") || isProfileAvatarPresetValue(raw);
}

export function loadAdminAvatar(emailNorm: string | null | undefined): string | null {
  if (!emailNorm) return null;
  try {
    const raw = localStorage.getItem(storageKey(emailNorm));
    if (!raw || !isStoredAvatarValue(raw) || isBrandLogoAvatarValue(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveAdminAvatar(emailNorm: string, dataUrl: string): void {
  localStorage.setItem(storageKey(emailNorm), dataUrl);
  window.dispatchEvent(new CustomEvent(ADMIN_AVATAR_CHANGED, { detail: { emailNorm } }));
}

export function saveProfileAvatarPreset(emailNorm: string, presetId: ProfileAvatarPresetId): void {
  localStorage.setItem(storageKey(emailNorm), presetStorageValue(presetId));
  window.dispatchEvent(new CustomEvent(ADMIN_AVATAR_CHANGED, { detail: { emailNorm } }));
}

export function clearAdminAvatar(emailNorm: string): void {
  localStorage.removeItem(storageKey(emailNorm));
  window.dispatchEvent(new CustomEvent(ADMIN_AVATAR_CHANGED, { detail: { emailNorm } }));
}

export function readAdminAvatarFile(
  file: File,
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) {
    return Promise.resolve({ ok: false, error: "Выберите файл изображения (JPG, PNG, WebP)." });
  }
  if (file.size > MAX_BYTES) {
    return Promise.resolve({ ok: false, error: "Фото не больше 2 МБ." });
  }
  return loadImageFromFile(file)
    .then((img) => ({ ok: true as const, dataUrl: squareAvatarDataUrl(img) }))
    .catch(() => ({ ok: false as const, error: "Не удалось обработать изображение." }));
}
