# Резервная копия дизайна портала

Перед редизайном (glass / SaaS по Behance-референсам) здесь хранятся **снимки** текущих стилей.

## Создать снимок

```bash
cd my-react-app
node scripts/backup-portal-design.cjs
```

Появится папка `design-legacy/snapshot-ГГГГ-ММ-ДД/` со всеми `.css`, `cabinetPalettes.ts` и `MANIFEST.json`.

## Вернуть старый вид

```bash
node scripts/restore-portal-design.cjs snapshot-2026-05-20
```

(подставьте имя своей папки)

После восстановления: **Ctrl+F5** в браузере.

## Мой закреплённый дизайн (текущий вид в проекте)

```bash
npm run design:pin          # сохранить CSS из src → design-legacy/my-design
npm run design:restore-pin  # вернуть файлы из my-design
```

В админке (Настройки): **«Сохранить мой текущий дизайн»** / **«Вернуть мой сохранённый дизайн»** — переключатели legacy/v2, фон Page2, сезон (и на сервер при API).

## Новый дизайн (v2)

Включается отдельно, не трогая снимок:

- в консоли: `localStorage.setItem('trassa-portal-design','v2')` + перезагрузка
- обратно: `localStorage.setItem('trassa-portal-design','legacy')` или удалить ключ

Превью компонентов: маршрут `/design-preview` (когда подключён в App).

Документация по v2: [../docs/design/PORTAL-DESIGN-V2-MASTER.md](../docs/design/PORTAL-DESIGN-V2-MASTER.md).
