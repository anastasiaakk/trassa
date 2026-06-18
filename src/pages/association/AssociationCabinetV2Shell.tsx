import { memo, useMemo, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import CabinetChromeLayout, { type CabinetChromeContext } from "../../components/CabinetChromeLayout";
import { FloatingNotes } from "../../components/FloatingNotes";
import { CABINET_V2_SHELL, cx } from "../../design-system/cabinetChromeClasses";
import type { CalendarEventItem } from "../AssociationEventsView";
import { AssociationEventsView } from "../AssociationEventsView";
import type { AssociationVariant } from "./associationTypes";
import AssociationCabinetV2Body from "./AssociationCabinetV2Body";

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
  associationRoleLabel: string;
  associationCopy: {
    archiveTag: string;
    badgeTitle: string;
    introParagraph: string;
  };
  filteredCards: FilteredCard[];
  upcomingPanelEvents: CalendarEventItem[];
  calendarEvents: CalendarEventItem[];
  onCalendarEventsChange: Dispatch<SetStateAction<CalendarEventItem[]>>;
  leaveProforientationPath: () => void;
};

function buildProforientationLayoutStyles(
  styles: CabinetChromeContext["styles"],
  isDark: boolean
): {
  recentPanel: CSSProperties;
  recentTitle: CSSProperties;
} {
  return {
    recentPanel: {
      borderRadius: 32,
      padding: "22px 28px 28px",
      background: styles.cardBg,
      boxShadow: styles.cardShadow,
      display: "grid",
      gap: 22,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #d9e2f1",
    },
    recentTitle: {
      fontSize: 22,
      fontWeight: 800,
      color: styles.text,
    },
  };
}

type StageProps = Omit<Props, "basePath" | "associationRoleLabel"> & {
  ctx: CabinetChromeContext;
  basePath: string;
};

function AssociationCabinetV2Stage({
  ctx,
  variant,
  basePath,
  associationCopy,
  filteredCards,
  upcomingPanelEvents,
  calendarEvents,
  onCalendarEventsChange,
  leaveProforientationPath,
}: StageProps) {
  const proforientationLayoutStyles = useMemo(
    () => buildProforientationLayoutStyles(ctx.styles, ctx.isDark),
    [ctx.styles, ctx.isDark]
  );

  return (
    <>
      <div className={cx(CABINET_V2_SHELL.stage, "cabinet-v2-dashboard-stage")}>
        <AssociationCabinetV2Body
          variant={variant}
          basePath={basePath}
          ctx={ctx}
          associationCopy={associationCopy}
          filteredCards={filteredCards}
          upcomingPanelEvents={upcomingPanelEvents}
          calendarEvents={calendarEvents}
          onCalendarEventsChange={onCalendarEventsChange}
          proforientationLayoutStyles={proforientationLayoutStyles}
          leaveProforientationPath={leaveProforientationPath}
        />
      </div>
      <FloatingNotes isDark={ctx.isDark} />
    </>
  );
}

function AssociationCabinetV2Shell(props: Props) {
  const { basePath, associationRoleLabel, calendarEvents, onCalendarEventsChange } = props;

  return (
    <CabinetChromeLayout
      cabinetPath={basePath}
      sidebarRoleLabel={associationRoleLabel}
      renderEvents={(ctx) => (
        <AssociationEventsView
          styles={ctx.styles}
          isDark={ctx.isDark}
          events={calendarEvents}
          onEventsChange={onCalendarEventsChange}
        />
      )}
    >
      {(ctx) => (
        <AssociationCabinetV2Stage
          ctx={ctx}
          basePath={basePath}
          variant={props.variant}
          associationCopy={props.associationCopy}
          filteredCards={props.filteredCards}
          upcomingPanelEvents={props.upcomingPanelEvents}
          calendarEvents={calendarEvents}
          onCalendarEventsChange={onCalendarEventsChange}
          leaveProforientationPath={props.leaveProforientationPath}
        />
      )}
    </CabinetChromeLayout>
  );
}

export default memo(AssociationCabinetV2Shell);
