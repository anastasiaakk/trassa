import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SLIDES, type SlideId } from "./presentationConfig";

export function FullscreenPreview({
  open,
  onClose,
  activeSlide,
  onSlideChange,
  children,
}: {
  open: boolean;
  onClose: () => void;
  activeSlide: SlideId;
  onSlideChange: (id: SlideId) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const idx = SLIDES.findIndex((s) => s.id === activeSlide);
      if (e.key === "ArrowLeft" && idx > 0) onSlideChange(SLIDES[idx - 1].id);
      if (e.key === "ArrowRight" && idx < SLIDES.length - 1) onSlideChange(SLIDES[idx + 1].id);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, activeSlide, onSlideChange]);

  if (!open) return null;

  const idx = SLIDES.findIndex((s) => s.id === activeSlide);

  return createPortal(
    <div className="admin-presentation-fullscreen" role="dialog" aria-modal="true" aria-label="Предпросмотр слайда">
      <div className="admin-presentation-fullscreen__toolbar">
        <div className="admin-presentation-fullscreen__tabs">
          {SLIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`admin-presentation-fullscreen__tab${activeSlide === s.id ? " admin-presentation-fullscreen__tab--active" : ""}`}
              onClick={() => onSlideChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="admin-presentation-fullscreen__nav">
          <button
            type="button"
            className="admin-presentation-fullscreen__navbtn"
            disabled={idx <= 0}
            onClick={() => onSlideChange(SLIDES[idx - 1].id)}
            aria-label="Предыдущий слайд"
          >
            ←
          </button>
          <span className="admin-presentation-fullscreen__counter">
            {idx + 1} / {SLIDES.length}
          </span>
          <button
            type="button"
            className="admin-presentation-fullscreen__navbtn"
            disabled={idx >= SLIDES.length - 1}
            onClick={() => onSlideChange(SLIDES[idx + 1].id)}
            aria-label="Следующий слайд"
          >
            →
          </button>
          <button type="button" className="admin-presentation-fullscreen__close" onClick={onClose}>
            Закрыть · Esc
          </button>
        </div>
      </div>
      <div className="admin-presentation-fullscreen__stage">{children}</div>
    </div>,
    document.body
  );
}
