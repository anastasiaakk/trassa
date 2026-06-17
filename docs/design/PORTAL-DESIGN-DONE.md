# Редизайн glass v2 — завершён

Все этапы 0–11 из [PORTAL-DESIGN-ROADMAP.md](./PORTAL-DESIGN-ROADMAP.md) реализованы в коде.

## Быстрый старт

| Задача | Действие |
|--------|----------|
| Новый интерфейс | Уже включён по умолчанию (или `trassa-portal-design` = `v2`) |
| Старый вид | [PORTAL-DESIGN-USER.md](./PORTAL-DESIGN-USER.md) → legacy |
| QA перед релизом | [PORTAL-DESIGN-STABILIZATION.md](./PORTAL-DESIGN-STABILIZATION.md) |
| Референсы Figma | [PORTAL-DESIGN-REFERENCES.md](./PORTAL-DESIGN-REFERENCES.md) |
| Текст для пользователей | [PORTAL-DESIGN-RELEASE.md](./PORTAL-DESIGN-RELEASE.md) |
| Откат CSS (разработка) | `node scripts/restore-portal-design.cjs snapshot-…` |

## Ключи localStorage

- `trassa-portal-design` — `v2` | `legacy`
- `trassa-cabinet-theme` — `light` | `dark`
- `trassa-portal-v2-whatsnew-dismissed` — баннер «Новый интерфейс»
- `trassa-ui-sounds` — звук dock в desktop (`1` = вкл)

## Дальнейшая работа

Только **точечные правки** по обратной связи (маршрут + описание) или **коммуникация** (рассылка по RELEASE).
