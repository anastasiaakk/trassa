# Админ-панель

Админка встроена в **карту** (`/services` → `ServicesMapPage`) и открывается после входа администратора.

## Файлы

| Файл | Назначение |
|------|------------|
| `src/components/admin/AdminHomeSection.tsx` | Главная: KPI, мониторинг, журнал сбоев |
| `src/components/admin/AdminSettingsSection.tsx` | Настройки: техработы, дизайн, синхронизация |
| `src/api/adminMonitoringApi.ts` | API статистики и инцидентов |
| `src/pages/AdminDashboard.tsx` | Главный shell админки (~500 строк, навигация + layout) |
| `src/pages/AdminLoginPanel.tsx` | Вход |
| `src/pages/AdminTablesPanel.tsx` | Shell таблиц (~90 строк, KPI + навигация) |
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

### RoleSelectPage (выбор роли и вход, маршрут `/page3`)

| Файл | Назначение |
|------|------------|
| `src/pages/RoleSelectPage.tsx` | Shell: выбор роли + обёртка auth |
| `src/hooks/useRoleSelectAuth.ts` | Логика входа, регистрации, восстановления |
| `src/config/roleSelectRoles.ts` | Иконки ролей, тексты, preload |
| `src/components/roleSelect/RoleSelectRoleCard.tsx` | Карточка роли |
| `src/components/roleSelect/RoleSelectAuthForm.tsx` | Shell формы входа |
| `src/components/roleSelect/Page3*FormSection.tsx` | Login / register / forgot секции |

### Мессенджер (кабинеты page5/page6)

| Файл | Назначение |
|------|------------|
| `src/pages/CabinetMessengerView.tsx` | Shell мессенджера |
| `src/hooks/useMessengerState.ts` | Состояние, отправка, приглашения |
| `src/components/messenger/*` | Sidebar, thread, bubbles, диалоги |
| `src/utils/messengerThreadStore.ts` | localStorage peers/threads |
| `src/types/messenger.ts` | Типы сообщений |

### Т-бот (кабинеты, `AiChatBubble`)

| Файл | Назначение |
|------|------------|
| `src/components/AiChatBubble.tsx` | Shell: FAB + панель чата |
| `src/hooks/useTbotChat.ts` | Состояние, drag, отправка, уведомления |
| `src/components/tbot/TbotChatPanel.tsx` | Панель диалога |
| `src/components/tbot/TbotFab.tsx` | Плавающая кнопка |
| `src/components/tbot/tbotConstants.ts` | Размеры, storage позиций |
| `src/utils/messengerTbotNotify.ts` | Красная точка, звук, OS push |

### Формы подрядчика (`ContractorCabinetPage`, `/page4`)

| Файл | Назначение |
|------|------------|
| `src/pages/ContractorFormsView.tsx` | Shell таблиц подрядчика (~95 строк) |
| `src/hooks/useContractorForms.ts` | Назначения, листы, импорт файлов, сохранение |
| `src/components/contractor/ContractorForms*.tsx` | Список, редактор, уведомления, toast |

### Таблицы админки

| Файл | Назначение |
|------|------------|
| `src/pages/AdminTablesPanel.tsx` | Shell: KPI, навигация workspace/monitor/ai |
| `src/hooks/useAdminTablesPanel.ts` | Состояние, синхронизация с API, шаблоны |
| `src/components/admin/AdminTablesWorkspaceSection.tsx` | Список шаблонов + редактор |
| `src/components/admin/AdminTablesEditorBody.tsx` | Вкладки редактора (основное, столбцы, подсказки, назначение) |
| `src/components/admin/AdminTablesMonitorSection.tsx` | Мониторинг заполнения, срезы |
| `src/components/admin/AdminTablesAiSection.tsx` | ИИ-запросы и база промптов |
| `src/components/admin/AdminTablesImportModal.tsx` | Импорт Excel/CSV |
| `src/components/admin/AdminTablesPanelIcons.tsx` | Иконки навигации |
| `src/utils/adminTablesTemplateUtils.ts` | Нормализация шаблонов импорта |

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
