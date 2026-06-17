import rateLimit from "express-rate-limit";

const tooManyAttempts = { ok: false, error: "Слишком много попыток. Подождите немного." };

/** Только POST /api/admin/login — опрос дашборда не должен блокировать вход */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много попыток входа. Подождите 15 минут." },
});

/** Регистрация — отдельный лимит на IP (не делим с /me и входом) */
export const authRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
});

/** Вход — считаем только неуспешные попытки */
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: tooManyAttempts,
});

/** /me, profile, logout — мягкий лимит, чтобы не мешать обычной работе */
export const authSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_SESSION_RATE_LIMIT_MAX) || 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
});
