import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_ICON_CONTRACTOR } from "../../assets/appIcons";
import type { CabinetChromeContext } from "../CabinetChromeLayout";
import type { FormSubmission, FormTemplate } from "../../types/adminForms";
import { buildRadorFormDeadlineRows } from "../../utils/contractorDashboardData";
import { matchesCabinetSearch } from "../../utils/cabinetSearchFilter";
import {
  CONTRACTOR_PLANNER_UPDATED_EVENT,
  listUpcomingPlannerEntries,
  plannerEntryToPanelItem,
  togglePlannerEntryDone,
} from "../../utils/contractorPlannerStorage";
import { AUDIENCE_LABELS, type CalendarEventItem } from "../../pages/Page5EventsView";
import {
  CabinetV2EventsPanel,
  CabinetV2Hero,
  CONTRACTOR_UPCOMING_EVENTS_PANEL_ID,
  type CabinetV2EventItem,
} from "./CabinetV2Primitives";
import ContractorPlannerPanel from "./ContractorPlannerPanel";
import ContractorRadorDeadlinesTable from "./ContractorRadorDeadlinesTable";

type Props = {
  ctx: CabinetChromeContext;
  contractorHeroCardStyle: CSSProperties;
  contractorHeroTitle: string;
  contractorUpcomingEvents: CalendarEventItem[];
  formsUnread: number;
  recommendationsUnread: number;
  assignedTemplates: FormTemplate[];
  formSubmissions: FormSubmission[];
};

function ContractorCabinetDashboardV2({
  ctx,
  contractorHeroCardStyle,
  contractorHeroTitle,
  contractorUpcomingEvents,
  formsUnread,
  recommendationsUnread,
  assignedTemplates,
  formSubmissions,
}: Props) {
  const { cn, layoutStyles, profilePlaque, normalizedSearch } = ctx;
  const navigate = useNavigate();
  const emailNorm = profilePlaque.email.trim().toLowerCase();

  const [plannerTick, setPlannerTick] = useState(0);

  useEffect(() => {
    const bump = () => setPlannerTick((n) => n + 1);
    window.addEventListener(CONTRACTOR_PLANNER_UPDATED_EVENT, bump);
    window.addEventListener("trassa-profile-saved", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener(CONTRACTOR_PLANNER_UPDATED_EVENT, bump);
      window.removeEventListener("trassa-profile-saved", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  const plannerItems = useMemo(() => {
    void plannerTick;
    return listUpcomingPlannerEntries(emailNorm, 5).map(plannerEntryToPanelItem);
  }, [emailNorm, plannerTick]);

  const eventItems: CabinetV2EventItem[] = useMemo(
    () =>
      contractorUpcomingEvents
        .map((ev) => {
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
    [contractorUpcomingEvents, normalizedSearch]
  );

  const radorDeadlineRows = useMemo(
    () =>
      buildRadorFormDeadlineRows({
        emailNorm,
        templates: assignedTemplates,
        submissions: formSubmissions,
      }),
    [emailNorm, assignedTemplates, formSubmissions]
  );

  const heroPrimaryAction = useMemo(() => {
    if (formsUnread > 0) {
      return {
        label: `Заполнить таблицы (${formsUnread})`,
        onClick: () => navigate("/page4/forms"),
      };
    }
    if (recommendationsUnread > 0) {
      return {
        label: `Открыть подборки (${recommendationsUnread})`,
        onClick: () => navigate("/page4/recommendations"),
      };
    }
    return undefined;
  }, [formsUnread, recommendationsUnread, navigate]);

  const openPlannerDay = useCallback(
    (dateKey: string) => {
      navigate(`/page4/planner?day=${dateKey}`);
    },
    [navigate]
  );

  return (
    <>
      <div className="cabinet-v2-dashboard__hero-row">
        <CabinetV2Hero
          heroClassName={cn.hero}
          heroStyle={contractorHeroCardStyle}
          tag="Письма, практика и обучение"
          heroTitle={contractorHeroTitle || undefined}
          heroEmpty="Укажите наименование организации в настройках профиля — оно появится здесь."
          roleIconSrc={ROLE_ICON_CONTRACTOR}
          heroButtonStyle={layoutStyles.heroButton}
          primaryAction={heroPrimaryAction}
        />
        <div className="cabinet-v2-dashboard__widgets cabinet-v2-dashboard__widgets--planner">
          <ContractorPlannerPanel
            compact
            panelClassName={cn.recentPanel}
            items={plannerItems}
            onManage={() => navigate("/page4/planner")}
            onToggleDone={(item) => {
              if (!emailNorm) return;
              togglePlannerEntryDone(emailNorm, item.id);
            }}
            onItemClick={(item) => openPlannerDay(item.dueAt.slice(0, 10))}
          />
          <ContractorRadorDeadlinesTable
            compact
            panelClassName={cn.recentPanel}
            rows={radorDeadlineRows}
            onManage={() => navigate("/page4/forms")}
            onRowClick={() => navigate("/page4/forms")}
          />
        </div>
      </div>
      <CabinetV2EventsPanel
        panelId={CONTRACTOR_UPCOMING_EVENTS_PANEL_ID}
        panelClassName={cn.recentPanel}
        titleClassName={cn.recentTitle}
        title="Ближайшие мероприятия"
        hint="События для студентов и школьников из календаря РАДОР и АДО."
        emptyText="Пока нет запланированных мероприятий. Когда ассоциации добавят события, они появятся здесь."
        items={eventItems}
        defaultExpanded={eventItems.length > 0}
      />
    </>
  );
}

export default memo(ContractorCabinetDashboardV2);
