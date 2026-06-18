import { memo, useMemo, type CSSProperties } from "react";
import { matchesCabinetSearch } from "../../utils/cabinetSearchFilter";
import { useNavigate } from "react-router-dom";
import type { CabinetChromeContext } from "../CabinetChromeLayout";
import ProforientationTestSection from "../ProforientationTestSection";
import {
  AUDIENCE_LABELS,
  type CalendarEventItem,
} from "../../pages/AssociationEventsView";
import type { LearnerCabinetVariant } from "../../pages/CabinetLearnerHome";
import { cx } from "../../design-system/cabinetChromeClasses";
import {
  CabinetV2ActionCard,
  CabinetV2AsideCard,
  CabinetV2AsideTile,
  CabinetV2DashboardFrame,
  CabinetV2EventsPanel,
  CabinetV2Hero,
  CabinetV2InfoCard,
  type CabinetV2EventItem,
} from "./CabinetV2Primitives";

type Copy = {
  cabinetPath: string;
  asideBadge: string;
  sideCardKicker: string;
  sideCardTitle: string;
  sideCardText: string;
  sideBlocks: { title: string; text: string }[];
  heroTag: string;
  heroTitleFallback: string;
  info: { label: string; title: string; text: string };
  actions: { title: string; text: string }[];
  eventsHint: string;
  eventsEmpty: string;
};

type Props = {
  ctx: CabinetChromeContext;
  variant: LearnerCabinetVariant;
  copy: Copy;
  schoolTab: "home" | "materials";
  setSchoolTab: (t: "home" | "materials") => void;
  heroDisplayName: string;
  heroCardStyle: CSSProperties;
  heroRoleIconSrc: string;
  upcomingEvents: CalendarEventItem[];
};

function LearnerCabinetDashboardV2({
  ctx,
  variant,
  copy,
  schoolTab,
  setSchoolTab,
  heroDisplayName,
  heroCardStyle,
  heroRoleIconSrc,
  upcomingEvents,
}: Props) {
  const { cn, layoutStyles, normalizedSearch } = ctx;
  const navigate = useNavigate();

  const visibleSideBlocks = useMemo(
    () =>
      copy.sideBlocks.filter((b) =>
        matchesCabinetSearch(normalizedSearch, b.title, b.text, copy.sideCardTitle)
      ),
    [copy.sideBlocks, copy.sideCardTitle, normalizedSearch]
  );

  const visibleActions = useMemo(
    () =>
      copy.actions.filter((a) => matchesCabinetSearch(normalizedSearch, a.title, a.text)),
    [copy.actions, normalizedSearch]
  );

  const eventItems: CabinetV2EventItem[] = useMemo(
    () =>
      upcomingEvents.map((ev) => {
        const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return {
          id: ev.id,
          title: ev.title,
          meta: `${dateLabel} · ${ev.time} · ${AUDIENCE_LABELS[ev.audience]}`,
          description:
            ev.description && ev.description.length > 160
              ? `${ev.description.slice(0, 160)}…`
              : ev.description,
        };
      })
      .filter((ev) =>
        matchesCabinetSearch(normalizedSearch, ev.title, ev.meta, ev.description)
      ),
    [upcomingEvents, normalizedSearch]
  );

  return (
    <main className={cx(cn.main, "cabinet-v2-main-grid--dashboard")}>
      <section className={cn.section}>
        <div className="cabinet-v2-dashboard">
          <div className="cabinet-v2-dashboard__context-strip" aria-label="Контекст и быстрые разделы">
            <CabinetV2AsideCard
              kicker={copy.sideCardKicker}
              title={copy.sideCardTitle}
              text={copy.sideCardText}
            />
            {visibleSideBlocks.map((b) => (
              <CabinetV2AsideTile
                key={b.title}
                active={variant === "school" && b.title === "Материалы и задания" && schoolTab === "materials"}
                title={b.title}
                text={b.text}
                onClick={
                  variant === "school" && b.title === "Материалы и задания"
                    ? () => {
                        setSchoolTab("materials");
                        navigate("/cabinet-school", { state: { schoolTab: "materials" } });
                      }
                    : undefined
                }
              />
            ))}
          </div>
          <CabinetV2DashboardFrame>
            <div className="cabinet-v2-dashboard__hero-row">
              <CabinetV2Hero
                heroClassName={cn.hero}
                heroStyle={heroCardStyle}
                tag={copy.heroTag}
                heroTitle={heroDisplayName || undefined}
                heroEmpty={copy.heroTitleFallback}
                roleIconSrc={heroRoleIconSrc}
                heroButtonStyle={layoutStyles.heroButton}
              />
              <div className="cabinet-v2-dashboard__widgets">
                <CabinetV2InfoCard
                  className={cn.infoCard}
                  label={copy.info.label}
                  title={copy.info.title}
                  text={copy.info.text}
                />
                <div className="cabinet-v2-dashboard__actions">
                  {visibleActions.map((a) => (
                    <CabinetV2ActionCard
                      key={a.title}
                      title={a.title}
                      text={a.text}
                      onClick={() => {
                        if (variant === "school") {
                          if (a.title === "Объявления и письма") {
                            navigate("/cabinet-school/messages");
                            return;
                          }
                          if (a.title === "Календарь активностей") {
                            navigate("/cabinet-school/calendar");
                            return;
                          }
                          navigate("/cabinet-school");
                          return;
                        }
                        if (a.title === "Портфолио достижений") {
                          navigate("/cabinet-spo/portfolio");
                          return;
                        }
                        navigate("/cabinet-spo/requests");
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <CabinetV2EventsPanel
              panelClassName={cn.recentPanel}
              titleClassName={cn.recentTitle}
              title="Ближайшие мероприятия"
              hint={copy.eventsHint}
              emptyText={copy.eventsEmpty}
              items={eventItems}
            />
          </CabinetV2DashboardFrame>
          <ProforientationTestSection styles={ctx.styles} learnerKind={variant} />
        </div>
      </section>
    </main>
  );
}

export default memo(LearnerCabinetDashboardV2);
