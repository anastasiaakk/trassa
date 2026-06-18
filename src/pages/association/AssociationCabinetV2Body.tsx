import { memo, useMemo, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import AssociationCabinetDashboardV2 from "../../components/cabinet-v2/AssociationCabinetDashboardV2";
import { ProforientationResultsTable } from "../../components/ProforientationEmployerPanels";
import type { CabinetChromeContext } from "../../components/CabinetChromeLayout";
import { cx } from "../../design-system/cabinetChromeClasses";
import { getHoverTooltipPreset } from "../../components/HoverTooltip";
import type { CalendarEventItem } from "../AssociationEventsView";
import type { AssociationVariant } from "./associationTypes";
import AssociationDocumentsView from "../AssociationDocumentsView";
import AssociationIncomingDocumentsView from "../AssociationIncomingDocumentsView";
import AssociationStudentTeamsView from "../AssociationStudentTeamsView";
import RadorFormsHub from "../RadorFormsHub";

type FilteredCard = {
  title: string;
  description: string;
  icon: string;
  accent: string;
  accentSoft: string;
  tag: string;
};

type Props = {
  variant: AssociationVariant;
  basePath: string;
  ctx: CabinetChromeContext;
  associationCopy: {
    archiveTag: string;
    badgeTitle: string;
    introParagraph: string;
  };
  filteredCards: FilteredCard[];
  upcomingPanelEvents: CalendarEventItem[];
  calendarEvents: CalendarEventItem[];
  onCalendarEventsChange: Dispatch<SetStateAction<CalendarEventItem[]>>;
  proforientationLayoutStyles: {
    recentPanel: CSSProperties;
    recentTitle: CSSProperties;
  };
  leaveProforientationPath: () => void;
};

function AssociationCabinetV2Body({
  variant,
  basePath,
  ctx,
  associationCopy,
  filteredCards,
  upcomingPanelEvents,
  calendarEvents,
  onCalendarEventsChange,
  proforientationLayoutStyles,
  leaveProforientationPath,
}: Props) {
  const location = useLocation();
  const { cn, isDark, normalizedSearch, cabinetSection } = ctx;

  const isProforientationRoute = location.pathname === `${basePath}/proforientation`;
  const isAssociationDocumentsMain = location.pathname === `${basePath}/documents`;
  const isIncomingDocumentsRoute = location.pathname === `${basePath}/documents/incoming`;
  const isDocumentsSectionRoute = isAssociationDocumentsMain || isIncomingDocumentsRoute;
  const isTeamsRoute = location.pathname === `${basePath}/teams`;
  const isFormsRoute = location.pathname === `${basePath}/forms`;

  const isV2DashboardHome =
    location.pathname === basePath &&
    cabinetSection === "dashboard" &&
    !isProforientationRoute &&
    !isDocumentsSectionRoute &&
    !isTeamsRoute &&
    !isFormsRoute;

  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  if (isV2DashboardHome) {
    return (
      <AssociationCabinetDashboardV2
        basePath={basePath}
        badgeTitle={associationCopy.badgeTitle}
        introParagraph={associationCopy.introParagraph}
        filteredCards={filteredCards}
        upcomingEvents={upcomingPanelEvents}
        calendarEvents={calendarEvents}
        onCalendarEventsChange={onCalendarEventsChange}
        cn={cn}
        isDark={isDark}
        isProforientationRoute={isProforientationRoute}
        leaveProforientationPath={leaveProforientationPath}
        setCabinetSection={ctx.setCabinetSection}
        sidebarTooltipPreset={sidebarTooltipPreset}
        normalizedSearch={normalizedSearch}
      />
    );
  }

  if (isIncomingDocumentsRoute) {
    return (
      <main className="page5-v2__main-region">
        <AssociationIncomingDocumentsView
          styles={ctx.styles}
          association={variant === "ado" ? "ado" : "rador"}
          layoutStyles={proforientationLayoutStyles}
          basePath={basePath}
          isV2
        />
      </main>
    );
  }

  if (isAssociationDocumentsMain) {
    return (
      <main className="page5-v2__main-region">
        <AssociationDocumentsView
          styles={ctx.styles}
          association={variant === "ado" ? "ado" : "rador"}
          layoutStyles={proforientationLayoutStyles}
          incomingDocumentsPath={`${basePath}/documents/incoming`}
          isDark={isDark}
          isV2
        />
      </main>
    );
  }

  if (isTeamsRoute) {
    return (
      <main className={cx("page5-v2__main-region", "page5-v2__main-region--flush-top")}>
        <AssociationStudentTeamsView
          styles={ctx.styles}
          association={variant === "ado" ? "ado" : "rador"}
          layoutStyles={proforientationLayoutStyles}
          isV2
        />
      </main>
    );
  }

  if (isFormsRoute) {
    return (
      <main className="page5-v2__main-region">
        <RadorFormsHub layoutStyles={proforientationLayoutStyles} />
      </main>
    );
  }

  if (isProforientationRoute) {
    return (
      <main className={cx("page5-v2__main-region", "page5-v2__main-region--flush-top")}>
        <ProforientationResultsTable styles={ctx.styles} layoutStyles={proforientationLayoutStyles} />
      </main>
    );
  }

  return null;
}

export default memo(AssociationCabinetV2Body);
