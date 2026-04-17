import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type BusState, getLineColor } from "@/lib/bus-data";

const CARTO_VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_POSITRON = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

const MUNSTER_CENTER: L.LatLngTuple = [51.9607, 7.6261];
const MAX_TRAIL_POINTS = 30;

interface BusMapProps {
  buses: Map<string, BusState>;
  updatedBusId: string | null;
  focusedBusId: string | null;
  mapStyle: "voyager" | "positron";
  userLocation: [number, number] | null;
  showTrails: boolean;
  onMapReady?: (map: L.Map) => void;
}

function createBusIcon(line: string, isStale: boolean, isFlash: boolean, isFocused: boolean): L.DivIcon {
  const color = getLineColor(line);
  const classes = ["bus-marker", isStale ? "stale" : "", isFlash ? "flash" : "", isFocused ? "focused" : ""].filter(Boolean).join(" ");
  return L.divIcon({
    className: "",
    html: `<div class="${classes}" style="background: ${color};">${line}</div>`,
    iconSize: [0, 0],
    iconAnchor: [12, 8],
    popupAnchor: [0, -12],
  });
}

function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="user-location-marker"><div class="user-location-dot"></div><div class="user-location-ring"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function BusMap({ buses, updatedBusId, focusedBusId, mapStyle, userLocation, showTrails, onMapReady }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerSigRef = useRef<Map<string, string>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  // Trail data: bus id -> array of [lat, lng] positions
  const trailDataRef = useRef<Map<string, L.LatLngTuple[]>>(new Map());
  // Trail polylines on map: bus id -> array of polyline segments
  const trailLinesRef = useRef<Map<string, L.Polyline[]>>(new Map());

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MUNSTER_CENTER,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    tileLayerRef.current = L.tileLayer(CARTO_VOYAGER, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    mapRef.current = map;

    // Strip marker transitions on zoom to prevent drift
    map.on("zoomstart", () => {
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        if (el) el.style.transition = "";
      });
    });

    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Tile style switch
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const url = mapStyle === "positron" ? CARTO_POSITRON : CARTO_VOYAGER;
    tileLayerRef.current.setUrl(url);
  }, [mapStyle]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation);
      } else {
        userMarkerRef.current = L.marker(userLocation, { icon: createUserLocationIcon() }).addTo(map);
      }
    } else if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Clear all trail polylines from map
  const clearTrailLines = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    trailLinesRef.current.forEach((lines) => {
      lines.forEach((line) => map.removeLayer(line));
    });
    trailLinesRef.current.clear();
  }, []);

  // When trails are toggled off, remove lines and clear history
  useEffect(() => {
    if (!showTrails) {
      clearTrailLines();
      trailDataRef.current.clear();
    }
  }, [showTrails, clearTrailLines]);

  // Render trail polylines
  const renderTrails = useCallback(() => {
    const map = mapRef.current;
    if (!map || !showTrails) return;

    // Remove old polylines
    clearTrailLines();

    trailDataRef.current.forEach((points, id) => {
      if (points.length < 2) return;
      const bus = buses.get(id);
      if (!bus) return;
      const color = getLineColor(bus.linie);

      // Create segments with fading opacity
      const segments: L.Polyline[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const opacity = 0.2 + (i / (points.length - 1)) * 0.7; // 0.2 to 0.9
        const seg = L.polyline([points[i], points[i + 1]], {
          color,
          weight: 3.5,
          opacity,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        segments.push(seg);
      }
      trailLinesRef.current.set(id, segments);
    });
  }, [buses, showTrails, clearTrailLines]);

  // Sync markers + trails
  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(buses.keys());

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        const el = marker.getElement();
        if (el) {
          const inner = el.querySelector(".bus-marker");
          if (inner) inner.classList.add("removing");
          setTimeout(() => {
            map.removeLayer(marker);
            markersRef.current.delete(id);
            markerSigRef.current.delete(id);
          }, 500);
        } else {
          map.removeLayer(marker);
          markersRef.current.delete(id);
          markerSigRef.current.delete(id);
        }
        // Clean up trail data for removed buses
        trailDataRef.current.delete(id);
      }
    });

    buses.forEach((bus, id) => {
      const pos: L.LatLngTuple = [bus.latitude, bus.longitude];
      const isFlash = id === updatedBusId;
      const isFocused = id === focusedBusId;
      const sig = `${bus.linie}|${bus.isStale}|${isFlash}|${isFocused}`;
      const existing = markersRef.current.get(id);

      // Track trail positions
      if (showTrails) {
        const trail = trailDataRef.current.get(id) || [];
        const last = trail[trail.length - 1];
        // Only add if position actually changed
        if (!last || last[0] !== pos[0] || last[1] !== pos[1]) {
          trail.push(pos);
          if (trail.length > MAX_TRAIL_POINTS) trail.shift();
          trailDataRef.current.set(id, trail);
        }
      }

      if (existing) {
        const oldLatLng = existing.getLatLng();
        const posChanged = oldLatLng.lat !== pos[0] || oldLatLng.lng !== pos[1];
        if (posChanged) {
          const el = existing.getElement();
          if (el) {
            el.style.transition = "transform 800ms ease-out";
            // Remove transition after it completes so zoom doesn't animate
            setTimeout(() => { if (el) el.style.transition = ""; }, 850);
          }
          existing.setLatLng(pos);
        }
        // Only recreate the icon when the visual appearance actually changed
        if (sig !== markerSigRef.current.get(id)) {
          existing.setIcon(createBusIcon(bus.linie, bus.isStale, isFlash, isFocused));
          markerSigRef.current.set(id, sig);
        }
      } else {
        const icon = createBusIcon(bus.linie, bus.isStale, isFlash, isFocused);
        const marker = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(() => {
            const b = buses.get(id);
            if (!b) return "";
            const time = new Date(b.timestamp).toLocaleTimeString("en-GB");
            return `
              <div style="font-family: Inter, sans-serif;">
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
                  Line ${b.linie} → ${b.richtung}
                </div>
                <div style="color: #6e6e73; font-size: 12px;">
                  ${b.fahrtbezeichner}<br/>
                  Last update: ${time}
                </div>
              </div>
            `;
          });

        marker.bindTooltip(`→ ${bus.richtung}`, {
          direction: "top",
          offset: [0, -12],
          className: "bus-tooltip",
        });

        markersRef.current.set(id, marker);
        markerSigRef.current.set(id, sig);
      }
    });

    // Render trails after markers are synced
    renderTrails();
  }, [buses, updatedBusId, focusedBusId, showTrails, renderTrails]);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    />
  );
}
