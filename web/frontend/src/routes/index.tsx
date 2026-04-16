import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import type L from "leaflet";
import BusMap from "@/components/BusMap";
import MapSidebar from "@/components/MapSidebar";
import MapControls from "@/components/MapControls";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import { type BusState, type BusEvent, createMockStream, createSSEStream } from "@/lib/bus-data";

export const Route = createFileRoute("/")({
  component: BusradarApp,
  head: () => ({
    meta: [
      { title: "Busradar MS — Live Bus Tracking Münster" },
      { name: "description", content: "Real-time positions of all Stadtwerke Münster buses on an interactive map." },
      { property: "og:title", content: "Busradar MS — Live Bus Tracking" },
      { property: "og:description", content: "Real-time bus positions in Münster." },
    ],
  }),
});

const USE_MOCK = false;

function BusradarApp() {
  const [buses, setBuses] = useState<Map<string, BusState>>(new Map());
  const [connected, setConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [lastUpdateAgo, setLastUpdateAgo] = useState(0);
  const [updatedBusId, setUpdatedBusId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"voyager" | "positron">("voyager");
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set());
  const [selectedBuses, setSelectedBuses] = useState<Set<string>>(new Set());
  const [allLinesInit, setAllLinesInit] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showTrails, setShowTrails] = useState(true);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleEvent = useCallback((event: BusEvent) => {
    setBuses((prev) => {
      const next = new Map(prev);
      if (event.event_type === "REMOVE") {
        next.delete(event.fahrtbezeichner);
      } else {
        next.set(event.fahrtbezeichner, {
          ...event,
          lastUpdate: Date.now(),
          isStale: false,
        });
      }
      return next;
    });

    if (event.event_type === "MODIFY") {
      setUpdatedBusId(event.fahrtbezeichner);
      setTimeout(() => setUpdatedBusId(null), 250);
    }

    setLastUpdateTime(Date.now());
    setConnected(true);
  }, []);

  useEffect(() => {
    const cleanup = USE_MOCK
      ? createMockStream(handleEvent)
      : createSSEStream(handleEvent, setConnected);
    return cleanup;
  }, [handleEvent]);

  useEffect(() => {
    if (!allLinesInit && buses.size > 0) {
      const allLineSet = new Set(Array.from(buses.values()).map((b) => b.linie));
      setActiveLines(allLineSet);
      // Select all buses by default
      setSelectedBuses(new Set(Array.from(buses.keys())));
      setAllLinesInit(true);
    }
  }, [buses, allLinesInit]);

  // Only auto-add genuinely new buses (first appearance), not on every position update
  const knownBusIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (allLinesInit) {
      setSelectedBuses((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of buses.keys()) {
          if (!knownBusIds.current.has(id)) {
            knownBusIds.current.add(id);
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [buses, allLinesInit]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLastUpdateAgo(Math.floor((now - lastUpdateTime) / 1000));
      setBuses((prev) => {
        let changed = false;
        const next = new Map(prev);
        next.forEach((bus, id) => {
          const stale = now - bus.lastUpdate > 60000;
          if (bus.isStale !== stale) {
            next.set(id, { ...bus, isStale: stale });
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  // Filter: line must be active AND bus must be selected
  const filteredBuses = new Map(
    Array.from(buses.entries()).filter(([id, b]) => activeLines.has(b.linie) && selectedBuses.has(id))
  );

  const toggleLine = (line: string) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const selectAllLines = () => {
    setActiveLines(new Set(Array.from(buses.values()).map((b) => b.linie)));
  };

  const deselectAllLines = () => {
    setActiveLines(new Set());
  };

  const toggleBus = (id: string) => {
    setSelectedBuses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllBuses = () => {
    setSelectedBuses(new Set(Array.from(buses.keys())));
  };

  const deselectAllBuses = () => {
    setSelectedBuses(new Set());
  };

  const handleFocusBus = (bus: BusState) => {
    mapInstanceRef.current?.flyTo([bus.latitude, bus.longitude], 16, { duration: 1.2 });
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        mapInstanceRef.current?.setView(loc, 15);
      },
      () => {}
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <BusMap
        buses={filteredBuses}
        updatedBusId={updatedBusId}
        mapStyle={mapStyle}
        userLocation={userLocation}
        showTrails={showTrails}
        onMapReady={(map) => {
          mapInstanceRef.current = map;
        }}
      />

      <MapSidebar
        buses={buses}
        connected={connected}
        lastUpdateAgo={lastUpdateAgo}
        activeLines={activeLines}
        selectedBuses={selectedBuses}
        onToggleLine={toggleLine}
        onSelectAllLines={selectAllLines}
        onDeselectAllLines={deselectAllLines}
        onToggleBus={toggleBus}
        onSelectAllBuses={selectAllBuses}
        onDeselectAllBuses={deselectAllBuses}
        onFocusBus={handleFocusBus}
      />

      <MapControls
        mapStyle={mapStyle}
        showTrails={showTrails}
        onToggleStyle={() => setMapStyle((s) => (s === "voyager" ? "positron" : "voyager"))}
        onLocateUser={handleLocateUser}
        onToggleTrails={() => setShowTrails((s) => !s)}
        onZoomIn={() => mapInstanceRef.current?.zoomIn()}
        onZoomOut={() => mapInstanceRef.current?.zoomOut()}
      />

      <MobileBottomSheet
        buses={buses}
        connected={connected}
        lastUpdateAgo={lastUpdateAgo}
        activeLines={activeLines}
        selectedBuses={selectedBuses}
        onToggleLine={toggleLine}
        onSelectAllLines={selectAllLines}
        onDeselectAllLines={deselectAllLines}
        onToggleBus={toggleBus}
        onFocusBus={handleFocusBus}
      />
    </div>
  );
}
