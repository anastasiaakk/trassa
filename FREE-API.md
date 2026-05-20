# Бесплатный общий сервер для всех установок

Цель: один адрес в интернете (например `https://api-trassa.duckdns.org`), куда ходят **все** установленные программы. Данные одни на всех.

Ниже — два рабочих бесплатных пути. Для организации надёжнее **вариант 1**; для быстрой проверки — **вариант 2**.

---

## Сравнение

| | Вариант 1: Oracle Cloud (бесплатный VPS) | Вариант 2: Ваш ПК + Cloudflare Tunnel |
|---|------------------------------------------|----------------------------------------|
| Цена | 0 ₽ (always free) | 0 ₽ |
| Работает 24/7 | Да, если VPS включён | Только пока включён компьютер |
| Сложность | Средняя (один раз настроить) | Легче |
| Для всех пользователей | Да | Да, пока ПК и туннель работают |

**Не рекомендуем** бесплатный Render/Railway «в один клик» для этой базы: там диск часто **сбрасывается**, SQLite может **пропасть** после перезапуска.

---

## Для России (Oracle недоступен)

| Вариант | Цена | 24/7 | Комментарий |
|---------|------|------|-------------|
| **ПК в офисе + Cloudflare Tunnel** | 0 ₽ | Пока ПК включён | Самый простой старт, см. [вариант 2](#вариант-2--бесплатно-без-vps-пк-в-офисе--туннель) |
| **Yandex Cloud** | Стартовый грант ~4000 ₽ новым аккаунтам | Да | Оплата картой РФ, ВМ Ubuntu — дальше те же шаги, что для VPS ниже |
| **VK Cloud** (ex Mail.ru Cloud) | Пробный период / грант | Да | Российский провайдер, ВМ + диск |
| **Timeweb Cloud / Selectel / REG.RU** | Часто от ~200–400 ₽/мес | Да | Не «навсегда бесплатно», но дёшево и без проблем с оплатой |
| **Amvera** (amvera.ru) | Есть бесплатный/тестовый тариф | Да | PaaS: заливаете Node-проект без настройки Linux (проверьте, что диск **постоянный**) |

**DuckDNS** и **Let's Encrypt** из России обычно работают.

Дальнейшая настройка API (Node, nginx, `apiUrl`) — **та же**, что в варианте 1; меняется только **где** вы арендуете виртуалку.

### Yandex Cloud (кратко)

1. [console.cloud.yandex.ru](https://console.cloud.yandex.ru) — регистрация, привязка карты, стартовый грант.
2. Создать **ВМ** Ubuntu 22/24, публичный IP, группа безопасности: порты **22, 80, 443**.
3. Подключиться по SSH, выполнить шаги из раздела «Установить API на сервер» и «HTTPS» ниже (подставьте IP или домен).
4. Домен: купить `.ru` у REG.RU / Timeweb **или** бесплатно [DuckDNS](https://www.duckdns.org) на IP ВМ.
5. `apiUrl` в `release-config.json` → `npm run electron:build`.

Гранта обычно хватает на небольшую ВМ на несколько месяцев; следите за расходом в биллинге.

### Если нужен именно 0 ₽ без облака

Оставьте **включённый ПК** (или старый мини-ПК в офисе) + **вариант 2** (туннель). Для постоянной работы организации позже лучше перейти на **дешёвый VPS в РФ** (~200–300 ₽/мес).

---

## Вариант 1 — бесплатный VPS навсегда (Oracle и зарубежные)

> В РФ Oracle часто недоступен — см. раздел **«Для России»** выше.

### 1. Зарегистрироваться

1. [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) — создать аккаунт (нужна карта для проверки, списания на free tier обычно нет).
2. Создать **Always Free** VM (Ubuntu 22/24, ARM — дешевле в квоте).
3. Открыть в firewall порты **22**, **80**, **443**.
4. Записать **публичный IP** сервера.

### 2. Бесплатное имя (DuckDNS)

1. [duckdns.org](https://www.duckdns.org) — войти, создать поддомен, например `trassa-api`.
2. Указать IP вашего VPS → получите **`trassa-api.duckdns.org`**.

Позже адрес API: **`https://trassa-api.duckdns.org`** (HTTPS настроим на шаге 4).

### 3. Установить API на сервер

Подключиться по SSH (в примерах IP замените на свой):

```bash
ssh ubuntu@ВАШ_IP

sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo mkdir -p /var/www/trassa /var/lib/trassa/api-data /etc/trassa
sudo chown -R $USER:$USER /var/www/trassa /var/lib/trassa
```

Скопируйте проект на сервер (git clone или `scp` папки `server/`):

```bash
cd /var/www/trassa
# git clone …  или загрузите архив

cd server
npm ci
npm run build
```

Секрет и настройки:

```bash
sudo nano /etc/trassa/api.env
```

Содержимое (подставьте свой длинный секрет ≥32 символов):

```env
NODE_ENV=production
JWT_SECRET=сюда-случайная-строка-32-символа-и-больше
PORT=4000
LISTEN_HOST=127.0.0.1
TRUST_PROXY=1
TRASSA_DATA_DIR=/var/lib/trassa/api-data
CORS_ORIGIN=http://localhost:5173
```

Systemd (скопируйте и поправьте пути из `deploy/trassa-api.service.example`):

```bash
sudo cp /var/www/trassa/my-react-app/deploy/trassa-api.service.example /etc/systemd/system/trassa-api.service
# Отредактируйте WorkingDirectory и User при необходимости
sudo systemctl daemon-reload
sudo systemctl enable --now trassa-api
curl -s http://127.0.0.1:4000/api/health
```

### 4. HTTPS (Let's Encrypt — бесплатно)

```bash
sudo nano /etc/nginx/sites-available/trassa-api
```

Вставьте (замените домен DuckDNS):

```nginx
server {
    listen 80;
    server_name trassa-api.duckdns.org;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/trassa-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d trassa-api.duckdns.org
```

Проверка в браузере:  
`https://trassa-api.duckdns.org/api/health` → `{"ok":true,"service":"trassa-api"}`

### 5. Собрать установщик у себя на Windows

В **`release-config.json`**:

```json
"apiUrl": "https://trassa-api.duckdns.org"
```

```powershell
cd c:\Programm\my-react-app
npm run electron:build
```

Раздайте **`release\trassa-setup-….exe`** всем.

В админке один раз: **«Синхронизировать данные с сервером»**.

---

## Вариант 2 — бесплатно без VPS (ПК в офисе + туннель)

Подходит для **теста** или если есть **всегда включённый** компьютер в офисе.

### 1. API на этом ПК

```powershell
cd c:\Programm\my-react-app\server
copy .env.example .env
# В .env задайте JWT_SECRET (≥32 символа) и TRASSA_DATA_DIR=C:\ProgramData\Trassa\api-data
npm ci
npm run build
$env:LISTEN_HOST="127.0.0.1"
npm start
```

Проверка: `http://127.0.0.1:4000/api/health`

### 2. Туннель Cloudflare (бесплатный HTTPS)

1. Скачать [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. В **новом** терминале:

```powershell
cloudflared tunnel --url http://127.0.0.1:4000
```

3. В выводе будет строка вида **`https://xxxx.trycloudflare.com`** — это ваш временный `apiUrl`.

В **`release-config.json`**:

```json
"apiUrl": "https://xxxx.trycloudflare.com"
```

Соберите установщик и раздайте.

**Минусы:** ссылка **меняется** при каждом новом запуске туннеля (если не настраивать именованный туннель в Cloudflare); ПК выключили — API недоступен.

Для постоянного бесплатного имени на том же ПК можно зарегистрировать [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) и настроить именованный tunnel — сложнее, но URL стабильный.

---

## После настройки — что проверить

1. С двух разных ПК установить одну и ту же сборку `.exe`.
2. Войти админом на `/services`, изменить, например, подпись на карте.
3. На втором ПК через ~30 секунд должно быть то же самое.
4. В GitHub Releases: секрет **`TRASSA_API_URL`** = ваш HTTPS-адрес (без `/` в конце).

---

## Частые вопросы

**Нужен ли сайт в браузере?**  
Нет. Только API и установщик.

**Нужен ли Node на компьютерах пользователей?**  
Нет, если в установщике указан внешний `apiUrl` (удалённый сервер).

**Это точно бесплатно?**  
Oracle Always Free и DuckDNS — 0 ₽ при соблюдении лимитов. Let's Encrypt — 0 ₽. Cloudflare Tunnel — 0 ₽.

**Что если ничего не хочу настраивать в облаке?**  
Тогда синхронизации между разными ПК **не будет** — останется режим «у каждого своя база на диске».
