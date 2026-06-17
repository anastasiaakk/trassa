import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE2_BG_VIDEO } from "../assets/appIcons";
import {
  getPage2BackgroundMode,
  PAGE2_BACKGROUND_CHANGED,
} from "../design-system/page2BackgroundMode";
import Page2BackgroundLines from "./Page2BackgroundLines";

/** Видеофон page2-bg.mov — подгружается отложенно (файл тяжёлый). */
export default function Page2BackgroundVideoActive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const assign = () => {
      if (!cancelled) setVideoSrc(PAGE2_BG_VIDEO);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(assign, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(assign, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const startPlayback = useCallback((video: HTMLVideoElement) => {
    if (startedRef.current) return;
    startedRef.current = true;
    setReady(true);
    video.playbackRate = 0.92;
    void video.play().catch(() => {
      /* autoplay может быть заблокирован */
    });
  }, []);

  const syncPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || getPage2BackgroundMode() !== "video") return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback(video);
    }
  }, [startPlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const stopVideo = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      startedRef.current = false;
      setReady(false);
    };

    const onLoadedData = () => syncPlayback();
    const onCanPlay = () => syncPlayback();
    const onError = () => setFailed(true);
    const onModeChange = () => {
      if (getPage2BackgroundMode() !== "video") stopVideo();
      else syncPlayback();
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    window.addEventListener(PAGE2_BACKGROUND_CHANGED, onModeChange);

    const fallbackTimer = window.setTimeout(() => syncPlayback(), 2000);
    syncPlayback();

    return () => {
      window.clearTimeout(fallbackTimer);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      window.removeEventListener(PAGE2_BACKGROUND_CHANGED, onModeChange);
    };
  }, [syncPlayback, videoSrc]);

  if (failed) {
    return <Page2BackgroundLines />;
  }

  return (
    <div
      className={`page2-ambient${ready ? " page2-ambient--ready" : ""}`}
      aria-hidden
    >
      <video
        ref={videoRef}
        className="page2-ambient__video"
        src={videoSrc ?? undefined}
        muted
        loop
        playsInline
        preload="none"
      />
      <div className="page2-ambient__veil" />
    </div>
  );
}
