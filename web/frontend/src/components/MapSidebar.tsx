import { useState } from "react";
import busLogo from "@/assets/bus-logo.png";
import { Search, X, PanelLeftClose, PanelLeftOpen, Info } from "lucide-react";
import type { BusState } from "@/lib/bus-data";
import { getLineColor } from "@/lib/bus-data";

interface MapSidebarProps {
  buses: Map<string, BusState>;
  connected: boolean;
  lastUpdateAgo: number;
  activeLines: Set<string>;
  selectedBuses: Set<string>;
  onToggleLine: (line: string) => void;
  onSelectAllLines: () => void;
  onDeselectAllLines: () => void;
  onToggleBus: (id: string) => void;
  onSelectAllBuses: () => void;
  onDeselectAllBuses: () => void;
  onFocusBus: (bus: BusState) => void;
}

export default function MapSidebar({
  buses,
  connected,
  lastUpdateAgo,
  activeLines,
  selectedBuses,
  onToggleLine,
  onSelectAllLines,
  onDeselectAllLines,
  onToggleBus,
  onSelectAllBuses,
  onDeselectAllBuses,
  onFocusBus,
}: MapSidebarProps) {
  const [busSearchQuery, setBusSearchQuery] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const busCount = buses.size;
  const allLines = Array.from(new Set(Array.from(buses.values()).map((b) => b.linie))).sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true })
  );
  const lineCount = allLines.length;

  // Stable sort by line then fahrtbezeichner
  const activeBuses = Array.from(buses.values())
    .filter((b) => activeLines.has(b.linie))
    .filter(
      (b) =>
        !busSearchQuery ||
        b.linie.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        b.richtung.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        b.fahrtbezeichner.toLowerCase().includes(busSearchQuery.toLowerCase())
    )
    .sort((a, b) => (parseInt(b.delay ?? "0") - parseInt(a.delay ?? "0")) || a.linie.localeCompare(b.linie, undefined, { numeric: true }));

  const statusText = connected
    ? `Updated ${lastUpdateAgo < 60 ? `${lastUpdateAgo}s ago` : `${Math.floor(lastUpdateAgo / 60)}m ago`}`
    : "Reconnecting...";

  const formatAge = (bus: BusState) => {
    const sec = Math.floor((Date.now() - bus.lastUpdate) / 1000);
    return `+${sec}s`;
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="frosted hidden md:flex"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 1000,
          width: 44,
          height: 44,
          borderRadius: 14,
          border: "none",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--br-shadow-control)",
          color: "var(--br-text-secondary)",
          background: "var(--br-panel)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <PanelLeftOpen size={18} />
      </button>
    );
  }

  return (
    <div
      className="frosted hidden md:flex flex-col"
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        bottom: 16,
        width: 320,
        borderRadius: "var(--br-radius-panel)",
        boxShadow: "var(--br-shadow-panel)",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={busLogo} alt="BusRadar" style={{ width: 38, height: 38, borderRadius: 4 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--br-text-primary)", letterSpacing: "-0.01em" }}>BUSRADAR-MS</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: connected ? "rgba(48,209,88,0.15)" : "rgba(255,149,0,0.15)", color: connected ? "#248a3d" : "#c93400", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: "var(--br-radius-pill)", letterSpacing: "0.04em" }}>
            <span className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? "var(--br-live)" : "#ff9500" }} />
            LIVE
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.05)", cursor: "pointer", color: "var(--br-text-tertiary)", transition: "background var(--br-transition-fast)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", padding: "0 16px 12px", gap: 10 }}>
        <div style={{ flex: 1, background: "rgba(0,0,0,0.03)", borderRadius: "var(--br-radius-input)", padding: "8px 10px" }}>
          <div style={{ fontSize: 9, fontWeight: 500, color: "var(--br-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Buses</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--br-text-primary)", lineHeight: 1.2 }}>{busCount}</div>
        </div>
        <div style={{ flex: 1, background: "rgba(0,0,0,0.03)", borderRadius: "var(--br-radius-input)", padding: "8px 10px" }}>
          <div style={{ fontSize: 9, fontWeight: 500, color: "var(--br-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lines</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--br-text-primary)", lineHeight: 1.2 }}>{lineCount}</div>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--br-divider)", margin: "0 16px" }} />

      {/* Line filter */}
      <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--br-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lines</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onSelectAllLines} style={{ fontSize: 10, fontWeight: 600, color: "var(--br-accent)", background: "rgba(0,113,227,0.08)", border: "none", cursor: "pointer", padding: "2px 7px", borderRadius: "var(--br-radius-pill)" }}>All</button>
          <button onClick={onDeselectAllLines} style={{ fontSize: 10, fontWeight: 600, color: "var(--br-text-secondary)", background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", padding: "2px 7px", borderRadius: "var(--br-radius-pill)" }}>None</button>
        </div>
      </div>

      {/* Line chips */}
      <div style={{ padding: "2px 16px 6px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {allLines.map((line) => {
            const isActive = activeLines.has(line);
            const color = getLineColor(line);
            return (
              <button
                key={line}
                onClick={() => onToggleLine(line)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 32,
                  height: 26,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  transition: "all 150ms ease-out",
                  background: isActive ? color : "rgba(0,0,0,0.05)",
                  color: isActive ? "#fff" : "var(--br-text-secondary)",
                  opacity: isActive ? 1 : 0.6,
                  boxShadow: isActive ? `0 2px 6px ${color}40` : "none",
                }}
                aria-label={`Line ${line}`}
              >
                {line}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: "var(--br-divider)", margin: "0 16px" }} />

      {/* Active Buses header */}
      <div style={{ padding: "10px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--br-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active Buses</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--br-accent)" }}>{activeBuses.length}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onSelectAllBuses} style={{ fontSize: 10, fontWeight: 600, color: "var(--br-accent)", background: "rgba(0,113,227,0.08)", border: "none", cursor: "pointer", padding: "2px 7px", borderRadius: "var(--br-radius-pill)" }}>All</button>
          <button onClick={onDeselectAllBuses} style={{ fontSize: 10, fontWeight: 600, color: "var(--br-text-secondary)", background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", padding: "2px 7px", borderRadius: "var(--br-radius-pill)" }}>None</button>
        </div>
      </div>

      {/* Bus search */}
      <div style={{ padding: "0 16px 6px" }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--br-text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search buses..."
            value={busSearchQuery}
            onChange={(e) => setBusSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "5px 26px 5px 26px", borderRadius: "var(--br-radius-input)", border: "1px solid var(--br-divider)", background: "rgba(0,0,0,0.03)", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {busSearchQuery && (
            <button onClick={() => setBusSearchQuery("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2 }} aria-label="Clear bus search">
              <X size={12} color="var(--br-text-tertiary)" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable bus list */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {activeBuses.map((bus) => {
            const color = getLineColor(bus.linie);
            const isSelected = selectedBuses.has(bus.fahrtbezeichner);
            return (
              <div
                key={bus.fahrtbezeichner}
                onClick={() => onFocusBus(bus)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 8px",
                  borderRadius: "var(--br-radius-input)",
                  background: "rgba(0,0,0,0.03)",
                  transition: "all 150ms ease-out",
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.45,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); onFocusBus(bus); }}
                  style={{
                    minWidth: 26,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 5,
                    background: isSelected ? color : "rgba(0,0,0,0.08)",
                    color: isSelected ? "#fff" : "var(--br-text-secondary)",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    cursor: "pointer",
                    transition: "all 150ms ease-out",
                  }}
                >
                  {bus.linie}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--br-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {bus.richtung}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--br-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {bus.fahrtbezeichner}
                  </div>
                </div>
                <div style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: bus.isStale ? "#c93400" : "var(--br-text-secondary)",
                  background: bus.isStale ? "rgba(201,52,0,0.1)" : "rgba(0,0,0,0.05)",
                  padding: "1px 6px",
                  borderRadius: "var(--br-radius-pill)",
                  flexShrink: 0,
                }}>
                  {formatAge(bus)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 6 }} />
      </div>

      {/* About This Project */}
      <div style={{ padding: "0 16px" }}>
        <button
          onClick={() => setShowAbout(!showAbout)}
          style={{ width: "100%", padding: "8px 0", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", borderTop: "1px solid var(--br-divider)" }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--br-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 4 }}>About This Project <Info size={15} /></span>
        </button>
      </div>

      {showAbout && (
        <div style={{ padding: "0 16px 10px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: 1.5, color: "var(--br-text-secondary)" }}>
            Real-time bus tracking for Münster. Data streamed via WebSocket → Kafka → Spark → Flask SSE.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href="https://busradar-ms.live/docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "7px 0",
                borderRadius: 8,
                background: "var(--br-accent)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "inherit",
                transition: "opacity 150ms ease-out",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Documentation
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "7px 0",
                borderRadius: 8,
                background: "rgba(0,0,0,0.06)",
                color: "var(--br-text-primary)",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "inherit",
                transition: "background 150ms ease-out",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
            >
              GitHub
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{ padding: "8px 16px 10px", borderTop: "1px solid var(--br-divider)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "var(--br-text-secondary)" }}
        aria-live="polite"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "var(--br-live)" : "#ff9500", flexShrink: 0 }} />
          {statusText}
        </div>
        <span style={{ fontSize: 11, color: "var(--br-text-tertiary)", fontWeight: 500, letterSpacing: "0.02em" }}>@LennartRosenthal</span>
      </div>
    </div>
  );
}
