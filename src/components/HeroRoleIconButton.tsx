import type { CSSProperties } from "react";
import { HERO_ROLE_IMG_PX, heroRoleButtonStyle } from "../utils/cabinetHero";

type Props = {
  iconSrc: string;
  buttonBaseStyle: CSSProperties;
};

/** Белый круг с иконкой роли — одинаково в кабинетах подрядчика, школы и СПО. */
export default function HeroRoleIconButton({ iconSrc, buttonBaseStyle }: Props) {
  return (
    <button
      type="button"
      aria-hidden
      style={heroRoleButtonStyle(buttonBaseStyle)}
    >
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
    </button>
  );
}
