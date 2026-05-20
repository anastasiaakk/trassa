import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";

function SpoPortfolioPage({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles } = ctx;
  const navigate = useNavigate();

  return (
    <main style={layoutStyles.main}>
      <aside style={layoutStyles.aside}>
        <div style={layoutStyles.sideCard}>
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

      <section style={layoutStyles.section}>
        <div style={{ ...layoutStyles.recentPanel, padding: 24 }}>
          <div style={layoutStyles.recentTitle}>Портфолио достижений</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
            Отдельная страница портфолио студента СПО/ВО.
          </div>

          {[
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
          ].map((item) => (
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
      </section>
    </main>
  );
}

const CabinetSpoPortfolio = () => {
  const render = useCallback((ctx: CabinetChromeContext) => <SpoPortfolioPage ctx={ctx} />, []);
  return <CabinetChromeLayout cabinetPath="/cabinet-spo">{render}</CabinetChromeLayout>;
};

export default memo(CabinetSpoPortfolio);

