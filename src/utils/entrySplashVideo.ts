import { publicUrl } from "./publicUrl";

export const ENTRY_SPLASH_VIDEO_MP4 = publicUrl("entry-splash-bg.mp4");
export const ENTRY_SPLASH_POSTER = publicUrl("entry-splash-poster.jpg");

const ENTRY_VIDEO_MP4 = ENTRY_SPLASH_VIDEO_MP4;

let blobUrlPromise: Promise<string> | null = null;

/** Скачивает весь ролик в память — воспроизведение без сетевых рывков. */
export function warmEntrySplashVideo(): Promise<string> {
  if (!blobUrlPromise) {
    blobUrlPromise = fetch(ENTRY_VIDEO_MP4, { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`entry splash video ${res.status}`);
        return res.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
  }
  return blobUrlPromise;
}

/** После сплэша — освободить blob URL в памяти. */
export function releaseEntrySplashVideo(): void {
  if (!blobUrlPromise) return;
  void blobUrlPromise
    .then((url) => URL.revokeObjectURL(url))
    .catch(() => {});
  blobUrlPromise = null;
}
