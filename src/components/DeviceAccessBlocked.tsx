import { useEffect } from "react";
import { getPortalDesign } from "../design-system/portalDesign";
import { DEVICE_BAN_MESSAGE } from "../api/deviceAccessApi";

type Props = {
  message?: string;
  title?: string;
  /** null — не показывать подсказку внизу */
  hint?: string | null;
};

/** Полноэкранный экран ограничения доступа (без упоминания устройства). */
export default function DeviceAccessBlocked({
  message = DEVICE_BAN_MESSAGE,
  title = "Сервис недоступен",
  hint = null,
}: Props) {
  const isV2 = getPortalDesign() === "v2";

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className={
        isV2
          ? "maintenance-v2 portal-gate-screen portal-gate-screen--solo"
          : undefined
      }
      style={
        isV2
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 2147483646,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
            }
          : {
              position: "fixed",
              inset: 0,
              zIndex: 2147483646,
              background: "linear-gradient(160deg, #1a2744 0%, #0d1526 100%)",
              color: "#e8eef8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
              fontFamily: "var(--font-ui)",
            }
      }
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="portal-gate-title"
    >
      <div
        className={isV2 ? "maintenance-v2__card portal-gate-screen__card" : undefined}
        style={isV2 ? undefined : { maxWidth: 520 }}
      >
        <h1
          id="portal-gate-title"
          className={isV2 ? "maintenance-v2__title portal-gate-screen__title" : undefined}
          style={isV2 ? undefined : { margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}
        >
          {title}
        </h1>
        <p
          className={isV2 ? "portal-gate-screen__message" : undefined}
          style={
            isV2
              ? undefined
              : { margin: 0, lineHeight: 1.55, fontSize: "1rem", color: "#9ca3af" }
          }
        >
          {message}
        </p>
        {hint ? (
          <p
            className={isV2 ? "maintenance-v2__hint portal-gate-screen__hint" : undefined}
            style={
              isV2
                ? undefined
                : {
                    marginTop: 24,
                    fontSize: "0.88rem",
                    opacity: 0.75,
                    lineHeight: 1.45,
                  }
            }
          >
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
