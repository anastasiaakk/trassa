# Маршруты портала

Базовый URL: `https://ваш-домен/#/...` (HashRouter).

Код: `src/routes/appRoutes.tsx`.

## Публичные

| Маршрут | Файл | Описание |
|---------|------|----------|
| `/` | `Page1Flow` | Главная, интро-сплэш |
| `/services` | `Page2` | Карта подрядчиков (+ встроенная админка) |
| `/page3` | `Page3` | Выбор роли (школьник, студент, подрядчик…) |
| `/download` | `DownloadDesktopPage` | Скачать десктоп |
| `/privacy` | `PrivacyPolicyPage` | Политика ПДн |
| `/design-preview` | `DesignSystemPreview` | Превью DS v2 (dev) |

## Кабинеты

| Маршрут | Файл | Роль |
|---------|------|------|
| `/cabinet-school/*` | `CabinetSchool` | Школьник |
| `/cabinet-spo/*` | `CabinetSpo` | Студент СПО |
| `/page4/*` | `Page4` | Подрядчик |
| `/page5`, `/page5/*` | `Page5` | Ассоциация (РАДОР) |
| `/page6`, `/page6/*` | `Page6` | Ассоциация (АДО) — обёртка над `AssociationPage` |

### Подмаршруты ассоциации (page5 / page6)

- `/proforientation` — профориентация
- `/documents`, `/documents/incoming` — документы
- `/teams` — команды
- `/forms` — формы

## Профиль

| Маршрут | Файл |
|---------|------|
| `/profile` | `ProfileSettings` |

## Семантические алиасы (редирект на legacy)

| Алиас | Куда | Описание |
|-------|------|----------|
| `/role-select` | `/page3` | Выбор роли |
| `/map` | `/services` | Карта |
| `/cabinet-contractor` | `/page4` | Подрядчик |
| `/cabinet-contractor/*` | `/page4/*` | Подрядчик (вложенные) |
| `/cabinet-association-rador` | `/page5` | РАДОР |
| `/cabinet-association-ado` | `/page6` | АДО |

Код: `src/routes/routeAliases.tsx`.

## Редиректы

| Маршрут | Куда |
|---------|------|
| `/page1` | `/` |

## CSS-классы на `<body>`

Задаются в `useRouteBodyClasses` (`src/hooks/`):

| Класс | Условие |
|-------|---------|
| `route-page1` | `/` |
| `route-page2` | `/services`, `/map` |
| `route-page3` | `/page3`, `/role-select` |
| `route-cabinet` | любой кабинет |
| `route-page4` | `/page4` |
| `route-profile` | `/profile` |
| `route-legal` | `/privacy` |

## Legacy-имена

Исторические имена `page3`–`page6` сохранены для совместимости QR и закладок. **Семантические алиасы** (см. выше) редиректят на них — используйте алиасы в новых ссылках и QR.
