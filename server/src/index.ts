import "dotenv/config";
import "./bootstrapEnv.js";
import { createApp } from "./createApp.js";

const PORT = Number(process.env.PORT) || 4000;
/** По умолчанию только localhost; для доступа из сети задайте LISTEN_HOST=0.0.0.0 (см. docs/deploy/DEPLOY.md). */
const LISTEN_HOST = process.env.LISTEN_HOST || "127.0.0.1";
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174";

const app = createApp();

app.listen(PORT, LISTEN_HOST, () => {
  const hint =
    LISTEN_HOST === "0.0.0.0" || LISTEN_HOST === "::"
      ? " (доступен по IP машины; за прокси обычно LISTEN_HOST=127.0.0.1)"
      : "";
  console.log(`Trassa API listening on http://${LISTEN_HOST}:${PORT}${hint}`);
  console.log(`CORS origin(s): ${CORS_ORIGIN}`);
});
