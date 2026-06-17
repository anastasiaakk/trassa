import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CabinetKpiCard from "../components/CabinetKpiCard";
import { getPortalDesign, setPortalDesign } from "../design-system/portalDesign";

export default function DesignSystemPreview() {
  const [design, setDesign] = useState(getPortalDesign);
  const [sceneDark, setSceneDark] = useState(false);

  useEffect(() => {
    if (design !== "v2") return;
    document.documentElement.setAttribute("data-cabinet-theme", sceneDark ? "dark" : "light");
    return () => document.documentElement.removeAttribute("data-cabinet-theme");
  }, [design, sceneDark]);

  const switchDesign = useCallback((id: "legacy" | "v2") => {
    setPortalDesign(id);
    setDesign(id);
  }, []);

  if (design !== "v2") {
    return (
      <div style={{ padding: 32, maxWidth: 560, margin: "0 auto", fontFamily: "var(--font-ui)" }}>
        <h1 style={{ fontSize: 24 }}>Дизайн-система v2</h1>
        <p style={{ lineHeight: 1.5, color: "#4f5a78" }}>
          Сейчас активен <strong>legacy</strong>. Включите v2 — glass SaaS по референсам Behance/Dribbble
          (MediAid, Rentier, HRMS, Quanta…). Шрифты не меняются.
        </p>
        <button
          type="button"
          style={{
            marginTop: 16,
            padding: "12px 20px",
            borderRadius: 9999,
            border: "none",
            background: "#2B64FD",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onClick={() => switchDesign("v2")}
        >
          Включить v2
        </button>
        <p style={{ marginTop: 24, fontSize: 14 }}>
          <Link to="/services">← На карту</Link>
        </p>
      </div>
    );
  }

  const sceneClass = sceneDark ? "pv2-scene" : "pv2-scene pv2-scene--light";

  return (
    <div className={sceneClass}>
      <div className="pv2-layout">
        <nav className="pv2-rail" aria-label="Демо-навигация">
          <button type="button" className="pv2-rail-btn pv2-rail-btn-active" aria-label="Главная">
            ⌂
          </button>
          <button type="button" className="pv2-rail-btn" aria-label="Аналитика">
            ◔
          </button>
          <button type="button" className="pv2-rail-btn" aria-label="Сообщения">
            ✉
          </button>
          <button type="button" className="pv2-rail-btn" aria-label="Настройки">
            ⚙
          </button>
        </nav>

        <main className="pv2-main">
          <header className="pv2-topbar pv2-card-l1 pv2-accent-edge">
            <div>
              <h1 className="pv2-topbar__title">
                <span className="pv2-text-gradient" style={{ fontFamily: "var(--font-brand)" }}>
                  ТрассА
                </span>{" "}
                Design System v2
              </h1>
              <p className="pv2-subtitle" style={{ margin: "6px 0 0" }}>
                Этап A · glass L1–L3 · light scene · 5 цветов ·{" "}
                <code style={{ fontSize: "0.85em" }}>docs/design/PORTAL-DESIGN-V2-DS.md</code>
              </p>
            </div>
            <div className="pv2-topbar__actions">
              <label className="pv2-search" style={{ marginRight: 8 }}>
                <span className="pv2-search__icon" aria-hidden>
                  ⌕
                </span>
                <input className="pv2-search__input" placeholder="Поиск…" aria-label="Поиск" />
              </label>
              <button type="button" className="pv2-btn pv2-btn-ghost" onClick={() => setSceneDark((v) => !v)}>
                {sceneDark ? "Светлая сцена" : "Тёмная сцена"}
              </button>
              <button type="button" className="pv2-btn pv2-btn-ghost" onClick={() => switchDesign("legacy")}>
                Legacy
              </button>
              <Link to="/cabinet-school" className="pv2-btn pv2-btn-primary" style={{ textDecoration: "none" }}>
                Кабинет
              </Link>
            </div>
          </header>

          <div className="pv2-bento">
            <div className="pv2-bento__hero">
              <section className="pv2-hero pv2-accent-edge">
                <span className="pv2-hero__eyebrow">Learning Sync · Rentier DNA</span>
                <h2 className="pv2-hero__title">Современный glass-кабинет</h2>
                <p className="pv2-hero__desc">
                  v2 независим от legacy UI: только данные и маршруты. Белая сцена, синие орбы, KPI сверху,
                  bento-сетка контента.
                </p>
                <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to="/services" className="pv2-btn pv2-btn-primary" style={{ textDecoration: "none" }}>
                    Карта
                  </Link>
                  <Link to="/page3" className="pv2-btn pv2-btn-ghost" style={{ textDecoration: "none" }}>
                    Вход
                  </Link>
                  <Link to="/page5" className="pv2-btn pv2-btn-ghost" style={{ textDecoration: "none" }}>
                    РАДОР
                  </Link>
                </div>
              </section>
            </div>
            <div className="pv2-bento__stack cabinet-v2-kpi-row cabinet-v2-kpi-row--stack">
              <CabinetKpiCard
                label="MRR"
                value="52 450"
                valuePrefix="$ "
                trend="down"
                trendLabel="−8%"
                insight="The main driver of growth is the PRO plan"
              />
              <CabinetKpiCard
                label="Пользователей"
                value="128"
                trend="up"
                trendLabel="+12"
                insight="Новые регистрации за последнюю неделю."
              />
            </div>
          </div>

          <section>
            <div className="pv2-section-head">
              <h2 className="pv2-section-head__title">KPI · MediAid / HRMS</h2>
              <a className="pv2-link" href="#palette">
                Палитра ↓
              </a>
            </div>
            <div className="cabinet-v2-page-kpi">
              <div className="cabinet-v2-kpi-row" aria-label="KPI по референсам">
                <CabinetKpiCard
                  label="Регионов РФ"
                  value="67"
                  trend="neutral"
                  insight="Покрытие интерактивной карты портала."
                />
                <CabinetKpiCard
                  label="Активных подрядчиков"
                  value="704"
                  accent="cyan"
                  trend="up"
                  trendLabel="+18"
                  insight="Организации с активным кабинетом подрядчика."
                />
                <CabinetKpiCard
                  label="Готовы работать"
                  value="874"
                  accent="blend"
                  trend="up"
                  insight="Специалисты, отметившие готовность к проектам."
                />
                <CabinetKpiCard
                  label="Среднее время отклика"
                  value="28"
                  accent="deep"
                  trend="down"
                  trendLabel="−12%"
                  insight="Среднее по обращениям в мессенджере ассоциации."
                />
              </div>
            </div>
          </section>

          <section className="pv2-bento__wide pv2-card-l2 pv2-accent-edge" style={{ padding: 24 }} id="palette">
            <h2 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 600 }}>Палитра (строго 5)</h2>
            <div className="pv2-swatch-row">
              <div className="pv2-swatch pv2-swatch-primary">#2B64FD</div>
              <div className="pv2-swatch pv2-swatch-cyan">#FFFFFF</div>
              <div className="pv2-swatch pv2-swatch-deep">#1C1C1C</div>
              <div className="pv2-swatch" style={{ background: "var(--pv2-fill-subtle)", color: "var(--pv2-ink)" }}>
                #F6F6F6 редко
              </div>
              <div className="pv2-swatch pv2-swatch-muted">#6B6B6B</div>
            </div>
          </section>

          <section className="pv2-card-l2 pv2-accent-edge" style={{ padding: 0, overflow: "hidden" }}>
            <div className="pv2-section-head" style={{ padding: "20px 24px 0", margin: 0 }}>
              <h2 className="pv2-section-head__title">Таблица · HRMS / Fintech</h2>
              <span className="pv2-badge pv2-badge--brand">ds-core</span>
            </div>
            <div className="pv2-table-shell" style={{ border: "none", boxShadow: "none", marginTop: 12 }}>
              <table className="pv2-table">
                <thead>
                  <tr>
                    <th>Организация</th>
                    <th>Регион</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Школа №12</td>
                    <td>Москва</td>
                    <td>
                      <span className="pv2-table__pill">Активна</span>
                    </td>
                  </tr>
                  <tr>
                    <td>СПО «Траектория»</td>
                    <td>Татарстан</td>
                    <td>
                      <span className="pv2-table__pill">Активна</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Подрядчик ООО</td>
                    <td>Самара</td>
                    <td>
                      <span className="pv2-table__pill">На проверке</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="pv2-grid-2">
            <section className="pv2-card-l2 pv2-accent-edge" style={{ padding: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.125rem" }}>Контролы</h2>
              <div className="pv2-nav-pill" style={{ marginBottom: 16 }}>
                <span className="pv2-chip pv2-chip-active">Конструктор</span>
                <span className="pv2-chip">Аналитика</span>
                <span className="pv2-chip">Импорт</span>
              </div>
              <input className="pv2-input" placeholder="Поле ввода…" style={{ marginBottom: 16 }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="pv2-btn pv2-btn-primary">
                  Primary
                </button>
                <button type="button" className="pv2-btn pv2-btn-ghost">
                  Ghost
                </button>
              </div>
            </section>

            <section className="pv2-card-l3" style={{ padding: 24 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Glass L3</h2>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--pv2-muted)", lineHeight: 1.5 }}>
                Следующие этапы: кабинеты B → публичные C → ассоциации D → админ E. Старые override-слои
                (`legacy-modules-v2`) постепенно уберём.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
