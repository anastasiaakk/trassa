# Руководство для разработчиков

## Перед PR / коммитом

```bash
npm run lint
npm run build:web
npm run build --prefix server
npm run smoke:portal    # API (локально или TRASSA_SMOKE_BASE)
npm run smoke:portal:web  # браузерные страницы (TRASSA_SMOKE_WEB_BASE)
```

## Соглашения

### Именование

- Новые маршруты — **семантические** (`/cabinet-contractor`), не `pageN`. Legacy-алиасы сохраняйте.
- API-клиенты — `src/api/<domain>Api.ts`, сервер — `server/src/routes/<domain>.ts`.
- Хуки — `src/hooks/use<Feature>.ts`.
- Storage — `src/utils/<feature>Storage.ts`.

### Стили

- Кабинет v2: `src/design-system/portal-v2/`.
- Не добавляйте HEX вне [design/PORTAL-DESIGN-V2-DS.md](./design/PORTAL-DESIGN-V2-DS.md).
- Перед крупным редизайном: `npm run design:pin`.

### API

- Ответы: `{ ok: true, ... } | { ok: false, error: string }`.
- Не коммитьте секреты (`.env`, `.trassa-deploy.local`).

### Компоненты

- Новая страница → `src/pages/` + запись в `src/routes/appRoutes.tsx` + `docs/ROUTES.md`.
- Логику >100 строк выносите в `src/hooks/` или `src/utils/`.
- **Не раздувайте** `AdminDashboard.tsx` — новые панели в `src/components/admin/` или отдельные `src/pages/Admin*.tsx`.

## Структура PR

1. Что изменено и зачем.
2. Как проверить (маршруты, роли).
3. Скриншот UI — для визуальных правок.

## Деплой

Только после явного запроса владельца проекта:

```bash
npm run build:web && npm run deploy:web
npm run deploy:api   # только сервер
```

## Документация

При добавлении фичи обновите при необходимости:

- `docs/ARCHITECTURE.md` — архитектурные изменения
- `docs/ROUTES.md` — новые маршруты
- `server/README.md` — новые эндпоинты
