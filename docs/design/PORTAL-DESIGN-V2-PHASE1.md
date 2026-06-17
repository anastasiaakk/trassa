# v2 — этап 1: новая дизайн-система

**Статус:** этап **A** заложен — см. [PORTAL-DESIGN-V2-DS.md](./PORTAL-DESIGN-V2-DS.md) (`scene-v2.css`, `ds-core.css`, `#/design-preview`).

## Палитра (макет, не меняем шрифты)

| Токен | HEX | Роль |
|-------|-----|------|
| primary | `#2B64FD` | CTA, акцент, mesh |
| white | `#FFFFFF` | текст на тёмном, карточки |
| ink | `#1C1C1C` | тёмный фон, текст на светлом |
| surface | `#F6F6F6` | светлый фон кабинета |
| muted | `#6B6B6B` | вторичный текст (серый swatch; на макете опечатка F6F6F6) |

Производные (`primary-soft`, glass, тени) — только `color-mix()` от этих пяти цветов в `tokens.css`.

## Референсы (ваши ссылки)

- [MediAid Medical Dashboard](https://www.behance.net/gallery/162667923/MediAid-Medical-App-Dashboard-UI)
- [Travel Dashboard](https://www.behance.net/gallery/196963125/Travel-Dashboard-UIUX-Case-Study)
- [HRMS Dashboard](https://www.behance.net/gallery/248361801/HRMS-Dashboard)
- [Defi Fintech Dashboard](https://www.behance.net/gallery/248101997/UXUI-Defi-Fintech-Dashboard-modern-design)
- [E-Commerce Analytics](https://www.behance.net/gallery/249050233/E-Commerce-Analytics-Dashboard)
- [Rentier SaaS](https://www.behance.net/gallery/241446005/Rentier-SaaS-UXUI-Design)
- [Learning Sync AI Education](https://www.behance.net/gallery/245893195/Learning-Sync-AI-Education-SaaS-UIUX-Case-Study)
- [Modern SaaS AI Platform](https://www.behance.net/gallery/245877227/Modern-SaaS-AI-Platform-Website-UIUX-Design)
- [CAREER GO AI](https://www.behance.net/gallery/249141057/CAREER-GO-AI-Career-Assistant)
- [Quanta AI Branding](https://www.behance.net/gallery/240513725/Quanta-AI-Branding-Design-for-AI-Sales-Manager)
- [Glassmorphism UI](https://www.behance.net/gallery/169071867/Glassmorphic-UI)
- [Lumica AI](https://www.behance.net/gallery/238803475/Lumica-AI-Creative-Platform-%28UXUI-Case-Study%29)
- [Dribbble glassmorphism dashboard](https://dribbble.com/shots/23626622-Dashboard-glassmorphism-style)

## Что взяли из референсов

| Приём | Классы / файлы |
|--------|----------------|
| Mesh + noise фон | `tokens.css`, `pv2-scene`, `foundation.css` |
| Frosted glass cards | `pv2-glass`, `pv2-kpi` |
| KPI row | `pv2-kpi`, `cabinet-bento-metric` |
| Icon rail | `pv2-rail`, `cabinet-icon-rail` |
| Topbar | `pv2-topbar` |
| Gradient accent line | `pv2-glass-topline` |
| Светлая glass-тема | `data-cabinet-theme="light"` |

## Файлы этапа 1

- `src/design-system/portal-v2/tokens.css` — токены
- `src/design-system/portal-v2/foundation.css` — KPI, topbar, table shell
- `src/design-system/portal-v2/v2-tokens.ts` — для TS
- `#/design-preview` — витрина компонентов

## Следующие этапы (по частям)

2. **Публичные страницы** — Page1, Entry, Page2, Page3 (только v2-классы).
3. **Кабинеты** — единый shell: rail + topbar + KPI; убрать визуальный шум legacy inline.
4. **Админ + РАДОР** — glass tables, forms hub.
5. **Motion + QA** — reduced-motion, контраст, мобильный dock.

Legacy не трогаем. v2 включается `portal_design: v2` или localStorage.
