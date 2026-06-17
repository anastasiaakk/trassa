import { useEffect } from "react";
import "../design-system/portal-v2/portal-violation-warning.css";

type Props = {
  open: boolean;
  onDismiss: () => void;
};

const AUTO_CLOSE_MS = 12_000;

export default function PortalViolationWarning({ open, onDismiss }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onDismiss, AUTO_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="portal-violation-warning"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="portal-violation-title"
      onClick={onDismiss}
    >
      <div
        className="portal-violation-warning__card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="portal-violation-warning__finger" aria-hidden>
          <span className="portal-violation-warning__finger-emoji">☝️</span>
        </div>
        <h2 id="portal-violation-title" className="portal-violation-warning__title">
          Кажется, вы пытались нарушить права портала ТрассА
        </h2>
        <p className="portal-violation-warning__text">
          Данное действие зафиксировано у администратора. Повторные попытки снимать или
          копировать содержимое портала также записываются.
        </p>
        <button
          type="button"
          className="portal-violation-warning__btn"
          onClick={onDismiss}
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
