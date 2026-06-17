import { memo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  label?: string;
  className?: string;
};

function AdminDeviceGeoMapInner({ lat, lng, accuracyM, label, className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const map = L.map(host, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const center: L.LatLngExpression = [lat, lng];
    const acc =
      accuracyM != null && Number.isFinite(accuracyM) && accuracyM > 0
        ? Math.min(accuracyM, 5_000)
        : null;

    if (acc && acc < 4_000) {
      L.circle(center, {
        radius: acc,
        color: "#0d9488",
        fillColor: "#14b8a6",
        fillOpacity: 0.18,
        weight: 1.5,
      }).addTo(map);
    }

    const marker = L.circleMarker(center, {
      radius: 9,
      color: "#0f766e",
      fillColor: "#14b8a6",
      fillOpacity: 0.95,
      weight: 2,
    }).addTo(map);
    if (label) marker.bindPopup(label);

    const zoom = acc != null && acc < 80 ? 17 : acc != null && acc < 400 ? 15 : acc != null && acc < 3000 ? 13 : 11;
    map.setView(center, zoom);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(host);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, accuracyM, label]);

  return (
    <div
      ref={hostRef}
      className={className ?? "admin-devices-panel__geo-map"}
      role="img"
      aria-label={label ?? "Карта местоположения устройства"}
    />
  );
}

export default memo(AdminDeviceGeoMapInner);
