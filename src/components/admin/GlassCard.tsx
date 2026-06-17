import type { ReactNode } from "react";
import styles from "./AdminGlass.module.css";

type Props = {
  children: ReactNode;
  className?: string;
  span?: "1" | "2";
  tone?: "dark" | "map";
};

export default function GlassCard({
  children,
  className = "",
  span = "1",
  tone = "dark",
}: Props) {
  return (
    <div
      className={`${styles.glassCard} ${tone === "map" ? styles.glassCardMap : ""} ${span === "2" ? styles.glassCardWide : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
