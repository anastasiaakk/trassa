import { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import CabinetV2SubpageFrame from "../components/cabinet-v2/CabinetV2SubpageFrame";
import { matchesCabinetSearch } from "../utils/cabinetSearchFilter";

const PORTFOLIO_ITEMS = [
  {
    title: "Кейс: цифровой мониторинг дорожных работ",
    meta: "Проект · март 2026",
    text: "Подготовлен аналитический отчёт с визуализацией динамики выполнения работ.",
  },
  {
    title: "Участие в конференции РАДОР",
    meta: "Мероприятие · апрель 2026",
    text: "Доклад по теме координации подрядчиков и контроля сроков выполнения задач.",
  },
  {
    title: "Практика в региональном дорожном ведомстве",
    meta: "Практика · май 2026",
    text: "Выполнены практические задания по документообороту и сопровождению заявок.",
  },
] as const;

export function SpoPortfolioPage({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, cn, normalizedSearch, isV2 } = ctx;
  const navigate = useNavigate();
  const items = useMemo(
    () =>
      PORTFOLIO_ITEMS.filter((item) =>
        matchesCabinetSearch(normalizedSearch, item.title, item.meta, item.text)
      ),
    [normalizedSearch]
  );

  const list = (
    <div className={cn.recentPanel} style={{ ...layoutStyles.recentPanel, padding: 24 }}>
      {!isV2 ? (
        <>
          <div className={cn.recentTitle} style={layoutStyles.recentTitle}>
            Портфолио достижений
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
            Отдельная страница портфолио студента СПО/ВО.
          </div>
        </>
      ) : null}
      {items.map((item) => (
        <div
          key={item.title}
          style={{
            padding: 18,
            borderRadius: 24,
            background: styles.sectionBg,
            color: styles.text,
            boxShadow: styles.insetShadow,
            textAlign: "left",
            marginTop: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>{item.title}</div>
          <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
            {item.meta}
          </div>
          <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
            {item.text}
          </div>
        </div>
      ))}
    </div>
  );

  if (isV2) {
    return (
      <CabinetV2SubpageFrame
        ctx={ctx}
        title="Портфолио достижений"
        lede="Проекты, кейсы и участие в отраслевых мероприятиях."
      >
        {list}
      </CabinetV2SubpageFrame>
    );
  }

  return (
    <main className={cn.main} style={layoutStyles.main}>
      <aside className={cn.aside} style={layoutStyles.aside}>
        <div className={cn.sideCard} style={layoutStyles.sideCard}>
          <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>Раздел студента</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Портфолио достижений</div>
          <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>
            Собирайте проекты, кейсы и участие в отраслевых мероприятиях в одном месте.
          </div>
        </div>
        <button
          type="button"
          className="softtouch-plaque"
          onClick={() => navigate("/cabinet-spo")}
          style={layoutStyles.sideBlock}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Вернуться в кабинет</div>
          <div style={{ fontSize: 13, color: styles.plaqueButtonMuted, lineHeight: 1.5 }}>
            Открыть главную страницу студента.
          </div>
        </button>
      </aside>
      <section style={layoutStyles.section}>{list}</section>
    </main>
  );
}

const CabinetSpoPortfolio = () => {
  const render = useCallback((ctx: CabinetChromeContext) => <SpoPortfolioPage ctx={ctx} />, []);
  return <CabinetChromeLayout cabinetPath="/cabinet-spo">{render}</CabinetChromeLayout>;
};

export default memo(CabinetSpoPortfolio);
