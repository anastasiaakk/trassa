# Редизайн портала ТрассА (v2)

Референсы: glassmorphism, SaaS-dashboard (Behance + Figma Community). Полный список: **[PORTAL-DESIGN-REFERENCES.md](./PORTAL-DESIGN-REFERENCES.md)**.

**Figma (ваши):** [Glassmorphism Dashboard UI Kit](https://www.figma.com/community/file/1514405085901665002/glassmorphism-dashboard-ui-kit) · [Glass SaaS Dashboard](https://www.figma.com/community/file/1633077830104049751/glass-saas-dashboard-free-figma-ui-kit-design-system) · [Glassmorphism Dashboard UI Design](https://www.figma.com/community/file/1004518384882716388/glassmorphism-dashboard-ui-design).

**Сохраняем без изменений:** шрифты `Inter` + `Onest`.

**Палитра v2 (glass):** `#0A2540` · `#2B64FD` · `#6F95FF` · светлый лёд `#E8F7FC`. Акценты — **градиенты** primary → soft blue.

**Legacy** по-прежнему использует бордо/синий (`#56061D`, `#243B74`) — откат через `legacy` + restore снимка.

**Меняем в v2:** формы карточек, стекло, сетки, навигация, тени, радиусы, плотность, микро-анимации.

---

## Резервная копия (откат)

| Действие | Команда |
|----------|---------|
| Снимок сейчас | `node scripts/backup-portal-design.cjs` |
| Вернуть старый CSS | `node scripts/restore-portal-design.cjs snapshot-ГГГГ-ММ-ДД` |

Папка: `design-legacy/snapshot-*` — см. `design-legacy/README.md`.

---

## Переключение legacy ↔ v2

В консоли браузера (F12):

**По умолчанию** для новых визитов включён **v2** (если в `localStorage` ещё нет ключа).

```js
localStorage.setItem('trassa-portal-design', 'legacy'); // вернуть старый вид
location.reload();
```

```js
localStorage.setItem('trassa-portal-design', 'v2');   // явно glass v2
location.reload();
```

Превью компонентов: **`#/design-preview`** (после включения v2).

Памятка: **[PORTAL-DESIGN-USER.md](./PORTAL-DESIGN-USER.md)** · QA: **[PORTAL-DESIGN-STABILIZATION.md](./PORTAL-DESIGN-STABILIZATION.md)** · релиз: **[PORTAL-DESIGN-RELEASE.md](./PORTAL-DESIGN-RELEASE.md)** · итог: **[PORTAL-DESIGN-DONE.md](./PORTAL-DESIGN-DONE.md)**

---

## Этапы (долгая работа)

### Этап 0 — сейчас ✅
- Снимок legacy CSS
- Токены v2 (`src/design-system/portal-v2/`)
- Превью `/design-preview`
- Переключатель `trassa-portal-design`

### Этап 1 — готово ✅
- [x] `CabinetChromeLayout` — glass-шапка, палитра v2, переключатель темы
- [x] Школа / СПО / подрядчик — боковая колонка и панели контента
- [x] Подрядчик: таблицы, документы, студенты, команды, профориентация
- [x] Мессенджер в шапке и встроенная панель
- [x] Светлая тема — базовый контраст панелей

### Этап 2 — готово ✅
- [x] Page3 — glass-фон, роли, вход, дорога, institution, кнопка «Далее»
- [x] Page1 — glass stat-карточки на тёмной сцене v2
- [x] EntrySplash — синий прогресс и затемнение
- [x] Переключатель v2 в админке → Настройки

### Этап 3 — готово ✅
- [x] Page2 — шапка, обзор, карта, панель субъекта, «О нас»
- [x] Leaflet — заливка округов, метки, popup, zoom
- [x] DesktopDownloadPanel в модалке «Скачать приложение»

### Этап 4 — готово ✅
- [x] Админ — акцент v2 на навигации и панели
- [x] Таблицы админа / FormGridEditor
- [x] Кабинеты РАДОР/АДО (Page5/6) — тема, шапка, мессенджер, навигация

### Этап 5 — готово
- [x] reduced-motion (расширено)
- [x] :focus-visible, prefers-contrast: more
- [x] Светлая тема — токены на `<html>`, синхрон между кабинетами
- [x] Контраст подписей в светлом кабинете
- [x] Dock (школа / СПО / подрядчик), bento-метрики на главной кабинета, sparklines (Page1/2, админ, кабинет)

### Этап 6 — готово
- [x] Dock для кабинетов ассоциаций (Page5 / Page6)
- [x] Sparklines на главной ассоциации (метрики «Статус кабинета»)
- [x] Светлая glass-тема v2 (`light-glass.css`) — Credifyx-подобные панели, dock, bento

### Этап 7 — готово
- [x] Bento-метрики на главной подрядчика (Page4) — события, формы, подборки
- [x] Glass-карточки разделов на главной ассоциации (`page5-v2__section-card`)
- [x] WCAG: формы подрядчика (`forms-cabinet.css`), светлая тема таблиц админа

### Этап 8 — готово
- [x] **v2 по умолчанию** (`getPortalDesign` без ключа → v2; явный `legacy` сохраняется)
- [x] Мессенджер v2 (`messenger-v2.css`) — поля, диалоги пересылки и настроек
- [x] Модалки: Page2 «О нас», создание мероприятия (`modals-v2.css`)

### Этап 9 — готово
- [x] Т-бот и заметки v2 (`overlays-v2.css`, `floating-widget-v2__*`)
- [x] Звук dock в desktop (`desktopUiFeedback.ts`, настройка в админке)
- [x] `:focus-visible` на FAB и панелях виджетов

### Этап 10 — готово
- [x] [PORTAL-DESIGN-USER.md](./PORTAL-DESIGN-USER.md) — памятка пользователю
- [x] [PORTAL-DESIGN-STABILIZATION.md](./PORTAL-DESIGN-STABILIZATION.md) — чеклист перед релизом
- [x] Профиль `/profile` — glass v2 (`profile-v2.css`, палитра кабинета)
- [x] Маршрутные классы `route-page3`, `route-profile`, `route-cabinet` в App.tsx

### Этап 11 — готово
- [x] [PORTAL-DESIGN-RELEASE.md](./PORTAL-DESIGN-RELEASE.md) — текст для рассылки и баннера
- [x] Вход администратора на карте — v2 поля и кнопка (`admin-login-v2.css`)
- [x] Календарь мероприятий — `page5-events-v2`, подсветка сегодняшнего дня
- [x] Баннер `PortalDesignWhatsNew` — один раз после обновления (ключ `trassa-portal-v2-whatsnew-dismissed`)

### Этап 12 — готово
- [x] Экран техработ в стиле v2 (`maintenance-v2.css`)
- [x] [PORTAL-DESIGN-DONE.md](./PORTAL-DESIGN-DONE.md) — сводка «редизайн завершён»
- [x] Комментарии в `server/src/profileTypes.ts` (синхрон с клиентом)

### Этап 13 — готово
- [x] [PORTAL-DESIGN-REFERENCES.md](./PORTAL-DESIGN-REFERENCES.md) — Figma + маппинг на код
- [x] `figma-refinements.css` — mesh-фон кабинетов, усиленное стекло, hover карточек, dock

---

## Что можно добавить (на ваш выбор)

1. **Точечные баги** на конкретных маршрутах при v2 (напишите URL и скрин).
2. **Рассылка** — текст из [PORTAL-DESIGN-RELEASE.md](./PORTAL-DESIGN-RELEASE.md) в новости / email.
