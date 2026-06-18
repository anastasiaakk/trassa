import { lazy, memo, Suspense } from "react";
import { useAssociationCabinetState } from "../hooks/useAssociationCabinetState";
import type { AssociationVariant } from "./association/associationTypes";

const AssociationCabinetLegacy = lazy(() => import("./association/AssociationCabinetLegacy"));
const AssociationCabinetV2Shell = lazy(() => import("./association/AssociationCabinetV2Shell"));

export type { AssociationVariant } from "./association/associationTypes";

export function AssociationPage({ variant }: { variant: AssociationVariant }) {
  const state = useAssociationCabinetState(variant);

  if (state.isV2) {
    return (
      <Suspense fallback={null}>
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
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <AssociationCabinetLegacy {...state} />
    </Suspense>
  );
}

function AssociationCabinetPage() {
  return <AssociationPage variant="rador" />;
}

export default memo(AssociationCabinetPage);
