import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";

function SchoolMessagesPage({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles } = ctx;
  const navigate = useNavigate();

  return (
    <main style={layoutStyles.main}>
      <aside style={layoutStyles.aside}>
        <div style={layoutStyles.sideCard}>
          <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>Раздел школьника</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Объявления и письма</div>
          <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>
            Отдельная страница для входящих объявлений, писем и уведомлений от ассоциаций.
          </div>
        </div>
        <button
          type="button"
          className="softtouch-plaque"
          onClick={() => navigate("/cabinet-school")}
          style={layoutStyles.sideBlock}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Вернуться в кабинет</div>
          <div style={{ fontSize: 13, color: styles.plaqueButtonMuted, lineHeight: 1.5 }}>
            Открыть главную страницу школьника.
          </div>
        </button>
      </aside>

      <section style={layoutStyles.section}>
        <div style={{ ...layoutStyles.recentPanel, padding: 24 }}>
          <div style={layoutStyles.recentTitle}>Объявления и письма</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
            Входящие сообщения и объявления по школьным активностям и проектам.
          </div>

          {[
            {
              title: "Приглашение на отраслевую олимпиаду",
              meta: "Объявление · 23 апреля",
              text: "Открыта регистрация школьных команд на региональный этап отраслевой олимпиады.",
            },
            {
              title: "Письмо от координатора программы",
              meta: "Письмо · 21 апреля",
              text: "Подтверждены даты проведения очных встреч и список рекомендованных материалов.",
            },
            {
              title: "Обновление по проектной неделе",
              meta: "Уведомление · 18 апреля",
              text: "Опубликованы новые задания и критерии оценки итоговых презентаций.",
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

const CabinetSchoolMessages = () => {
  const render = useCallback((ctx: CabinetChromeContext) => <SchoolMessagesPage ctx={ctx} />, []);
  return <CabinetChromeLayout cabinetPath="/cabinet-school">{render}</CabinetChromeLayout>;
};

export default memo(CabinetSchoolMessages);

