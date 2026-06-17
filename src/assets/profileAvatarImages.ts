import { publicUrl } from "../utils/publicUrl";
import type { ProfileAvatarPresetId } from "../utils/profileAvatarPresets";

export const PROFILE_AVATAR_IMAGE_BY_ID: Record<ProfileAvatarPresetId, string> = {
  cone: publicUrl("profile-avatars/cone.png"),
  worker: publicUrl("profile-avatars/worker.png"),
  crane: publicUrl("profile-avatars/crane.png"),
};

const PROFILE_AVATAR_IMAGE_VERSION = "v3";

export function getProfileAvatarImageSrc(id: ProfileAvatarPresetId): string {
  return `${PROFILE_AVATAR_IMAGE_BY_ID[id]}?${PROFILE_AVATAR_IMAGE_VERSION}`;
}
