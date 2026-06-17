type IpGeoResult = {
  lat: number;
  lng: number;
  accuracyM: number;
  city?: string;
  region?: string;
  countryCode?: string;
  countryName?: string;
};

type IpCountryResult = {
  countryCode: string;
  countryName?: string;
};

const cache = new Map<string, { at: number; value: IpGeoResult | null }>();
const countryCache = new Map<string, { at: number; value: IpCountryResult | null }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function isPrivateIp(ip: string): boolean {
  const t = ip.trim();
  if (!t || t === "unknown" || t === "::1" || t === "127.0.0.1") return true;
  if (t.startsWith("10.") || t.startsWith("192.168.") || t.startsWith("172.")) return true;
  if (t.startsWith("fe80:") || t.startsWith("fc") || t.startsWith("fd")) return true;
  return false;
}

async function fetchIpApiBody(ip: string, fields: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4_500) });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    if (body.status !== "success") return null;
    return body;
  } catch {
    return null;
  }
}

export async function resolveIpCountry(ip: string): Promise<IpCountryResult | null> {
  const key = ip.trim().slice(0, 80);
  if (!key || isPrivateIp(key)) return null;

  const hit = countryCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const geoHit = cache.get(key);
  if (geoHit?.value?.countryCode) {
    const value: IpCountryResult = {
      countryCode: geoHit.value.countryCode,
      countryName: geoHit.value.countryName,
    };
    countryCache.set(key, { at: Date.now(), value });
    return value;
  }

  const body = await fetchIpApiBody(key, "status,countryCode,country");
  if (!body || typeof body.countryCode !== "string" || !body.countryCode.trim()) {
    countryCache.set(key, { at: Date.now(), value: null });
    return null;
  }
  const value: IpCountryResult = {
    countryCode: body.countryCode.trim().toUpperCase(),
    countryName: typeof body.country === "string" ? body.country : undefined,
  };
  countryCache.set(key, { at: Date.now(), value });
  return value;
}

export async function resolveIpGeoLocation(ip: string): Promise<IpGeoResult | null> {
  const key = ip.trim().slice(0, 80);
  if (!key || isPrivateIp(key)) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const body = await fetchIpApiBody(
    key,
    "status,lat,lon,city,regionName,countryCode,country"
  );
  if (
    !body ||
    !Number.isFinite(body.lat as number) ||
    !Number.isFinite(body.lon as number)
  ) {
    cache.set(key, { at: Date.now(), value: null });
    return null;
  }
  const value: IpGeoResult = {
    lat: body.lat as number,
    lng: body.lon as number,
    accuracyM: 25_000,
    city: typeof body.city === "string" ? body.city : undefined,
    region: typeof body.regionName === "string" ? body.regionName : undefined,
    countryCode:
      typeof body.countryCode === "string"
        ? body.countryCode.trim().toUpperCase()
        : undefined,
    countryName: typeof body.country === "string" ? body.country : undefined,
  };
  cache.set(key, { at: Date.now(), value });
  if (value.countryCode) {
    countryCache.set(key, {
      at: Date.now(),
      value: { countryCode: value.countryCode, countryName: value.countryName },
    });
  }
  return value;
}
