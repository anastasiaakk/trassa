# v2 Glass — мастер-план редизайна

**Не меняем:** шрифты `Inter` / `Onest`. **Палитра v2:** `#2B64FD` · `#FFFFFF` · `#1C1C1C` · `#F6F6F6` (редко) · `#6B6B6B`. Спека: [PORTAL-DESIGN-V2-DS.md](./PORTAL-DESIGN-V2-DS.md).

**Цель:** премиальный **glass + мягкая глубина** (Apple / Rentier / SunCore / Veri / CentralFlow), не копия lime-green из чужих макетов.

## DNA макета (по референсу дашборда + Behance)

```
┌────┬──────────────────────────────────────────────────┐
│ R  │  Заголовок кабинета          [поиск]  🔔 💬 👤 │
│ a  ├──────────────────────────────────────────────────┤
│ i  │  [KPI] [KPI] [KPI] [KPI]   ← ряд метрик         │
│ l  ├──────────────────────────────────────────────────┤
│    │  ┌──────────┬─────────┬────────────────────┐   │
│    │  │ Hero /   │ Aside   │  Контент / сетка   │   │
│    │  │ виджет   │ nav     │  карточек          │   │
│    │  └──────────┴─────────┴────────────────────┘   │
│    ├──────────────────────────────────────────────────┤
│    │  Dock (быстрые разделы) — мобильный fallback   │
└────┴──────────────────────────────────────────────────┘
```

## Референсы

| Источник | Ссылка |
|----------|--------|
| Rentier SaaS | [Behance](https://www.behance.net/gallery/241446005/Rentier-SaaS-UXUI-Design) |
| Glassmorphic UI | [Behance](https://www.behance.net/gallery/169071867/Glassmorphic-UI) |
| SunCore | [Behance](https://www.behance.net/gallery/240050653/SunCore-Solar-Monitoring-Platform-Case-Study) |
| Veri Health | [Behance](https://www.behance.net/gallery/244192609/Veri-Health-App-SaaS-UX-UI-Design) |
| CentralFlow | [Behance](https://www.behance.net/gallery/208923943/CentralFlow-CRM-Email-SaaS-UI-UX-Design) |
| Figma kits | [1514405085901665002](https://www.figma.com/community/file/1514405085901665002) · [1633077830104049751](https://www.figma.com/community/file/1633077830104049751) · [1004518384882716388](https://www.figma.com/community/file/1004518384882716388) |

## Этапы работ (пошагово)

| # | Этап | Статус | Что делаем |
|---|------|--------|------------|
| **1** | Каркас кабинета | **готово** | Icon rail, topbar без центр. лого, KPI-карточки, сцена, `cabinet-v2-pro.css` |
| **2** | Главная школа/СПО/подрядчик | **готово** | `cabinet-v2-dashboard.css`, `LearnerCabinetDashboardV2`, `ContractorCabinetDashboardV2` |
| **3** | Ассоциации Page5/6 | **готово** | Rail, topbar, KPI, `AssociationCabinetDashboardV2`, `page5-v2-layout.css` |
| **4** | Публичные Page1–3, карта | **готово** | KPI Page1/2, glass hero, EntrySplash, Page3 login shell |
| **5** | Админ + формы | **готово** | `admin-v2-pro.css`, `AdminV2KpiRow`, KPI на главной/таблицах/спецификациях, login glass |
| **6** | Motion, a11y, QA | | Финал + [STABILIZATION](./PORTAL-DESIGN-STABILIZATION.md) |

## UX-решения (предлагаю)

1. **Icon rail слева** — основная навигация (как Rentier); **dock снизу** оставить на узких экранах.
2. **Один topbar** — без логотипа по центру (логотип в rail); меньше визуального шума.
3. **KPI всегда первым рядом** — сканируемость за 3 секунды (NN/g dashboard pattern).
4. **Hero-карта** — одна крупная «витрина» слева, не растягивать на всю сетку.
5. **Светлая тема** — те же токены, больше белого стекла (Credifyx / Apple Settings).

## Следующий шаг

**Этап 6:** motion (`prefers-reduced-motion`), a11y-аудит, QA по [STABILIZATION](./PORTAL-DESIGN-STABILIZATION.md).
