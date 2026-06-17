import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { resolvePageMeta } from "../config/pageMeta";

/** document.title и meta description для текущего маршрута. */
export function usePageMeta(): void {
  const { pathname } = useLocation();
  const pageMeta = useMemo(() => resolvePageMeta(pathname), [pathname]);

  useEffect(() => {
    document.title = pageMeta.title;
    const descriptionElement = document.querySelector('meta[name="description"]');
    if (descriptionElement) {
      descriptionElement.setAttribute("content", pageMeta.metaDescription);
    }
  }, [pageMeta]);
}
