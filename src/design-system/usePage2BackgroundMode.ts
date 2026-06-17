import { useEffect, useState } from "react";
import {
  getPage2BackgroundMode,
  PAGE2_BACKGROUND_CHANGED,
  type Page2BackgroundMode,
} from "./page2BackgroundMode";

export function usePage2BackgroundMode(): Page2BackgroundMode {
  const [mode, setMode] = useState<Page2BackgroundMode>(() => getPage2BackgroundMode());

  useEffect(() => {
    const sync = () => setMode(getPage2BackgroundMode());
    window.addEventListener(PAGE2_BACKGROUND_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PAGE2_BACKGROUND_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return mode;
}
