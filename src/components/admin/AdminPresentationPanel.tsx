import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { fetchAdminStats } from "../../api/adminStatsApi";
import logoImg from "/entry-splash-logo.png";
import roleSchool from "../../assets/школьник.png";
import roleStudent from "../../assets/студент.png";
import roleContractor from "../../assets/подрядчик.png";
import roleAdmin from "../../assets/админ.png";
import { loadContractorOrganizations } from "../../utils/contractorOrganizations";
import {
  loadMapSubjectOrganizations,
  type MapSubjectOrganization,
} from "../../utils/mapSubjectOrganizations";
import { loadActiveSpecializations } from "../../utils/specializationsStorage";
import { exportElementAsImage, waitForRender, type ExportImageFormat } from "../../utils/exportPresentationImage";
import "../../design-system/portal-v2/admin-presentation.css";
import "../../design-system/portal-v2/admin-presentation-deck.css";
import "../../design-system/portal-v2/admin-presentation-projector.css";

import type { MapPreviewSize } from "./PresentationRussiaMap";

const PresentationRussiaMap = lazy(() => import("./PresentationRussiaMap"));

function MapPreview({
  className,
  size = "md",
  activeSubjectNames,
}: {
  className?: string;
  size?: MapPreviewSize;
  activeSubjectNames: string[];
}) {
  return (
    <Suspense
      fallback={
        <div
          className={`presentation-russia-map presentation-russia-map--fallback presentation-russia-map--${size} ${className ?? ""}`.trim()}
        >
          <span>Карта…</span>
        </div>
      }
    >
      <PresentationRussiaMap className={className} size={size} activeSubjectNames={activeSubjectNames} />
    </Suspense>
  );
}

function formatStat(n: number): string {
  return n.toLocaleString("ru-RU");
}

type PresentationStats = {
  organizations: number;
  users: number;
  specializations: number;
  mapEntries: number;
};

type SlideId = "cover" | "ecosystem" | "modules" | "devices" | "flows" | "metrics" | "impact" | "qr";

type Props = {
  glassHintClass?: string;
  errorClass?: string;
  btnPrimaryClass?: string;
  btnSecondaryClass?: string;
};

const SLIDES: { id: SlideId; label: string; exportName: string; desc: string }[] = [
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

const SERVICE_ITEMS = [
  { num: 1, title: "Профориентация", text: "Карта профессий, олимпиады, выбор направления", icon: "route" as const },
  { num: 2, title: "Кабинеты обучающихся", text: "Портфолио, программы, документы и сервисы", icon: "people" as const },
  { num: 3, title: "Практика и работа", text: "Стажировки, вакансии, карьерный трек", icon: "hardhat" as const },
  { num: 4, title: "Карта подрядчиков", text: "География организаций и региональный охват", icon: "chart" as const },
  { num: 5, title: "Аналитика спроса", text: "Прогнозы, отчёты, данные для решений", icon: "chart" as const, accent: true },
  { num: 6, title: "Документооборот", text: "Договоры, согласования, электронные сервисы", icon: "docs" as const },
];

const METRIC_FEATURES = [
  { title: "Единый портал", text: "Кабинеты, карта, документы и аналитика в одном контуре" },
  { title: "Региональный охват", text: "Карта подрядчиков и организаций дорожной отрасли" },
  { title: "Сквозной маршрут", text: "От профориентации школьника до трудоустройства" },
  { title: "Управление кадрами", text: "Координация вузов, работодателей и госзаказчика" },
];

const METRIC_MODULES = [
  "Профориентация и олимпиады",
  "Кабинеты обучающихся",
  "Практики и вакансии",
  "Карта подрядчиков",
  "Аналитика спроса",
  "Электронный документооборот",
];

const DEVICE_FEATURES = [
  { icon: "responsive", title: "Адаптивный интерфейс", text: "Кабинеты, карта и сервисы подстраиваются под экран" },
  { icon: "sync", title: "Единый вход", text: "trassa.duckdns.org — один аккаунт на всех устройствах" },
  { icon: "full", title: "Полный функционал", text: "Документы, аналитика и карта доступны с телефона и ПК" },
] as const;

const PLATFORM_CHANNELS = ["Браузер на ПК", "Safari · Chrome", "Планшет · Android", "Единый кабинет"];

const PORTAL_DEVICE_SHOTS = {
  phone: "/presentation/devices/portal-phone.jpg",
  tablet: "/presentation/devices/portal-tablet.jpg",
  desktop: "/presentation/devices/portal-desktop.jpg",
} as const;

const PORTAL_QR_URL = "https://trassa.duckdns.org/#/";

const QR_STEPS = [
  { num: 1, title: "Наведите камеру", text: "Откройте камеру iPhone или Android" },
  { num: 2, title: "Сканируйте QR-код", text: "Нажмите на уведомление со ссылкой" },
  { num: 3, title: "Откройте портал", text: "trassa.duckdns.org — без установки приложения" },
] as const;

const QR_LINKS = [
  { label: "Главная", path: "#/" },
  { label: "Карта подрядчиков", path: "#/services" },
  { label: "Вход", path: "#/page3" },
] as const;

const LEFT_ACTORS = [
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

const RIGHT_ACTORS = [
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

const GOV_ACTOR = {
  id: "gov",
  num: 5,
  title: "Госзаказчик и ТОУАД",
  text: "Мониторинг потребностей, региональная аналитика",
  photo: roleAdmin,
};

const CORE_SERVICES = ["Кабинеты", "Карта подрядчиков", "Аналитика", "Документооборот"];

const CAREER = [
  { label: "Школа", sub: "Выбор профессии" },
  { label: "ВУЗ / колледж", sub: "Обучение и развитие" },
  { label: "Практика и работа", sub: "Опыт и карьерный рост" },
  { label: "Государство и регионы", sub: "Планирование отрасли" },
];

const PRINCIPLES = [
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

const INTERACTIONS = [
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

const DATA_PIPES = [
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

const CYCLE_STEPS = [
  { num: 1, label: "Профориентация", sub: "Школа" },
  { num: 2, label: "Обучение", sub: "ВУЗ / СПО" },
  { num: 3, label: "Практика", sub: "Работодатель" },
  { num: 4, label: "Аналитика", sub: "Регионы" },
];

function ModuleIcon({ kind }: { kind: string }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true as const };
  if (kind === "hardhat") {
    return (
      <svg {...common}>
        <path
          d="M4 14v3h16v-3M12 3L4 8v2h16V8l-8-5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "people") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" fill="currentColor" />
        <circle cx="17" cy="9" r="2.5" fill="currentColor" opacity="0.85" />
        <path
          d="M3 20a5 5 0 0110 0M13 20a4 4 0 017 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "docs") {
    return (
      <svg {...common}>
        <path
          d="M8 3h7l5 5v13H8V3zm7 0v5h5M10 12h8M10 16h8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "route") {
    return (
      <svg {...common}>
        <path
          d="M4 18c4-8 8-12 16-12M16 6l3-1-1 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="18" r="2" fill="currentColor" />
        <circle cx="20" cy="6" r="2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 18V8h4v10H5zm5-6v6h4V12h-4zm5-8v14h4V4h-4z" fill="currentColor" />
    </svg>
  );
}

function PrincipleIcon({ kind }: { kind: string }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true as const, className: "tpi__principle-icon" };
  if (kind === "orbit") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <circle cx="19" cy="16" r="1.5" fill="currentColor" />
        <circle cx="5" cy="16" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "route") {
    return (
      <svg {...common}>
        <path
          d="M4 18c4-8 8-12 16-12M16 6l3-1-1 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="18" r="2" fill="currentColor" />
        <circle cx="20" cy="6" r="2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 18V8h4v10H5zm5-6v6h4V12h-4zm5-8v14h4V4h-4z" fill="currentColor" />
    </svg>
  );
}

function ActorCard({
  title,
  text,
  photo,
  id,
  num,
  row = false,
  compact = false,
}: {
  title: string;
  text: string;
  photo: string;
  id: string;
  num: number;
  row?: boolean;
  compact?: boolean;
}) {
  return (
    <article
      className={`tpi__actor tpr-actor${compact ? " tpr-actor--compact" : ""}${row ? " tpi__actor--row" : ""} tpi__actor--${id}`}
    >
      <span className="tpi__actor-num">{num}</span>
      <div className="tpi__actor-icon">
        <img src={photo} alt="" className={`tpi__role-photo tpi__role-photo--${id}`} />
      </div>
      <div className="tpi__actor-body">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function GovStrip() {
  return (
    <div className="tpr-gov-strip">
      <span className="tpr-gov-strip__num">{GOV_ACTOR.num}</span>
      <div className="tpr-gov-strip__icon">
        <img src={GOV_ACTOR.photo} alt="" className="tpi__role-photo tpi__role-photo--gov" />
      </div>
      <div className="tpr-gov-strip__body">
        <strong>{GOV_ACTOR.title}</strong>
        <span>{GOV_ACTOR.text}</span>
      </div>
      <div className="tpr-gov-strip__tags" aria-hidden="true">
        <span>Регионы</span>
        <span>Аналитика</span>
        <span>Мониторинг</span>
      </div>
    </div>
  );
}

function BrandLogoMark({ className }: { className?: string }) {
  return (
    <span
      className={`tpr-brand-logo-mark${className ? ` ${className}` : ""}`}
      style={{
        WebkitMaskImage: `url(${logoImg})`,
        maskImage: `url(${logoImg})`,
      }}
      aria-hidden
    />
  );
}

function DeckBg() {
  return (
    <>
      <div className="tpr-bg" aria-hidden="true" />
      <div className="tpr-orb tpr-orb--a" aria-hidden="true" />
      <div className="tpr-orb tpr-orb--b" aria-hidden="true" />
    </>
  );
}

function slideIndexOf(id: SlideId): number {
  return SLIDES.findIndex((s) => s.id === id);
}

function DeckTop({
  slideId,
  subtitle,
  compact = false,
}: {
  slideId: SlideId;
  subtitle?: string;
  compact?: boolean;
}) {
  const idx = slideIndexOf(slideId);
  const slide = SLIDES[idx];
  return (
    <header className={`tpr-top${compact ? " tpr-top--compact" : ""}`}>
      <div className="tpr-brand">
        <div className="tpr-logo">
          <BrandLogoMark />
        </div>
        <div>
          <p className="tpr-kicker">
            Цифровая платформа · {slide?.label ?? ""}
          </p>
          <h1 className="tpr-title">«ТрассА»</h1>
          {compact && slide?.desc ? (
            <p className="tpr-top-desc">{slide.desc}</p>
          ) : subtitle && !compact ? (
            <p className="tpr-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="tpr-top-meta">
        <span className="tpr-index">
          {idx + 1} / {SLIDES.length}
        </span>
        <span className="tpr-url">trassa.duckdns.org</span>
      </div>
      <div className="tpr-top__accent" aria-hidden="true" />
    </header>
  );
}

function DeckSlideFoot({ slideId, hint }: { slideId: SlideId; hint?: string }) {
  const idx = slideIndexOf(slideId);
  const slide = SLIDES[idx];
  return (
    <footer className="tpr-slide-foot">
      <span className="tpr-slide-foot__label">{slide?.label ?? ""}</span>
      <div className="tpr-slide-foot__center">
        {hint ? <span className="tpr-slide-foot__hint">{hint}</span> : null}
        <div className="tpr-slide-foot__progress" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <span
              key={s.id}
              className={`tpr-slide-foot__dot${i === idx ? " tpr-slide-foot__dot--active" : ""}${i < idx ? " tpr-slide-foot__dot--done" : ""}`}
            />
          ))}
        </div>
      </div>
      <span className="tpr-slide-foot__url">trassa.duckdns.org</span>
    </footer>
  );
}

function SectionHead({ label, desc }: { label: string; desc?: string }) {
  return (
    <div className="tpr-section-head">
      <p className="tpr-section-label">{label}</p>
      {desc ? <p className="tpr-section-desc">{desc}</p> : null}
    </div>
  );
}

type HeroMetric = { value: string; label: string; sub: string; lead?: boolean };

function KpiPlaque({
  value,
  label,
  sub,
  lead = false,
  index,
  compact = false,
}: HeroMetric & { index: number; compact?: boolean }) {
  return (
    <article
      className={`tpr-kpi${lead ? " tpr-kpi--lead" : ""}${compact ? " tpr-kpi--compact" : ""}`.trim()}
    >
      <span className="tpr-kpi__idx">{String(index + 1).padStart(2, "0")}</span>
      <strong className="tpr-kpi__value">{value}</strong>
      <h3 className="tpr-kpi__label">{label}</h3>
      <p className="tpr-kpi__sub">{sub}</p>
    </article>
  );
}

function SlideHeader({
  subtitle,
  slideId,
  compact = false,
}: {
  subtitle?: string;
  slideId: SlideId;
  compact?: boolean;
}) {
  return <DeckTop slideId={slideId} subtitle={subtitle} compact={compact} />;
}

type KpiItem = { value: string; line1: string; line2: string };

function CoverSlide({
  kpis,
  mapSubjects,
  updatedLabel,
}: {
  kpis: KpiItem[];
  mapSubjects: string[];
  updatedLabel: string;
}) {
  const coverStats: HeroMetric[] = [
    { value: kpis[0]?.value ?? "0", label: "Организаций", sub: "в контуре платформы", lead: true },
    { value: kpis[1]?.value ?? "0", label: "Направлений", sub: "программ обучения" },
    { value: kpis[2]?.value ?? "0", label: kpis[2]?.line1 === "пользователей" ? "Пользователей" : "Точек", sub: kpis[2]?.line2 ?? "на карте" },
  ];

  return (
    <>
      <DeckBg />
      <DeckTop slideId="cover" compact />
      <div className="tpr-cover">
        <div>
          <div className="tpr-cover__plaque">Кадры дорожной отрасли · цифровой контур</div>
          <h2 className="tpr-cover__headline">«ТрассА»</h2>
          <p className="tpr-cover__lead">
            Единое цифровое пространство — от профориентации школьника до трудоустройства,
            региональной аналитики и координации участников отрасли.
          </p>
          <div className="tpr-cover__stats">
            {coverStats.map((s, i) => (
              <KpiPlaque key={s.label} {...s} index={i} />
            ))}
          </div>
          <div className="tpr-cover__chips">
            {CORE_SERVICES.map((chip) => (
              <span key={chip} className="tpr-cover__chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="tpr-cover__visual">
          <div className="tpr-cover__glow" aria-hidden="true" />
          <div className="tpr-cover__ring tpr-cover__ring--1" aria-hidden="true" />
          <div className="tpr-cover__ring tpr-cover__ring--2" aria-hidden="true" />
          <div className="tpr-cover__map">
            <span className="tpr-map-badge">{mapSubjects.length || 0} регионов на карте</span>
            <MapPreview size="lg" activeSubjectNames={mapSubjects} />
          </div>
        </div>
      </div>
      <DeckSlideFoot slideId="cover" hint={`данные портала · ${updatedLabel}`} />
    </>
  );
}

function ModulesSlide() {
  return (
    <>
      <DeckBg />
      <SlideHeader slideId="modules" compact />
      <div className="tpr-body">
        <div className="tpr-strip">
          <span className="tpr-strip__badge">6 сервисов</span>
          <span className="tpr-strip__text">Единое ядро платформы «ТрассА» — все модули в одном контуре</span>
        </div>
        <div className="tpr-services">
          <SectionHead
            label="Платформенные модули"
            desc="Шесть сервисов в едином контуре — от профориентации до документооборота"
          />
          <div className="tpr-services-grid">
            {SERVICE_ITEMS.map((item) => (
              <article
                key={item.title}
                className={item.accent ? "tpr-service tpr-service--accent" : "tpr-service"}
              >
                <span className="tpr-service__num">{String(item.num).padStart(2, "0")}</span>
                <div className="tpr-service__icon">
                  <ModuleIcon kind={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="tpr-principles-row">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="tpr-principle-pill tpr-principle-pill--rich">
                <PrincipleIcon kind={p.icon} />
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DeckSlideFoot slideId="modules" hint="единый контур · 3 принципа" />
    </>
  );
}

function DeviceFeatureIcon({ kind }: { kind: string }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true as const };
  if (kind === "sync") {
    return (
      <svg {...common}>
        <path
          d="M12 4v3l3-3-3-3v3a7 7 0 105.2 11.8M12 20v-3l-3 3 3 3v-3a7 7 0 00-5.2-11.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "full") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 20h8M12 18v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="5" width="9" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="3" width="9" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PortalDeviceShot({ layout }: { layout: keyof typeof PORTAL_DEVICE_SHOTS }) {
  return (
    <img
      src={PORTAL_DEVICE_SHOTS[layout]}
      alt=""
      className={`tpr-device-shot tpr-device-shot--${layout}`}
      draggable={false}
      loading="eager"
      decoding="sync"
    />
  );
}

function DeviceFrame({
  kind,
  label,
  sub,
  children,
}: {
  kind: "phone" | "tablet" | "desktop";
  label: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <figure className={`tpr-device tpr-device--${kind}`}>
      <div className="tpr-device__shell">
        {kind === "phone" ? <span className="tpr-device__notch" aria-hidden="true" /> : null}
        {kind === "desktop" ? (
          <div className="tpr-device__titlebar" aria-hidden="true">
            <span />
            <span />
            <span />
            <em>«ТрассА» — браузер</em>
          </div>
        ) : null}
        <div className="tpr-device__screen">{children}</div>
        {kind === "phone" ? <span className="tpr-device__home" aria-hidden="true" /> : null}
        {kind === "desktop" ? <div className="tpr-device__stand" aria-hidden="true" /> : null}
      </div>
      <figcaption className="tpr-device__caption">
        <strong>{label}</strong>
        <span>{sub}</span>
      </figcaption>
    </figure>
  );
}

function DevicesSlide() {
  return (
    <>
      <DeckBg />
      <SlideHeader slideId="devices" compact />
      <div className="tpr-body tpr-body--devices">
        <div className="tpr-strip">
          <span className="tpr-strip__badge">3 устройства</span>
          <span className="tpr-strip__text">Один портал — смартфон, планшет и компьютер без установки приложения</span>
        </div>

        <SectionHead
          label="Доступ с любого экрана"
          desc="Скриншоты trassa.duckdns.org — главная, карта подрядчиков и мобильная версия"
        />

        <div className="tpr-devices-stage" aria-label="Портал на разных устройствах">
          <DeviceFrame kind="phone" label="Смартфон" sub="iOS · Android">
            <PortalDeviceShot layout="phone" />
          </DeviceFrame>
          <DeviceFrame kind="desktop" label="Компьютер" sub="Windows · macOS · Linux">
            <PortalDeviceShot layout="desktop" />
          </DeviceFrame>
          <DeviceFrame kind="tablet" label="Планшет" sub="iPad · Android">
            <PortalDeviceShot layout="tablet" />
          </DeviceFrame>
        </div>

        <div className="tpr-devices-foot">
          <div className="tpr-devices-features">
            {DEVICE_FEATURES.map((item, idx) => (
              <article key={item.title} className={idx === 0 ? "tpr-device-feature tpr-device-feature--lead" : "tpr-device-feature"}>
                <div className="tpr-device-feature__icon">
                  <DeviceFeatureIcon kind={item.icon} />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="tpr-devices-channels">
            {PLATFORM_CHANNELS.map((ch) => (
              <span key={ch} className="tpr-devices-channel">
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>
      <DeckSlideFoot slideId="devices" hint="веб-портал · без установки" />
    </>
  );
}

const VALUE_ITEMS = [
  { title: "Для участников", text: "Единый кабинет, прозрачный маршрут, доступ к практике и вакансиям" },
  { title: "Для отрасли", text: "Согласованность вузов, работодателей и регионов на одной платформе" },
  {
    title: "Для государства",
    text: "Данные для планирования кадров и мониторинга потребностей регионов",
    lead: true,
  },
] as const;

function ImpactSlide() {
  return (
    <>
      <DeckBg />
      <SlideHeader slideId="impact" compact />
      <div className="tpr-body">
        <div className="tpr-impact">
          <div>
            <SectionHead label="Маршрут развития" desc="От выбора профессии до планирования кадров отрасли" />
            <div className="tpr-journey">
              {CAREER.map((step, idx) => (
                <div key={step.label} className="tpr-journey__item">
                  <article
                    className={`tpr-journey-step${idx === 0 ? " tpr-journey-step--lead" : ""}${idx === CAREER.length - 1 ? " tpr-journey-step--final" : ""}`}
                  >
                    <span className="tpr-journey-step__num">{idx + 1}</span>
                    <strong>{step.label}</strong>
                    <span>{step.sub}</span>
                  </article>
                  {idx < CAREER.length - 1 ? (
                    <span className="tpr-journey__arrow" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHead label="Ценность платформы" desc="Выгода для участников, отрасли и государства" />
            <div className="tpr-value-grid">
              {VALUE_ITEMS.map((item, idx) => (
                <article
                  key={item.title}
                  className={"lead" in item && item.lead ? "tpr-value-card tpr-value-card--lead" : "tpr-value-card"}
                >
                  <span className="tpr-value-card__num">{String(idx + 1).padStart(2, "0")}</span>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="tpr-closing">
            <div className="tpr-closing__brand">
              <img src={logoImg} alt="" className="tpr-closing__logo" />
              <div>
                <strong>Квалифицированные кадры для современной дорожной отрасли</strong>
                <span>trassa.duckdns.org · цифровая платформа «ТрассА»</span>
              </div>
            </div>
            <span className="tpr-closing__cta">Единый контур</span>
          </div>
        </div>
      </div>
      <DeckSlideFoot slideId="impact" hint="ценность для участников · отрасли · государства" />
    </>
  );
}

function QrSlide() {
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(PORTAL_QR_URL, {
      width: 520,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#2B64FD", light: "#FFFFFF" },
    }).then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <DeckBg />
      <SlideHeader slideId="qr" compact />
      <div className="tpr-body tpr-body--qr">
        <div className="tpr-strip">
          <span className="tpr-strip__badge">Быстрый доступ</span>
          <span className="tpr-strip__text">Сканируйте QR — откройте цифровой портал «ТрассА» в браузере</span>
        </div>

        <div className="tpr-qr-layout">
          <div className="tpr-qr-copy">
            <SectionHead
              label="Откройте портал с телефона"
              desc="QR ведёт на главную страницу trassa.duckdns.org — работает из любой точки мира"
            />
            <p className="tpr-qr-url">
              <span className="tpr-qr-url__label">Адрес портала</span>
              <strong>trassa.duckdns.org</strong>
            </p>
            <ol className="tpr-qr-steps">
              {QR_STEPS.map((step) => (
                <li key={step.num} className="tpr-qr-step">
                  <span className="tpr-qr-step__num">{step.num}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="tpr-qr-links">
              {QR_LINKS.map((link) => (
                <span key={link.path} className="tpr-qr-link">
                  {link.label}
                </span>
              ))}
            </div>
          </div>

          <div className="tpr-qr-visual">
            <div className="tpr-qr-card">
              <div className="tpr-qr-card__frame">
                {qrSrc ? (
                  <img src={qrSrc} alt="" className="tpr-qr-card__img" draggable={false} />
                ) : (
                  <div className="tpr-qr-card__placeholder" aria-hidden="true" />
                )}
                <div className="tpr-qr-card__logo-wrap">
                  <BrandLogoMark className="tpr-qr-card__logo" />
                </div>
              </div>
              <p className="tpr-qr-card__caption">Сканируйте · «ТрассА»</p>
            </div>
            <div className="tpr-qr-badges">
              <span>iOS · Safari</span>
              <span>Android · Chrome</span>
              <span>Без установки</span>
            </div>
          </div>
        </div>
      </div>
      <DeckSlideFoot slideId="qr" hint={PORTAL_QR_URL.replace("https://", "")} />
    </>
  );
}

function ecosystemCoreMetrics(kpis: KpiItem[]) {
  return [
    { value: kpis[0]?.value ?? "0", label: "Организаций", sub: "в контуре платформы", lead: true },
    { value: kpis[1]?.value ?? "0", label: "Направлений", sub: "программ обучения" },
    {
      value: kpis[2]?.value ?? "0",
      label: kpis[2]?.line1 === "пользователей" ? "Пользователей" : "Точек на карте",
      sub: kpis[2]?.line2 ?? "в системе",
    },
  ];
}

function EcosystemSlide({
  kpis,
  mapSubjects,
  updatedLabel,
}: {
  kpis: KpiItem[];
  mapSubjects: string[];
  updatedLabel: string;
}) {
  return (
    <>
      <DeckBg />

      <SlideHeader slideId="ecosystem" compact />

      <div className="tpr-body tpr-body--ecosystem">
        <div className="tpr-principles-row tpr-principles-row--inline">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="tpr-principle-pill tpr-principle-pill--rich">
              <PrincipleIcon kind={p.icon} />
              <div>
                <strong>{p.title}</strong>
                <span>{p.text}</span>
              </div>
            </div>
          ))}
        </div>

      <section className="tpi__architecture tpi__architecture--deck" aria-label="Устройство платформы">
        <div className="tpi__layer-label tpi__layer-label--left">Участники экосистемы</div>
        <div className="tpi__layer-label tpi__layer-label--center">Ядро платформы</div>
        <div className="tpi__layer-label tpi__layer-label--right">Организации отрасли</div>

        <div className="tpi__arch-body tpi__arch-body--deck">
          <div className="tpi__col tpi__col--left">
            {LEFT_ACTORS.map((a) => (
              <ActorCard key={a.id} {...a} />
            ))}
          </div>

          <div className="tpi__core tpi__core--deck">
            <div className="tpi__core-screen">
              <div className="tpr-core-head">
                <strong>Карта подрядчиков · ядро платформы</strong>
                <span>{mapSubjects.length || 0} регионов</span>
              </div>
              <div className="tpi__core-map-wrap">
                <MapPreview className="tpi__core-map" size="lg" activeSubjectNames={mapSubjects} />
              </div>
              <div className="tpi__services">
                {CORE_SERVICES.map((s) => (
                  <span key={s} className="tpi__service-chip">
                    {s}
                  </span>
                ))}
              </div>
              <div className="tpr-kpi-row tpr-kpi-row--3 tpr-kpi-row--core">
                {ecosystemCoreMetrics(kpis).map((k, i) => (
                  <KpiPlaque
                    key={k.label}
                    value={k.value}
                    label={k.label}
                    sub={k.sub}
                    lead={k.lead}
                    index={i}
                    compact
                  />
                ))}
              </div>
            </div>
            <p className="tpi__core-caption">
              Единая точка входа: данные, сервисы и взаимодействие всех участников
            </p>
          </div>

          <div className="tpi__col tpi__col--right">
            {RIGHT_ACTORS.map((a) => (
              <ActorCard key={a.id} {...a} />
            ))}
          </div>

          <div className="tpi__arch-gov tpi__arch-gov--deck">
            <GovStrip />
          </div>
        </div>
      </section>
      </div>
      <DeckSlideFoot slideId="ecosystem" hint={`данные от ${updatedLabel}`} />
    </>
  );
}

function FlowsSlide({ mapSubjects }: { mapSubjects: string[] }) {
  return (
    <>
      <DeckBg />

      <SlideHeader slideId="flows" compact />

      <div className="tpr-body tpr-body--flows">
      <section className="tpf__cycle tpr-cycle-panel" aria-label="Цикл кадрового контура">
        <SectionHead label="Цикл кадрового контура" desc="Сквозной маршрут: школа → обучение → практика → аналитика" />
        <div className="tpf__cycle-track">
          {CYCLE_STEPS.map((step, idx) => (
            <div key={step.num} className="tpf__cycle-step">
              <div className="tpf__cycle-num">{step.num}</div>
              <div className="tpf__cycle-text">
                <strong>{step.label}</strong>
                <span>{step.sub}</span>
              </div>
              {idx < CYCLE_STEPS.length - 1 ? (
                <svg className="tpf__cycle-arrow" viewBox="0 0 32 12" aria-hidden="true">
                  <path d="M0 6h26M22 2l6 4-6 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ) : null}
            </div>
          ))}
          <div className="tpf__cycle-hub">
            <MapPreview className="tpf__cycle-map" size="md" activeSubjectNames={mapSubjects} />
            <span>Портал «ТрассА»</span>
          </div>
        </div>
      </section>

      <div className="tpf__main">
        <section className="tpf__interactions" aria-label="Взаимодействия по ролям">
          <SectionHead label="Взаимодействия по ролям" desc="Что передаёт и получает каждый участник экосистемы" />
          <div className="tpf__interaction-grid">
            {INTERACTIONS.map((item, idx) => (
              <article
                key={item.roleKey}
                className={`tpf__interaction tpr-interaction-card tpr-interaction-card--${item.roleKey}`}
              >
                <span className="tpr-interaction-card__idx">{String(idx + 1).padStart(2, "0")}</span>
                <div className="tpf__interaction-head">
                  <div className="tpf__role-avatar">
                    <img
                      src={item.photo}
                      alt=""
                      className={`tpi__role-photo tpi__role-photo--${item.roleKey}`}
                    />
                  </div>
                  <h3 title={item.role}>{"roleShort" in item && item.roleShort ? item.roleShort : item.role}</h3>
                </div>
                <div className="tpf__interaction-flow">
                  <div className="tpf__interaction-col">
                    <span className="tpf__interaction-label">Передаёт</span>
                    <p>{item.gives}</p>
                  </div>
                  <div className="tpf__interaction-arrow" aria-hidden="true">
                    →
                  </div>
                  <div className="tpf__interaction-col tpf__interaction-col--out">
                    <span className="tpf__interaction-label">Получает</span>
                    <p>{item.gets}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="tpf__pipes" aria-label="Сквозные потоки данных">
          <SectionHead label="Сквозные потоки данных" desc="Как информация движется между участниками и платформой" />
          <div className="tpf__pipes-grid">
            {DATA_PIPES.map((pipe, idx) => (
              <article key={pipe.title} className="tpf__pipe tpr-pipe-card">
                <span className="tpr-pipe-card__idx">{String(idx + 1).padStart(2, "0")}</span>
                <h3>{pipe.title}</h3>
                <div className="tpf__pipe-flow">
                  <span>{pipe.from}</span>
                  <svg viewBox="0 0 48 12" aria-hidden="true">
                    <path d="M0 6h40M34 2l6 4-6 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <span className="tpf__pipe-hub">{pipe.to}</span>
                </div>
                <p>{pipe.result}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      </div>
      <DeckSlideFoot slideId="flows" hint="5 ролей · 3 сквозных потока" />
    </>
  );
}

function MetricsSlide({
  stats,
  updatedLabel,
  mapSubjects,
}: {
  stats: PresentationStats;
  updatedLabel: string;
  mapSubjects: string[];
}) {
  const heroMetrics = [
    {
      value: formatStat(stats.organizations),
      label: "Организаций",
      sub: "в контуре платформы",
      accent: true,
    },
    {
      value: formatStat(stats.specializations || stats.mapEntries),
      label: "Направлений",
      sub: "и программ обучения",
    },
    {
      value: formatStat(stats.users > 0 ? stats.users : stats.mapEntries),
      label: stats.users > 0 ? "Пользователей" : "Точек на карте",
      sub: stats.users > 0 ? "зарегистрировано" : "организаций на карте",
    },
    {
      value: formatStat(stats.mapEntries),
      label: "На карте",
      sub: "региональный охват",
    },
  ];

  return (
    <>
      <DeckBg />

      <SlideHeader slideId="metrics" compact />

      <div className="tpr-body tpr-body--metrics">
      <section className="tpm__hero" aria-label="Ключевые показатели">
        <div className="tpm__hero-head">
          <SectionHead label="Показатели платформы" desc="Актуальные цифры из данных портала" />
          <span className="tpm__updated">Обновлено: {updatedLabel}</span>
        </div>
        <div className="tpr-kpi-row">
          {heroMetrics.map((m, i) => (
            <KpiPlaque
              key={m.label}
              value={m.value}
              label={m.label}
              sub={m.sub}
              lead={m.accent}
              index={i}
            />
          ))}
        </div>
      </section>

      <div className="tpm__dashboard">
        <section className="tpm__geo" aria-label="География платформы">
          <div className="tpm__geo-head">
            <SectionHead label="География и карта" desc="Региональный охват организаций дорожной отрасли" />
            <span className="tpm__geo-badge">{mapSubjects.length || 0} регионов на карте</span>
          </div>
          <div className="tpm__map-card tpm__map-card--grow">
            <MapPreview
              className="tpm__map-visual tpm__map-visual--fill"
              size="lg"
              activeSubjectNames={mapSubjects}
            />
            <div className="tpm__map-stats">
              <div className="tpm__map-stat tpm__map-stat--lead">
                <strong>{formatStat(stats.organizations)}</strong>
                <span>организаций в системе</span>
              </div>
              <div>
                <strong>{formatStat(stats.specializations || stats.mapEntries)}</strong>
                <span>направлений подготовки</span>
              </div>
              <div>
                <strong>{formatStat(stats.mapEntries)}</strong>
                <span>точек на карте организаций</span>
              </div>
            </div>
          </div>
          <p className="tpm__map-caption">
            Карта показывает подрядчиков и организации — визуальный контур регионального охвата платформы
          </p>
        </section>

        <aside className="tpm__aside" aria-label="Возможности и ценность">
          <section className="tpm__features">
            <SectionHead label="Что даёт платформа" desc="Ключевые возможности для всех участников" />
            <div className="tpr-feature-grid">
              {METRIC_FEATURES.map((f, i) => (
                <article key={f.title} className={i === 0 ? "tpr-feature tpr-feature--lead" : "tpr-feature"}>
                  <span className="tpr-feature__num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
            <div className="tpm__module-tags">
              {METRIC_MODULES.map((tag) => (
                <span key={tag} className="tpm__module-tag">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
      </div>
      <DeckSlideFoot slideId="metrics" hint={`обновлено ${updatedLabel}`} />
    </>
  );
}

function renderSlideContent(
  slideId: SlideId,
  kpis: KpiItem[],
  stats: PresentationStats,
  updatedLabel: string,
  mapSubjects: string[]
) {
  if (slideId === "cover") {
    return <CoverSlide kpis={kpis} mapSubjects={mapSubjects} updatedLabel={updatedLabel} />;
  }
  if (slideId === "ecosystem") {
    return <EcosystemSlide kpis={kpis} mapSubjects={mapSubjects} updatedLabel={updatedLabel} />;
  }
  if (slideId === "modules") return <ModulesSlide />;
  if (slideId === "devices") return <DevicesSlide />;
  if (slideId === "flows") return <FlowsSlide mapSubjects={mapSubjects} />;
  if (slideId === "metrics") {
    return <MetricsSlide stats={stats} updatedLabel={updatedLabel} mapSubjects={mapSubjects} />;
  }
  if (slideId === "impact") return <ImpactSlide />;
  if (slideId === "qr") return <QrSlide />;
  return <ImpactSlide />;
}

function collectStats(mapEntries: MapSubjectOrganization[]): PresentationStats {
  const contractorList = loadContractorOrganizations();
  const specs = loadActiveSpecializations();
  return {
    organizations: contractorList.length + mapEntries.length,
    mapEntries: mapEntries.length,
    users: 0,
    specializations: specs.length,
  };
}

const ZOOM_MIN = 0.42;
const ZOOM_MAX = 1;
const ZOOM_STEP = 0.06;
const SLIDE_W = 1600;

function FullscreenPreview({
  open,
  onClose,
  activeSlide,
  onSlideChange,
  children,
}: {
  open: boolean;
  onClose: () => void;
  activeSlide: SlideId;
  onSlideChange: (id: SlideId) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const idx = SLIDES.findIndex((s) => s.id === activeSlide);
      if (e.key === "ArrowLeft" && idx > 0) onSlideChange(SLIDES[idx - 1].id);
      if (e.key === "ArrowRight" && idx < SLIDES.length - 1) onSlideChange(SLIDES[idx + 1].id);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, activeSlide, onSlideChange]);

  if (!open) return null;

  const idx = SLIDES.findIndex((s) => s.id === activeSlide);

  return createPortal(
    <div className="admin-presentation-fullscreen" role="dialog" aria-modal="true" aria-label="Предпросмотр слайда">
      <div className="admin-presentation-fullscreen__toolbar">
        <div className="admin-presentation-fullscreen__tabs">
          {SLIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`admin-presentation-fullscreen__tab${activeSlide === s.id ? " admin-presentation-fullscreen__tab--active" : ""}`}
              onClick={() => onSlideChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="admin-presentation-fullscreen__nav">
          <button
            type="button"
            className="admin-presentation-fullscreen__navbtn"
            disabled={idx <= 0}
            onClick={() => onSlideChange(SLIDES[idx - 1].id)}
            aria-label="Предыдущий слайд"
          >
            ←
          </button>
          <span className="admin-presentation-fullscreen__counter">
            {idx + 1} / {SLIDES.length}
          </span>
          <button
            type="button"
            className="admin-presentation-fullscreen__navbtn"
            disabled={idx >= SLIDES.length - 1}
            onClick={() => onSlideChange(SLIDES[idx + 1].id)}
            aria-label="Следующий слайд"
          >
            →
          </button>
          <button type="button" className="admin-presentation-fullscreen__close" onClick={onClose}>
            Закрыть · Esc
          </button>
        </div>
      </div>
      <div className="admin-presentation-fullscreen__stage">{children}</div>
    </div>,
    document.body
  );
}

export default function AdminPresentationPanel({
  glassHintClass = "",
  errorClass = "",
  btnPrimaryClass = "",
  btnSecondaryClass = "",
}: Props) {
  const slideRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<SlideId>("cover");
  const [batchSlide, setBatchSlide] = useState<SlideId | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stats, setStats] = useState<PresentationStats>(() =>
    collectStats(loadMapSubjectOrganizations())
  );
  const [statsUpdatedAt, setStatsUpdatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState<ExportImageFormat | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.75);

  const reloadStats = useCallback(async () => {
    setLoading(true);
    const mapEntries = loadMapSubjectOrganizations();
    const base = collectStats(mapEntries);
    const r = await fetchAdminStats(30);
    setStats({
      ...base,
      users: r.ok ? r.stats.registrations.totalUsers : base.users,
    });
    setStatsUpdatedAt(new Date());
    setLoading(false);
  }, []);

  const zoomFit = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;
    const w = el.clientWidth - 48;
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, w / SLIDE_W)));
  }, []);

  useEffect(() => {
    void reloadStats();
  }, [reloadStats]);

  useEffect(() => {
    const t = window.setTimeout(() => zoomFit(), 80);
    return () => window.clearTimeout(t);
  }, [zoomFit, activeSlide]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => zoomFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomFit]);

  const kpis = useMemo(
    () => [
      { value: formatStat(stats.organizations), line1: "организаций", line2: "в контуре" },
      {
        value: formatStat(stats.specializations || stats.mapEntries),
        line1: "направлений",
        line2: "и программ",
      },
      {
        value: formatStat(stats.users > 0 ? stats.users : stats.mapEntries),
        line1: stats.users > 0 ? "пользователей" : "точек",
        line2: stats.users > 0 ? "зарегистрировано" : "на карте",
      },
    ],
    [stats]
  );

  const mapSubjects = useMemo(() => {
    const entries = loadMapSubjectOrganizations();
    return Array.from(new Set(entries.map((e) => e.subjectName.trim()).filter(Boolean)));
  }, [stats]);

  const updatedLabel = useMemo(
    () =>
      statsUpdatedAt.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [statsUpdatedAt]
  );

  const exportBaseName = SLIDES.find((s) => s.id === activeSlide)?.exportName ?? "trassa-prezentaciya";

  const download = useCallback(
    async (format: ExportImageFormat) => {
      const node = slideRef.current;
      if (!node) return;
      setExportBusy(format);
      setError(null);
      setNotice(null);
      try {
        await waitForRender();
        await new Promise((r) => window.setTimeout(r, 480));
        await exportElementAsImage(node, format, exportBaseName);
        setNotice(
          `Слайд «${SLIDES.find((s) => s.id === activeSlide)?.label}» сохранён (${format.toUpperCase()}, 1600×900).`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось сохранить изображение.");
      } finally {
        setExportBusy(null);
      }
    },
    [activeSlide, exportBaseName]
  );

  const downloadAll = useCallback(async (format: ExportImageFormat) => {
    setExportBusy("all");
    setError(null);
    setNotice(null);
    try {
      for (const s of SLIDES) {
        setBatchSlide(s.id);
        await waitForRender();
        await new Promise((r) => window.setTimeout(r, 480));
        const node = exportRef.current;
        if (!node) throw new Error("Не удалось подготовить слайд для экспорта.");
        await exportElementAsImage(node, format, s.exportName);
      }
      setNotice(`Все ${SLIDES.length} слайдов сохранены (${format.toUpperCase()}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить изображения.");
    } finally {
      setBatchSlide(null);
      setExportBusy(null);
    }
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));

  const renderSlide = (attachRef: boolean, slideId: SlideId = activeSlide) => (
    <div
      className={`trassa-presentation-slide trassa-presentation-slide--${slideId}`}
      ref={attachRef ? slideRef : undefined}
    >
      <div className="tpr-slide-inner">{renderSlideContent(slideId, kpis, stats, updatedLabel, mapSubjects)}</div>
    </div>
  );

  const activeSlideMeta = SLIDES.find((s) => s.id === activeSlide);

  return (
    <div className="admin-presentation-panel">
      <div className="admin-presentation-panel__intro">
        <div>
          <h3 className="admin-presentation-panel__heading">Слайды для презентации</h3>
          <p className={glassHintClass}>
            Восемь слайдов в стиле портала v2: обложка, экосистема, сервисы, устройства, потоки, KPI, ценность и QR-код.
            Цифры подтягиваются из данных портала. Экспорт PNG/JPEG — текущий слайд или все сразу.
          </p>
        </div>
        <div className="admin-presentation-panel__actions">
          <button
            type="button"
            className={btnSecondaryClass}
            onClick={() => setFullscreen(true)}
          >
            На весь экран
          </button>
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={Boolean(exportBusy)}
            onClick={() => void download("png")}
          >
            {exportBusy === "png" ? "Сохранение…" : "PNG"}
          </button>
          <button
            type="button"
            className={btnSecondaryClass}
            disabled={Boolean(exportBusy)}
            onClick={() => void download("jpeg")}
          >
            {exportBusy === "jpeg" ? "Сохранение…" : "JPEG"}
          </button>
          <button
            type="button"
            className={btnSecondaryClass}
            disabled={Boolean(exportBusy)}
            onClick={() => void downloadAll("png")}
          >
            {exportBusy === "all" ? "Сохранение…" : "Все PNG"}
          </button>
          <button
            type="button"
            className={btnSecondaryClass}
            disabled={loading}
            onClick={() => void reloadStats()}
          >
            {loading ? "…" : "Обновить цифры"}
          </button>
        </div>
      </div>

      <div className="admin-presentation-panel__slide-tabs">
        {SLIDES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-presentation-panel__slide-tab${activeSlide === s.id ? " admin-presentation-panel__slide-tab--active" : ""}`}
            onClick={() => setActiveSlide(s.id)}
            title={s.desc}
          >
            <span className="admin-presentation-panel__slide-tab-label">{s.label}</span>
          </button>
        ))}
      </div>

      {activeSlideMeta ? (
        <p className={`admin-presentation-panel__slide-meta ${glassHintClass}`}>
          Слайд «{activeSlideMeta.label}» · {activeSlideMeta.desc}
          {activeSlide === "metrics" || activeSlide === "ecosystem" || activeSlide === "cover"
            ? ` · Данные от ${updatedLabel}`
            : ""}
        </p>
      ) : null}

      <div className="admin-presentation-panel__zoombar">
        <span className="admin-presentation-panel__zoomlabel">Масштаб превью</span>
        <button type="button" className="admin-presentation-panel__zoombtn" onClick={zoomOut} aria-label="Уменьшить">
          −
        </button>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="admin-presentation-panel__zoomrange"
          aria-label="Масштаб"
        />
        <button type="button" className="admin-presentation-panel__zoombtn" onClick={zoomIn} aria-label="Увеличить">
          +
        </button>
        <button type="button" className="admin-presentation-panel__zoomfit" onClick={zoomFit}>
          По ширине
        </button>
        <span className="admin-presentation-panel__meta">{Math.round(zoom * 100)}%</span>
      </div>

      {error ? <p className={errorClass}>{error}</p> : null}
      {notice && !error ? <p className={`admin-presentation-panel__notice ${glassHintClass}`}>{notice}</p> : null}

      <div className="admin-presentation-panel__preview" ref={previewRef}>
        <div className="admin-presentation-panel__scale" style={{ transform: `scale(${zoom})` }}>
          {renderSlide(true)}
        </div>
      </div>

      <FullscreenPreview
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        activeSlide={activeSlide}
        onSlideChange={setActiveSlide}
      >
        {renderSlide(false)}
      </FullscreenPreview>

      {batchSlide ? (
        <div className="admin-presentation-panel__export-host" aria-hidden="true">
          <div className={`trassa-presentation-slide trassa-presentation-slide--${batchSlide}`} ref={exportRef}>
            <div className="tpr-slide-inner">
              {renderSlideContent(batchSlide, kpis, stats, updatedLabel, mapSubjects)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
