import { Layers, Navigation, Plus, Minus, Route } from "lucide-react";

interface MapControlsProps {
  mapStyle: "voyager" | "positron";
  showTrails: boolean;
  onToggleStyle: () => void;
  onLocateUser: () => void;
  onToggleTrails: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const pillStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "var(--br-panel)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 22,
  boxShadow: "var(--br-shadow-control)",
  overflow: "hidden",
};

const btnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "var(--br-text-secondary)",
  transition: "background var(--br-transition-fast), color var(--br-transition-fast)",
  padding: 0,
};

const divider: React.CSSProperties = {
  width: 28,
  height: 1,
  background: "var(--br-divider)",
};

export default function MapControls({ mapStyle, showTrails, onToggleStyle, onLocateUser, onToggleTrails, onZoomIn, onZoomOut }: MapControlsProps) {
  return (
    <>
      {/* Top-right controls */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={pillStyle}>
          <button
            style={btnStyle}
            onClick={onToggleStyle}
            aria-label={`Map style: ${mapStyle === "voyager" ? "Standard" : "Light"}`}
            title={mapStyle === "voyager" ? "Switch to Light" : "Switch to Standard"}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Layers size={18} />
          </button>
          <div style={divider} />
          <button
            style={btnStyle}
            onClick={onLocateUser}
            aria-label="Find my location"
            title="My location"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Navigation size={18} />
          </button>
          <div style={divider} />
          <button
            style={{ ...btnStyle, color: showTrails ? "var(--br-accent)" : "var(--br-text-secondary)" }}
            onClick={onToggleTrails}
            aria-label={showTrails ? "Hide trails" : "Show trails"}
            title={showTrails ? "Hide trails" : "Show trails"}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Route size={18} />
          </button>
        </div>

        {/* Compass */}
        <div style={{
          ...pillStyle,
          width: 44,
          height: 44,
          borderRadius: "50%",
          justifyContent: "center",
          position: "relative",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              {/* North arrow (red) */}
              <polygon points="14,4 11,14 14,12.5 17,14" fill="#E34234" />
              {/* South arrow (grey) */}
              <polygon points="14,24 11,14 14,15.5 17,14" fill="#999" />
            </svg>
            <span style={{
              position: "absolute",
              top: 4,
              fontSize: 7,
              fontWeight: 700,
              color: "var(--br-text-tertiary)",
              letterSpacing: "0.04em",
            }}>N</span>
          </div>
        </div>
      </div>

      {/* Bottom-right zoom */}
      <div style={{ position: "absolute", bottom: 32, right: 16, zIndex: 1000 }}>
        <div style={pillStyle}>
          <button
            style={btnStyle}
            onClick={onZoomIn}
            aria-label="Zoom in"
            title="Zoom in"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Plus size={18} />
          </button>
          <div style={divider} />
          <button
            style={btnStyle}
            onClick={onZoomOut}
            aria-label="Zoom out"
            title="Zoom out"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Minus size={18} />
          </button>
        </div>
      </div>

      {/* Attribution */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          right: 16,
          zIndex: 1000,
          fontSize: 10,
          color: "rgba(0,0,0,0.5)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        © OpenStreetMap · © CARTO · Data: Stadtwerke Münster
      </div>
    </>
  );
}
