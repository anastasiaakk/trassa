# ТрассА · Design System v2 (2026)

**Независимый дизайн:** v2 берёт из legacy только данные и маршруты; UX/UI — по референсам ниже.  
**Не меняем:** семейства шрифтов (`Inter`, `Onest` и т.д. из legacy).  
**Палитра (строго 5 HEX):** `#2B64FD` · `#FFFFFF` · `#1C1C1C` · `#F6F6F6` (редко) · `#6B6B6B`.

---

## Референсы (ваши ссылки)

| # | Проект | Ссылка | Что заимствуем |
|---|--------|--------|----------------|
| 1 | MediAid Medical Dashboard | [Behance](https://www.behance.net/gallery/162667923/MediAid-Medical-App-Dashboard-UI) | Светлый SaaS, KPI-ряд, мягкие карточки, sidebar |
| 2 | Travel Dashboard | [Behance](https://www.behance.net/gallery/196963125/Travel-Dashboard-UIUX-Case-Study) | Bento-сетка, hero-блок, воздух между блоками |
| 3 | HRMS Dashboard | [Behance](https://www.behance.net/gallery/248361801/HRMS-Dashboard) | Таблицы, фильтры, корпоративный topbar |
| 4 | DeFi Fintech Dashboard | [Behance](https://www.behance.net/gallery/248101997/UXUI-Defi-Fintech-Dashboard-modern-design) | Контраст ink/white, акцент primary, метрики |
| 5 | E-Commerce Analytics | [Behance](https://www.behance.net/gallery/249050233/E-Commerce-Analytics-Dashboard) | Sparkline/KPI, плотная аналитика |
| 6 | Rentier SaaS | [Behance](https://www.behance.net/gallery/241446005/Rentier-SaaS-UXUI-Design) | Icon rail, glass panels, иерархия |
| 7 | Learning Sync AI | [Behance](https://www.behance.net/gallery/245893195/Learning-Sync-AI-Education-SaaS-UIUX-Case-Study) | EdTech SaaS, дружелюбные карточки |
| 8 | Modern SaaS AI Platform | [Behance](https://www.behance.net/gallery/245877227/Modern-SaaS-AI-Platform-Website-UIUX-Design) | AI-продукт, glow primary, landing→app |
| 9 | CAREER GO AI | [Behance](https://www.behance.net/gallery/249141057/CAREER-GO-AI-Career-Assistant) | Карьерный ассистент, CTA, чипы |
| 10 | Quanta AI Branding | [Behance](https://www.behance.net/gallery/240513725/Quanta-AI-Branding-Design-for-AI-Sales-Manager) | Синие орбы на белом, бренд-сцена |
| 11 | Lumica AI Platform | [Behance](https://www.behance.net/gallery/238803475/Lumica-AI-Creative-Platform-%28UXUI-Case-Study%29) | Креативная платформа, mesh-light |
| 12 | Glassmorphic UI | [Behance](https://www.behance.net/gallery/169071867/Glassmorphic-UI) | Frosted glass, blur, inset highlight |
| 13 | Dashboard glassmorphism | [Dribbble](https://dribbble.com/shots/23626622-Dashboard-glassmorphism-style) | Стекло, глубина, pill-кнопки |
| 14 | App Store Screenshots | [Dribbble](https://dribbble.com/shots/27412030-App-Store-Screenshot-Design) | Маркетинговые панели, крупная типографика KPI |

Превью в коде: **`#/design-preview`** при `trassa-portal-design = v2`.

---

## Принципы DNA

1. **Light-first** — основной опыт кабинетов и публичных экранов: белый фон + синие орбы (Quanta/Lumica), не «тёмный legacy».
2. **Glass L1–L3** — три уровня стекла: панель → карточка → вложенный блок (`pv2-card-l1` … `l3`).
3. **Rail + topbar + KPI** — скан за 3 с: слева rail, сверху topbar, первый ряд — метрики (Rentier/HRMS).
4. **Bento** — hero 2×2 + метрики 1×1 (Travel, E-Commerce refs).
5. **F6F6F6 мало** — только треки, hover, вторичные кнопки (`--pv2-fill-subtle`).
6. **Motion сдержанно** — lift на hover, `prefers-reduced-motion` (этап 6).

---

## Токены (CSS)

| Группа | Ключевые переменные |
|--------|---------------------|
| Цвета | `--pv2-primary`, `--pv2-white`, `--pv2-ink`, `--pv2-surface`, `--pv2-muted`, `--pv2-fill-subtle` |
| Сцена | `--pv2-scene-light`, `--pv2-scene-dark`, `--pv2-orb-a/b/c` |
| Glass | `--pv2-glass-l1` … `--pv2-glass-l3`, `--pv2-blur-*` |
| Радиусы | `--pv2-radius-xs` … `--pv2-radius-2xl`, `--pv2-radius-pill` |
| Сетка | `--pv2-rail-width`, `--pv2-topbar-height`, `--pv2-content-max` |

Файлы: `src/design-system/portal-v2/tokens.css`, `scene-v2.css`, `ds-core.css`, `foundation.css`, `components.css`.

---

## Этапы внедрения

| Этап | Содержание | Статус |
|------|------------|--------|
| **A** | Токены, scene light, ds-core, design-preview | **готово** |
| **B** | Кабинеты — pv2-scene, bridge, primitives | **готово** |
| **C** | Page1–3, EntrySplash, Page2 glass | **готово** |
| **D** | Ассоциации: документы, формы, события | **готово** |
| **E** | Админ light scene, messenger, modals | **готово** |
| **F** | Page2 glass-float, a11y, final-layer, legacy cleanup | **готово** |

---

## Классы-кирпичи

| Класс | Назначение |
|-------|------------|
| `pv2-scene` `pv2-scene--light` | Фоновая сцена страницы |
| `pv2-card-l1` | Панель / topbar / sidebar |
| `pv2-card-l2` | KPI, stat, обычная карточка |
| `pv2-card-l3` | Вложенный блок, list item |
| `pv2-kpi` | Метрика с gradient value |
| `pv2-hero` | Крупный hero (Travel ref) |
| `pv2-bento` | Сетка bento |
| `pv2-search` | Поле поиска в topbar |
| `cabinet-v2-scene` | Кабинет на новой сцене |

---

## UX-идеи (на обсуждение)

- **Command palette** (⌘K) для переходов между разделами кабинета.
- **Единый «центр уведомлений»** в topbar вместо разрозненных бейджей.
- **Пустые состояния** с иллюстрацией primary-glow (без новых цветов).
- **Карта Page2** — плавающая glass-панель субъектов поверх белой сцены (как Rentier widget).
