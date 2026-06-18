import "../../design-system/portal-v2/admin-presentation.css";
import "../../design-system/portal-v2/admin-presentation-deck.css";
import "../../design-system/portal-v2/admin-presentation-projector.css";
import { SLIDES, ZOOM_MAX, ZOOM_MIN, type SlideId } from "./presentation/presentationConfig";
import { FullscreenPreview } from "./presentation/PresentationFullscreen";
import { renderSlideContent } from "./presentation/presentationSlides";
import { useAdminPresentation } from "../../hooks/useAdminPresentation";

type Props = {
  glassHintClass?: string;
  errorClass?: string;
  btnPrimaryClass?: string;
  btnSecondaryClass?: string;
};

export default function AdminPresentationPanel({
  glassHintClass = "",
  errorClass = "",
  btnPrimaryClass = "",
  btnSecondaryClass = "",
}: Props) {
  const {
    slideRef,
    exportRef,
    previewRef,
    activeSlide,
    setActiveSlide,
    batchSlide,
    fullscreen,
    setFullscreen,
    stats,
    loading,
    exportBusy,
    error,
    notice,
    zoom,
    setZoom,
    reloadStats,
    zoomFit,
    kpis,
    mapSubjects,
    updatedLabel,
    download,
    downloadAll,
    zoomIn,
    zoomOut,
    activeSlideMeta,
  } = useAdminPresentation();

  const renderSlide = (attachRef: boolean, slideId: SlideId = activeSlide) => (
    <div
      className={`trassa-presentation-slide trassa-presentation-slide--${slideId}`}
      ref={attachRef ? slideRef : undefined}
    >
      <div className="tpr-slide-inner">{renderSlideContent(slideId, kpis, stats, updatedLabel, mapSubjects)}</div>
    </div>
  );

  return (
    <div className="admin-presentation-panel">
      <div className="admin-presentation-panel__intro">
        <div>
          <h3 className="admin-presentation-panel__heading">Слайды для презентации</h3>
          <p className={glassHintClass}>
            Восемь слайдов в стиле портала v2: обложка, экосистема, сервисы, устройства, потоки, KPI, ценность и QR-код.
            Цифры подтягиваются из данных портала. Экспорт PNG/JPEG — текущий слайд или все сразу.
          </p>
        </div>
        <div className="admin-presentation-panel__actions">
          <button
            type="button"
            className={btnSecondaryClass}
            onClick={() => setFullscreen(true)}
          >
            На весь экран
          </button>
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={Boolean(exportBusy)}
            onClick={() => void download("png")}
          >
            {exportBusy === "png" ? "Сохранение…" : "PNG"}
          </button>
          <button
            type="button"
            className={btnSecondaryClass}
            disabled={Boolean(exportBusy)}
            onClick={() => void download("jpeg")}
          >
            {exportBusy === "jpeg" ? "Сохранение…" : "JPEG"}
          </button>
          <button
            type="button"
            className={btnSecondaryClass}
            disabled={Boolean(exportBusy)}
            onClick={() => void downloadAll("png")}
          >
            {exportBusy === "all" ? "Сохранение…" : "Все PNG"}
          </button>
          <button
            type="button"
            className={btnSecondaryClass}
            disabled={loading}
            onClick={() => void reloadStats()}
          >
            {loading ? "…" : "Обновить цифры"}
          </button>
        </div>
      </div>

      <div className="admin-presentation-panel__slide-tabs">
        {SLIDES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-presentation-panel__slide-tab${activeSlide === s.id ? " admin-presentation-panel__slide-tab--active" : ""}`}
            onClick={() => setActiveSlide(s.id)}
            title={s.desc}
          >
            <span className="admin-presentation-panel__slide-tab-label">{s.label}</span>
          </button>
        ))}
      </div>

      {activeSlideMeta ? (
        <p className={`admin-presentation-panel__slide-meta ${glassHintClass}`}>
          Слайд «{activeSlideMeta.label}» · {activeSlideMeta.desc}
          {activeSlide === "metrics" || activeSlide === "ecosystem" || activeSlide === "cover"
            ? ` · Данные от ${updatedLabel}`
            : ""}
        </p>
      ) : null}

      <div className="admin-presentation-panel__zoombar">
        <span className="admin-presentation-panel__zoomlabel">Масштаб превью</span>
        <button type="button" className="admin-presentation-panel__zoombtn" onClick={zoomOut} aria-label="Уменьшить">
          −
        </button>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="admin-presentation-panel__zoomrange"
          aria-label="Масштаб"
        />
        <button type="button" className="admin-presentation-panel__zoombtn" onClick={zoomIn} aria-label="Увеличить">
          +
        </button>
        <button type="button" className="admin-presentation-panel__zoomfit" onClick={zoomFit}>
          По ширине
        </button>
        <span className="admin-presentation-panel__meta">{Math.round(zoom * 100)}%</span>
      </div>

      {error ? <p className={errorClass}>{error}</p> : null}
      {notice && !error ? <p className={`admin-presentation-panel__notice ${glassHintClass}`}>{notice}</p> : null}

      <div className="admin-presentation-panel__preview" ref={previewRef}>
        <div className="admin-presentation-panel__scale" style={{ transform: `scale(${zoom})` }}>
          {renderSlide(true)}
        </div>
      </div>

      <FullscreenPreview
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        activeSlide={activeSlide}
        onSlideChange={setActiveSlide}
      >
        {renderSlide(false)}
      </FullscreenPreview>

      {batchSlide ? (
        <div className="admin-presentation-panel__export-host" aria-hidden="true">
          <div className={`trassa-presentation-slide trassa-presentation-slide--${batchSlide}`} ref={exportRef}>
            <div className="tpr-slide-inner">
              {renderSlideContent(batchSlide, kpis, stats, updatedLabel, mapSubjects)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
