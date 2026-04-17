import { useState, useCallback, useRef } from "react";
import { Search, X, ChevronUp, Info } from "lucide-react";
import type { BusState } from "@/lib/bus-data";
import { getLineColor } from "@/lib/bus-data";

type SnapPoint = "peek" | "full";

const PEEK_HEIGHT = 72;
const FULL_RATIO = 0.92;

interface MobileBottomSheetProps {
  buses: Map<string, BusState>;
  connected: boolean;
  lastUpdateAgo: number;
  activeLines: Set<string>;
  selectedBuses: Set<string>;
  onToggleLine: (line: string) => void;
  onSelectAllLines: () => void;
  onDeselectAllLines: () => void;
  onToggleBus: (id: string) => void;
  onFocusBus: (bus: BusState) => void;
}

export default function MobileBottomSheet({
  buses,
  connected,
  lastUpdateAgo,
  activeLines,
  selectedBuses,
  onToggleLine,
  onSelectAllLines,
  onDeselectAllLines,
  onToggleBus,
  onFocusBus,
}: MobileBottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [busSearchQuery, setBusSearchQuery] = useState("");
  const [showAllBuses, setShowAllBuses] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(PEEK_HEIGHT);

  const getHeight = useCallback((s: SnapPoint) => {
    if (s === "peek") return PEEK_HEIGHT;
    return window.innerHeight * FULL_RATIO;
  }, []);

  const currentHeight =
    dragOffset !== null ? dragOffset : getHeight(snap);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      dragStartY.current = e.touches[0].clientY;
      dragStartHeight.current = getHeight(snap);
    },
    [snap, getHeight]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = dragStartY.current - e.touches[0].clientY;
    const newH = Math.max(PEEK_HEIGHT, Math.min(window.innerHeight * FULL_RATIO, dragStartHeight.current + dy));
    setDragOffset(newH);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragOffset === null) return;
    const peekH = PEEK_HEIGHT;
    const fullH = window.innerHeight * FULL_RATIO;
    const mid = (peekH + fullH) / 2;
    setSnap(dragOffset < mid ? "peek" : "full");
    setDragOffset(null);
    dragStartY.current = null;
  }, [dragOffset]);

  const handleHandleClick = useCallback(() => {
    setSnap((s) => (s === "peek" ? "full" : "peek"));
  }, []);

  const allLines = Array.from(new Set(Array.from(buses.values()).map((b) => b.linie))).sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true })
  );

  const activeBuses = Array.from(buses.values())
    .filter((b) => activeLines.has(b.linie))
    .filter(
      (b) =>
        !busSearchQuery ||
        b.linie.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        b.richtung.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        b.fahrtbezeichner.toLowerCase().includes(busSearchQuery.toLowerCase())
    )
    .sort(
      (a, b) =>
        parseInt(b.delay ?? "0") - parseInt(a.delay ?? "0") ||
        a.linie.localeCompare(b.linie, undefined, { numeric: true })
    );

  const visibleBuses = activeBuses.slice(0, showAllBuses ? undefined : 8);

  const statusText = connected
    ? `Updated ${lastUpdateAgo < 60 ? `${lastUpdateAgo}s ago` : `${Math.floor(lastUpdateAgo / 60)}m ago`}`
    : "Reconnecting...";

  return (
    <div
      className="flex md:hidden"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: currentHeight,
        zIndex: 1000,
        flexDirection: "column",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.1), 0 -1px 4px rgba(0,0,0,0.06)",
        transition: dragOffset !== null ? "none" : "height 350ms cubic-bezier(0.32, 0.72, 0, 1)",
        overflow: "hidden",
        touchAction: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle + peek bar */}
      <div
        onClick={handleHandleClick}
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          paddingTop: 8,
          paddingBottom: 6,
        }}
      >
        {/* Grab bar */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(0,0,0,0.15)",
            marginBottom: 8,
          }}
        />
        {/* Peek row */}
        <div
          style={{
            width: "100%",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--br-live)" : "#ff9500",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--br-text-primary)" }}>
              {buses.size} buses
            </span>
            <span style={{ fontSize: 11, color: "var(--br-text-secondary)" }}>{statusText}</span>
          </div>
          <ChevronUp
            size={18}
            color="var(--br-text-tertiary)"
            style={{
              transform: snap === "full" ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 300ms ease",
            }}
          />
        </div>
      </div>

      {/* Scrollable content — only visible when expanded */}
      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}
      >
        {/* Line filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 0 4px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--br-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Lines
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onSelectAllLines}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--br-accent)",
                background: "rgba(0,113,227,0.08)",
                border: "none",
                cursor: "pointer",
                padding: "2px 7px",
                borderRadius: "var(--br-radius-pill)",
              }}
            >
              All
            </button>
            <button
              onClick={onDeselectAllLines}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--br-text-secondary)",
                background: "rgba(0,0,0,0.05)",
                border: "none",
                cursor: "pointer",
                padding: "2px 7px",
                borderRadius: "var(--br-radius-pill)",
              }}
            >
              None
            </button>
          </div>
        </div>

        {/* Line chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 8 }}>
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

        <div style={{ height: 1, background: "var(--br-divider)", margin: "0 0 8px" }} />

        {/* Bus search */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--br-text-tertiary)",
            }}
          />
          <input
            type="text"
            placeholder="Search buses..."
            value={busSearchQuery}
            onChange={(e) => setBusSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "5px 26px 5px 26px",
              borderRadius: "var(--br-radius-input)",
              border: "1px solid var(--br-divider)",
              background: "rgba(0,0,0,0.03)",
              fontSize: 12,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          {busSearchQuery && (
            <button
              onClick={() => setBusSearchQuery("")}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
              }}
              aria-label="Clear bus search"
            >
              <X size={12} color="var(--br-text-tertiary)" />
            </button>
          )}
        </div>

        {/* Bus list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {visibleBuses.map((bus) => {
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
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.45,
                }}
              >
                <div
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
                  }}
                >
                  {bus.linie}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--br-text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {bus.richtung}
                  </div>
                  {(() => {
                    const d = parseInt(bus.delay || "0", 10) || 0;
                    if (d === 0) return null;
                    const mins = Math.round(d / 60);
                    const late = d > 0;
                    return (
                      <div style={{ fontSize: 9, fontWeight: 600, color: d < -600 ? "var(--br-text-tertiary)" : late ? "#c93400" : "#248a3d", whiteSpace: "nowrap" }}>
                        {d < -600 ? "Not started yet" : late ? `+${mins} min late` : `${mins} min early`}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const sec = Math.floor((Date.now() - bus.lastUpdate) / 1000);
                  if (sec <= 30) return null;
                  const label = sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.floor(sec / 60)}m` : `${Math.floor(sec / 3600)}h`;
                  return (
                    <div
                      title={`Last position update was ${label} ago`}
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: "var(--br-text-secondary)",
                        background: "rgba(0,0,0,0.06)",
                        padding: "2px 7px",
                        borderRadius: "var(--br-radius-pill)",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      no signal {label}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Show all / show less toggle */}
        {activeBuses.length > 8 && (
          <button
            onClick={() => setShowAllBuses((v) => !v)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "6px 0",
              background: "rgba(0,0,0,0.04)",
              border: "none",
              borderRadius: "var(--br-radius-input)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--br-accent)",
              fontFamily: "inherit",
            }}
          >
            {showAllBuses ? "Show less" : `Show all ${activeBuses.length} buses`}
          </button>
        )}

        {/* About This Project */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowAbout((v) => !v)}
            style={{
              width: "100%",
              padding: "8px 0",
              background: "none",
              border: "none",
              borderTop: "1px solid var(--br-divider)",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--br-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              About This Project <Info size={15} />
            </span>
          </button>

          {showAbout && (
            <div style={{ paddingBottom: 10 }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "var(--br-text-secondary)",
                }}
              >
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
                  }}
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
                  }}
                >
                  GitHub
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 0 10px",
            borderTop: "1px solid var(--br-divider)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--br-text-secondary)",
          }}
          aria-live="polite"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              className="live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--br-live)" : "#ff9500",
                flexShrink: 0,
              }}
            />
            {statusText}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--br-text-tertiary)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            @LennartRosenthal
          </span>
        </div>
      </div>
    </div>
  );
}
