/**
 * Точное определение iPhone по чипу Apple (WebGL) + экран + iOS.
 * iPhone 15 (A16) и 15 Pro (A17 Pro) имеют один viewport — различаются только чипом.
 */

export type AppleFingerprintExtras = {
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
  gpuRenderer?: string;
  iosMajor?: number;
  cpuCores?: number;
};

export type AppleGpuResolve = {
  name: string;
  confidence: number;
  source: string;
};

type AppleChip =
  | "A12"
  | "A13"
  | "A14"
  | "A15"
  | "A16"
  | "A17P"
  | "A18"
  | "A18P"
  | "M1"
  | "M2"
  | "M4"
  | "GENERIC";

/** Читает UNMASKED_RENDERER_WEBGL (Safari iOS отдаёт «Apple A16 GPU» и т.п.). */
export function collectWebGLRenderer(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    const kinds = ["webgl2", "webgl", "experimental-webgl"] as const;
    for (const kind of kinds) {
      const gl = canvas.getContext(kind) as WebGLRenderingContext | null;
      if (!gl) continue;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (!ext) continue;
      const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof renderer === "string" && renderer.trim()) {
        return renderer.trim().slice(0, 120);
      }
    }
  } catch {
    /* privacy / WebGL disabled */
  }
  return null;
}

export function parseIosMajorVersion(ua: string): number | undefined {
  const m = ua.match(/(?:iPhone OS|CPU OS|iPad OS)\s+(\d+)[_.]/i);
  if (m) return Number.parseInt(m[1], 10);
  const m2 = ua.match(/OS\s+(\d+)[_.]/i);
  if (m2 && /iPhone|iPad|Macintosh/i.test(ua)) return Number.parseInt(m2[1], 10);
  return undefined;
}

export function parseAppleGpuChip(renderer: string | null | undefined): AppleChip | null {
  if (!renderer?.trim()) return null;
  const r = renderer.trim();
  if (/Apple\s+A17\s+Pro/i.test(r)) return "A17P";
  if (/Apple\s+A18\s+Pro/i.test(r)) return "A18P";
  if (/Apple\s+A18\b/i.test(r)) return "A18";
  if (/Apple\s+A16\b/i.test(r)) return "A16";
  if (/Apple\s+A15\b/i.test(r)) return "A15";
  if (/Apple\s+A14\b/i.test(r)) return "A14";
  if (/Apple\s+A13\b/i.test(r)) return "A13";
  if (/Apple\s+A12\b/i.test(r)) return "A12";
  if (/Apple\s+M4\b/i.test(r)) return "M4";
  if (/Apple\s+M2\b/i.test(r)) return "M2";
  if (/Apple\s+M1\b/i.test(r)) return "M1";
  if (/Apple GPU/i.test(r)) return "GENERIC";
  return null;
}

function screenCss(extras: AppleFingerprintExtras): { w: number; h: number } {
  const w = extras.screenW ?? 0;
  const h = extras.screenH ?? 0;
  return { w: Math.min(w, h), h: Math.max(w, h) };
}

function resolveFromChip(
  chip: AppleChip,
  w: number,
  h: number,
  iosMajor?: number
): AppleGpuResolve | null {
  if (chip === "A17P") {
    if (h >= 930 || w >= 428) {
      return { name: "iPhone 15 Pro Max", confidence: 95, source: "apple-gpu" };
    }
    return { name: "iPhone 15 Pro", confidence: 95, source: "apple-gpu" };
  }

  if (chip === "A18P") {
    if (h >= 950 || w >= 438) {
      return { name: "iPhone 16 Pro Max", confidence: 95, source: "apple-gpu" };
    }
    return { name: "iPhone 16 Pro", confidence: 95, source: "apple-gpu" };
  }

  if (chip === "A18") {
    if (h >= 930 || w >= 428) {
      return { name: "iPhone 16 Plus", confidence: 94, source: "apple-gpu" };
    }
    return { name: "iPhone 16", confidence: 94, source: "apple-gpu" };
  }

  if (chip === "A16") {
    if (h >= 930 || w >= 428) {
      if (iosMajor && iosMajor >= 17) {
        return { name: "iPhone 15 Plus", confidence: 93, source: "apple-gpu" };
      }
      return { name: "iPhone 14 Pro Max", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 392) {
      if (iosMajor && iosMajor >= 17) {
        return { name: "iPhone 15", confidence: 94, source: "apple-gpu" };
      }
      return { name: "iPhone 14 Pro", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 388) {
      if (iosMajor && iosMajor >= 16) {
        return { name: "iPhone 14", confidence: 92, source: "apple-gpu" };
      }
      return { name: "iPhone 13", confidence: 88, source: "apple-gpu" };
    }
  }

  if (chip === "A15") {
    if (h >= 920 || w >= 426) {
      if (iosMajor && iosMajor >= 16) {
        return { name: "iPhone 14 Plus", confidence: 90, source: "apple-gpu" };
      }
      return { name: "iPhone 13 Pro Max", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 388) {
      if (iosMajor && iosMajor >= 16) {
        return { name: "iPhone 14", confidence: 88, source: "apple-gpu" };
      }
      return { name: "iPhone 13", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 375 && h >= 800 && h < 840) {
      return { name: "iPhone 13 mini", confidence: 88, source: "apple-gpu" };
    }
    if (w >= 375 && h >= 810) {
      return { name: "iPhone 13 Pro", confidence: 86, source: "apple-gpu" };
    }
    if (w <= 320) {
      return { name: "iPhone SE (3-го пок.)", confidence: 88, source: "apple-gpu" };
    }
  }

  if (chip === "A14") {
    if (h >= 920 || w >= 426) {
      return { name: "iPhone 12 Pro Max", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 388) {
      return { name: "iPhone 12", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 375 && h < 800) {
      return { name: "iPhone 12 mini", confidence: 90, source: "apple-gpu" };
    }
    if (w >= 375) {
      return { name: "iPhone 12 Pro", confidence: 88, source: "apple-gpu" };
    }
  }

  if (chip === "A13") {
    if (h >= 880) {
      return { name: "iPhone 11 Pro Max", confidence: 88, source: "apple-gpu" };
    }
    if (w >= 414 && h >= 880) {
      return { name: "iPhone 11", confidence: 88, source: "apple-gpu" };
    }
    if (w >= 375 && h >= 810) {
      return { name: "iPhone 11 Pro", confidence: 88, source: "apple-gpu" };
    }
    if (w <= 320) {
      return { name: "iPhone SE (2-го пок.)", confidence: 88, source: "apple-gpu" };
    }
  }

  if (chip === "A12") {
    if (h >= 880) {
      return { name: "iPhone XS Max", confidence: 86, source: "apple-gpu" };
    }
    if (w >= 414 && h >= 880) {
      return { name: "iPhone XR", confidence: 86, source: "apple-gpu" };
    }
    if (w >= 375 && h >= 810) {
      return { name: "iPhone XS", confidence: 86, source: "apple-gpu" };
    }
  }

  if (chip === "M1" || chip === "M2" || chip === "M4") {
    if (w >= 700) return { name: "iPad Pro", confidence: 82, source: "apple-gpu" };
    return { name: "iPad Air", confidence: 80, source: "apple-gpu" };
  }

  return null;
}

/** Лучшее имя iPhone/iPad по GPU + экран (+ iOS). */
export function resolveAppleFromGpuFingerprint(
  extras: AppleFingerprintExtras | undefined
): AppleGpuResolve | null {
  if (!extras?.gpuRenderer) return null;
  const chip = parseAppleGpuChip(extras.gpuRenderer);
  if (!chip || chip === "GENERIC") return null;
  const { w, h } = screenCss(extras);
  if (w < 280 || h < 480) return null;
  return resolveFromChip(chip, w, h, extras.iosMajor);
}

/** Сверка сохранённой модели с GPU (исправляет 15↔15 Pro). */
export function reconcileAppleModelWithGpu(
  storedName: string,
  extras: AppleFingerprintExtras | undefined
): string | null {
  const gpu = resolveAppleFromGpuFingerprint(extras);
  if (!gpu) return null;
  const stored = storedName.trim();
  if (stored === gpu.name) return null;
  const chip = parseAppleGpuChip(extras?.gpuRenderer);
  if (!chip || chip === "GENERIC") return null;
  if (chip === "A17P" && /^iPhone 15 Pro/i.test(stored)) return null;
  if (chip === "A16" && /^iPhone 15 Pro/i.test(stored)) return gpu.name;
  if (chip === "A16" && stored === "iPhone 15" && gpu.name === "iPhone 15") return null;
  if (gpu.confidence >= 90) return gpu.name;
  return null;
}
