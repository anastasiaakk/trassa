import { useCallback, useState } from "react";
import { loadContractorOrganizations } from "../utils/contractorOrganizations";

/** Справочник организаций подрядчиков для входа в кабинет. */
export function useContractorOrganizations() {
  const [contractors, setContractors] = useState(() => loadContractorOrganizations());

  const refresh = useCallback(() => {
    setContractors(loadContractorOrganizations());
  }, []);

  return { contractors, refresh };
}
