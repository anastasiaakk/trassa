import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";

function SchoolMaterialsPage({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles } = ctx;
  const navigate = useNavigate();

  return (
    <main style={layoutStyles.main}>
      <aside style={layoutStyles.aside}>
        <div style={layoutStyles.sideCard}>
          <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>Раздел школьника</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Материалы и задания</div>
          <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>
            Отдельная страница учебных материалов, задач и практических заданий по дорожной тематике.
          </div>
        </div>
      </aside>

      <section style={layoutStyles.section}>
        <div style={{ ...layoutStyles.recentPanel, padding: 24 }}>
          <div style={layoutStyles.recentTitle}>Материалы и задания</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
            Учебные блоки и задания для подготовки к отраслевым мероприятиям.
          </div>

          {[
            {
              title: "Тема: Безопасность дорожного движения",
              meta: "Учебный модуль",
              text: "Изучите материалы и ответьте на контрольные вопросы по теме БДД.",
            },
            {
              title: "Практическое задание: анализ дорожной ситуации",
              meta: "Задание · до 30 апреля",
              text: "Подготовьте краткий разбор предложенного кейса и загрузите ответ в систему.",
            },
            {
              title: "Дополнительные материалы",
              meta: "Подборка",
              text: "Презентации, методички и видеоматериалы от ассоциаций РАДОР и АДО.",
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

const CabinetSchoolMaterials = () => {
  const render = useCallback((ctx: CabinetChromeContext) => <SchoolMaterialsPage ctx={ctx} />, []);
  return <CabinetChromeLayout cabinetPath="/cabinet-school">{render}</CabinetChromeLayout>;
};

export default memo(CabinetSchoolMaterials);

