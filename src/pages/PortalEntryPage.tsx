import { useCallback, useEffect, useState, type CSSProperties } from "react";
import EntrySplash from "../components/EntrySplash";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import PortalHomePage from "./PortalHomePage";
import {
  clearIntroPendingEarly,
  endPage1Handoff,
  markEntrySplashPlayed,
  markIntroDoneForRouting,
  shouldPlayEntrySplash,
} from "../ensureIntroRoute";
import { ENTRY_SPLASH_FADE_MS } from "../introFlow";
import { releaseEntrySplashVideo } from "../utils/entrySplashVideo";

type Phase = "splash" | "page1";

/**
 * Сплэш → кроссфейд → главная (PortalHomePage).
 * Анимация при каждой перезагрузке вкладки; внутри SPA после первого показа — без повтора.
 */
export default function PortalEntryPage() {
  const isV2 = usePortalDesign() === "v2";
  const playSplash = shouldPlayEntrySplash();
  const [phase, setPhase] = useState<Phase>(playSplash ? "splash" : "page1");
  /** Page1 показана (кроссфейд или финал) */
  const [page1Visible, setPage1Visible] = useState(!playSplash);
  /** Один раз: анимация карточек после сплэша */
  const [page1FromSplash, setPage1FromSplash] = useState(false);

  useEffect(() => {
    if (phase === "splash") markEntrySplashPlayed();
  }, [phase]);

  useEffect(() => {
    if (!playSplash) clearIntroPendingEarly();
  }, [playSplash]);

  /** Блокируем скролл только на время сплэша; иначе Page1 на телефоне не листается. */
  useEffect(() => {
    if (phase !== "splash") {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      return;
    }
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
    };
  }, [phase]);

  const startHandoff = useCallback(() => {
    setPage1FromSplash(true);
    setPage1Visible(true);
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, []);

  const completeSplash = useCallback(() => {
    markIntroDoneForRouting();
    releaseEntrySplashVideo();
    clearIntroPendingEarly();
    endPage1Handoff();
    setPhase("page1");
    setPage1Visible(true);
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, []);

  const handoffStyle = {
    "--page1-handoff-ms": `${ENTRY_SPLASH_FADE_MS}ms`,
  } as CSSProperties;

  return (
    <div
      className={cx(
        "page1-flow-bg",
        isV2 && "page1-v2",
        page1Visible && "page1-flow-bg--handoff",
      )}
      style={page1Visible ? handoffStyle : undefined}
    >
      {page1Visible && (
        <div className={cx("page1-flow-bg__page", "page1-flow-bg__page--in")}>
          <PortalHomePage
            isV2={isV2}
            introFromSplash={page1FromSplash}
          />
        </div>
      )}
      {phase === "splash" && (
        <EntrySplash onExiting={startHandoff} onComplete={completeSplash} />
      )}
    </div>
  );
}
