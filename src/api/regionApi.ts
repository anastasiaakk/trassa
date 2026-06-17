import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { isAuthApiEnabled } from "../utils/authMode";

export const PORTAL_REGION_MESSAGE =
  "Данный портал доступен только на территории Российской Федерации.";

export const PORTAL_REGION_CODE = "REGION_BLOCKED";

export async function resolvePortalRegionAccess(): Promise<{
  allowed: boolean;
  message: string;
  countryCode?: string | null;
  countryName?: string | null;
}> {
  if (!isAuthApiEnabled()) {
    return { allowed: true, message: "" };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/portal/region`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json()) as {
      ok?: boolean;
      allowed?: boolean;
      message?: string | null;
      error?: string;
      code?: string;
      countryCode?: string | null;
      countryName?: string | null;
    };
    if (res.status === 403 && body.code === PORTAL_REGION_CODE) {
      return {
        allowed: false,
        message: body.error ?? PORTAL_REGION_MESSAGE,
        countryCode: body.countryCode,
        countryName: body.countryName,
      };
    }
    if (!res.ok || !body.ok) {
      return { allowed: true, message: "" };
    }
    if (body.allowed === false) {
      return {
        allowed: false,
        message: body.message ?? PORTAL_REGION_MESSAGE,
        countryCode: body.countryCode,
        countryName: body.countryName,
      };
    }
    return {
      allowed: true,
      message: "",
      countryCode: body.countryCode,
      countryName: body.countryName,
    };
  } catch {
    return { allowed: true, message: "" };
  }
}
