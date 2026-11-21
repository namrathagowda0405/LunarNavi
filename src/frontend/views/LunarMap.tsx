import { ViewId } from '../Sidebar'

interface LunarMapProps {
  onNavigate?: (view: ViewId) => void
}

export function LunarMap({ onNavigate }: LunarMapProps) {
  const plannedFeatures = [
    {
      icon: '🔍',
      title: 'Dynamic Zoom & Pan',
      description: 'Continuous navigation across lunar south polar stereographic projections down to high-resolution landing zones.',
    },
    {
      icon: '🧭',
      title: 'Precision Coordinate Readout',
      description: 'Live lunar latitude and longitude tracking formatted to the Mean Earth / Polar Axis (ME) coordinate convention.',
    },
    {
      icon: '📍',
      title: 'Candidate-Site Overlays',
      description: 'Interactive reference markers placed at documented crater rims, connecting ridges, and plateau targets.',
    },
    {
      icon: '📊',
      title: 'Click-to-Inspect Site Profiles',
      description: 'Selecting any marker opens an in-depth telemetry card with slope angles, solar illumination, and feasibility limits.',
    },
    {
      icon: '🌑',
      title: 'Multi-Layer Terrain GIS',
      description: 'Toggleable data layers including LOLA elevation DEM, surface slope roughness, and multi-year solar illumination models.',
    },
    {
      icon: '🛡️',
      title: 'Visual Constraint Boundaries',
      description: 'Real-time color-coded shading indicating pass, marginal, and fail zones according to active mission limits.',
    },
  ]

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header">
        <div className="section-tag">SPATIAL DECISION VIEWER</div>
        <div className="title-row">
          <h1 className="view-title">Interactive Lunar Map</h1>
          <span className="status-chip status-chip--planned" role="status">
            <span className="status-chip__dot" aria-hidden="true" />
            <span className="status-chip__text">Planned · Milestone UI-3</span>
          </span>
        </div>
        <p className="view-description">
          Spatial decision-support viewport designed to contextualize candidate landing sites against lunar topography,
          polar lighting conditions, and communication line-of-sight to Earth.
        </p>
      </header>

      {/* Honest Development Notice */}
      <section className="notice-banner notice-banner--warning" role="alert">
        <span className="notice-icon" aria-hidden="true">🗺️</span>
        <div className="notice-content">
          <strong className="notice-title">
            Interactive Map Under Active Development — Scheduled for Milestone UI-3
          </strong>
          <p className="notice-text">
            Real lunar terrain elevation tiles (LOLA DEM) and candidate site GIS layers have not yet been integrated into the web client.
            No fake map imagery, artificial crater contours, or simulated landing markers are rendered.
            The dedicated interactive viewport container below defines the exact spatial placement for the WebGL/Leaflet lunar projection map.
          </p>
        </div>
      </section>

      {/* Large Dedicated Map Viewport Placeholder */}
      <section className="panel map-viewport-panel" aria-label="Interactive Map Viewport Container">
        <div className="map-viewport-header">
          <div className="map-viewport-controls">
            <span className="map-control-pill font-mono">PROJECTION: POLAR STEREOGRAPHIC (80°S – 90°S)</span>
            <span className="map-control-pill font-mono">DATUM: MOON 2000 (R = 1737.4 km)</span>
          </div>
          <div className="map-viewport-status font-mono">
            STATUS: <span className="text-amber">VIEWPORT READY · TILES PENDING</span>
          </div>
        </div>

        {/* Technical Map Viewport Grid */}
        <div className="lunar-map-canvas-placeholder" role="region" aria-label="Map Canvas Viewport">
          {/* Concentric Polar Grid Rings */}
          <div className="polar-grid-overlay" aria-hidden="true">
            <div className="polar-ring polar-ring--80">
              <span className="ring-label">80°S</span>
            </div>
            <div className="polar-ring polar-ring--85">
              <span className="ring-label">85°S</span>
            </div>
            <div className="polar-ring polar-ring--88">
              <span className="ring-label">88°S</span>
            </div>
            <div className="polar-center-crosshair">
              <div className="crosshair-h" />
              <div className="crosshair-v" />
              <span className="pole-label">SOUTH POLE (90°S)</span>
            </div>
          </div>

          {/* Central Technical Information Box */}
          <div className="map-placeholder-centerbox">
            <div className="placeholder-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20" />
                <path d="M2 12h20" />
                <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
              </svg>
            </div>
            <h2 className="placeholder-title">Interactive GIS Lunar Map Container</h2>
            <p className="placeholder-desc">
              This dedicated 600px viewport will render the interactive WebGL/Leaflet lunar projection map in Milestone UI-3.
              Terrain rasters and candidate site markers will load dynamically upon dataset verification.
            </p>
            <div className="placeholder-meta font-mono">
              <span>TARGET REGION: LUNAR SOUTH POLE</span>
              <span className="divider">·</span>
              <span>INTEGRATION STAGE: UI-3</span>
              <span className="divider">·</span>
              <span>RENDERER: LEAFLET / WEBGL</span>
            </div>
          </div>

          {/* Bottom Coordinate Bar */}
          <div className="map-coordinate-bar font-mono">
            <div className="coord-item">
              <span className="coord-label">LAT:</span>
              <span className="coord-val">--.----° S</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">LON:</span>
              <span className="coord-val">---.----° E</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">ELEVATION:</span>
              <span className="coord-val">---- m (LOLA)</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">ACTIVE SITES:</span>
              <span className="coord-val">AWAITING D2 DATASET</span>
            </div>
          </div>
        </div>
      </section>

      {/* Planned Feature Breakdown */}
      <section className="panel" aria-labelledby="heading-planned-features">
        <div className="panel-header">
          <span className="panel-tag">ROADMAP SPECIFICATION</span>
          <h2 id="heading-planned-features" className="panel-title">Planned Interactive Map Capabilities</h2>
          <p className="panel-subtitle">
            The following capabilities are specified for implementation in Milestone UI-3 once candidate coordinates are integrated.
          </p>
        </div>

        <div className="grid-cards">
          {plannedFeatures.map((feat, i) => (
            <article key={i} className="info-card">
              <div className="card-step">{feat.icon}</div>
              <h3 className="card-title">{feat.title}</h3>
              <p className="card-text">{feat.description}</p>
            </article>
          ))}
        </div>

        {onNavigate && (
          <div className="panel-action-bar" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span className="action-hint">Ready to specify mission constraints?</span>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onNavigate('setup')}
            >
              Go to Mission Setup →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
