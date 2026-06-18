import { memo } from "react";
import { AssociationPage } from "./AssociationCabinetPage";

/** Тот же интерфейс, что страница 5, вариант для АДО вместо РАДОР */
function AdoCabinetPage() {
  return <AssociationPage variant="ado" />;
}

export default memo(AdoCabinetPage);
