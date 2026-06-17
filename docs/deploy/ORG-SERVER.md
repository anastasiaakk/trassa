# Общий сервер для всех установок (одна база)

Схема:

```text
  [Сервер организации]  ← одна база SQLite (portal_kv, users, …)
         ↑    ↑    ↑
    ПК 1   ПК 2   ПК 3   (один и тот же trassa-setup.exe)
```

## 1. Поднять API на сервере (один раз)

Нужен **VPS** или постоянно включённый ПК в офисе с белым IP и **HTTPS** (`https://api.ваш-домен.ru`).

На сервере (Ubuntu, Node **22+**):

```bash
# каталог, например /var/www/trassa
cd /var/www/trassa
git clone … my-react-app   # или скопируйте проект
cd my-react-app/server
npm ci
npm run build
```

Файл **`/etc/trassa/api.env`** (права `600`):

```env
NODE_ENV=production
JWT_SECRET=случайная-строка-не-короче-32-символов
PORT=4000
LISTEN_HOST=127.0.0.1
TRUST_PROXY=1
TRASSA_DATA_DIR=/var/lib/trassa/api-data
# Для десктопа (file://) достаточно null/file — в коде уже разрешено.
# Если позже будет сайт — добавьте его origin:
CORS_ORIGIN=https://ваш-сайт.ru
```

Systemd: **`deploy/trassa-api.service.example`**.  
Nginx только для API: **`deploy/nginx-api-only.example.conf`** (поддомен `api.…` → `127.0.0.1:4000`).

Проверка: `curl https://api.ваш-домен.ru/api/health` → `{"ok":true,"service":"trassa-api"}`.

## 2. Указать адрес API перед сборкой установщика

В **`release-config.json`** в корне проекта:

```json
{
  "apiUrl": "https://api.ваш-домен.ru",
  "manifestUrl": "https://github.com/anastasiaakk/trassa/releases/latest/download/app-update.json"
}
```

Или при сборке:

```bash
set TRASSA_API_URL=https://api.ваш-домен.ru
npm run electron:build
```

Скрипт запишет **`.env.production.local`** и **`electron-assets/api.json`**.  
Без **`apiUrl`** команда **`npm run electron:build`** завершится с ошибкой (так и задумано).

### GitHub Actions (релизы)

В настройках репозитория добавьте секрет **`TRASSA_API_URL`** = `https://api.ваш-домен.ru` (без слэша в конце).  
Сборка установщика в CI использует тот же общий сервер.

## 3. Раздать один установщик всем

После сборки отдайте всем один файл **`release/trassa-setup-*.exe`**.

- Пользователям **не нужен** Node.js на ПК для синхронизации (локальный API не стартует).
- Админ один раз: вход на `/services`, кнопка **«Синхронизировать данные с сервером»**, если переносите старые локальные данные.

## 4. Обновления

Новая версия приложения — тот же **`apiUrl`** в `release-config.json`, снова `npm run electron:build`, публикация `.exe` (GitHub Releases / свой хостинг). База на сервере **сохраняется**.

## Локальная разработка

`npm run dev` + `npm run server:dev` — без `apiUrl` в `release-config.json` (или пустой `apiUrl`).  
`npm run build` без `--installer` не требует `apiUrl`.
