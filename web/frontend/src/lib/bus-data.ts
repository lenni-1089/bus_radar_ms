// Bus line colors matching Stadtwerke Münster branding
export const LINE_COLORS: Record<string, string> = {
  "1": "#e3000f",
  "2": "#006ab3",
  "3": "#00853e",
  "4": "#f39200",
  "5": "#951b81",
  "6": "#009fe3",
  "7": "#d4a800",
  "8": "#e87d1e",
  "9": "#a0c814",
  "10": "#009b77",
  "11": "#c7508f",
  "12": "#6c6e70",
  "13": "#b9373d",
  "14": "#0071e3",
  "15": "#8b6834",
  "16": "#5c8a3c",
  "17": "#da291c",
  "18": "#005f99",
  "19": "#3f6fb5",
  "20": "#4a8c72",
  "22": "#00857c",
  "33": "#7b5ea7",
  "34": "#c26e4f",
  "68": "#2d8e9f",
  "R1": "#006ab3",
  "R2": "#e3000f",
  "R3": "#00853e",
  "R11": "#5a7fbf",
  "R12": "#8a5c9e",
  "R13": "#3d8b6e",
  "N1": "#2c2c2e",
  "N2": "#2c2c2e",
  "N3": "#3a3a3c",
  "N4": "#3a3a3c",
  "E10": "#1a7a5a",
};

const FALLBACK_HUES = [210, 340, 160, 30, 270, 50, 190, 310, 80, 130, 0, 240, 110, 350, 20, 290, 170, 60, 220, 330];

export function getLineColor(line: string): string {
  if (LINE_COLORS[line]) return LINE_COLORS[line];
  let hash = 0;
  for (let i = 0; i < line.length; i++) hash = (hash * 31 + line.charCodeAt(i)) | 0;
  const hue = FALLBACK_HUES[Math.abs(hash) % FALLBACK_HUES.length];
  return `hsl(${hue}, 60%, 45%)`;
}

export interface BusEvent {
  fahrtbezeichner: string;
  linie: string;
  richtung: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  event_type: "MODIFY" | "REMOVE";
  // Extra fields from backend
  delay?: string;
  nachhst?: string;
  akthst?: string;
  starthst?: string;
  zielhst?: string;
  fahrtstatus?: string;
  linienid?: string;
  richtungsid?: string;
  fahrzeugid?: string;
}

export interface BusState extends BusEvent {
  lastUpdate: number;
  isStale: boolean;
}

// Mock data for preview
const MOCK_BUSES: Omit<BusEvent, "timestamp" | "event_type">[] = [
  { fahrtbezeichner: "MS-001", linie: "1", richtung: "Kinderhaus", latitude: 51.965, longitude: 7.618 },
  { fahrtbezeichner: "MS-002", linie: "2", richtung: "Mecklenbeck", latitude: 51.957, longitude: 7.630 },
  { fahrtbezeichner: "MS-003", linie: "3", richtung: "Handorf", latitude: 51.962, longitude: 7.642 },
  { fahrtbezeichner: "MS-004", linie: "4", richtung: "Gievenbeck", latitude: 51.970, longitude: 7.610 },
  { fahrtbezeichner: "MS-005", linie: "5", richtung: "Hiltrup", latitude: 51.950, longitude: 7.625 },
  { fahrtbezeichner: "MS-006", linie: "6", richtung: "Nienberge", latitude: 51.975, longitude: 7.605 },
  { fahrtbezeichner: "MS-007", linie: "7", richtung: "Wolbeck", latitude: 51.948, longitude: 7.650 },
  { fahrtbezeichner: "MS-008", linie: "9", richtung: "Sprakel", latitude: 51.980, longitude: 7.635 },
  { fahrtbezeichner: "MS-009", linie: "10", richtung: "Roxel", latitude: 51.955, longitude: 7.590 },
  { fahrtbezeichner: "MS-010", linie: "11", richtung: "Amelsbüren", latitude: 51.940, longitude: 7.615 },
  { fahrtbezeichner: "MS-011", linie: "14", richtung: "Roxel", latitude: 51.960, longitude: 7.626 },
  { fahrtbezeichner: "MS-012", linie: "14", richtung: "Hiltrup", latitude: 51.952, longitude: 7.638 },
  { fahrtbezeichner: "MS-013", linie: "22", richtung: "Coerde", latitude: 51.972, longitude: 7.640 },
  { fahrtbezeichner: "MS-014", linie: "R1", richtung: "Greven", latitude: 51.985, longitude: 7.622 },
  { fahrtbezeichner: "MS-015", linie: "R2", richtung: "Telgte", latitude: 51.945, longitude: 7.660 },
];

export function createMockStream(onEvent: (event: BusEvent) => void): () => void {
  // Assign a stable mock delay (in seconds) per bus, mostly small, some larger
  const mockDelays = new Map<string, number>();
  MOCK_BUSES.forEach((bus, i) => {
    // mix of on-time, slightly late, very late, and a few early
    const samples = [0, 0, 0, 60, 120, 180, 300, 420, 600, -60, -120];
    mockDelays.set(bus.fahrtbezeichner, samples[i % samples.length]);
  });

  // Send initial positions
  MOCK_BUSES.forEach((bus) => {
    onEvent({
      ...bus,
      delay: String(mockDelays.get(bus.fahrtbezeichner) ?? 0),
      timestamp: new Date().toISOString(),
      event_type: "MODIFY",
    });
  });

  // Animate positions every 2s
  const interval = setInterval(() => {
    const bus = MOCK_BUSES[Math.floor(Math.random() * MOCK_BUSES.length)];
    const drift = () => (Math.random() - 0.5) * 0.002;
    bus.latitude += drift();
    bus.longitude += drift();

    onEvent({
      ...bus,
      delay: String(mockDelays.get(bus.fahrtbezeichner) ?? 0),
      timestamp: new Date().toISOString(),
      event_type: "MODIFY",
    });
  }, 2000);

  return () => clearInterval(interval);
}

/* === SSE ENDPOINT — replace URL for production === */
const SSE_URL = "/stream";

/**
 * The Flask backend sends a full snapshot dict every ~1s:
 *   { "fahrtbezeichner1": { fahrtbezeichner, linie, richtung, latitude, longitude, ... }, ... }
 *
 * We diff against the previous snapshot to produce MODIFY / REMOVE events
 * that the rest of the frontend expects.
 */
export function createSSEStream(onEvent: (event: BusEvent) => void, onStatusChange: (connected: boolean) => void): () => void {
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let previousKeys = new Set<string>();

  function connect() {
    es = new EventSource(SSE_URL);
    
    es.onopen = () => onStatusChange(true);
    
    es.onmessage = (e) => {
      try {
        const snapshot: Record<string, Record<string, unknown>> = JSON.parse(e.data);
        const currentKeys = new Set<string>();

        // Emit MODIFY for every bus in the snapshot
        for (const [key, raw] of Object.entries(snapshot)) {
          currentKeys.add(key);
          const operation = String(raw.operation ?? "MODIFY");
          onEvent({
            fahrtbezeichner: key,
            linie: String(raw.linientext ?? ""),
            richtung: String(raw.richtungstext ?? ""),
            latitude: Number(raw.latitude ?? 0),
            longitude: Number(raw.longitude ?? 0),
            timestamp: new Date().toISOString(),
            event_type: operation === "REMOVE" ? "REMOVE" : "MODIFY",
            delay: raw.delay != null ? String(raw.delay) : undefined,
            nachhst: raw.nachhst != null ? String(raw.nachhst) : undefined,
            akthst: raw.akthst != null ? String(raw.akthst) : undefined,
            starthst: raw.starthst != null ? String(raw.starthst) : undefined,
            zielhst: raw.zielhst != null ? String(raw.zielhst) : undefined,
            fahrtstatus: raw.fahrtstatus != null ? String(raw.fahrtstatus) : undefined,
            linienid: raw.linienid != null ? String(raw.linienid) : undefined,
            richtungsid: raw.richtungsid != null ? String(raw.richtungsid) : undefined,
            fahrzeugid: raw.fahrzeugid != null ? String(raw.fahrzeugid) : undefined,
          });
        }

        // Emit REMOVE for buses that disappeared from snapshot
        for (const key of previousKeys) {
          if (!currentKeys.has(key)) {
            onEvent({
              fahrtbezeichner: key,
              linie: "",
              richtung: "",
              latitude: 0,
              longitude: 0,
              timestamp: new Date().toISOString(),
              event_type: "REMOVE",
            });
          }
        }

        previousKeys = currentKeys;
      } catch { /* skip malformed */ }
    };

    es.onerror = () => {
      onStatusChange(false);
      es?.close();
      reconnectTimer = setTimeout(connect, 5000);
    };
  }

  connect();

  return () => {
    es?.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}
