import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { prefetchServicesRoute } from "../utils/routePrefetch";
import Sparkline from "../components/Sparkline";
import { cx } from "../design-system/cabinetChromeClasses";
import { publicUrl } from "../utils/publicUrl";
import styles from "./PortalHomePage.module.css";

const STAT_ICON_SPECIALISTS = publicUrl("icons/page1-stat-specialists.png");

const STATS = [
  {
    id: "regions",
    label: "Региональные заявки",
    value: "63+",
    hint: "за этот месяц",
    icon: "pin",
  },
  {
    id: "specialists",
    label: "Специалисты",
    value: "Много",
    hint: "База: 4,582+",
    sub: "Специалистов",
    icon: "people",
  },
  {
    id: "interest",
    label: "Заинтересованность",
    value: "99,95%",
    hint: "",
    icon: "heart",
    chart: true,
  },
  {
    id: "support",
    label: "Поддержка",
    value: "24/7",
    hint: "Среднее время ответа: 3 мин.",
    icon: "clock",
  },
] as const;

const INTEREST_SPARK = [72, 78, 81, 88, 92, 96, 99.95] as const;

type StatId = (typeof STATS)[number]["id"];
type StatSlide = { value: string; sub?: string; hint: string };

/** Крупный заголовок в две строки (число сверху, слово снизу). */
const STACKED_STAT_HEADINGS = new Set([
  "Много|Специалистов",
  "87%|Закрытия",
]);

function isStackedStatHeading(value: string, sub?: string) {
  if (!sub) return false;
  return STACKED_STAT_HEADINGS.has(`${value}|${sub}`);
}

const STAT_SLIDES: Record<StatId, readonly StatSlide[]> = {
  regions: [
    { value: "63+", hint: "за этот месяц" },
    { value: "18", sub: "Регионов", hint: "в активной фазе подбора" },
    { value: "4", hint: "ремонты, стройка, диагностика, безопасность" },
  ],
  specialists: [
    { value: "Много", sub: "Специалистов", hint: "база: 4,582+" },
    { value: "1 124", sub: "На вахте", hint: "актуальный статус сегодня" },
    { value: "87%", sub: "Закрытия", hint: "по запросам подрядчиков" },
  ],
  interest: [
    { value: "99,95%", hint: "положительная оценка сервиса" },
    { value: "NPS +67", hint: "по данным опросов кабинета" },
    { value: "+4,2%", sub: "Рост", hint: "к прошлому месяцу" },
  ],
  support: [
    { value: "24/7", hint: "Среднее время ответа: 3 мин." },
    { value: "3", sub: "Минуты", hint: "среднее время первого ответа" },
    { value: "97%", sub: "Решено", hint: "в рамках первого обращения" },
  ],
} as const;

function StatIcon({ type }: { type: (typeof STATS)[number]["icon"] }) {
  if (type === "people") {
    return (
      <img
        src={STAT_ICON_SPECIALISTS}
        alt=""
        decoding="async"
        aria-hidden
      />
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      {type === "pin" && (
        <path
          d="M12 11.5a3 3 0 100-6 3 3 0 000 6zm0-7.5c3.31 0 6 2.69 6 6 0 4.5-6 10.5-6 10.5S6 14.5 6 10c0-3.31 2.69-6 6-6z"
          fill="currentColor"
        />
      )}
      {type === "heart" && (
        <path
          d="M12 20.2l-1.2-1.1C7.1 15.1 4 12.4 4 9.5 4 7 6 5 8.5 5c1.4 0 2.7.7 3.5 1.8.8-1.1 2.1-1.8 3.5-1.8C17 5 19 7 19 9.5c0 2.9-3.1 5.6-6.8 9.6L12 20.2z"
          fill="currentColor"
        />
      )}
      {type === "clock" && (
        <path
          d="M12 7v5.2l3.2 1.9-.8 1.3L11 13.2V7h1zm0-5a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

const PortalHomePage: FunctionComponent<{
  isV2?: boolean;
  introFast?: boolean;
  /** Кроссфейд после entry-splash */
  introFromSplash?: boolean;
}> = ({
  isV2 = false,
  introFast = false,
  introFromSplash = false,
}) => {
  const navigate = useNavigate();
  const skipEntrance = introFast && !introFromSplash;
  const [heroVisible, setHeroVisible] = useState(skipEntrance);
  const [visibleCards, setVisibleCards] = useState(() =>
    skipEntrance ? [true, true, true, true] : [false, false, false, false],
  );
  const [activeSlides, setActiveSlides] = useState<Record<StatId, number>>({
    regions: 0,
    specialists: 0,
    interest: 0,
    support: 0,
  });

  useEffect(() => {
    if (skipEntrance) {
      setHeroVisible(true);
      setVisibleCards([true, true, true, true]);
      return;
    }

    const heroDelay = introFromSplash ? 320 : 200;
    const startDelayMs = introFromSplash ? 520 : 450;
    const stepMs = introFromSplash ? 200 : 420;

    const heroTimer = window.setTimeout(() => setHeroVisible(true), heroDelay);
    const timers = [0, 1, 2, 3].map((index) =>
      window.setTimeout(() => {
        setVisibleCards((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, startDelayMs + index * stepMs),
    );

    return () => {
      window.clearTimeout(heroTimer);
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [introFromSplash, skipEntrance]);

  const touchStartX = useRef(0);

  const setStatSlide = useCallback((statId: StatId, slideIndex: number) => {
    setActiveSlides((prev) => ({
      ...prev,
      [statId]: slideIndex,
    }));
  }, []);

  const handleStatTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? 0;
  }, []);

  const handleStatTouchEnd = useCallback(
    (statId: StatId, slideCount: number, event: React.TouchEvent) => {
      const endX = event.changedTouches[0]?.clientX ?? 0;
      const delta = endX - touchStartX.current;
      if (Math.abs(delta) < 48) return;

      setActiveSlides((prev) => {
        const current = prev[statId] ?? 0;
        const next =
          delta < 0
            ? (current + 1) % slideCount
            : (current - 1 + slideCount) % slideCount;
        return { ...prev, [statId]: next };
      });
    },
    [],
  );

  const warmServicesRoute = useCallback(() => {
    prefetchServicesRoute();
  }, []);

  const goToServices = () => {
    navigate("/services");
  };

  return (
    <div
      className={cx(
        styles.page,
        (introFast || introFromSplash) && styles.pageAfterSplash,
        isV2 && "page1-v2",
        isV2 && "page1-v2-scene",
      )}
    >
      <div className={styles.bento}>
        <article
          className={cx(
            styles.heroCard,
            isV2 && "page1-v2__hero",
            heroVisible ? styles.cardShown : styles.cardHidden
          )}
        >
          <span className={styles.heroTag}>Новый портал для управления кадрами</span>
          <h1 className={`${styles.heroTitle} font-brand`}>
            <span className={styles.heroTitleName}>ТрассА</span>
            <span className={styles.heroTitleDash} aria-hidden="true">
              —
            </span>
          </h1>
          <p className={styles.heroDesc}>
            комплексный портал для управления персоналом, развития лучших практик в дорожной
            деятельности
          </p>

          <div className={styles.progressBlock}>
            <div className={styles.progressHead}>
              <span>Общий прогресс внедрения</span>
              <span>85%</span>
            </div>
            <div className={cx(styles.progressTrack, isV2 && "page1-v2__progress-track")}>
              <div className={cx(styles.progressFill, isV2 && "page1-v2__progress-fill")} />
            </div>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroCta}
              onClick={goToServices}
              onMouseEnter={warmServicesRoute}
              onFocus={warmServicesRoute}
            >
              Перейти в управление
            </button>
          </div>
        </article>

        <div
          className={cx(styles.statsGrid, isV2 && "page1-v2__stats-grid")}
          aria-label="Показатели портала"
        >
          {STATS.map((stat, index) => (
            (() => {
              const slides = STAT_SLIDES[stat.id];
              const activeIdx = activeSlides[stat.id] ?? 0;
              const activeSlide = slides[activeIdx];
              const displayValue = activeSlide.value;
              const displaySub = activeSlide.sub ?? ("sub" in stat ? stat.sub : undefined);
              const stackedHeading = isStackedStatHeading(displayValue, displaySub);
              const inlineHeading = Boolean(displaySub) && !stackedHeading;
              return (
            <article
              key={stat.id}
              className={cx(
                styles.statCard,
                isV2 && "page1-v2__stat",
                visibleCards[index] ? styles.cardShown : styles.cardHidden,
              )}
              onTouchStart={handleStatTouchStart}
              onTouchEnd={(event) => handleStatTouchEnd(stat.id, slides.length, event)}
            >
              <div className={cx(styles.statIconWrap, isV2 && "page1-v2__stat-icon")}>
                <StatIcon type={stat.icon} />
              </div>
              <div className={cx(styles.statLabel, isV2 && "page1-v2__stat-muted")}>{stat.label}</div>
              {inlineHeading ? (
                <div
                  key={`${stat.id}-main-${activeIdx}`}
                  className={cx(styles.statMain, styles.statMainRow, styles.statFadeIn)}
                >
                  <p className={styles.statHeadline}>
                    <span className={cx(styles.statValue, isV2 && "page1-v2__stat-value")}>
                      {displayValue}
                    </span>{" "}
                    <span className={styles.statSub}>{displaySub}</span>
                  </p>
                </div>
              ) : (
                <div
                  key={`${stat.id}-main-${activeIdx}`}
                  className={cx(
                    styles.statMain,
                    stackedHeading && styles.statMainStacked,
                    styles.statFadeIn,
                  )}
                >
                  <div className={cx(styles.statValue, isV2 && "page1-v2__stat-value")}>
                    {displayValue}
                  </div>
                  {displaySub ? <div className={styles.statSub}>{displaySub}</div> : null}
                </div>
              )}
              <div
                key={`${stat.id}-hint-${activeIdx}`}
                className={cx(styles.statHint, styles.statFadeIn, isV2 && "page1-v2__stat-hint")}
              >
                {activeSlide.hint}
              </div>
              {"chart" in stat && stat.chart ? (
                <Sparkline
                  values={INTEREST_SPARK}
                  className={cx(styles.statChart, isV2 && "page1-v2__stat-chart")}
                  width={120}
                  height={32}
                  strokeWidth={2}
                  filled
                  showLastDot={false}
                />
              ) : null}
              <div className={styles.statDots} role="tablist" aria-label={`${stat.label}: выбор показателя`}>
                {slides.map((_, dotIndex) => (
                  <button
                    type="button"
                    key={`${stat.id}-dot-${dotIndex}`}
                    role="tab"
                    className={dotIndex === activeIdx ? styles.statDotActive : undefined}
                    onClick={() => setStatSlide(stat.id, dotIndex)}
                    aria-label={`Показатель ${dotIndex + 1} из ${slides.length}`}
                    aria-selected={dotIndex === activeIdx}
                  />
                ))}
              </div>
            </article>
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortalHomePage;
