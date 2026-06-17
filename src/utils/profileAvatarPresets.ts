export const PROFILE_AVATAR_PRESET_PREFIX = "preset:";

export type ProfileAvatarPresetId = "cone" | "worker" | "crane";

export type ProfileAvatarPreset = {
  id: ProfileAvatarPresetId;
  label: string;
};

/** Старые id → один из трёх активных пресетов. */
const DEPRECATED_PRESET_MAP: Record<string, ProfileAvatarPresetId> = {
  excavator: "crane",
  bulldozer: "crane",
  "dump-truck": "crane",
  hardhat: "worker",
  loader: "crane",
  roller: "cone",
  blueprint: "worker",
  mixer: "crane",
  bridge: "crane",
  happy: "worker",
  thinking: "worker",
  curious: "cone",
  talking: "worker",
  classic: "crane",
  crown: "crane",
  star: "cone",
};

/** Пресеты — иконки строительной сферы (PNG). */
export const PROFILE_AVATAR_PRESETS: ProfileAvatarPreset[] = [
  { id: "cone", label: "Дорожный конус" },
  { id: "worker", label: "Строитель" },
  { id: "crane", label: "Башенный кран" },
];

export function isProfileAvatarPresetValue(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PROFILE_AVATAR_PRESET_PREFIX));
}

export function normalizeProfileAvatarPresetId(raw: string): ProfileAvatarPresetId | null {
  const id = (DEPRECATED_PRESET_MAP[raw] ?? raw) as ProfileAvatarPresetId;
  return PROFILE_AVATAR_PRESETS.some((p) => p.id === id) ? id : null;
}

export function parseProfileAvatarPresetId(
  value: string | null | undefined,
): ProfileAvatarPresetId | null {
  if (!isProfileAvatarPresetValue(value)) return null;
  return normalizeProfileAvatarPresetId(value!.slice(PROFILE_AVATAR_PRESET_PREFIX.length));
}

export function getProfileAvatarPreset(id: ProfileAvatarPresetId): ProfileAvatarPreset {
  const preset = PROFILE_AVATAR_PRESETS.find((p) => p.id === id);
  if (!preset) return PROFILE_AVATAR_PRESETS[0]!;
  return preset;
}

export function presetStorageValue(id: ProfileAvatarPresetId): string {
  return `${PROFILE_AVATAR_PRESET_PREFIX}${id}`;
}
