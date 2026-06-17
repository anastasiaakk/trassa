import { useId, useMemo } from "react";
import { V2_RGB } from "../design-system/portal-v2/v2-tokens";
import { usePortalDesign } from "../design-system/usePortalDesign";

/** SVG-фон с «плывущими» линиями — лёгкая альтернатива page2-bg.mov. */
export default function Page2BackgroundLines() {
  const isV2 = usePortalDesign() === "v2";
  const uid = useId().replace(/:/g, "");
  const primaryId = `p2bg-line-primary-${uid}`;
  const softId = `p2bg-line-soft-${uid}`;

  const stops = useMemo(() => {
    if (isV2) {
      return {
        primaryA: `rgba(${V2_RGB.primary}, 0.34)`,
        primaryB: `rgba(${V2_RGB.white}, 0.62)`,
        softA: `rgba(${V2_RGB.white}, 0.72)`,
        softB: `rgba(${V2_RGB.primary}, 0.16)`,
      };
    }
    return {
      primaryA: "rgba(0, 212, 165, 0.55)",
      primaryB: "rgba(103, 232, 249, 0.35)",
      softA: "rgba(103, 232, 249, 0.45)",
      softB: "rgba(0, 212, 165, 0.2)",
    };
  }, [isV2]);

  return (
    <div className="page2-ambient page2-ambient--lines page2-ambient--ready" aria-hidden>
      <div className="page2-ambient__linesBase" />
      <svg
        className="page2-ambient__linesSvg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={primaryId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops.primaryA} />
            <stop offset="100%" stopColor={stops.primaryB} />
          </linearGradient>
          <linearGradient id={softId} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={stops.softA} />
            <stop offset="100%" stopColor={stops.softB} />
          </linearGradient>
        </defs>
        <path
          className="page2-ambient__line page2-ambient__line--far"
          stroke={`url(#${softId})`}
          d="M -120 280 C 200 220 420 340 720 300 S 1180 240 1560 320"
        />
        <path
          className="page2-ambient__line page2-ambient__line--mid"
          stroke={`url(#${primaryId})`}
          d="M -80 420 C 280 360 520 480 840 440 S 1240 380 1520 460"
        />
        <path
          className="page2-ambient__line page2-ambient__line--main"
          stroke={`url(#${primaryId})`}
          d="M -100 520 C 180 400 380 460 620 430 S 980 360 1280 390"
        />
        <path
          className="page2-ambient__line page2-ambient__line--accent"
          stroke={`url(#${softId})`}
          d="M 200 180 C 480 260 640 140 920 200 S 1200 120 1380 240"
        />
      </svg>
      <div className="page2-ambient__veil page2-ambient__veil--lines" />
    </div>
  );
}
