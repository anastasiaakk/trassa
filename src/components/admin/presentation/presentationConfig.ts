import logoImg from "/entry-splash-logo.png";
import roleSchool from "../../../assets/школьник.png";
import roleStudent from "../../../assets/студент.png";
import roleContractor from "../../../assets/подрядчик.png";
import roleAdmin from "../../../assets/админ.png";

export { logoImg };

export type SlideId = "cover" | "ecosystem" | "modules" | "devices" | "flows" | "metrics" | "impact" | "qr";

export type PresentationStats = {
  organizations: number;
  users: number;
  specializations: number;
  mapEntries: number;
};

export const SLIDES: { id: SlideId; label: string; exportName: string; desc: string }[] = [
  { id: "cover", label: "Обложка", exportName: "trassa-oblozhka", desc: "Hero-слайд с миссией и ключевыми цифрами" },
  { id: "ecosystem", label: "Экосистема", exportName: "trassa-ekosistema", desc: "Участники и ядро с картой России" },
  { id: "modules", label: "Сервисы", exportName: "trassa-servisy", desc: "Модули платформы и принципы работы" },
  {
    id: "devices",
    label: "Устройства",
    exportName: "trassa-ustroystva",
    desc: "Портал на смартфоне, планшете и компьютере",
  },
  { id: "flows", label: "Потоки", exportName: "trassa-potoki", desc: "Цикл, обмен ролями и сквозные потоки" },
  { id: "metrics", label: "Цифры", exportName: "trassa-cifry", desc: "KPI и географический охват" },
  { id: "impact", label: "Ценность", exportName: "trassa-cennost", desc: "Маршрут развития и ценность для стейкхолдеров" },
  {
    id: "qr",
    label: "QR-код",
    exportName: "trassa-qr",
    desc: "Сканируйте и откройте портал trassa.duckdns.org",
  },
];

export const SERVICE_ITEMS = [
  { num: 1, title: "Профориентация", text: "Карта профессий, олимпиады, выбор направления", icon: "route" as const },
  { num: 2, title: "Кабинеты обучающихся", text: "Портфолио, программы, документы и сервисы", icon: "people" as const },
  { num: 3, title: "Практика и работа", text: "Стажировки, вакансии, карьерный трек", icon: "hardhat" as const },
  { num: 4, title: "Карта подрядчиков", text: "География организаций и региональный охват", icon: "chart" as const },
  { num: 5, title: "Аналитика спроса", text: "Прогнозы, отчёты, данные для решений", icon: "chart" as const, accent: true },
  { num: 6, title: "Документооборот", text: "Договоры, согласования, электронные сервисы", icon: "docs" as const },
];

export const METRIC_FEATURES = [
  { title: "Единый портал", text: "Кабинеты, карта, документы и аналитика в одном контуре" },
  { title: "Региональный охват", text: "Карта подрядчиков и организаций дорожной отрасли" },
  { title: "Сквозной маршрут", text: "От профориентации школьника до трудоустройства" },
  { title: "Управление кадрами", text: "Координация вузов, работодателей и госзаказчика" },
];

export const METRIC_MODULES = [
  "Профориентация и олимпиады",
  "Кабинеты обучающихся",
  "Практики и вакансии",
  "Карта подрядчиков",
  "Аналитика спроса",
  "Электронный документооборот",
];

export const DEVICE_FEATURES = [
  { icon: "responsive", title: "Адаптивный интерфейс", text: "Кабинеты, карта и сервисы подстраиваются под экран" },
  { icon: "sync", title: "Единый вход", text: "trassa.duckdns.org — один аккаунт на всех устройствах" },
  { icon: "full", title: "Полный функционал", text: "Документы, аналитика и карта доступны с телефона и ПК" },
] as const;

export const PLATFORM_CHANNELS = ["Браузер на ПК", "Safari · Chrome", "Планшет · Android", "Единый кабинет"];

export const PORTAL_DEVICE_SHOTS = {
  phone: "/presentation/devices/portal-phone.jpg",
  tablet: "/presentation/devices/portal-tablet.jpg",
  desktop: "/presentation/devices/portal-desktop.jpg",
} as const;

export const PORTAL_QR_URL = "https://trassa.duckdns.org/#/";

export const QR_STEPS = [
  { num: 1, title: "Наведите камеру", text: "Откройте камеру iPhone или Android" },
  { num: 2, title: "Сканируйте QR-код", text: "Нажмите на уведомление со ссылкой" },
  { num: 3, title: "Откройте портал", text: "trassa.duckdns.org — без установки приложения" },
] as const;

export const QR_LINKS = [
  { label: "Главная", path: "#/" },
  { label: "Карта подрядчиков", path: "#/services" },
  { label: "Вход", path: "#/page3" },
] as const;

export const LEFT_ACTORS = [
  {
    id: "school",
    num: 1,
    title: "Школьник",
    text: "Профориентация, карта профессий, олимпиады",
    photo: roleSchool,
  },
  {
    id: "student",
    num: 2,
    title: "Студент",
    text: "Кабинет, практика, вакансии, карьерный маршрут",
    photo: roleStudent,
  },
] as const;

export const RIGHT_ACTORS = [
  {
    id: "edu",
    num: 3,
    title: "Образовательная организация",
    text: "Программы, контингент, аналитика спроса",
    photo: roleAdmin,
  },
  {
    id: "employer",
    num: 4,
    title: "Работодатель",
    text: "Заявки, наставничество, обратная связь",
    photo: roleContractor,
  },
] as const;

export const GOV_ACTOR = {
  id: "gov",
  num: 5,
  title: "Госзаказчик и ТОУАД",
  text: "Мониторинг потребностей, региональная аналитика",
  photo: roleAdmin,
};

export const CORE_SERVICES = ["Кабинеты", "Карта подрядчиков", "Аналитика", "Документооборот"];

export const CAREER = [
  { label: "Школа", sub: "Выбор профессии" },
  { label: "ВУЗ / колледж", sub: "Обучение и развитие" },
  { label: "Практика и работа", sub: "Опыт и карьерный рост" },
  { label: "Государство и регионы", sub: "Планирование отрасли" },
];

export const PRINCIPLES = [
  {
    title: "Единый контур",
    text: "Все участники в одном цифровом пространстве",
    icon: "orbit",
  },
  {
    title: "Сквозной маршрут",
    text: "От профориентации до трудоустройства",
    icon: "route",
  },
  {
    title: "Данные для решений",
    text: "Региональная аналитика кадровых потребностей",
    icon: "chart",
  },
];

export const INTERACTIONS = [
  {
    roleKey: "school",
    role: "Школьник",
    photo: roleSchool,
    gives: "Интересы, результаты олимпиад, выбор направления",
    gets: "Карта профессий, маршрут, рекомендации программ",
  },
  {
    roleKey: "student",
    role: "Студент",
    photo: roleStudent,
    gives: "Портфолио, заявки на практику, обратная связь",
    gets: "Кабинет, вакансии, наставничество, карьерный трек",
  },
  {
    roleKey: "edu",
    role: "Образовательная организация",
    photo: roleAdmin,
    gives: "Программы, контингент, отчётность",
    gets: "Аналитика спроса, связь с работодателями",
  },
  {
    roleKey: "contractor",
    role: "Работодатель",
    photo: roleContractor,
    gives: "Вакансии, стажировки, требования к компетенциям",
    gets: "Кандидаты, координация практик, обратная связь",
  },
  {
    roleKey: "gov",
    role: "Госзаказчик и ТОУАД",
    roleShort: "ТОУАД",
    photo: roleAdmin,
    gives: "Потребности отрасли, региональные задачи",
    gets: "Мониторинг кадров, прогнозы, отчёты по регионам",
  },
] as const;

export const DATA_PIPES = [
  {
    title: "Обучение и профориентация",
    from: "Школа · ВУЗ",
    to: "Платформа",
    result: "Профиль компетенций и карьерный маршрут",
  },
  {
    title: "Практика и трудоустройство",
    from: "Студент · Работодатель",
    to: "Платформа",
    result: "Согласованные стажировки и кадровый резерв",
  },
  {
    title: "Планирование отрасли",
    from: "Платформа · Аналитика",
    to: "Госзаказчик",
    result: "Региональные отчёты и прогноз потребностей",
  },
];

export const CYCLE_STEPS = [
  { num: 1, label: "Профориентация", sub: "Школа" },
  { num: 2, label: "Обучение", sub: "ВУЗ / СПО" },
  { num: 3, label: "Практика", sub: "Работодатель" },
  { num: 4, label: "Аналитика", sub: "Регионы" },
];

export const VALUE_ITEMS = [
  { title: "Для участников", text: "Единый кабинет, прозрачный маршрут, доступ к практике и вакансиям" },
  { title: "Для отрасли", text: "Согласованность вузов, работодателей и регионов на одной платформе" },
  {
    title: "Для государства",
    text: "Данные для планирования кадров и мониторинга потребностей регионов",
    lead: true,
  },
] as const;

export const ZOOM_MIN = 0.42;
export const ZOOM_MAX = 1;
export const ZOOM_STEP = 0.06;
export const SLIDE_W = 1600;
