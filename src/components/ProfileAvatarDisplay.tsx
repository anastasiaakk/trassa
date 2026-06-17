import { memo } from "react";
import { getProfileAvatarImageSrc } from "../assets/profileAvatarImages";
import { parseProfileAvatarPresetId } from "../utils/profileAvatarPresets";
import { PROFILE_AVATAR_CLIP_STYLE, PROFILE_AVATAR_FILL_STYLE } from "./profileAvatarFillStyle";

type Props = {
  stored: string | null;
  fallbackSrc: string;
  size: number;
  imgClassName?: string;
  photoImgClassName?: string;
  presetClassName?: string;
  /** Показывать fallback-картинку, если аватар не выбран (legacy). В v2 — пустой круг. */
  showFallbackWhenEmpty?: boolean;
};

function ProfileAvatarDisplay({
  stored,
  fallbackSrc,
  size,
  imgClassName = "",
  photoImgClassName = "",
  presetClassName = "profile-avatar-display__preset",
  showFallbackWhenEmpty = false,
}: Props) {
  const renderMedia = (className: string, src: string) => (
    <span className="profile-avatar-display__clip" style={PROFILE_AVATAR_CLIP_STYLE} aria-hidden>
      <img
        className={className}
        style={PROFILE_AVATAR_FILL_STYLE}
        src={src}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  );

  const presetId = parseProfileAvatarPresetId(stored);
  if (presetId) {
    return renderMedia(
      `${imgClassName} profile-avatar-display__fill profile-avatar-display__preset profile-construction-preset__img`.trim(),
      getProfileAvatarImageSrc(presetId),
    );
  }

  if (!stored) {
    return showFallbackWhenEmpty ? (
      <img
        className={imgClassName}
        src={fallbackSrc}
        alt=""
        width={size}
        height={size}
        decoding="async"
      />
    ) : null;
  }

  const isPhoto = stored.startsWith("data:image/");
  return renderMedia(
    `profile-avatar-display__photo profile-avatar-display__fill ${imgClassName}${isPhoto ? ` ${photoImgClassName}`.trim() : ""}`.trim(),
    stored,
  );
}

export default memo(ProfileAvatarDisplay);
