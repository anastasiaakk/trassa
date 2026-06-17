# Трасса — портал дорожной отрасли

Веб-портал и десктоп-приложение (Windows): карта подрядчиков, личные кабинеты, формы, админка, AI-ассистент (Т-бот).

**Стек:** React 19 · Vite 6 · TypeScript · Express · SQLite · Electron

## Быстрый старт

```bash
npm install
npm run server:install
npm run dev:all
```

Откройте **http://localhost:5173/** · API: **http://127.0.0.1:4000/api/health**

## Документация

Вся документация — в папке **[docs/](./docs/)**:

| Документ | Описание |
|----------|----------|
| [docs/ONBOARDING.md](./docs/ONBOARDING.md) | Первый день разработчика |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Архитектура системы |
| [docs/ROUTES.md](./docs/ROUTES.md) | Маршруты `/#/...` |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Соглашения для разработчиков |
| [docs/deploy/DEPLOY.md](./docs/deploy/DEPLOY.md) | Деплой на VPS |
| [docs/desktop/DESKTOP.md](./docs/desktop/DESKTOP.md) | Сборка `.exe` |

## Основные команды

```bash
npm run dev              # только фронт
npm run dev:all          # фронт + API
npm run build:web        # сборка сайта → dist/
npm run deploy:web       # выкладка на сервер
npm run electron:build   # Windows-установщик
npm run lint             # ESLint
```

## Структура

```
src/           — React SPA (pages, components, api, hooks, design-system)
server/        — Express API + SQLite
scripts/       — деплой, сборка, probe-скрипты
docs/          — документация
deploy/        — шаблоны nginx / systemd
electron.js    — оболочка десктопа
```

## Production

- Сайт: https://trassa.duckdns.org/
- Сборка: `npm run build:web` → `npm run deploy:web`

Подробнее: [docs/deploy/DEPLOY.md](./docs/deploy/DEPLOY.md).
