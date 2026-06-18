import { memo, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import russiaAdmin1 from "../../data/russiaAdmin1Ne50m.json";
import {
  FEDERAL_DISTRICTS_GEO,
  getRussiaMapBoundsCorners,
} from "../../data/page2MapGeo";
import { V2_RGB } from "../../design-system/portal-v2/v2-tokens";
import {
  resolvePresentationMapMarkers,
  type PresentationMapMarker,
} from "../../utils/presentationMapMarkers";
import mapStyles from "../RussiaLeafletMap.module.css";

export type MapPreviewSize = "sm" | "md" | "lg";

type Props = {
  className?: string;
  size?: MapPreviewSize;
  activeSubjectNames: string[];
  onReady?: () => void;
};

const MARKER_SCALE: Record<MapPreviewSize, { subject: number; district: number }> = {
  sm: { subject: 13, district: 14 },
  md: { subject: 18, district: 16 },
  lg: { subject: 22, district: 18 },
};

function adminPolygonStyle(): L.PathOptions {
  return {
    fillColor: `rgba(${V2_RGB.surface}, 0.96)`,
    fillOpacity: 1,
    color: `rgba(${V2_RGB.muted}, 0.5)`,
    weight: 0.85,
    lineJoin: "round",
    lineCap: "round",
  };
}

function createSubjectIcon(core: number, active: boolean): L.DivIcon {
  const pad = Math.round(core * 0.95);
  const box = core + pad * 2;
  const cls = active ? mapStyles.markerSubjectActive : mapStyles.markerSubject;
  const html = `<span class="${mapStyles.markerSubjectWrap}" style="--marker-core:${core}px" aria-hidden="true"><span class="${cls}"></span></span>`;
  return L.divIcon({
    className: mapStyles.markerIconRoot,
    html,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  });
}

function createDistrictIcon(core: number): L.DivIcon {
  const pad = Math.round(core * 0.85);
  const box = core + pad * 2;
  const html = `<span class="${mapStyles.markerMainWrap}" style="--marker-core:${core}px" aria-hidden="true"><span class="${mapStyles.markerMainRing}"></span><span class="${mapStyles.markerMainCore}"></span></span>`;
  return L.divIcon({
    className: mapStyles.markerIconRoot,
    html,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  });
}

function addMarkers(
  map: L.Map,
  markers: PresentationMapMarker[],
  scale: { subject: number; district: number },
  showDistrictHubs: boolean
) {
  const layer = L.featureGroup().addTo(map);
  const subjectCoords: L.LatLngTuple[] = [];

  if (showDistrictHubs) {
    const districtIcon = createDistrictIcon(scale.district);
    for (const d of FEDERAL_DISTRICTS_GEO) {
      L.marker(d.center as L.LatLngTuple, { icon: districtIcon, interactive: false, zIndexOffset: 100 }).addTo(
        layer
      );
    }
  }

  for (const item of markers) {
    const core = scale.subject + Math.min(4, item.orgCount > 2 ? 2 : item.orgCount > 1 ? 1 : 0);
    const icon = createSubjectIcon(core, true);
    const latlng: L.LatLngTuple = [item.subject.lat, item.subject.lon];
    L.marker(latlng, { icon, interactive: false, zIndexOffset: 400 }).addTo(layer);
    subjectCoords.push(latlng);
  }

  return subjectCoords;
}

function PresentationRussiaMapInner({
  className = "",
  size = "md",
  activeSubjectNames,
  onReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const markers = useMemo(
    () => resolvePresentationMapMarkers(activeSubjectNames),
    [activeSubjectNames]
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const scale = MARKER_SCALE[size];
    const showDistrictHubs = size !== "sm";
    const { sw, ne } = getRussiaMapBoundsCorners();
    const russiaBounds = L.latLngBounds(sw, ne);

    const map = L.map(el, {
      center: russiaBounds.getCenter(),
      zoom: 4,
      minZoom: 2,
      maxZoom: 9,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    L.geoJSON(russiaAdmin1 as GeoJSON.GeoJsonObject, {
      interactive: false,
      style: () => adminPolygonStyle(),
    }).addTo(map);

    addMarkers(map, markers, scale, showDistrictHubs);

    const padY = size === "lg" ? 6 : size === "md" ? 8 : 10;
    const padX = size === "lg" ? 4 : 6;
    map.fitBounds(russiaBounds, { padding: [padY, padX], animate: false });

    let readyTimer = 0;
    const notifyReady = () => {
      map.invalidateSize({ pan: false, animate: false });
      readyTimer = window.setTimeout(() => onReadyRef.current?.(), 220);
    };

    const raf = requestAnimationFrame(notifyReady);

    return () => {
      cancelAnimationFrame(raf);
      if (readyTimer) window.clearTimeout(readyTimer);
      map.remove();
    };
  }, [markers, size]);

  return (
    <div
      className={`presentation-russia-map map-v2 presentation-russia-map--${size} ${className}`.trim()}
      aria-hidden="true"
      data-markers={markers.length}
    >
      <div ref={hostRef} className={mapStyles.mapHost} />
      {markers.length > 0 ? (
        <span className="presentation-russia-map__badge">{markers.length} меток</span>
      ) : null}
    </div>
  );
}

export default memo(PresentationRussiaMapInner);
