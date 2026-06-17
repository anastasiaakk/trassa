import type { CSSProperties } from "react";
import { HERO_ROLE_IMG_PX, heroRoleIconBadgeStyle } from "../utils/cabinetHero";

type Props = {
  iconSrc: string;
  buttonBaseStyle: CSSProperties;
};

/** Белый круг с иконкой роли на плашке героя (декоративный, без действия). */
export default function HeroRoleIconButton({ iconSrc, buttonBaseStyle }: Props) {
  return (
    <div aria-hidden style={heroRoleIconBadgeStyle(buttonBaseStyle)}>
      <img
        decoding="async"
        src={iconSrc}
        alt=""
        width={HERO_ROLE_IMG_PX}
        height={HERO_ROLE_IMG_PX}
        style={{
          display: "block",
          objectFit: "contain",
          width: HERO_ROLE_IMG_PX,
          height: HERO_ROLE_IMG_PX,
          maxWidth: "86%",
          maxHeight: "86%",
        }}
      />
    </div>
  );
}
