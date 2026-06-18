import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/Page3.module.css";

type Page3RoadBackgroundProps = {
  isV2?: boolean;
};

const Page3RoadBackground = memo(({ isV2 = false }: Page3RoadBackgroundProps) => (
  <div className={styles.roadIndustryBg} aria-hidden>
    <div className={cx(styles.neoAmbientWash, isV2 && "page3-v2__wash")} />
    <div className={cx(styles.neoAtmosphereGlow, isV2 && "page3-v2__glow")} />
  </div>
));

Page3RoadBackground.displayName = "Page3RoadBackground";

export default Page3RoadBackground;
