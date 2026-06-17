/**
 * Реквизиты оператора и версия политики — заполните перед продакшеном.
 * Можно переопределить через VITE_PORTAL_OPERATOR_* в .env
 */

export const PORTAL_PRIVACY_POLICY_VERSION = "2025-06-02";

export const PORTAL_OPERATOR = {
  name:
    (import.meta.env.VITE_PORTAL_OPERATOR_NAME as string | undefined)?.trim() ||
    "Оператор портала «ТрассА» (укажите полное наименование юрлица)",
  inn:
    (import.meta.env.VITE_PORTAL_OPERATOR_INN as string | undefined)?.trim() ||
    "0000000000",
  email:
    (import.meta.env.VITE_PORTAL_OPERATOR_EMAIL as string | undefined)?.trim() ||
    "privacy@example.com",
  address:
    (import.meta.env.VITE_PORTAL_OPERATOR_ADDRESS as string | undefined)?.trim() ||
    "Адрес оператора (укажите в VITE_PORTAL_OPERATOR_ADDRESS)",
};

/** Текст подписи на главной (неявное согласие при продолжении использования). */
export const PORTAL_PRIVACY_BROWSE_NOTICE = {
  prefix: "Продолжая, вы соглашаетесь с",
  linkLabel: "Политикой конфиденциальности",
  suffix: ".",
} as const;
