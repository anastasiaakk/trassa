# Онбординг разработчика

## Требования

- **Node.js 22+** (встроенный SQLite в API)
- npm
- Для деплоя: Python 3 + `paramiko`, пароль в `.trassa-deploy.local` (не в git)

## Первый запуск

```bash
cd my-react-app
npm install
npm run server:install
npm run dev:all
```

Откройте **http://localhost:5173/** — главная с интро-сплэшем.

API: **http://127.0.0.1:4000/api/health** → `{"ok":true}`.

## Переменные окружения

| Файл | Назначение |
|------|------------|
| `.env` | Локальная разработка |
| `.env.web.production` | `npm run build:web` — `VITE_USE_AUTH_API=true` |
| `.env.production` | Desktop / полная сборка |
| `server/.env` | `JWT_SECRET`, `TRASSA_DATA_DIR`, `CORS_ORIGIN` |

Фронт в dev ходит на API через **прокси Vite** (`/api` → `:4000`). В production web — тот же origin через nginx.

## Где искать код

```
src/pages/           — экраны (маршруты)
src/components/      — UI (admin/, cabinet-v2/, forms/)
src/api/             — HTTP-клиенты (зеркало server/src/routes/)
src/utils/           — storage, guards, device, sync
src/design-system/   — тема legacy | v2
src/routes/          — таблица маршрутов React Router
server/src/routes/   — REST API
server/src/db.ts     — схема SQLite
scripts/             — деплой, сборка, probe-скрипты
docs/                — вся документация (вы здесь)
```

## Важные концепции

1. **HashRouter** — URL вида `https://site/#/services`. Прямой заход на `/services` без hash перенаправляется на главную (см. `ensureIntroRoute.ts`).

2. **portal_kv** — общие настройки портала на сервере. Клиент опрашивает `/api/portal/version` (`PortalSyncProvider`).

3. **Устройства** — `POST /api/portal/consent` + cookie `pv2_s`. Админка: «Выход с устройств».

4. **Два режима дизайна** — `legacy` и `v2` (`portal_design` в KV + localStorage).

5. **Auth** — JWT в httpOnly cookie; `VITE_USE_AUTH_API=true` для серверной авторизации.

## Типичные задачи

| Задача | Куда смотреть |
|--------|----------------|
| Новая страница | `src/routes/appRoutes.tsx`, `docs/ROUTES.md` |
| API endpoint | `server/src/routes/`, `src/api/` |
| Стили кабинета v2 | `src/design-system/portal-v2/` |
| Деплой сайта | `npm run build:web && npm run deploy:web` |
| Деплой только API | `npm run deploy:api` |

## Линт

```bash
npm run lint
```

Автотестов в `src/` пока нет; probe-скрипты в `scripts/` — ручная проверка production.

## Дальше

- [ARCHITECTURE.md](./ARCHITECTURE.md) — схема системы
- [ROUTES.md](./ROUTES.md) — все маршруты
- [deploy/DEPLOY.md](./deploy/DEPLOY.md) — production
