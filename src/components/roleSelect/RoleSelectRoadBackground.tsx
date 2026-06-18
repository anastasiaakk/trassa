import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/RoleSelectPage.module.css";

type RoleSelectRoadBackgroundProps = {
  isV2?: boolean;
};

const RoleSelectRoadBackground = memo(({ isV2 = false }: RoleSelectRoadBackgroundProps) => (
  <div className={styles.roadIndustryBg} aria-hidden>
    <div className={cx(styles.neoAmbientWash, isV2 && "page3-v2__wash")} />
    <div className={cx(styles.neoAtmosphereGlow, isV2 && "page3-v2__glow")} />
  </div>
));

RoleSelectRoadBackground.displayName = "RoleSelectRoadBackground";

export default RoleSelectRoadBackground;
