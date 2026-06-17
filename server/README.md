# API сервера ТрассА

Node.js **22.13+** (Express) + SQLite через встроенный модуль **`node:sqlite`** + JWT в **httpOnly cookie** + bcrypt.

При старте Node может вывести предупреждение *ExperimentalWarning: SQLite* — это нормально для встроенного API.

## Безопасность

- **Helmet** — заголовки ответа.
- **CORS** — только указанные источники (`CORS_ORIGIN`), `credentials: true`.
- **express-rate-limit** — лимит запросов к `/api/auth/*` и `/api/admin/login`.
- **Пароль** — bcrypt (cost 12), правила сложности как на клиенте (только латиница и цифры).
- **JWT** — срок 7 дней, cookie `trassa_access`, `SameSite=Lax`, в production — `Secure`.
- **В production** обязательно задайте `JWT_SECRET` (≥32 символов) в `.env`.
- **Админ** — отдельная таблица `admin_users`, токен в заголовке `X-Trassa-Admin-Token`.

## Запуск

```bash
cd server
npm install
cp .env.example .env   # отредактируйте JWT_SECRET
npm run dev            # tsx watch, порт 4000
```

По умолчанию API слушает **`127.0.0.1:4000`**. База: `server/data/app.db` или `TRASSA_DATA_DIR`.

## Вместе с фронтендом

1. В корне: `.env` с `VITE_USE_AUTH_API=true`.
2. Запустите API (`npm run dev` в `server/`).
3. Запустите Vite из корня `my-react-app` — прокси `/api` → `:4000`.

## Тесты

```bash
cd server
npm run test
```

Интеграционные тесты (`tests/api.integration.test.ts`): health, region, consent/устройство, auth register/login/me, admin login.

## Формат ответов

Успех: `{ ok: true, ... }`  
Ошибка: `{ ok: false, error: string }` (иногда `code` для гейтов)

## Точка входа

| Файл | Назначение |
|------|------------|
| `src/index.ts` | `listen()` |
| `src/createApp.ts` | сборка Express (тесты) |
| `src/db.ts` | SQLite, миграции |
| `src/routes/*.ts` | HTTP-роуты |
| `src/middleware/*.ts` | auth, region, device, rate limit |

---

## Сводка эндпоинтов

Префиксы смонтированы в `src/createApp.ts`. Методы без пометки — JSON body или query.

### Система

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/health` | — | Проверка живости |
| POST | `/api/diagnostics/event` | — | Клиентская диагностика |

### Auth (`/api/auth`)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/register` | — | Регистрация пользователя |
| POST | `/login` | — | Вход, cookie + `accessToken` |
| POST | `/logout` | — | Сброс cookie |
| GET | `/me` | user | Текущий профиль |
| PATCH | `/profile` | user | Обновление профиля |
| GET | `/users` | admin | Список пользователей |
| PATCH | `/users/:emailNorm` | admin | Профиль пользователя |
| PATCH | `/users/:emailNorm/password` | admin | Сброс пароля |
| DELETE | `/users/:emailNorm` | admin | Удаление |

### Portal (`/api/portal`)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/ping` | session | Лёгкий ping сессии |
| GET | `/live` | — | SSE (legacy) |
| GET | `/region` | — | Проверка региона (РФ) |
| GET | `/version` | session | Версия KV + gate hold |
| POST | `/consent` | session | Согласие ПДн + регистрация устройства |
| GET | `/state` | — | Публичный KV |
| GET | `/state-auth` | user/admin | Полный KV |
| GET | `/kv/:key` | — | Одна KV-запись |
| PUT | `/kv/:key` | admin | Запись KV |
| PUT | `/user-kv/:key` | user/admin | Персональный KV |
| POST | `/bootstrap` | admin | Первичная заливка KV |

### Устройства

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/devices/events` | — | SSE (legacy) |
| GET | `/api/devices/status` | session | Статус сессии устройства |
| GET | `/api/admin/devices` | admin | Список устройств |
| GET | `/api/admin/devices/:id/location` | admin | Геолокация |
| GET | `/api/admin/devices/:id/visits` | admin | История визитов |
| PATCH | `/api/admin/devices/:id` | admin | Бан, заметка, персонализация |
| DELETE | `/api/admin/devices/:id` | admin | Удаление |

### Нарушения

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/api/violations/report` | session | Жалоба на скриншот |
| GET | `/api/admin/violations` | admin | Список |
| DELETE | `/api/admin/violations/:id` | admin | Удалить одну |
| DELETE | `/api/admin/violations` | admin | Очистить все |

### Админ (`/api/admin`)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/login` | — | Вход админа → `adminToken` |
| POST | `/password` | admin | Смена пароля админа |
| GET | `/stats` | admin | KPI мониторинга |
| GET | `/incidents` | admin | Журнал сбоев |
| DELETE | `/incidents` | admin | Очистить журнал |

### Формы (админ)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/forms/state` | admin | Состояние шаблонов |
| PUT | `/forms/state` | admin | Сохранить |
| GET | `/forms/monitoring` | admin | Мониторинг заполнения |
| POST | `/forms/import` | admin | Импорт шаблона |
| POST | `/forms/assign` | admin | Назначить подрядчикам |

### Формы (подрядчик / менеджер)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/forms/assigned` | user | Назначенные формы |
| POST | `/api/forms/assigned/:id/submit` | user | Отправка |
| PUT | `/api/forms/assigned/:id/draft` | user | Черновик |
| GET | `/api/forms/rador-dashboard` | — | Дашборд РАДОР (KV) |
| GET | `/api/forms/snapshots` | user | Снимки |
| GET | `/api/forms/alerts` | user | Алерты |
| GET | `/api/forms/rador-alerts` | — | Алерты РАДОР |
| PATCH | `/api/forms/alerts/:id/read` | user | Прочитано |
| GET | `/api/forms/manage/state` | forms mgr | Управление формами |
| PUT | `/api/forms/manage/state` | forms mgr | Сохранить |
| GET | `/api/forms/manage/monitoring` | forms mgr | Мониторинг |
| POST | `/api/forms/manage/import` | forms mgr | Импорт |
| POST | `/api/forms/manage/assign` | forms mgr | Назначение |

### Специализации и распределение

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/specializations` | — | Публичный список |
| GET | `/api/admin/specializations` | admin | CRUD специализаций |
| POST | `/api/admin/specializations` | admin | Создать |
| PATCH | `/api/admin/specializations/:id` | admin | Изменить |
| DELETE | `/api/admin/specializations/:id` | admin | Удалить |
| GET | `/api/admin/specializations/summary` | admin | Сводка |
| PATCH | `/api/admin/specializations/users/:emailNorm` | admin | Привязка студента |
| POST | `/api/admin/distribution/proposals` | admin | Предложение распределения |
| GET | `/api/admin/specializations/export.csv` | admin | Экспорт CSV |
| GET | `/api/distribution/recommendations` | user | Рекомендации подрядчику |

### AI

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/tbot/status` | — | Статус T-bot |
| POST | `/api/tbot/chat` | user | Чат ассистента |
| POST | `/api/admin/ai/chat` | admin | Админ AI |
| POST | `/api/admin/ai/design-system` | admin | AI дизайн |
| POST | `/api/admin/ai/fill-hints` | admin | Подсказки форм |

### Обновления приложения

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/app-update/manifest` | — | Манифест desktop |
| GET | `/api/app-update/current` | — | Текущая версия |
| PUT | `/api/admin/app-update/publish` | admin | Публикация |

---

## Заголовки клиента (устройства)

Сессия портала: cookie `pv2_s`, заголовки `X-Pv2-Csid`, `X-Pv2-Ctx`, legacy `X-Trassa-Device-*` (см. `portalClientSession.ts`).

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `JWT_SECRET` | Подпись JWT (обязательно в prod) |
| `TRASSA_DATA_DIR` | Путь к `app.db` |
| `CORS_ORIGIN` | Разрешённые origin через запятую |
| `LISTEN_HOST` | `0.0.0.0` для доступа из сети |
| `TRUST_PROXY` | `1` за nginx |
| `PORTAL_REGION_GATE` | `1` — только РФ (в prod по умолчанию) |

Подробнее о деплое: [../docs/deploy/DEPLOY.md](../docs/deploy/DEPLOY.md).

Клиентские зеркала API: `src/api/*.ts`.
