import { memo, useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  SubjectMarkerGeo,
  FEDERAL_DISTRICTS_GEO,
  formatSubjectDisplayName,
  getRussiaMapBoundsCorners,
  getSubjectsForDistrict,
} from "../data/page2MapGeo";
import russiaAdmin1 from "../data/russiaAdmin1Ne50m.json";
import { cx } from "../design-system/cabinetChromeClasses";
import { V2_PALETTE, V2_RGB } from "../design-system/portal-v2/v2-tokens";
import styles from "./RussiaLeafletMap.module.css";

type Props = {
  selectedDistrict: number | null;
  onToggleDistrict: (districtId: number) => void;
  onSubjectClick: (subject: SubjectMarkerGeo) => void;
  activeSubjectName: string | null;
  activeCategory: "education" | "contractors" | null;
  onCategoryChange: (category: "education" | "contractors") => void;
  educationLabel: string;
  contractorsLabel: string;
  isV2?: boolean;
};

type AdminProps = {
  district: number;
  iso: string;
  name: string;
};

function zoomToPercent(z: number): number {
  const t = (z - 2) / 16;
  return Math.round(50 + t * 250);
}

/** Лёгкая заливка по федеральному округу (legacy / prod). */
function districtFill(districtId: number): string {
  const hues = [168, 172, 178, 182, 165, 175, 185, 170];
  const h = hues[(districtId - 1) % 8];
  return `hsl(${h}, 28%, 96%)`;
}

function adminPolygonStyle(
  feat: GeoJSON.Feature,
  selectedDistrict: number | null,
  isV2: boolean
): L.PathOptions {
  const d = (feat.properties as AdminProps).district;
  const isSel = selectedDistrict != null && selectedDistrict === d;
  if (isV2) {
    return {
      fillColor: isSel ? `rgba(${V2_RGB.primary}, 0.22)` : `rgba(${V2_RGB.surface}, 0.95)`,
      fillOpacity: 1,
      color: isSel ? V2_PALETTE.primary : `rgba(${V2_RGB.muted}, 0.55)`,
      weight: isSel ? 2.2 : 0.75,
      lineJoin: "round",
      lineCap: "round",
    };
  }
  return {
    fillColor: districtFill(d),
    fillOpacity: 1,
    color: isSel ? "#0a2540" : "#8fb8b0",
    weight: isSel ? 1.5 : 0.65,
    lineJoin: "round",
    lineCap: "round",
  };
}

type GlowMarkerVariant = "district" | "districtActive" | "subject" | "subjectActive";

const MARKER_LAYOUT: Record<GlowMarkerVariant, { core: number; pad: number }> = {
  district: { core: 14, pad: 12 },
  districtActive: { core: 16, pad: 16 },
  subject: { core: 10, pad: 10 },
  subjectActive: { core: 12, pad: 12 },
};

function tooltipOffsetFor(variant: GlowMarkerVariant): [number, number] {
  const { core } = MARKER_LAYOUT[variant];
  return [0, -Math.round(core / 2 + 10)];
}

function createGlowMarkerIcon(variant: GlowMarkerVariant): L.DivIcon {
  const { core, pad } = MARKER_LAYOUT[variant];
  const box = core + pad * 2;
  const isMain = variant === "district" || variant === "districtActive";

  let html: string;
  if (isMain) {
    const stateClass = variant === "districtActive" ? styles.markerMainActive : "";
    html = `<span class="${styles.markerMainWrap}${stateClass ? ` ${stateClass}` : ""}" style="--marker-core:${core}px" aria-hidden="true"><span class="${styles.markerMainRing}"></span><span class="${styles.markerMainCore}"></span></span>`;
  } else {
    const cls = variant === "subjectActive" ? styles.markerSubjectActive : styles.markerSubject;
    html = `<span class="${styles.markerSubjectWrap}" style="--marker-core:${core}px" aria-hidden="true"><span class="${cls}"></span></span>`;
  }

  return L.divIcon({
    className: styles.markerIconRoot,
    html,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  });
}

/**
 * Карта РФ: белый фон, границы субъектов (Natural Earth admin-1), цвет фона по федеральному округу.
 */
function RussiaLeafletMapInner({
  selectedDistrict,
  onToggleDistrict,
  onSubjectClick,
  activeSubjectName,
  activeCategory,
  onCategoryChange,
  educationLabel,
  contractorsLabel,
  isV2 = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const adminLayerRef = useRef<L.GeoJSON | null>(null);
  const [zoomLabel, setZoomLabel] = useState(100);
  const [popupPoint, setPopupPoint] = useState<{ x: number; y: number } | null>(null);
  const [popupSubject, setPopupSubject] = useState<SubjectMarkerGeo | null>(null);
  const popupSubjectRef = useRef<SubjectMarkerGeo | null>(null);
  const mapHostSizeRef = useRef<{ w: number; h: number } | null>(null);

  const updatePopupPosition = useCallback(
    (subject: SubjectMarkerGeo | null) => {
      const map = mapRef.current;
      if (!map || !subject) {
        setPopupPoint(null);
        return;
      }
      const point = map.latLngToContainerPoint([subject.lat, subject.lon]);
      setPopupPoint({ x: point.x, y: point.y });
    },
    []
  );

  useEffect(() => {
    popupSubjectRef.current = popupSubject;
  }, [popupSubject]);

  const rebuildMarkers = useCallback(
    (map: L.Map) => {
      const layer = markersLayerRef.current;
      if (!layer) return;
      layer.clearLayers();

      const addGlowMarker = (
        latlng: L.LatLngTuple,
        title: string,
        variant: GlowMarkerVariant,
        onClick: () => void
      ) => {
        const m = L.marker(latlng, { icon: createGlowMarkerIcon(variant) });
        m.bindTooltip(title, {
          direction: "top",
          offset: tooltipOffsetFor(variant),
          className: cx(styles.mapTooltip, isV2 && "map-v2-tooltip"),
        });
        m.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onClick();
        });
        layer.addLayer(m);
      };

      for (const d of FEDERAL_DISTRICTS_GEO) {
        const isSel = selectedDistrict === d.id;
        addGlowMarker(
          d.center as L.LatLngTuple,
          `Округ: ${d.name}`,
          isSel ? "districtActive" : "district",
          () => onToggleDistrict(d.id)
        );
      }

      if (selectedDistrict != null) {
        const subs = getSubjectsForDistrict(selectedDistrict);
        for (const s of subs) {
          const isActive = activeSubjectName === s.name;
          addGlowMarker(
            [s.lat, s.lon],
            s.name,
            isActive ? "subjectActive" : "subject",
            () => {
              setPopupSubject(s);
              updatePopupPosition(s);
              onSubjectClick(s);
            }
          );
        }
      }
    },
    [activeSubjectName, isV2, onSubjectClick, onToggleDistrict, selectedDistrict, updatePopupPosition]
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const { sw, ne } = getRussiaMapBoundsCorners();
    const russiaBounds = L.latLngBounds(sw, ne);
    const maxBounds = russiaBounds.pad(0.1);

    const map = L.map(el, {
      center: russiaBounds.getCenter(),
      zoom: 4,
      minZoom: 3,
      maxZoom: 14,
      worldCopyJump: false,
      zoomControl: false,
      attributionControl: false,
      maxBounds,
      maxBoundsViscosity: 1,
    });

    const adminLayer = L.geoJSON(russiaAdmin1 as GeoJSON.GeoJsonObject, {
      interactive: false,
      style: (feat) => adminPolygonStyle(feat as GeoJSON.Feature, selectedDistrict, isV2),
    }).addTo(map);
    adminLayerRef.current = adminLayer;

    map.fitBounds(russiaBounds, { padding: [20, 22] });
    const zAfterFit = map.getZoom();
    map.setMinZoom(Math.max(2, zAfterFit));

    const markers = L.featureGroup().addTo(map);
    markersLayerRef.current = markers;

    mapRef.current = map;
    setZoomLabel(zoomToPercent(map.getZoom()));

    const onZoom = () => setZoomLabel(zoomToPercent(map.getZoom()));
    map.on("zoomend", onZoom);
    const onMove = () => {
      setZoomLabel(zoomToPercent(map.getZoom()));
      updatePopupPosition(popupSubjectRef.current);
    };
    map.on("move", onMove);

    return () => {
      map.off("zoomend", onZoom);
      map.off("move", onMove);
      markersLayerRef.current = null;
      adminLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- инициализация карты один раз
  }, [updatePopupPosition]);

  useEffect(() => {
    const el = hostRef.current;
    const map = mapRef.current;
    if (!el || !map) return;
    let rafId = 0;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const prev = mapHostSizeRef.current;
      if (
        prev &&
        Math.abs(prev.w - width) < 1 &&
        Math.abs(prev.h - height) < 1
      ) {
        return;
      }
      mapHostSizeRef.current = { w: width, h: height };

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, animate: false });
        updatePopupPosition(popupSubjectRef.current);
      });
    });
    ro.observe(el);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [popupSubject, updatePopupPosition]);

  useEffect(() => {
    const gj = adminLayerRef.current;
    if (!gj) return;
    gj.eachLayer((ly) => {
      const raw = (ly as L.Layer & { feature?: GeoJSON.Feature }).feature;
      if (!raw) return;
      (ly as L.Path).setStyle(adminPolygonStyle(raw, selectedDistrict, isV2));
    });
  }, [selectedDistrict, isV2]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    rebuildMarkers(map);
  }, [rebuildMarkers]);

  useEffect(() => {
    if (!activeSubjectName) {
      setPopupSubject(null);
      setPopupPoint(null);
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const subjects = selectedDistrict != null ? getSubjectsForDistrict(selectedDistrict) : [];
    const found = subjects.find((s) => s.name === activeSubjectName) ?? null;
    setPopupSubject(found);
    updatePopupPosition(found);
  }, [activeSubjectName, selectedDistrict, updatePopupPosition]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn(1);
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut(1);
  }, []);

  return (
    <div className={cx(styles.wrap, isV2 && "map-v2")} lang="ru">
      <div ref={hostRef} className={styles.mapHost} lang="ru" />
      {popupSubject && popupPoint ? (
        <div
          className={cx(styles.subjectPopup, isV2 && "map-v2-popup")}
          style={{
            left: popupPoint.x,
            top: popupPoint.y - 64,
          }}
        >
          <div className={styles.subjectPopupHead}>
            <span className={styles.subjectPopupTitle}>{formatSubjectDisplayName(popupSubject.name)}</span>
            <button
              type="button"
              className={styles.subjectPopupClose}
              aria-label="Закрыть плашку субъекта"
              onClick={() => {
                setPopupSubject(null);
                setPopupPoint(null);
              }}
            >
              ×
            </button>
          </div>
          <div
            className={styles.subjectPopupTabs}
            role="tablist"
            aria-label="Раздел организаций"
            data-active={activeCategory ?? ""}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "education"}
              className={cx(
                styles.subjectPopupTab,
                activeCategory === "education" && styles.subjectPopupTabActive,
              )}
              onClick={() => {
                onCategoryChange("education");
                (document.activeElement as HTMLElement | null)?.blur();
              }}
            >
              {educationLabel}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "contractors"}
              className={cx(
                styles.subjectPopupTab,
                activeCategory === "contractors" && styles.subjectPopupTabActive,
              )}
              onClick={() => {
                onCategoryChange("contractors");
                (document.activeElement as HTMLElement | null)?.blur();
              }}
            >
              {contractorsLabel}
            </button>
          </div>
        </div>
      ) : null}
      <div className={styles.zoomCluster}>
        <button
          type="button"
          className={cx(styles.zoomBtn, isV2 && "map-v2-zoom-btn")}
          onClick={handleZoomIn}
          aria-label="Приблизить карту"
        >
          +
        </button>
        <button
          type="button"
          className={cx(styles.zoomBtn, isV2 && "map-v2-zoom-btn")}
          onClick={handleZoomOut}
          aria-label="Отдалить карту"
        >
          −
        </button>
      </div>
      <div className={cx(styles.scaleReadout, isV2 && "map-v2-scale")}>Масштаб: {zoomLabel}%</div>
    </div>
  );
}

export default memo(RussiaLeafletMapInner);
