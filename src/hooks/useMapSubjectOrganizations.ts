import { useCallback, useEffect, useState } from "react";
import {
  loadMapSubjectOrganizations,
  type MapSubjectOrganization,
} from "../utils/mapSubjectOrganizations";

/** Организации по субъектам для интерактивной карты. */
export function useMapSubjectOrganizations() {
  const [orgs, setOrgs] = useState<MapSubjectOrganization[]>(() =>
    loadMapSubjectOrganizations(),
  );

  const refresh = useCallback(() => {
    setOrgs(loadMapSubjectOrganizations());
  }, []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener("trassa-map-subject-organizations-changed", onChange);
    return () =>
      window.removeEventListener("trassa-map-subject-organizations-changed", onChange);
  }, [refresh]);

  return { orgs, refresh };
}
