# Документация Трасса

Портал «Трасса» — React + Vite (фронт), Express + SQLite (API), Electron (Windows).

## С чего начать

| Документ | Для кого | Содержание |
|----------|----------|------------|
| [ONBOARDING.md](./ONBOARDING.md) | Новый разработчик | Первый день: запуск, env, где что лежит |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Разработчик | Соглашения, PR, деплой |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Разработчик | Архитектура, потоки данных, API |
| [ROUTES.md](./ROUTES.md) | Разработчик | Таблица маршрутов `/#/...` → страницы |
| [ADMIN.md](./ADMIN.md) | Разработчик | Админ-панель: структура файлов |

## Деплой и инфраструктура

| Документ | Содержание |
|----------|------------|
| [deploy/DEPLOY.md](./deploy/DEPLOY.md) | VPS, nginx, HTTPS, production |
| [deploy/ORG-SERVER.md](./deploy/ORG-SERVER.md) | Один API на организацию, десктоп-клиенты |
| [deploy/FREE-API.md](./deploy/FREE-API.md) | Бесплатный хостинг API |
| [deploy/PORTAL-WEB-QR.md](./deploy/PORTAL-WEB-QR.md) | Сайт + QR для доступа |

## Десктоп

| Документ | Содержание |
|----------|------------|
| [desktop/DESKTOP.md](./desktop/DESKTOP.md) | Сборка `.exe`, обновления, GitHub Releases |

## Дизайн портала (v2)

| Документ | Содержание |
|----------|------------|
| [design/PORTAL-DESIGN-V2-MASTER.md](./design/PORTAL-DESIGN-V2-MASTER.md) | Мастер-план редизайна |
| [design/PORTAL-DESIGN-V2-DS.md](./design/PORTAL-DESIGN-V2-DS.md) | Design system, токены, палитра |
| [design/PORTAL-DESIGN-ROADMAP.md](./design/PORTAL-DESIGN-ROADMAP.md) | Этапы и чеклисты |
| [design/PORTAL-DESIGN-USER.md](./design/PORTAL-DESIGN-USER.md) | Памятка пользователю |
| [design/PORTAL-DESIGN-STABILIZATION.md](./design/PORTAL-DESIGN-STABILIZATION.md) | QA перед релизом |

Полный список — папка [design/](./design/).

Резервные снимки CSS: [../design-legacy/README.md](../design-legacy/README.md).

## Прочее

| Документ | Содержание |
|----------|------------|
| [legal/LEGAL-COMPLIANCE-RU.md](./legal/LEGAL-COMPLIANCE-RU.md) | 152-ФЗ, согласие, устройства |
| [../server/README.md](../server/README.md) | API: эндпоинты, безопасность, dev |

## Быстрые команды

```bash
npm install
npm run dev:all          # фронт :5173 + API :4000
npm run build:web        # dist/ для сайта
npm run deploy:web       # выкладка на VPS (нужен TRASSA_SSH_PASSWORD)
npm run electron:build   # Windows-установщик
```
