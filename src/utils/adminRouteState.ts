/** Синхронизация админ-панели с query в HashRouter (#/services?admin=1&tab=devices). */

export type AdminSectionId =
  | "home"
  | "settings"
  | "designSystem"
  | "users"
  | "specs"
  | "tables"
  | "map"
  | "orgs"
  | "release"
  | "devices"
  | "violations"
  | "account";

export type AdminRouteMode = "map" | "login" | "dashboard";

const VALID_SECTIONS = new Set<string>([
  "home",
  "settings",
  "designSystem",
  "users",
  "specs",
  "tables",
  "map",
  "orgs",
  "release",
  "devices",
  "violations",
  "account",
]);

function parseSearch(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

export function readAdminRouteState(search: string): {
  mode: AdminRouteMode;
  tab: AdminSectionId;
} {
  const p = parseSearch(search);

  if (p.get("adminCabinet") === "1") {
    return { mode: "dashboard", tab: "account" };
  }

  const admin = p.get("admin");
  if (admin === "login") {
    return { mode: "login", tab: "home" };
  }

  if (admin === "1") {
    const rawTab = p.get("tab") ?? "home";
    const tab = VALID_SECTIONS.has(rawTab) ? (rawTab as AdminSectionId) : "home";
    return { mode: "dashboard", tab };
  }

  return { mode: "map", tab: "home" };
}

export function buildAdminSearch(
  mode: AdminRouteMode,
  tab: AdminSectionId = "home"
): string {
  if (mode === "map") return "";
  const p = new URLSearchParams();
  if (mode === "login") {
    p.set("admin", "login");
    return `?${p.toString()}`;
  }
  p.set("admin", "1");
  if (tab !== "home") p.set("tab", tab);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export type Page2AdminSurface = "map" | "adminLogin" | "adminDashboard";

export function adminSurfaceFromRoute(
  mode: AdminRouteMode,
  loggedIn: boolean
): Page2AdminSurface {
  if (mode === "login") return "adminLogin";
  if (mode === "dashboard") return loggedIn ? "adminDashboard" : "adminLogin";
  return "map";
}

export function routeModeFromSurface(surface: Page2AdminSurface): AdminRouteMode {
  if (surface === "adminLogin") return "login";
  if (surface === "adminDashboard") return "dashboard";
  return "map";
}
