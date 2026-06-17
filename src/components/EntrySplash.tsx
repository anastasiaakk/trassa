import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "../design-system/cabinetChromeClasses";
import { beginPage1Handoff, setPage1HandoffDurationMs } from "../ensureIntroRoute";
import { usePortalDesign } from "../design-system/usePortalDesign";
import {
  ENTRY_SPLASH_DURATION_MS,
  ENTRY_SPLASH_FADE_MS,
  ENTRY_SPLASH_LOAD_TIMEOUT_MS,
  ENTRY_SPLASH_MAX_MS,
  ENTRY_SPLASH_MIN_MS,
  ENTRY_SPLASH_PLAYBACK_RATE,
} from "../introFlow";
import {
  ENTRY_SPLASH_POSTER,
  ENTRY_SPLASH_VIDEO_MP4,
  warmEntrySplashVideo,
} from "../utils/entrySplashVideo";
import { setIntroSplashActive } from "../utils/introSplashRuntime";
import { publicUrl } from "../utils/publicUrl";

const ENTRY_LOGO = publicUrl("entry-splash-logo.png");

type EntrySplashProps = {
  durationMs?: number;
  /** Старт показа Page1 под сплэшем (кроссфейд) */
  onExiting?: () => void;
  onComplete?: () => void;
};

export default function EntrySplash({
  durationMs = ENTRY_SPLASH_DURATION_MS,
  onExiting,
  onComplete,
}: EntrySplashProps) {
  const isV2 = usePortalDesign() === "v2";
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [videoFrameVisible, setVideoFrameVisible] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [activeDurationMs, setActiveDurationMs] = useState(durationMs);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const smoothProgressRef = useRef(0);
  const finishedRef = useRef(false);
  const videoReadyRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const beginExit = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearExitTimer();
    setPage1HandoffDurationMs(ENTRY_SPLASH_FADE_MS);
    beginPage1Handoff();
    onExiting?.();
    setExiting(true);
    window.setTimeout(() => {
      setMounted(false);
    }, ENTRY_SPLASH_FADE_MS);
  }, [clearExitTimer, onExiting]);

  const scheduleExitAfterPlay = useCallback(
    (video: HTMLVideoElement) => {
      clearExitTimer();
      const seconds = video.duration;
      const fromVideo =
        Number.isFinite(seconds) && seconds > 0
          ? Math.round((seconds * 1000) / ENTRY_SPLASH_PLAYBACK_RATE)
          : durationMs;
      const playMs = Math.min(fromVideo, durationMs);
      const ms = Math.min(ENTRY_SPLASH_MAX_MS, Math.max(ENTRY_SPLASH_MIN_MS, playMs));
      setActiveDurationMs(ms);
      exitTimerRef.current = window.setTimeout(beginExit, ms);
    },
    [beginExit, clearExitTimer, durationMs],
  );

  const markReadyAndPlay = useCallback(
    (video: HTMLVideoElement) => {
      if (finishedRef.current) return;
      video.playbackRate = ENTRY_SPLASH_PLAYBACK_RATE;
      const playPromise = video.play();
      if (playPromise === undefined) {
        videoReadyRef.current = true;
        setVideoReady(true);
        scheduleExitAfterPlay(video);
        return;
      }
      playPromise
        .then(() => {
          if (finishedRef.current) return;
          videoReadyRef.current = true;
          setVideoReady(true);
          scheduleExitAfterPlay(video);
        })
        .catch(() => {
          beginExit();
        });
    },
    [beginExit, scheduleExitAfterPlay],
  );

  useEffect(() => {
    setIntroSplashActive(true);
    return () => setIntroSplashActive(false);
  }, []);

  useEffect(() => {
    if (!mounted) {
      onComplete?.();
    }
  }, [mounted, onComplete]);

  useEffect(() => () => clearExitTimer(), [clearExitTimer]);

  useEffect(() => {
    const fill = progressFillRef.current;
    if (!videoReady) {
      smoothProgressRef.current = 0;
      if (fill) fill.style.transform = "scaleX(0.08)";
      setPlayProgress(0);
      return;
    }

    const video = videoRef.current;
    if (!video || !fill) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let ariaFrame = 0;

    const tick = () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        const target = Math.min(1, video.currentTime / duration);
        let smooth = smoothProgressRef.current;
        if (reduceMotion) {
          smooth = target;
        } else {
          smooth += (target - smooth) * 0.11;
          if (Math.abs(target - smooth) < 0.002) smooth = target;
        }
        smoothProgressRef.current = smooth;
        fill.style.transform = `scaleX(${Math.max(0.06, smooth).toFixed(4)})`;

        ariaFrame += 1;
        if (ariaFrame % 5 === 0) setPlayProgress(smooth);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const onLoadedData = () => {
      if (!cancelled) setVideoFrameVisible(true);
    };

    const onCanPlay = () => {
      if (!cancelled && !videoReadyRef.current) markReadyAndPlay(video);
    };

    const onCanPlayThrough = () => {
      if (!cancelled && !videoReadyRef.current) markReadyAndPlay(video);
    };

    const onEnded = () => {
      smoothProgressRef.current = 1;
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = "scaleX(1)";
      }
      setPlayProgress(1);
      beginExit();
    };

    const wireVideo = () => {
      video.preload = "auto";
      video.defaultPlaybackRate = ENTRY_SPLASH_PLAYBACK_RATE;
      video.playbackRate = ENTRY_SPLASH_PLAYBACK_RATE;
      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
      video.addEventListener("ended", onEnded);
    };

    wireVideo();

    void warmEntrySplashVideo()
      .then((blobUrl) => {
        if (cancelled || finishedRef.current || videoReadyRef.current) return;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
        video.src = blobUrl;
        video.load();
      })
      .catch(() => {
        /* остаёмся на прямом URL */
      });

    const loadTimeout = window.setTimeout(() => {
      if (cancelled || finishedRef.current || videoReadyRef.current) return;
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        markReadyAndPlay(video);
      } else {
        beginExit();
      }
    }, ENTRY_SPLASH_LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlayThrough);
      video.removeEventListener("ended", onEnded);
      video.pause();
    };
  }, [beginExit, markReadyAndPlay]);

  if (!mounted) return null;

  const progressPercent = Math.round(playProgress * 100);
  const rootStyle = {
    "--entry-splash-duration": `${activeDurationMs}ms`,
    "--entry-splash-fade": `${ENTRY_SPLASH_FADE_MS}ms`,
  } as CSSProperties;

  const caption = videoReady ? "Входим в приложение…" : "Загрузка…";

  return (
    <div
      className={cx(
        "entry-splash",
        isV2 && "entry-splash--v2",
        videoFrameVisible && "entry-splash--video-frame",
        videoReady && "entry-splash--playing",
        exiting && "entry-splash--exiting",
      )}
      style={rootStyle}
      role="status"
      aria-label="Загрузка приложения"
      aria-live="polite"
    >
      <div className="entry-splash__video-stage" aria-hidden>
        <video
          ref={videoRef}
          className={cx(
            "entry-splash__video",
            videoFrameVisible && "entry-splash__video--frame",
            videoReady && "entry-splash__video--ready",
          )}
          src={ENTRY_SPLASH_VIDEO_MP4}
          poster={ENTRY_SPLASH_POSTER}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>

      <div className="entry-splash__stack entry-splash__stack--overlay entry-splash__stack--after-video">
        <div className="entry-splash__panel">
          <img
            className="entry-splash__logo"
            src={ENTRY_LOGO}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
          <p className="entry-splash__caption">{caption}</p>
          <div
            className={cx("entry-splash__progress", !videoReady && "entry-splash__progress--loading")}
            aria-hidden={!videoReady}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={videoReady ? progressPercent : undefined}
            role="progressbar"
            aria-label={caption}
          >
            <div
              ref={progressFillRef}
              className={cx(
                "entry-splash__progress-fill",
                videoReady && "entry-splash__progress-fill--sync",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
