/** Семантические алиасы → canonical path (без hash). */
export const ROUTE_PATH_ALIASES: Record<string, string> = {
  "/role-select": "/page3",
  "/map": "/services",
  "/cabinet-contractor": "/page4",
  "/cabinet-association-rador": "/page5",
  "/cabinet-association-ado": "/page6",
};

export function normalizeRoutePath(pathname: string): string {
  const base = pathname.replace(/\/$/, "") || "/";
  if (ROUTE_PATH_ALIASES[base]) return ROUTE_PATH_ALIASES[base];
  for (const [from, to] of Object.entries(ROUTE_PATH_ALIASES)) {
    if (base.startsWith(`${from}/`)) {
      return `${to}${base.slice(from.length)}`;
    }
  }
  return base;
}

export type PageMeta = {
  title: string;
  metaDescription: string;
};

export function resolvePageMeta(pathname: string): PageMeta {
  const path = normalizeRoutePath(pathname);

  switch (path) {
    case "/":
      return {
        title: "Страница 1 — ТрассА",
        metaDescription:
          "Комплексный портал для управления персоналом, развития лучших практик в дорожной деятельности",
      };
    case "/services":
      return {
        title: "Страница 2 — Карта подрядчиков — ТрассА",
        metaDescription: "Интерактивная карта подрядчиков по городам России",
      };
    case "/page3":
    case "/role-select":
      return {
        title: "Выбор роли — ТрассА",
        metaDescription: "Выбор роли пользователя для входа в систему",
      };
    case "/cabinet-school":
      return {
        title: "Личный кабинет — Школа — ТрассА",
        metaDescription: "Кабинет обучающегося",
      };
    case "/cabinet-school/calendar":
      return {
        title: "Календарь активностей — Школа — ТрассА",
        metaDescription: "Отдельная страница календаря мероприятий для школьников",
      };
    case "/cabinet-school/messages":
      return {
        title: "Объявления и письма — Школа — ТрассА",
        metaDescription: "Отдельная страница объявлений и писем для школьников",
      };
    case "/cabinet-school/materials":
      return {
        title: "Материалы и задания — Школа — ТрассА",
        metaDescription: "Отдельная страница материалов и заданий для школьников",
      };
    case "/cabinet-spo":
      return {
        title: "Личный кабинет — СПО и ВО — ТрассА",
        metaDescription: "Кабинет студента СПО и вуза",
      };
    case "/page4":
      return {
        title: "Кабинет подрядчика — ТрассА",
        metaDescription: "Рабочий контур подрядчика для управления письмами и задачами",
      };
    case "/page4/proforientation":
      return {
        title: "Профориентация и кадры — Подрядчик — ТрассА",
        metaDescription: "Результаты профориентационного теста и подбор кадров",
      };
    case "/page4/planner":
      return {
        title: "Планнер — Подрядчик — ТрассА",
        metaDescription: "Личный календарь задач подрядчика",
      };
    case "/page5":
      return {
        title: "Кабинет ассоциации — РАДОР — ТрассА",
        metaDescription:
          "Рабочий контур ассоциации РАДОР для управления заявками, документами и мероприятиями",
      };
    case "/page5/proforientation":
      return {
        title: "Профориентация — РАДОР — ТрассА",
        metaDescription: "Результаты профориентационного теста обучающихся",
      };
    case "/page6":
      return {
        title: "Кабинет ассоциации — АДО — ТрассА",
        metaDescription:
          "Рабочий контур АДО для управления заявками, документами и мероприятиями",
      };
    case "/page6/proforientation":
      return {
        title: "Профориентация — АДО — ТрассА",
        metaDescription: "Результаты профориентационного теста обучающихся",
      };
    case "/profile":
      return {
        title: "Настройки профиля — ТрассА",
        metaDescription: "Личные данные, контакты и уведомления",
      };
    case "/download":
      return {
        title: "Скачать приложение — ТрассА",
        metaDescription: "Установка десктопной версии портала для Windows",
      };
    case "/privacy":
      return {
        title: "Политика конфиденциальности — ТрассА",
        metaDescription: "Обработка персональных данных",
      };
    default:
      return {
        title: "ТрассА",
        metaDescription: "",
      };
  }
}
