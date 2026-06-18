import { memo } from "react";
import { useAssociationCabinetState } from "../hooks/useAssociationCabinetState";
import AssociationCabinetLegacy from "./association/AssociationCabinetLegacy";
import AssociationCabinetV2Shell from "./association/AssociationCabinetV2Shell";
import type { AssociationVariant } from "./association/associationTypes";

export type { AssociationVariant } from "./association/associationTypes";

export function AssociationPage({ variant }: { variant: AssociationVariant }) {
  const state = useAssociationCabinetState(variant);

  if (state.isV2) {
    return (
      <AssociationCabinetV2Shell
        variant={variant}
        basePath={state.basePath}
        associationRoleLabel={state.associationRoleLabel}
        associationCopy={state.associationCopy}
        filteredCards={state.filteredCards}
        upcomingPanelEvents={state.upcomingPanelEvents}
        calendarEvents={state.calendarEvents}
        onCalendarEventsChange={state.setCalendarEvents}
        leaveProforientationPath={state.leaveProforientationPath}
      />
    );
  }

  return <AssociationCabinetLegacy {...state} />;
}

function AssociationCabinetPage() {
  return <AssociationPage variant="rador" />;
}

export default memo(AssociationCabinetPage);
