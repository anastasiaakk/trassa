import type { CSSProperties } from "react";

/** Обрезка внутри кнопки — картинка не раздувает flex-toolbar. */
export const PROFILE_AVATAR_CLIP_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  overflow: "hidden",
  borderRadius: "inherit",
  display: "block",
  pointerEvents: "none",
};

/** Круглая заливка — не зависит от data-portal-design. */
export const PROFILE_AVATAR_FILL_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  maxWidth: "none",
  maxHeight: "none",
  margin: 0,
  padding: 0,
  border: "none",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
  verticalAlign: "top",
};

export function profileAvatarMediaButtonStyle(sizePx?: number): CSSProperties {
  const base: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    padding: 0,
    boxSizing: "border-box",
    flexShrink: 0,
  };
  if (!sizePx || sizePx <= 0) {
    return { ...base, borderRadius: "50%" };
  }
  return {
    ...base,
    width: sizePx,
    height: sizePx,
    minWidth: sizePx,
    minHeight: sizePx,
    maxWidth: sizePx,
    maxHeight: sizePx,
    borderRadius: "50%",
  };
}
