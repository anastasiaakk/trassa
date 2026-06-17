import type { CSSProperties } from "react";

/** Единые размеры контентной панели подстраниц /page4 в v2 (без legacy recentPanel). */
export function page4V2PanelStyle(
  layoutStyles: { recentPanel?: CSSProperties },
  isV2: boolean,
  legacyMaxWidth = 920
): CSSProperties {
  if (isV2) {
    return { width: "100%", maxWidth: "100%", minWidth: 0 };
  }
  return { ...(layoutStyles.recentPanel ?? {}), maxWidth: legacyMaxWidth };
}
