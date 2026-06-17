import { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import CabinetV2SubpageFrame from "../components/cabinet-v2/CabinetV2SubpageFrame";
import { matchesCabinetSearch } from "../utils/cabinetSearchFilter";

const MESSAGE_ITEMS = [
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
] as const;

export function SchoolMessagesPage({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, cn, normalizedSearch, isV2 } = ctx;
  const navigate = useNavigate();
  const items = useMemo(
    () =>
      MESSAGE_ITEMS.filter((item) =>
        matchesCabinetSearch(normalizedSearch, item.title, item.meta, item.text)
      ),
    [normalizedSearch]
  );

  const list = (
    <div className={cn.recentPanel} style={{ ...layoutStyles.recentPanel, padding: 24 }}>
      {!isV2 ? (
        <>
          <div className={cn.recentTitle} style={layoutStyles.recentTitle}>
            Объявления и письма
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
            Входящие сообщения и объявления по школьным активностям и проектам.
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
        title="Объявления и письма"
        lede="Входящие сообщения и объявления по школьным активностям и проектам."
      >
        {list}
      </CabinetV2SubpageFrame>
    );
  }

  return (
    <main className={cn.main} style={layoutStyles.main}>
      <aside className={cn.aside} style={layoutStyles.aside}>
        <div className={cn.sideCard} style={layoutStyles.sideCard}>
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

      <section style={layoutStyles.section}>{list}</section>
    </main>
  );
}

const CabinetSchoolMessages = () => {
  const render = useCallback((ctx: CabinetChromeContext) => <SchoolMessagesPage ctx={ctx} />, []);
  return <CabinetChromeLayout cabinetPath="/cabinet-school">{render}</CabinetChromeLayout>;
};

export default memo(CabinetSchoolMessages);

