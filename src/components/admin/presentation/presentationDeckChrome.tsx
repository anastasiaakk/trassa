import { GOV_ACTOR, logoImg, SLIDES, type SlideId } from "./presentationConfig";

export type HeroMetric = { value: string; label: string; sub: string; lead?: boolean };

export type KpiItem = { value: string; line1: string; line2: string };

export function ModuleIcon({ kind }: { kind: string }) {
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

export function PrincipleIcon({ kind }: { kind: string }) {
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

export function ActorCard({
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

export function GovStrip() {
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

export function BrandLogoMark({ className }: { className?: string }) {
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

export function DeckBg() {
  return (
    <>
      <div className="tpr-bg" aria-hidden="true" />
      <div className="tpr-orb tpr-orb--a" aria-hidden="true" />
      <div className="tpr-orb tpr-orb--b" aria-hidden="true" />
    </>
  );
}

export function slideIndexOf(id: SlideId): number {
  return SLIDES.findIndex((s) => s.id === id);
}

export function DeckTop({
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

export function DeckSlideFoot({ slideId, hint }: { slideId: SlideId; hint?: string }) {
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

export function SectionHead({ label, desc }: { label: string; desc?: string }) {
  return (
    <div className="tpr-section-head">
      <p className="tpr-section-label">{label}</p>
      {desc ? <p className="tpr-section-desc">{desc}</p> : null}
    </div>
  );
}

export function KpiPlaque({
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

export function SlideHeader({
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
