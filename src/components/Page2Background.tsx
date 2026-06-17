import { useEffect, useState } from "react";
import { usePage2BackgroundMode } from "../design-system/usePage2BackgroundMode";
import Page2BackgroundLines from "./Page2BackgroundLines";
import Page2BackgroundVideoActive from "./Page2BackgroundVideoActive";
import Page2BackgroundStatic from "./Page2BackgroundStatic";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Фон карты Page2 и админки: видео, SVG-линии или статичная заливка. */
export default function Page2Background() {
  const mode = usePage2BackgroundMode();
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (reducedMotion || mode === "off") {
    return <Page2BackgroundStatic />;
  }

  if (mode === "lines") {
    return <Page2BackgroundLines />;
  }

  return <Page2BackgroundVideoActive />;
}
