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

/** Лёгкая заливка по федеральному округу — граница между округами заметнее, чем между субъектами внутри. */
function districtFill(districtId: number): string {
  const hues = [268, 220, 200, 145, 235, 190, 205, 175];
  const h = hues[(districtId - 1) % 8];
  return `hsl(${h}, 14%, 97.2%)`;
}

function adminPolygonStyle(
  feat: GeoJSON.Feature,
  selectedDistrict: number | null
): L.PathOptions {
  const d = (feat.properties as AdminProps).district;
  const isSel = selectedDistrict != null && selectedDistrict === d;
  return {
    fillColor: districtFill(d),
    fillOpacity: 1,
    color: isSel ? "#1e40af" : "#9ca8b8",
    weight: isSel ? 1.5 : 0.65,
    lineJoin: "round",
    lineCap: "round",
  };
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
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const adminLayerRef = useRef<L.GeoJSON | null>(null);
  const [zoomLabel, setZoomLabel] = useState(100);
  const [popupPoint, setPopupPoint] = useState<{ x: number; y: number } | null>(null);
  const [popupSubject, setPopupSubject] = useState<SubjectMarkerGeo | null>(null);
  const popupSubjectRef = useRef<SubjectMarkerGeo | null>(null);

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

      const addDistrict = (
        latlng: L.LatLngTuple,
        title: string,
        fill: string,
        radius: number,
        onClick: () => void
      ) => {
        const m = L.circleMarker(latlng, {
          radius,
          color: "#e2e8f0",
          weight: 2,
          fillColor: fill,
          fillOpacity: 1,
        });
        m.bindTooltip(title, {
          direction: "top",
          offset: [0, -6],
          className: styles.mapTooltip,
        });
        m.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onClick();
        });
        layer.addLayer(m);
      };

      for (const d of FEDERAL_DISTRICTS_GEO) {
        const isSel = selectedDistrict === d.id;
        const fill = isSel ? "#d4a034" : "#2f5f9c";
        addDistrict(
          d.center as L.LatLngTuple,
          `Округ: ${d.name}`,
          fill,
          11,
          () => onToggleDistrict(d.id)
        );
      }

      if (selectedDistrict != null) {
        const subs = getSubjectsForDistrict(selectedDistrict);
        for (const s of subs) {
          addDistrict([s.lat, s.lon], s.name, "#3a8ec4", 7, () => {
            setPopupSubject(s);
            updatePopupPosition(s);
            onSubjectClick(s);
          });
        }
      }
    },
    [onSubjectClick, onToggleDistrict, selectedDistrict, updatePopupPosition]
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
      style: (feat) => adminPolygonStyle(feat as GeoJSON.Feature, selectedDistrict),
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

    const ro = new ResizeObserver(() => {
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
      (ly as L.Path).setStyle(adminPolygonStyle(raw, selectedDistrict));
    });
  }, [selectedDistrict]);

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
    <div className={styles.wrap} lang="ru">
      <div ref={hostRef} className={styles.mapHost} lang="ru" />
      {popupSubject && popupPoint ? (
        <div
          className={styles.subjectPopup}
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
          <div className={styles.subjectPopupActions}>
            <button
              type="button"
              className={`${styles.subjectPopupBtn} ${activeCategory === "education" ? styles.subjectPopupBtnActive : ""}`}
              onClick={() => onCategoryChange("education")}
            >
              {educationLabel} <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              className={`${styles.subjectPopupBtn} ${activeCategory === "contractors" ? styles.subjectPopupBtnActive : ""}`}
              onClick={() => onCategoryChange("contractors")}
            >
              {contractorsLabel} <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      ) : null}
      <div className={styles.zoomCluster}>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={handleZoomIn}
          aria-label="Приблизить карту"
        >
          +
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={handleZoomOut}
          aria-label="Отдалить карту"
        >
          −
        </button>
      </div>
      <div className={styles.scaleReadout}>Масштаб: {zoomLabel}%</div>
    </div>
  );
}

export default memo(RussiaLeafletMapInner);
