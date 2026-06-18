import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  CAREER,
  CORE_SERVICES,
  CYCLE_STEPS,
  DATA_PIPES,
  DEVICE_FEATURES,
  INTERACTIONS,
  logoImg,
  METRIC_FEATURES,
  METRIC_MODULES,
  PLATFORM_CHANNELS,
  PORTAL_DEVICE_SHOTS,
  PORTAL_QR_URL,
  PRINCIPLES,
  QR_LINKS,
  QR_STEPS,
  SERVICE_ITEMS,
  VALUE_ITEMS,
  LEFT_ACTORS,
  RIGHT_ACTORS,
  type PresentationStats,
  type SlideId,
} from "./presentationConfig";
import {
  ActorCard,
  BrandLogoMark,
  DeckBg,
  DeckSlideFoot,
  GovStrip,
  KpiPlaque,
  ModuleIcon,
  PrincipleIcon,
  SectionHead,
  SlideHeader,
  type HeroMetric,
  type KpiItem,
} from "./presentationDeckChrome";
import { MapPreview } from "./PresentationMapPreview";
import { formatStat } from "./presentationStats";

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

export function CoverSlide({
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
      <SlideHeader slideId="cover" compact />
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

export function ModulesSlide() {
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

export function DevicesSlide() {
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

export function ImpactSlide() {
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

export function QrSlide() {
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

export function EcosystemSlide({
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

export function FlowsSlide({ mapSubjects }: { mapSubjects: string[] }) {
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

export function MetricsSlide({
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

export function renderSlideContent(
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
