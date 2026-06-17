import { Navigate, useLocation } from "react-router-dom";
import { ROUTE_PATH_ALIASES } from "../config/pageMeta";

function AliasRedirect({ fromPrefix }: { fromPrefix: string }) {
  const { pathname, search } = useLocation();
  const toPrefix = ROUTE_PATH_ALIASES[fromPrefix] ?? fromPrefix;
  const tail = pathname.startsWith(`${fromPrefix}/`)
    ? pathname.slice(fromPrefix.length)
  : pathname === fromPrefix
      ? ""
      : pathname.replace(fromPrefix, "");
  return <Navigate to={`${toPrefix}${tail}${search}`} replace />;
}

/** Редиректы семантических URL на legacy-маршруты (обратная совместимость). */
export const ROUTE_ALIAS_ROUTES = [
  { path: "/role-select", element: <Navigate to="/page3" replace /> },
  { path: "/map", element: <Navigate to="/services" replace /> },
  { path: "/cabinet-contractor", element: <Navigate to="/page4" replace /> },
  { path: "/cabinet-contractor/*", element: <AliasRedirect fromPrefix="/cabinet-contractor" /> },
  { path: "/cabinet-association-rador", element: <Navigate to="/page5" replace /> },
  { path: "/cabinet-association-rador/*", element: <AliasRedirect fromPrefix="/cabinet-association-rador" /> },
  { path: "/cabinet-association-ado", element: <Navigate to="/page6" replace /> },
  { path: "/cabinet-association-ado/*", element: <AliasRedirect fromPrefix="/cabinet-association-ado" /> },
] as const;
