import { memo } from "react";
import { getProfileAvatarImageSrc } from "../assets/profileAvatarImages";
import type { ProfileAvatarPresetId } from "../utils/profileAvatarPresets";

type Props = {
  variant: ProfileAvatarPresetId;
  size?: number;
  className?: string;
};

export const ProfileConstructionPresetIcon = memo(function ProfileConstructionPresetIcon({
  variant,
  size,
  className,
}: Props) {
  return (
    <span
      className="profile-construction-preset"
      style={size ? { width: size, height: size } : undefined}
      aria-hidden
    >
      <img
        className={className ?? "profile-construction-preset__img"}
        src={getProfileAvatarImageSrc(variant)}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  );
});

/** @deprecated Используйте ProfileConstructionPresetIcon */
export const ProfileRobotPresetIcon = ProfileConstructionPresetIcon;
