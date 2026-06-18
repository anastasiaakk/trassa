/**
 * Прогрев динамических чанков до клика — маршруты остаются lazy, но загрузка
 * начинается заранее (кеш модулей Vite/Rollup).
 */

export function prefetchServicesRoute(): void {
  void import("../pages/ServicesMapPage");
}

export function prefetchRoleSelectRoute(): void {
  void import("../pages/RoleSelectPage");
}

/** После первого кадра — лёгкий прогрев (Page2 ~800KB+ — только по намерению, см. prefetchServicesRoute). */
export function scheduleIdlePrefetchCommonRoutes(): void {
  const run = () => {
    prefetchRoleSelectRoute();
    /** Desktop: чанки с диска — можно прогреть тяжёлые маршруты заранее. */
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      prefetchServicesRoute();
      void import("../pages/AssociationCabinetPage");
      void import("../pages/ContractorCabinetPage");
    }
  };
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    globalThis.setTimeout(run, 120);
    return;
  }
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    globalThis.setTimeout(run, 300);
  }
}
