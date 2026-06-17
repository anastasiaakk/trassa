import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { adminStatsRouter } from "./routes/adminStats.js";
import { adminAppUpdateRouter, appUpdateRouter } from "./routes/appUpdate.js";
import { diagnosticsRouter } from "./routes/diagnostics.js";
import { portalRouter } from "./routes/portal.js";
import {
  adminSpecializationsRouter,
  publicSpecializationsRouter,
} from "./routes/adminSpecializations.js";
import { distributionRouter } from "./routes/distribution.js";
import { adminFormsRouter } from "./routes/adminForms.js";
import { adminAiRouter } from "./routes/adminAi.js";
import { contractorFormsRouter } from "./routes/contractorForms.js";
import { formsManageRouter } from "./routes/formsManage.js";
import { tbotRouter } from "./routes/tbot.js";
import { adminDevicesRouter, devicesRouter } from "./routes/devices.js";
import { adminViolationsRouter, violationsRouter } from "./routes/violations.js";
import { portalDeviceAccessMiddleware } from "./middleware/portalDeviceAccess.js";
import { portalRegionGateMiddleware } from "./middleware/portalRegionGate.js";

function resolveTrustProxy(): boolean | number {
  const v = (process.env.TRUST_PROXY ?? "").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  if (v === "1" || v === "true" || v === "yes") return 1;
  if (process.env.NODE_ENV === "production") return 1;
  return false;
}

function isPrivateOrLocalDevOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Создаёт Express-приложение API (без listen). Используется в index.ts и интеграционных тестах. */
export function createApp() {
  const CORS_ORIGIN =
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174";
  const allowedOrigins = CORS_ORIGIN.split(",").map((s) => s.trim());

  const app = express();
  app.set("trust proxy", resolveTrustProxy());

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === "null") {
          callback(null, true);
          return;
        }
        if (origin.startsWith("file:")) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        if (isPrivateOrLocalDevOrigin(origin)) {
          callback(null, true);
          return;
        }
        try {
          const host = new URL(origin).hostname;
          if (
            host === "trassa.duckdns.org" ||
            host.endsWith(".duckdns.org") ||
            host === "localhost" ||
            host === "127.0.0.1"
          ) {
            callback(null, true);
            return;
          }
        } catch {
          /* ignore malformed origin */
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Trassa-Admin-Token",
        "X-Pv2-Csid",
        "X-Pv2-Ctx",
        "X-Trassa-Device-Id",
        "X-Trassa-Device-Label",
        "X-Trassa-Screen-W",
        "X-Trassa-Screen-H",
        "X-Trassa-Dpr",
        "X-Trassa-Gpu-Renderer",
        "X-Trassa-Ios-Major",
        "X-Trassa-Device-Model",
        "X-Trassa-Model-Confidence",
        "X-Trassa-Model-Source",
        "X-Trassa-Hint-Model",
      ],
    }),
  );

  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());
  app.use(portalRegionGateMiddleware);
  app.use(portalDeviceAccessMiddleware);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "trassa-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/devices", devicesRouter);
  app.use("/api/violations", violationsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/admin", adminDevicesRouter);
  app.use("/api/admin", adminViolationsRouter);
  app.use("/api/admin", adminStatsRouter);
  app.use("/api/admin", adminSpecializationsRouter);
  app.use("/api/admin", adminFormsRouter);
  app.use("/api/admin", adminAiRouter);
  app.use("/api", contractorFormsRouter);
  app.use("/api", formsManageRouter);
  app.use("/api", tbotRouter);
  app.use("/api/specializations", publicSpecializationsRouter);
  app.use("/api/distribution", distributionRouter);
  app.use("/api/diagnostics", diagnosticsRouter);
  app.use("/api/portal", portalRouter);
  app.use("/api/app-update", appUpdateRouter);
  app.use("/api/admin/app-update", adminAppUpdateRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && err.message.includes("JSON")) {
      res.status(400).json({ ok: false, error: "Некорректный JSON в теле запроса." });
      return;
    }
    next(err);
  });

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Not found" });
  });

  return app;
}
