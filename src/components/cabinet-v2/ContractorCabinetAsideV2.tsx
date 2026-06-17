import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { CabinetChromeClassNames } from "../../design-system/cabinetChromeClasses";
import { CabinetV2AsideNav, CabinetV2AsideTile } from "./CabinetV2Primitives";

type Props = {
  cn?: CabinetChromeClassNames;
  active: "home" | "proforientation" | "documents" | "teams" | "recommendations" | "forms";
  recommendationsUnread?: number;
  formsUnread?: number;
};

function ContractorCabinetAsideV2({
  cn,
  active,
  recommendationsUnread = 0,
  formsUnread = 0,
}: Props) {
  const navigate = useNavigate();

  return (
    <aside className={cx("cabinet-v2-aside", cn?.aside)}>
      <CabinetV2AsideNav
        active={active === "home"}
        label="Главная"
        badge="2"
        showHomeIcon
        onClick={() => navigate("/page4")}
      />
      <CabinetV2AsideTile
        active={active === "recommendations"}
        title="Студенты"
        text="Рекомендованные кадры в вашей спецификации"
        badge={recommendationsUnread > 0 ? (recommendationsUnread > 99 ? "99+" : recommendationsUnread) : undefined}
        onClick={() => navigate("/page4/recommendations")}
      />
      <CabinetV2AsideTile
        active={active === "forms"}
        title="Заполнение таблиц"
        text="Шаблоны от администратора"
        badge={formsUnread > 0 ? (formsUnread > 99 ? "99+" : formsUnread) : undefined}
        onClick={() => navigate("/page4/forms")}
      />
      <CabinetV2AsideTile
        active={active === "teams"}
        title="Студенческие команды"
        text="Материалы ассоциаций РАДОР и АДО"
        onClick={() => navigate("/page4/teams")}
      />
      <CabinetV2AsideTile
        active={active === "documents"}
        title="Шаблоны ассоциаций"
        text="Заполнить и отправить ответ"
        onClick={() => navigate("/page4/documents")}
      />
      <CabinetV2AsideTile
        active={active === "proforientation"}
        title="Профориентация"
        text="Результаты теста и подбор кадров"
        onClick={() => navigate("/page4/proforientation")}
      />
    </aside>
  );
}

export default memo(ContractorCabinetAsideV2);
