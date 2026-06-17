# Портал в браузере по QR (удалённый доступ)

У вас API уже на **`https://trassa-api.duckdns.org`**. Ниже — как выложить **сайт** на тот же VPS, чтобы любой человек с телефона открыл ссылку из QR (не в вашей Wi‑Fi).

## Схема (рекомендуем)

```text
https://trassa.duckdns.org          ← сайт (папка dist/)
https://trassa.duckdns.org/api/…    ← тот же API (nginx → :4000)

QR-код → https://trassa.duckdns.org/#/
```

Один домен для сайта и `/api` — проще всего: не нужен CORS между разными именами.

| У вас уже есть | Добавляем |
|----------------|-----------|
| `trassa-api.duckdns.org` → API | `trassa.duckdns.org` → сайт + `/api` |

Оба поддомена DuckDNS указывают на **один IP** VPS.

---

## Часть 1. DuckDNS (2 минуты)

1. [duckdns.org](https://www.duckdns.org) → войти.
2. Создать поддомен **`trassa`** (если свободен) → **`trassa.duckdns.org`**.
3. IP — **тот же**, что у `trassa-api.duckdns.org`.

---

## Часть 2. Собрать сайт на Windows

В PowerShell:

```powershell
cd c:\Programm\my-react-app
npm ci
npm run build:web
```

Появится папка **`dist/`** — это и есть сайт для nginx.

> Команда **`build:web`** использует `.env.web.production` (API с того же домена `/api`).  
> Для установщика Windows по-прежнему **`npm run electron:build`**.

---

## Часть 3. Загрузить `dist/` на сервер

**Автоматически с ПК** (если API уже на VPS, как у вас):

```powershell
cd c:\Programm\my-react-app
npm run build:web
$env:TRASSA_SSH_PASSWORD = 'ваш_пароль_SSH'
npm run deploy:web
```

Скрипт заливает `dist/`, nginx (`trassa.duckdns.org` + `/api`), certbot, обновляет CORS.

Перед этим на [duckdns.org](https://www.duckdns.org) создайте **`trassa`** → тот же IP, что у `trassa-api`.

---

**Вариант A — git** (если репозиторий на сервере):

```bash
ssh ubuntu@ВАШ_IP
cd /var/www/trassa/my-react-app
git pull
npm ci
npm run build:web
```

**Вариант B — с ПК** (архив):

```powershell
cd c:\Programm\my-react-app
tar -czf dist.tar.gz -C dist .
scp dist.tar.gz ubuntu@ВАШ_IP:/tmp/
```

На сервере:

```bash
sudo mkdir -p /var/www/trassa/dist
sudo tar -xzf /tmp/dist.tar.gz -C /var/www/trassa/dist
```

---

## Часть 4. API (если ещё не поднят)

Проверка:

```bash
curl -s https://trassa-api.duckdns.org/api/health
```

Ожидается: `{"ok":true,"service":"trassa-api"}`

Если нет — шаги в **`FREE-API.md`** (Node, systemd, nginx только для API).

Обновите **`/etc/trassa/api.env`** — добавьте сайт в CORS (на случай отладки с другого origin):

```env
CORS_ORIGIN=https://trassa.duckdns.org,http://localhost:5173
```

```bash
sudo systemctl restart trassa-api
```

При схеме «сайт + `/api` на одном домене» браузеру CORS почти не мешает; строка выше — на будущее.

---

## Часть 5. Nginx для сайта

На сервере:

```bash
sudo cp /var/www/trassa/my-react-app/deploy/nginx-portal-web.example.conf \
  /etc/nginx/sites-available/trassa-portal
sudo nano /etc/nginx/sites-available/trassa-portal
```

Проверьте `server_name trassa.duckdns.org` и `root /var/www/trassa/dist`.

```bash
sudo ln -sf /etc/nginx/sites-available/trassa-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d trassa.duckdns.org
```

Проверка в браузере:

- `https://trassa.duckdns.org/` — **главная (портал)**
- `https://trassa.duckdns.org/api/health` — API

> **`trassa-api.duckdns.org`** — только API. Корень `/` там показывает страницу nginx — это нормально.  
> Для людей и QR используйте **`trassa.duckdns.org`**, не `trassa-api`.

---

## Часть 6. QR-код

Ссылка для QR (HashRouter):

```text
https://trassa.duckdns.org/#/
```

Другие экраны:

| Экран | Ссылка |
|-------|--------|
| Карта | `https://trassa.duckdns.org/#/services` |
| Вход | `https://trassa.duckdns.org/#/page3` |

Сгенерируйте QR: [qr.io](https://qr.io) или любой генератор → отдайте картинку/печать.

Человек сканирует → Safari/Chrome → видит портал **из любой точки мира**.

---

## Обновление сайта

После правок в коде:

```powershell
npm run build:web
```

Снова залить **`dist/`** на сервер (git pull + build или scp).

API и база на сервере **не трогаются** — пользовательские данные сохраняются.

---

## Альтернатива: два домена

Если не хотите `/api` на домене сайта:

1. Сайт: `https://trassa.duckdns.org` — только `dist/`, без `location /api/`.
2. Сборка: в `.env.web.production` указать  
   `VITE_API_URL=https://trassa-api.duckdns.org`
3. В **`/etc/trassa/api.env`**:  
   `CORS_ORIGIN=https://trassa.duckdns.org`

QR всё равно на `https://trassa.duckdns.org/#/`.

---

## Чеклист

- [ ] `trassa.duckdns.org` → IP VPS  
- [ ] `npm run build:web` → `dist/` на сервере  
- [ ] `trassa-api` работает (`/api/health`)  
- [ ] nginx + certbot для `trassa.duckdns.org`  
- [ ] Открывается с телефона по мобильному интернету  
- [ ] QR на `https://trassa.duckdns.org/#/`

---

## Безопасность

- Не публикуйте админку без сильного пароля.
- `JWT_SECRET` только на сервере.
- Для демо заведите тестовых пользователей.

Подробнее: **`DEPLOY.md`**, **`ORG-SERVER.md`**.
