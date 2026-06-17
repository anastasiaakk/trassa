# Админ-панель

Админка встроена в **карту** (`/services` → Page2) и открывается после входа администратора.

## Файлы

| Файл | Назначение |
|------|------------|
| `src/components/admin/AdminHomeSection.tsx` | Главная: KPI, мониторинг, журнал сбоев |
| `src/components/admin/AdminSettingsSection.tsx` | Настройки: техработы, дизайн, синхронизация |
| `src/api/adminMonitoringApi.ts` | API статистики и инцидентов |
| `src/pages/AdminDashboard.tsx` | Главный shell админки (~500 строк, навигация + layout) |
| `src/pages/AdminLoginPanel.tsx` | Вход |
| `src/pages/AdminTablesPanel.tsx` | Таблицы |
| `src/pages/AdminSpecializationsPanel.tsx` | Специализации |
| `src/pages/AdminDesignSystemPanel.tsx` | Настройки дизайна |
| `src/components/admin/AdminDevicesPanel.tsx` | Устройства, бан |
| `src/components/admin/AdminViolationsPanel.tsx` | Нарушения (скриншоты) |
| `src/components/admin/AdminPresentationPanel.tsx` | Презентация |
| `src/components/admin/AdminUsersPanel.tsx` | Таблица и CRUD пользователей |
| `src/components/admin/AdminUsersSection.tsx` | Секция «Пользователи» (collapse + поиск) |
| `src/components/admin/AdminContractorsSection.tsx` | Организации подрядчиков |
| `src/components/admin/AdminMapSection.tsx` | Редактирование карты (субъекты, метки) |
| `src/hooks/useMapSubjectOrganizations.ts` | Данные организаций на карте |
| `src/components/admin/AdminAccountSection.tsx` | Аккаунт: пароль, быстрые ссылки |
| `src/components/admin/AdminReleaseSection.tsx` | Публикация .exe обновлений |
| `src/utils/adminRouteState.ts` | Секции и URL state |
| `src/utils/adminAuth.ts` | Сессия админа |

## Правило для новых фич

**Не добавляйте код в `AdminDashboard.tsx`.** Создавайте:

```
src/components/admin/AdminMyFeaturePanel.tsx
```

и подключайте через существующий роутинг секций в `adminRouteState.ts`.

## API

- Заголовок: `X-Trassa-Admin-Token` (sessionStorage)
- Роуты: `server/src/routes/admin*.ts`
- Клиент: `src/api/adminApi.ts`, `adminFormsApi.ts`, …

## Проверка устройств

```bash
python scripts/probe-admin-devices.py
node scripts/probe-device-ban-api.mjs
```
