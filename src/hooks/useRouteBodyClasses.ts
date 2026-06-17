import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Классы route-* на html/body для page-scoped CSS. */
export function useRouteBodyClasses(): void {
  const pathname = useLocation().pathname;

  const isPage1Home = pathname === "/";
  const isPage2Map = pathname === "/services" || pathname === "/map";
  const isPage3 = pathname === "/page3" || pathname === "/role-select";
  const isProfile = pathname === "/profile";
  const isCabinet =
    pathname.startsWith("/cabinet-school") ||
    pathname.startsWith("/cabinet-spo") ||
    pathname === "/page4" ||
    pathname.startsWith("/page4/") ||
    pathname === "/cabinet-contractor" ||
    pathname.startsWith("/cabinet-contractor/") ||
    pathname === "/page5" ||
    pathname.startsWith("/page5/") ||
    pathname === "/cabinet-association-rador" ||
    pathname.startsWith("/cabinet-association-rador/") ||
    pathname === "/page6" ||
    pathname.startsWith("/page6/") ||
    pathname === "/cabinet-association-ado" ||
    pathname.startsWith("/cabinet-association-ado/");
  const isPage4 =
    pathname === "/page4" ||
    pathname.startsWith("/page4/") ||
    pathname === "/cabinet-contractor" ||
    pathname.startsWith("/cabinet-contractor/");
  const isLegal = pathname === "/privacy";

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const routes = [
      ["route-page1", isPage1Home],
      ["route-page2", isPage2Map],
      ["route-page3", isPage3],
      ["route-profile", isProfile],
      ["route-cabinet", isCabinet],
      ["route-page4", isPage4],
      ["route-legal", isLegal],
    ] as const;
    for (const [cls, on] of routes) {
      root.classList.toggle(cls, on);
      body.classList.toggle(cls, on);
    }
    return () => {
      for (const [cls] of routes) {
        root.classList.remove(cls);
        body.classList.remove(cls);
      }
    };
  }, [isPage1Home, isPage2Map, isPage3, isProfile, isCabinet, isPage4, isLegal]);
}
