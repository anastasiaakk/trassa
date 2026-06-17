import type { CSSProperties } from "react";

/** База фона страницы 1; анимация — в App.css (.page1-ambient) */
export const PAGE1_SURFACE_STYLE: CSSProperties = {
  backgroundColor: "#0a2540",
  backgroundImage: "linear-gradient(152deg, #124656 0%, #0f3d52 38%, #0a2540 68%, #081c32 100%)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "cover",
  minHeight: "100svh",
  width: "100%",
  position: "relative",
  boxSizing: "border-box",
};
