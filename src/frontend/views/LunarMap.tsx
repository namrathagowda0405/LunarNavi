import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ViewId } from '../Sidebar'
import {
  latLonToNormalized,
  normalizedToLatLon,
  LUNAR_LANDMARKS,
  MAP_LAYERS,
  LunarLandmark,
  MapLayer,
} from '../lunarMapData'
import { MissionProfile, getDefaultMissionProfile } from '../../engine/mission'
import {
  evaluateAllSites,
  filterFeasibleSites,
  FeasibilityResult,
} from '../../engine/feasibility'
import { rankSites } from '../../engine/topsis'
import {
  CENTRALIZED_CANDIDATE_SITES,
  CentralizedSite,
  getSiteById,
} from '../../data/candidateSites'
import { MissionFormState } from '../missionForm'

interface LunarMapProps {
  configuredMission?: MissionProfile | null
  activeMission?: MissionProfile | null
  formState?: MissionFormState
  onNavigate?: (view: ViewId) => void
}

interface MetricsGridData {
  width: number
  height: number
  data: number[]
  illumination?: number[]
  earthVisibility?: number[]
  isPsr?: number[]
}

export function LunarMap({
  configuredMission,
  activeMission: propActiveMission,
  formState,
  onNavigate,
}: LunarMapProps) {
  // Navigation & Zoom State
  const [zoom, setZoom] = useState<number>(1.0)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Layer & Visibility State
  const [activeLayerId, setActiveLayerId] = useState<MapLayer['id']>('elevation')
  const [layerOpacity, setLayerOpacity] = useState<number>(0.85)
  const [underlayHillshade, setUnderlayHillshade] = useState<boolean>(true)
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true)
  const [showProvenance, setShowProvenance] = useState<boolean>(false)

  // Selection & Telemetry State
  const [selectedSite, setSelectedSite] = useState<CentralizedSite | null>(null)
  const [selectedLandmark, setSelectedLandmark] = useState<LunarLandmark | null>(null)
  const [compareSiteIds, setCompareSiteIds] = useState<string[]>([])
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false)

  const [cursorTelemetry, setCursorTelemetry] = useState<{
    lat: number
    lon: number
    elevation: number | null
    illumination: number | null
    earthVisibility: number | null
    isPsr: boolean
    inCoverage: boolean
  } | null>(null)

  // Elevation Grid State for Instant Cursor Sampling
  const [metricsGrid, setMetricsGrid] = useState<MetricsGridData | null>(null)

  const viewportRef = useRef<HTMLDivElement>(null)

  // Determine active mission profile from props
  const activeMission: MissionProfile = useMemo(() => {
    if (propActiveMission) return propActiveMission
    if (configuredMission) return configuredMission
    const missionTypeId = formState?.missionType ?? 'science'
    return getDefaultMissionProfile(missionTypeId)
  }, [propActiveMission, configuredMission, formState?.missionType])

  // Run Feasibility Evaluation across all centralized sites
  const evaluationSummary = useMemo(() => {
    return evaluateAllSites(CENTRALIZED_CANDIDATE_SITES, activeMission)
  }, [activeMission])

  const feasibilityMap = useMemo(() => {
    const map = new Map<string, FeasibilityResult>()
    evaluationSummary.all.forEach(({ site, result }) => {
      map.set(site.id, result)
    })
    return map
  }, [evaluationSummary])

  // Run TOPSIS Multi-Criteria Ranking across feasible sites
  const feasibleSites = useMemo(() => {
    return filterFeasibleSites(CENTRALIZED_CANDIDATE_SITES, activeMission)
  }, [activeMission])

  const rankingResult = useMemo(() => {
    return rankSites(feasibleSites, activeMission)
  }, [feasibleSites, activeMission])

  const rankingMap = useMemo(() => {
    const map = new Map<string, { rank: number; score: number }>()
    rankingResult.ranking.forEach((r, idx) => {
      map.set(r.id, { rank: idx + 1, score: r.closeness })
    })
    return map
  }, [rankingResult])

  // Load lightweight 380x380 telemetry grid on mount for instant client-side telemetry
  useEffect(() => {
    let isMounted = true
    fetch('/lunar_map/elevation_grid.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: MetricsGridData) => {
        if (isMounted) {
          setMetricsGrid(json)
        }
      })
      .catch((err) => {
        console.warn('Could not load telemetry grid JSON:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const activeLayer = useMemo(() => {
    return MAP_LAYERS.find((l) => l.id === activeLayerId) || MAP_LAYERS[0]
  }, [activeLayerId])

  // Reset viewport to default centered framing
  const handleResetView = useCallback(() => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    setSelectedSite(null)
    setSelectedLandmark(null)
  }, [])

  // Zoom controls
  const handleZoom = useCallback((deltaFactor: number) => {
    setZoom((prev) => Math.min(Math.max(prev * deltaFactor, 1.0), 8.0))
  }, [])

  // Mouse Wheel Zoom centered at cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault()
      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const factor = e.deltaY < 0 ? 1.2 : 0.8333
      const newZoom = Math.min(Math.max(zoom * factor, 1.0), 8.0)

      if (newZoom !== zoom) {
        const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom)
        const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom)
        setZoom(newZoom)
        setPan({ x: newPanX, y: newPanY })
      }
    },
    [zoom, pan]
  )

  // Drag-to-Pan Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect) return

      if (isDragging) {
        const dx = e.clientX - dragStart.x
        const dy = e.clientY - dragStart.y
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        setDragStart({ x: e.clientX, y: e.clientY })
      }

      // Compute normalized coordinates on the 600x600 lunar raster
      const rasterCenterX = rect.width / 2 + pan.x
      const rasterCenterY = rect.height / 2 + pan.y
      const rasterSize = 600 * zoom

      const mouseRelX = e.clientX - rect.left - (rasterCenterX - rasterSize / 2)
      const mouseRelY = e.clientY - rect.top - (rasterCenterY - rasterSize / 2)

      const u = mouseRelX / rasterSize
      const v = mouseRelY / rasterSize

      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const { lat, lon, inCoverage } = normalizedToLatLon(u, v)

        let elevMeters: number | null = null
        let illumPct: number | null = null
        let earthVisPct: number | null = null
        let isPsrVal = false

        if (inCoverage && metricsGrid?.data) {
          const gx = Math.min(379, Math.max(0, Math.floor(u * 380)))
          const gy = Math.min(379, Math.max(0, Math.floor(v * 380)))
          const idx = gy * 380 + gx
          elevMeters = metricsGrid.data[idx] ?? null

          if (metricsGrid.illumination) {
            illumPct = metricsGrid.illumination[idx] ?? null
          }
          if (metricsGrid.earthVisibility) {
            earthVisPct = metricsGrid.earthVisibility[idx] ?? null
          }
          if (metricsGrid.isPsr) {
            isPsrVal = metricsGrid.isPsr[idx] === 1
          }
        }

        setCursorTelemetry({
          lat,
          lon,
          elevation: elevMeters,
          illumination: illumPct,
          earthVisibility: earthVisPct,
          isPsr: isPsrVal,
          inCoverage,
        })
      } else {
        setCursorTelemetry(null)
      }
    },
    [isDragging, dragStart, zoom, pan, metricsGrid]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault()
          handleZoom(1.2)
          break
        case '-':
        case '_':
          e.preventDefault()
          handleZoom(0.8333)
          break
        case 'r':
        case 'R':
          e.preventDefault()
          handleResetView()
          break
        case 'g':
        case 'G':
          e.preventDefault()
          setShowGrid((prev) => !prev)
          break
        case 'l':
        case 'L':
          e.preventDefault()
          setShowLandmarks((prev) => !prev)
          break
        case 'ArrowLeft':
          e.preventDefault()
          setPan((p) => ({ ...p, x: p.x + 30 }))
          break
        case 'ArrowRight':
          e.preventDefault()
          setPan((p) => ({ ...p, x: p.x - 30 }))
          break
        case 'ArrowUp':
          e.preventDefault()
          setPan((p) => ({ ...p, y: p.y + 30 }))
          break
        case 'ArrowDown':
          e.preventDefault()
          setPan((p) => ({ ...p, y: p.y - 30 }))
          break
      }
    },
    [handleZoom, handleResetView]
  )

  // Focus map view to center a specific site
  const centerOnSite = useCallback((site: CentralizedSite) => {
    setSelectedSite(site)
    setSelectedLandmark(null)
    const { u, v } = latLonToNormalized(site.latitude, site.longitude)
    const targetZoom = 3.5
    const rasterSize = 600 * targetZoom
    const offsetX = (u - 0.5) * rasterSize
    const offsetY = (v - 0.5) * rasterSize
    setZoom(targetZoom)
    setPan({ x: -offsetX, y: -offsetY })
  }, [])

  // Focus map view to center a specific landmark
  const centerOnLandmark = useCallback((landmark: LunarLandmark) => {
    setSelectedLandmark(landmark)
    setSelectedSite(null)
    const { u, v } = latLonToNormalized(landmark.latitude, landmark.longitude)
    const targetZoom = 3.2
    const rasterSize = 600 * targetZoom
    const offsetX = (u - 0.5) * rasterSize
    const offsetY = (v - 0.5) * rasterSize
    setZoom(targetZoom)
    setPan({ x: -offsetX, y: -offsetY })
  }, [])

  // Toggle candidate site for side-by-side comparison
  const toggleCompareSite = useCallback((siteId: string) => {
    setCompareSiteIds((prev) => {
      if (prev.includes(siteId)) {
        return prev.filter((id) => id !== siteId)
      } else {
        if (prev.length >= 4) {
          alert('You can compare a maximum of 4 sites at once.')
          return prev
        }
        return [...prev, siteId]
      }
    })
  }, [])

  // Calculate dynamic scale bar
  const scaleBarKm = useMemo(() => {
    const kmPerPixel = 1.013 / zoom
    const targetBarPx = 100
    const rawKm = targetBarPx * kmPerPixel

    let roundKm = 10
    if (rawKm >= 200) roundKm = 200
    else if (rawKm >= 100) roundKm = 100
    else if (rawKm >= 50) roundKm = 50
    else if (rawKm >= 25) roundKm = 25
    else if (rawKm >= 10) roundKm = 10
    else if (rawKm >= 5) roundKm = 5
    else roundKm = 2

    const widthPx = Math.max(30, Math.min(180, roundKm / kmPerPixel))
    return { km: roundKm, widthPx }
  }, [zoom])

  const comparedSites = useMemo(() => {
    return compareSiteIds
      .map((id) => getSiteById(id))
      .filter((s): s is CentralizedSite => s !== undefined)
  }, [compareSiteIds])

  return (
    <div className="view-container">
      {/* View Header */}
      <header className="view-header">
        <div className="section-tag">POLAR STEREOGRAPHIC CARTOGRAPHIC VIEWER</div>
        <div className="title-row">
          <h1 className="view-title">Lunar South Pole Map (80°S – 90°S)</h1>
          <span className="status-badge-ready" role="status">
            <span className="status-badge-dot" aria-hidden="true" />
            NASA LOLA & PGDA Datasets Loaded
          </span>
        </div>
        <p className="view-description">
          Authentic lunar cartographic visualization using NASA Lunar Reconnaissance Orbiter (LRO) data.
          Centered at 90°S with polar stereographic projection (DE421 Mean Earth/Polar Axis frame).
          Interactive candidate sites show live feasibility triage and multi-criteria rankings under the active mission profile.
        </p>
      </header>

      {/* Active Mission Profile Context Banner */}
      <section className="notice-banner notice-banner--info" role="region" aria-label="Active Mission Context">
        <span className="notice-icon" aria-hidden="true">🎯</span>
        <div className="notice-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>Active Mission Profile: {activeMission.name}</strong>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
              Sites display live physical feasibility status and TOPSIS ranking under this profile.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onNavigate && (
              <>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => onNavigate('setup')}
                >
                  Adjust in Setup
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => onNavigate('results')}
                >
                  View TOPSIS Results →
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Map Control Toolbar */}
      <section className="panel" style={{ padding: '0.75rem 1rem' }} aria-label="Map Layer Controls">
        <div className="lunar-map-toolbar">
          {/* Layer Selector */}
          <div className="toolbar-group">
            <span className="toolbar-label">DATASET LAYER:</span>
            <div className="layer-tabs-row" role="tablist" aria-label="Scientific Map Layers">
              {MAP_LAYERS.map((layer) => {
                const isActive = activeLayerId === layer.id
                return (
                  <button
                    key={layer.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`layer-tab-btn ${isActive ? 'layer-tab-btn--active' : ''}`}
                    onClick={() => setActiveLayerId(layer.id)}
                    title={`${layer.name} (${layer.sourceCitation})`}
                  >
                    <span>{layer.shortLabel}</span>
                    {layer.status === 'active' && (
                      <span className="layer-active-indicator" aria-hidden="true">●</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Visibility Toggles */}
          <div className="toolbar-group toolbar-group--right">
            {(activeLayerId === 'elevation' || activeLayerId === 'slope' || activeLayerId === 'illumination' || activeLayerId === 'earth-vis') && (
              <label className="opacity-slider-label">
                <span>Opacity: {Math.round(layerOpacity * 100)}%</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={layerOpacity}
                  onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                  className="opacity-slider"
                  aria-label="Layer Tint Opacity"
                />
              </label>
            )}

            <button
              type="button"
              className={`btn btn--subtle ${showGrid ? 'text-teal' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
              onClick={() => setShowGrid((p) => !p)}
              title="Toggle Polar Coordinate Grid (G)"
            >
              Grid: {showGrid ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              className={`btn btn--subtle ${showLandmarks ? 'text-teal' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
              onClick={() => setShowLandmarks((p) => !p)}
              title="Toggle Candidate Sites & Landmarks (L)"
            >
              Candidates: {showLandmarks ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Interactive Viewport Canvas */}
        <div
          ref={viewportRef}
          className="lunar-map-viewport"
          tabIndex={0}
          role="region"
          aria-label="Interactive Lunar Map Viewport. Use arrow keys to pan, plus/minus to zoom."
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        >
          {/* Zoomable & Pannable Stage */}
          <div
            className="lunar-map-stage"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            {/* 600x600 Scaled Raster Container */}
            <div
              className="lunar-map-raster-container"
              style={{
                transform: `translate(-50%, -50%) scale(${zoom})`,
              }}
            >
              {/* Underlay Hillshade: renders 3D shaded relief depth under hypsometric tints */}
              {(underlayHillshade || activeLayerId === 'psr') && (
                <img
                  src="/lunar_map/hillshade.webp"
                  alt="NASA LOLA Photometric Hillshade"
                  className="lunar-map-base-layer"
                  draggable={false}
                />
              )}

              {/* Active Authentic Dataset Layer */}
              {activeLayer.assetUrl && (
                <img
                  src={activeLayer.assetUrl}
                  alt={activeLayer.name}
                  className="lunar-map-overlay-layer"
                  draggable={false}
                  style={{
                    opacity:
                      activeLayerId === 'elevation' || activeLayerId === 'slope' || activeLayerId === 'illumination' || activeLayerId === 'earth-vis'
                        ? layerOpacity
                        : 1.0,
                  }}
                />
              )}

              {/* Polar Coordinate Grid SVG Overlay */}
              {showGrid && (
                <svg
                  className="polar-svg-grid"
                  viewBox="0 0 600 600"
                  aria-hidden="true"
                >
                  <circle cx="300" cy="300" r="300" className="polar-grid-circle polar-grid-circle--80" />
                  <circle cx="300" cy="300" r="240" className="polar-grid-circle" />
                  <circle cx="300" cy="300" r="180" className="polar-grid-circle" />
                  <circle cx="300" cy="300" r="120" className="polar-grid-circle" />
                  <circle cx="300" cy="300" r="60" className="polar-grid-circle" />

                  {/* Meridian Axes */}
                  <line x1="300" y1="0" x2="300" y2="600" className="polar-grid-axis" />
                  <line x1="0" y1="300" x2="600" y2="300" className="polar-grid-axis" />

                  {/* Center Pole Crosshair */}
                  <line x1="295" y1="300" x2="305" y2="300" stroke="#2dd4bf" strokeWidth="1.5" />
                  <line x1="300" y1="295" x2="300" y2="305" stroke="#2dd4bf" strokeWidth="1.5" />

                  {/* Latitude Labels */}
                  <text x="304" y="24" className="polar-grid-text">80°S</text>
                  <text x="304" y="64" className="polar-grid-text">82°S</text>
                  <text x="304" y="124" className="polar-grid-text">84°S</text>
                  <text x="304" y="184" className="polar-grid-text">86°S</text>
                  <text x="304" y="244" className="polar-grid-text">88°S</text>
                  <text x="304" y="296" className="polar-grid-text" fill="#2dd4bf">90°S POLE</text>

                  {/* Meridian Labels */}
                  <text x="304" y="592" className="polar-grid-text">0°E (Earth)</text>
                  <text x="540" y="296" className="polar-grid-text">90°E</text>
                  <text x="304" y="14" className="polar-grid-text">180° (Far Side)</text>
                  <text x="10" y="296" className="polar-grid-text">270°E</text>
                </svg>
              )}

              {/* Centralized Candidate Sites Pins Overlay */}
              {showLandmarks && (
                <div className="landmark-markers-container" aria-hidden="true">
                  {CENTRALIZED_CANDIDATE_SITES.map((site) => {
                    const { u, v } = latLonToNormalized(site.latitude, site.longitude)
                    const isSelected = selectedSite?.id === site.id
                    const isArtemis = site.designation === 'official-artemis-candidate'
                    const feasibility = feasibilityMap.get(site.id)
                    const ranking = rankingMap.get(site.id)

                    // Halos based on feasibility category
                    let statusHaloColor = '#3b82f6'
                    if (feasibility) {
                      if (feasibility.category === 'feasible') statusHaloColor = '#22c55e'
                      else if (feasibility.category === 'infeasible') statusHaloColor = '#ef4444'
                      else if (feasibility.category === 'unknown') statusHaloColor = '#fbbf24'
                    }

                    return (
                      <button
                        key={site.id}
                        type="button"
                        className={`landmark-marker ${isSelected ? 'landmark-marker--active' : ''}`}
                        style={{
                          left: `${u * 100}%`,
                          top: `${v * 100}%`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSite(site)
                          setSelectedLandmark(null)
                        }}
                        title={`${site.name} (${site.latitude.toFixed(2)}°S, ${site.longitude.toFixed(1)}°E) — ${feasibility?.status ?? 'Unassessed'}`}
                      >
                        <div
                          className="landmark-pin-icon"
                          style={{
                            backgroundColor: isArtemis ? '#38bdf8' : '#a855f7',
                            borderColor: isSelected ? '#fbbf24' : statusHaloColor,
                            boxShadow: isSelected
                              ? '0 0 12px #fbbf24, 0 0 20px rgba(251, 191, 36, 0.6)'
                              : `0 0 6px ${statusHaloColor}`,
                          }}
                        />
                        <span className="landmark-pin-label">
                          {ranking && ranking.rank <= 3 && (
                            <strong style={{ color: '#fbbf24', marginRight: '3px' }}>
                              #{ranking.rank}
                            </strong>
                          )}
                          {site.name}
                        </span>
                      </button>
                    )
                  })}

                  {/* Reference Landmarks (Crater Floor / Peak baselines not in candidates) */}
                  {LUNAR_LANDMARKS.filter((l) => !l.id.startsWith('artemis-') && l.id !== 'cal-cabeus-lcross').map((landmark) => {
                    const { u, v } = latLonToNormalized(landmark.latitude, landmark.longitude)
                    const isSelected = selectedLandmark?.id === landmark.id
                    return (
                      <button
                        key={landmark.id}
                        type="button"
                        className={`landmark-marker ${isSelected ? 'landmark-marker--active' : ''}`}
                        style={{
                          left: `${u * 100}%`,
                          top: `${v * 100}%`,
                          opacity: 0.75,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLandmark(landmark)
                          setSelectedSite(null)
                        }}
                        title={`${landmark.name} (${landmark.latitude.toFixed(2)}°S, ${landmark.longitude.toFixed(1)}°E)`}
                      >
                        <div
                          className="landmark-pin-icon"
                          style={{
                            backgroundColor: '#64748b',
                            borderColor: isSelected ? '#fbbf24' : '#334155',
                          }}
                        />
                        <span className="landmark-pin-label" style={{ color: '#94a3b8' }}>
                          {landmark.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Compass / Orientation Indicator */}
          <div className="map-compass-rose" aria-hidden="true">
            <div className="compass-row">
              <span>0°E (EARTH):</span>
              <span className="compass-target">↓ DOWN</span>
            </div>
            <div className="compass-row">
              <span>90°E:</span>
              <span className="compass-target">→ RIGHT</span>
            </div>
            <div className="compass-row">
              <span>180° (FARSIDE):</span>
              <span className="compass-target">↑ UP</span>
            </div>
            <div className="compass-row">
              <span>270°E (90°W):</span>
              <span className="compass-target">← LEFT</span>
            </div>
          </div>

          {/* Floating Zoom & Tool Controls */}
          <div className="map-floating-controls" aria-label="Map Navigation Controls">
            <button
              type="button"
              className="map-control-btn"
              onClick={() => handleZoom(1.25)}
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              className="map-control-btn"
              onClick={() => handleZoom(0.8)}
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              −
            </button>
            <button
              type="button"
              className="map-control-btn"
              onClick={handleResetView}
              title="Reset Map Framing (R)"
              aria-label="Reset View"
            >
              ⟲
            </button>
            <button
              type="button"
              className={`map-control-btn ${underlayHillshade ? 'map-control-btn--active' : ''}`}
              onClick={() => setUnderlayHillshade((p) => !p)}
              title="Toggle 3D Hillshade Underlay"
              aria-label="Toggle 3D Relief"
            >
              ⛰️
            </button>
          </div>

          {/* Dynamic Scale Bar */}
          <div className="map-scale-bar-widget" aria-hidden="true">
            <div className="scale-bar-label font-mono">{scaleBarKm.km} km</div>
            <div
              className="scale-bar-graphic"
              style={{ width: `${scaleBarKm.widthPx}px` }}
            />
          </div>

          {/* Layer Legend Card */}
          <div className="map-legend-card" aria-label="Map Layer Legend">
            {activeLayerId === 'elevation' && (
              <>
                <div className="legend-title">
                  <span>ELEVATION RELIEF</span>
                  <span className="legend-unit">meters (R=1737.4 km)</span>
                </div>
                <div className="legend-gradient-bar legend-gradient-bar--elevation" />
                <div className="legend-ticks">
                  <span>-7,288m</span>
                  <span>-3,500m</span>
                  <span>0m</span>
                  <span>+3,500m</span>
                  <span>+7,023m</span>
                </div>
              </>
            )}

            {activeLayerId === 'slope' && (
              <>
                <div className="legend-title">
                  <span>SURFACE SLOPE</span>
                  <span className="legend-unit">degrees (NASA P90)</span>
                </div>
                <div className="legend-gradient-bar legend-gradient-bar--slope" />
                <div className="legend-ticks">
                  <span>0° (Safe)</span>
                  <span>10°</span>
                  <span>20°</span>
                  <span>35°+ (Steep)</span>
                </div>
              </>
            )}

            {activeLayerId === 'hillshade' && (
              <>
                <div className="legend-title">
                  <span>PHOTOMETRIC HILLSHADE</span>
                  <span className="legend-unit">Az: 45°, Alt: 35°</span>
                </div>
                <div className="legend-gradient-bar legend-gradient-bar--hillshade" />
                <div className="legend-ticks">
                  <span>Deep Shadow</span>
                  <span>Reflective Highland</span>
                </div>
              </>
            )}

            {activeLayerId === 'roughness' && (
              <>
                <div className="legend-title">
                  <span>RMS SURFACE ROUGHNESS</span>
                  <span className="legend-unit">Composite RGB</span>
                </div>
                <div className="legend-roughness-grid">
                  <div className="roughness-item">
                    <span className="roughness-color-chip" style={{ backgroundColor: '#ef4444' }} />
                    <span>Red: 50 m baseline roughness</span>
                  </div>
                  <div className="roughness-item">
                    <span className="roughness-color-chip" style={{ backgroundColor: '#22c55e' }} />
                    <span>Green: 200 m baseline roughness</span>
                  </div>
                  <div className="roughness-item">
                    <span className="roughness-color-chip" style={{ backgroundColor: '#3b82f6' }} />
                    <span>Blue: 1,000 m baseline roughness</span>
                  </div>
                </div>
              </>
            )}

            {activeLayerId === 'illumination' && (
              <>
                <div className="legend-title">
                  <span>SOLAR ILLUMINATION</span>
                  <span className="legend-unit">annual sunlight %</span>
                </div>
                <div className="legend-gradient-bar legend-gradient-bar--illumination" />
                <div className="legend-ticks">
                  <span>0% (Shadow)</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>93.5% (Peak)</span>
                </div>
              </>
            )}

            {activeLayerId === 'psr' && (
              <>
                <div className="legend-title">
                  <span>PERMANENT SHADOWS (PSR)</span>
                  <span className="legend-unit">Cryogenic Cold Traps</span>
                </div>
                <div className="legend-gradient-bar legend-gradient-bar--psr" />
                <div className="legend-ticks">
                  <span>Sunlit Regolith</span>
                  <span style={{ color: '#38bdf8' }}>PSR (T &lt; 100 K)</span>
                </div>
              </>
            )}

            {activeLayerId === 'earth-vis' && (
              <>
                <div className="legend-title">
                  <span>DIRECT EARTH LINE-OF-SIGHT</span>
                  <span className="legend-unit">visibility % over 18.6y</span>
                </div>
                <div className="legend-gradient-bar legend-gradient-bar--earth-vis" />
                <div className="legend-ticks">
                  <span>0% (Shadow)</span>
                  <span>35%</span>
                  <span>70%</span>
                  <span>100% (Continuous)</span>
                </div>
              </>
            )}
          </div>

          {/* CANDIDATE SITE INSPECTION CARD POPOVER */}
          {selectedSite && (
            <div
              className="landmark-inspection-popover"
              role="dialog"
              aria-labelledby="popover-site-title"
              style={{ maxWidth: '420px', maxHeight: '85%', overflowY: 'auto' }}
            >
              <div className="inspection-header">
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span
                      className={`badge-designation ${
                        selectedSite.designation === 'official-artemis-candidate'
                          ? 'badge-designation--artemis'
                          : 'badge-designation--research'
                      }`}
                    >
                      {selectedSite.designation === 'official-artemis-candidate'
                        ? 'OFFICIAL ARTEMIS III REGION'
                        : 'SCIENTIFIC RESEARCH LOCATION'}
                    </span>
                    {feasibilityMap.get(selectedSite.id)?.category === 'feasible' && (
                      <span className="badge-triage badge-triage--pass">
                        FEASIBLE
                        {rankingMap.get(selectedSite.id) &&
                          ` · RANK #${rankingMap.get(selectedSite.id)!.rank}`}
                      </span>
                    )}
                    {feasibilityMap.get(selectedSite.id)?.category === 'infeasible' && (
                      <span className="badge-triage badge-triage--fail">INFEASIBLE</span>
                    )}
                    {feasibilityMap.get(selectedSite.id)?.category === 'unknown' && (
                      <span className="badge-triage badge-triage--unknown">CANNOT ASSESS</span>
                    )}
                  </div>
                  <h3 id="popover-site-title" className="inspection-title">
                    {selectedSite.name}
                  </h3>
                  <span className="inspection-region">
                    {selectedSite.region} (<span className="text-nowrap font-mono">{selectedSite.latitude.toFixed(2)}°S, {selectedSite.longitude.toFixed(2)}°E</span>)
                  </span>
                </div>
                <button
                  type="button"
                  className="inspection-close-btn"
                  onClick={() => setSelectedSite(null)}
                  aria-label="Close Candidate Site Details"
                >
                  ×
                </button>
              </div>

              {/* Feasibility Alert Box */}
              {feasibilityMap.get(selectedSite.id) && (
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.6rem 0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.775rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      Mission Feasibility ({activeMission.name}):
                    </strong>
                    {rankingMap.get(selectedSite.id) && (
                      <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                        Score: {(rankingMap.get(selectedSite.id)!.score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {feasibilityMap.get(selectedSite.id)!.category === 'feasible' && (
                    <div style={{ color: '#4ade80' }}>
                      ✓ Meets all physical safety constraints for this mission. Admitted to TOPSIS matrix.
                    </div>
                  )}
                  {feasibilityMap.get(selectedSite.id)!.category === 'infeasible' && (
                    <div style={{ color: '#f87171' }}>
                      ✗ Disqualified: {feasibilityMap.get(selectedSite.id)!.reasons.join('; ')}
                    </div>
                  )}
                  {feasibilityMap.get(selectedSite.id)!.category === 'unknown' && (
                    <div style={{ color: '#fbbf24' }}>
                      ⚠ Data Gap: {feasibilityMap.get(selectedSite.id)!.reasons.join('; ')}
                    </div>
                  )}
                </div>
              )}

              {/* Real Extracted NASA Data Grid */}
              <div className="inspection-grid">
                <div className="inspection-grid-item">
                  <span>ELEVATION (LOLA)</span>
                  <span style={{ color: 'var(--accent-teal)' }}>
                    {selectedSite.measurements.elevation.value !== null
                      ? `${selectedSite.measurements.elevation.value > 0 ? '+' : ''}${selectedSite.measurements.elevation.value.toLocaleString()} m`
                      : 'Unknown'}
                  </span>
                </div>

                <div className="inspection-grid-item">
                  <span>SURFACE SLOPE</span>
                  <span style={{ color: '#f8fafc' }}>
                    {selectedSite.measurements.slope.value !== null
                      ? `${selectedSite.measurements.slope.value}°`
                      : 'Unknown'}
                  </span>
                </div>

                <div className="inspection-grid-item">
                  <span>ROUGHNESS (50m)</span>
                  <span style={{ color: selectedSite.measurements.roughness.value !== null ? '#f8fafc' : '#fbbf24' }}>
                    {selectedSite.measurements.roughness.value !== null
                      ? `${selectedSite.measurements.roughness.value} m`
                      : 'UNASSESSED'}
                  </span>
                </div>

                <div className="inspection-grid-item">
                  <span>SOLAR ILLUMINATION</span>
                  <span style={{ color: '#facc15' }}>
                    {selectedSite.measurements.illumination.value !== null
                      ? `${selectedSite.measurements.illumination.value}%`
                      : 'Unknown'}
                  </span>
                </div>

                <div className="inspection-grid-item">
                  <span>EARTH LINE-OF-SIGHT</span>
                  <span style={{ color: '#4ade80' }}>
                    {selectedSite.communicationModel.directEarthVisibilityPercent !== null
                      ? `${selectedSite.communicationModel.directEarthVisibilityPercent}%`
                      : 'Unknown'}
                  </span>
                </div>

                <div className="inspection-grid-item">
                  <span>PSR PROXIMITY</span>
                  <span style={{ color: selectedSite.measurements.isPsr.value ? '#38bdf8' : '#94a3b8' }}>
                    {selectedSite.measurements.isPsr.value
                      ? 'INSIDE PSR'
                      : `${selectedSite.measurements.psrDistanceKm} km to PSR`}
                  </span>
                </div>
              </div>

              {/* Evidence-Based Resource Summary */}
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>RESOURCE POTENTIAL:</strong>
                  <span
                    className={`badge-evidence badge-evidence--${selectedSite.resourceEvidence.kind}`}
                  >
                    {selectedSite.resourceEvidence.kind.toUpperCase().replace('-', ' ')}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {selectedSite.resourceEvidence.summary}
                </p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Source: {selectedSite.resourceEvidence.citation}
                </div>
              </div>

              {/* Communication Libration Model */}
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>COMMUNICATION VISIBILITY MODEL:</strong>
                <p style={{ margin: '0.1rem 0 0 0', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {selectedSite.communicationModel.assumedScenario}
                </p>
              </div>

              {/* Actions */}
              <div className="inspection-actions" style={{ marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn btn--small ${compareSiteIds.includes(selectedSite.id) ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ fontSize: '0.725rem' }}
                  onClick={() => toggleCompareSite(selectedSite.id)}
                >
                  {compareSiteIds.includes(selectedSite.id) ? '✓ In Compare' : '+ Add to Compare'}
                </button>

                <button
                  type="button"
                  className="btn btn--subtle btn--small"
                  style={{ fontSize: '0.725rem' }}
                  onClick={() => centerOnSite(selectedSite)}
                >
                  Center 🎯
                </button>

                {onNavigate && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    style={{ fontSize: '0.725rem' }}
                    onClick={() => onNavigate('sites')}
                  >
                    Sites Table →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reference Landmark Popover (if clicked landmark is not a candidate site) */}
          {selectedLandmark && !selectedSite && (
            <div className="landmark-inspection-popover" role="dialog" aria-labelledby="popover-landmark-title">
              <div className="inspection-header">
                <div>
                  <h3 id="popover-landmark-title" className="inspection-title">{selectedLandmark.name}</h3>
                  <span className="inspection-region">{selectedLandmark.region}</span>
                </div>
                <button
                  type="button"
                  className="inspection-close-btn"
                  onClick={() => setSelectedLandmark(null)}
                  aria-label="Close Landmark Details"
                >
                  ×
                </button>
              </div>

              <div className="inspection-grid">
                <div className="inspection-grid-item">
                  <span>LATITUDE</span>
                  <span>{selectedLandmark.latitude.toFixed(2)}° S</span>
                </div>
                <div className="inspection-grid-item">
                  <span>LONGITUDE</span>
                  <span>{selectedLandmark.longitude.toFixed(1)}° E</span>
                </div>
                <div className="inspection-grid-item">
                  <span>LOLA ELEVATION</span>
                  <span style={{ color: 'var(--accent-teal)' }}>
                    {selectedLandmark.elevationMeters > 0 ? '+' : ''}
                    {selectedLandmark.elevationMeters.toLocaleString()} m
                  </span>
                </div>
                <div className="inspection-grid-item">
                  <span>CLASSIFICATION</span>
                  <span style={{ textTransform: 'uppercase' }}>
                    {selectedLandmark.type.replace('-', ' ')}
                  </span>
                </div>
              </div>

              <p className="inspection-details">{selectedLandmark.significance}</p>
              <p className="inspection-details" style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>
                <strong>Exploration Target:</strong> {selectedLandmark.explorationProgram}
              </p>

              <div className="inspection-actions">
                <button
                  type="button"
                  className="btn btn--subtle btn--small"
                  onClick={() => centerOnLandmark(selectedLandmark)}
                >
                  Center 🎯
                </button>
              </div>
            </div>
          )}

          {/* Bottom Live Coordinate Telemetry Bar */}
          <div className="map-coordinate-bar font-mono" role="status" aria-live="polite">
            <div className="coord-item">
              <span className="coord-label">LAT:</span>
              <span className="coord-val">
                {cursorTelemetry
                  ? `${Math.abs(cursorTelemetry.lat).toFixed(2)}° S`
                  : '89.90° S'}
              </span>
            </div>

            <div className="coord-item">
              <span className="coord-label">LON:</span>
              <span className="coord-val">
                {cursorTelemetry
                  ? `${cursorTelemetry.lon.toFixed(1)}° E`
                  : '0.0° E'}
              </span>
            </div>

            <div className="coord-item">
              <span className="coord-label">ELEV:</span>
              <span className="coord-val" style={{ color: 'var(--accent-teal)' }}>
                {cursorTelemetry && cursorTelemetry.elevation !== null
                  ? `${cursorTelemetry.elevation > 0 ? '+' : ''}${cursorTelemetry.elevation.toLocaleString()} m`
                  : '+575 m'}
              </span>
            </div>

            <div className="coord-item">
              <span className="coord-label">ILLUM:</span>
              <span className="coord-val" style={{ color: '#facc15' }}>
                {cursorTelemetry && cursorTelemetry.illumination !== null
                  ? `${cursorTelemetry.illumination.toFixed(1)}%`
                  : '28.9%'}
              </span>
            </div>

            <div className="coord-item">
              <span className="coord-label">EARTH VIS:</span>
              <span className="coord-val" style={{ color: '#4ade80' }}>
                {cursorTelemetry && cursorTelemetry.earthVisibility !== null
                  ? `${cursorTelemetry.earthVisibility.toFixed(1)}%`
                  : '62.4%'}
              </span>
            </div>

            <div className="coord-item">
              <span className="coord-label">PSR:</span>
              <span
                className="coord-val"
                style={{
                  color: cursorTelemetry?.isPsr ? '#38bdf8' : 'var(--text-muted)',
                }}
              >
                {cursorTelemetry ? (cursorTelemetry.isPsr ? 'CRYOGENIC COLD TRAP' : 'NO') : 'NO'}
              </span>
            </div>

            <div className="coord-item" style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className="btn btn--subtle"
                style={{ fontSize: '0.675rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setShowProvenance((p) => !p)}
              >
                {showProvenance ? 'Hide Citations ▲' : 'Scientific Provenance ▼'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING COMPARISON BAR (Appears when 1+ sites are selected for compare) */}
      {compareSiteIds.length > 0 && (
        <section className="comparison-floating-bar" aria-label="Site Comparison Bar">
          <div className="comparison-floating-bar__info">
            <span style={{ fontSize: '1.1rem' }}>⚖️</span>
            <div>
              <strong>Comparing {compareSiteIds.length} Candidate Sites:</strong>{' '}
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {comparedSites.map((s) => s.name).join(', ')}
              </span>
            </div>
          </div>
          <div className="comparison-floating-bar__actions">
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => setShowCompareModal(true)}
            >
              View Side-by-Side Comparison ({compareSiteIds.length}) →
            </button>
            <button
              type="button"
              className="btn btn--subtle btn--small"
              onClick={() => setCompareSiteIds([])}
            >
              Clear
            </button>
          </div>
        </section>
      )}

      {/* SIDE-BY-SIDE SITE COMPARISON MODAL */}
      {showCompareModal && (
        <div className="comparison-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-comparison-title">
          <div className="comparison-modal-content panel">
            <div className="comparison-modal-header">
              <div>
                <span className="section-tag">MULTI-SITE CROSS EVALUATION</span>
                <h2 id="modal-comparison-title" className="comparison-modal-title">
                  Candidate Sites Side-by-Side Comparison
                </h2>
                <p className="panel-subtitle" style={{ margin: 0 }}>
                  Active Mission Profile: <strong>{activeMission.name}</strong>. Authentic NASA measurements extracted from LOLA and PGDA.
                </p>
              </div>
              <button
                type="button"
                className="inspection-close-btn"
                style={{ fontSize: '1.5rem', width: '36px', height: '36px' }}
                onClick={() => setShowCompareModal(false)}
                aria-label="Close Comparison"
              >
                ×
              </button>
            </div>

            <div className="table-responsive" style={{ maxHeight: '65vh', overflowY: 'auto', marginTop: '1rem' }}>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '180px', minWidth: '160px' }}>Parameter</th>
                    {comparedSites.map((site) => (
                      <th key={site.id} scope="col" style={{ minWidth: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {site.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {site.region}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn--subtle"
                            style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => toggleCompareSite(site.id)}
                            title="Remove from comparison"
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Designation */}
                  <tr>
                    <th scope="row">Designation</th>
                    {comparedSites.map((site) => (
                      <td key={site.id}>
                        <span
                          className={`badge-designation ${
                            site.designation === 'official-artemis-candidate'
                              ? 'badge-designation--artemis'
                              : 'badge-designation--research'
                          }`}
                        >
                          {site.designation === 'official-artemis-candidate'
                            ? 'Official Artemis III'
                            : 'Research Location'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Feasibility Status */}
                  <tr>
                    <th scope="row">Mission Feasibility</th>
                    {comparedSites.map((site) => {
                      const res = feasibilityMap.get(site.id)
                      const rank = rankingMap.get(site.id)
                      return (
                        <td key={site.id}>
                          {res?.category === 'feasible' && (
                            <span className="badge-triage badge-triage--pass">
                              PASS (RANK #{rank?.rank ?? '—'})
                            </span>
                          )}
                          {res?.category === 'infeasible' && (
                            <span className="badge-triage badge-triage--fail">
                              FAIL (DISQUALIFIED)
                            </span>
                          )}
                          {res?.category === 'unknown' && (
                            <span className="badge-triage badge-triage--unknown">
                              UNKNOWN (CANNOT ASSESS)
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* TOPSIS Closeness Score */}
                  <tr>
                    <th scope="row">TOPSIS Score (C_i)</th>
                    {comparedSites.map((site) => {
                      const rank = rankingMap.get(site.id)
                      return (
                        <td key={site.id} className="font-mono">
                          {rank ? (
                            <strong style={{ color: '#fbbf24' }}>
                              {(rank.score * 100).toFixed(2)}%
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Excluded</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Coordinates */}
                  <tr>
                    <th scope="row">Coordinates (DE421)</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} className="font-mono text-nowrap" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {site.latitude.toFixed(2)}°S, {site.longitude.toFixed(2)}°E
                      </td>
                    ))}
                  </tr>

                  {/* LOLA Elevation */}
                  <tr>
                    <th scope="row">LOLA Elevation</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} className="font-mono">
                        {site.measurements.elevation.value !== null
                          ? `${site.measurements.elevation.value > 0 ? '+' : ''}${site.measurements.elevation.value} m`
                          : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Slope */}
                  <tr>
                    <th scope="row">Surface Slope (50m)</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} className="font-mono">
                        <strong>{site.measurements.slope.value}°</strong>
                      </td>
                    ))}
                  </tr>

                  {/* Roughness */}
                  <tr>
                    <th scope="row">Surface Roughness (RMS)</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} className="font-mono">
                        {site.measurements.roughness.value !== null ? (
                          `${site.measurements.roughness.value} m`
                        ) : (
                          <span style={{ color: '#fbbf24' }}>UNASSESSED</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Illumination */}
                  <tr>
                    <th scope="row">Annual Solar Illumination</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} className="font-mono">
                        {site.measurements.illumination.value !== null ? (
                          `${site.measurements.illumination.value}%`
                        ) : (
                          '—'
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Direct Earth Visibility */}
                  <tr>
                    <th scope="row">Direct Earth Visibility</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} className="font-mono">
                        {site.communicationModel.directEarthVisibilityPercent !== null ? (
                          `${site.communicationModel.directEarthVisibilityPercent}%`
                        ) : (
                          '—'
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* PSR Status */}
                  <tr>
                    <th scope="row">Permanently Shadowed (PSR)</th>
                    {comparedSites.map((site) => (
                      <td key={site.id}>
                        {site.measurements.isPsr.value ? (
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>Inside Cold Trap</span>
                        ) : (
                          <span>No ({site.measurements.psrDistanceKm} km away)</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Resource Potential Evidence */}
                  <tr>
                    <th scope="row">Resource Potential</th>
                    {comparedSites.map((site) => (
                      <td key={site.id}>
                        <div style={{ marginBottom: '0.2rem' }}>
                          <span
                            className={`badge-evidence badge-evidence--${site.resourceEvidence.kind}`}
                          >
                            {site.resourceEvidence.kind.toUpperCase().replace('-', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {site.resourceEvidence.summary}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Communication Scenario */}
                  <tr>
                    <th scope="row">Communication Scenario</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {site.communicationModel.assumedScenario}
                      </td>
                    ))}
                  </tr>

                  {/* Source Organization */}
                  <tr>
                    <th scope="row">Source Organization</th>
                    {comparedSites.map((site) => (
                      <td key={site.id} style={{ fontSize: '0.75rem' }}>
                        <a
                          href={site.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-teal)' }}
                        >
                          {site.sourceOrganization} ↗
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--subtle"
                onClick={() => setCompareSiteIds([])}
              >
                Clear All Comparisons
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowCompareModal(false)}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scientific Provenance Drawer */}
      {showProvenance && (
        <section className="provenance-drawer" aria-labelledby="provenance-heading">
          <h2 id="provenance-heading" className="provenance-title">
            <span aria-hidden="true">🛰️</span> NASA Lunar Reconnaissance Orbiter (LRO) Data Provenance
          </h2>

          <div className="provenance-specs-grid">
            <div className="provenance-spec-card">
              <span className="spec-label">PRIMARY ELEVATION DEM</span>
              <span className="spec-val">LDEM_80S_80M.JP2 (7600 x 7600)</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">GRID DIMENSIONS</span>
              <span className="spec-val">608 km x 608 km polar coverage</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">SPATIAL RESOLUTION</span>
              <span className="spec-val">80.0 meters per pixel</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">CARTOGRAPHIC PROJECTION</span>
              <span className="spec-val">Polar Stereographic (DE421, 90°S)</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">SURFACE SLOPE PRODUCT</span>
              <span className="spec-val">NASA LOLA 50m Baseline (Barker et al.)</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">SURFACE ROUGHNESS PRODUCT</span>
              <span className="spec-val">NASA PGDA Product 90 (50m RMS)</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">POLAR ILLUMINATION MODEL</span>
              <span className="spec-val">NASA PGDA Prod 69 (Mazarico et al.)</span>
            </div>
            <div className="provenance-spec-card">
              <span className="spec-label">EARTH VISIBILITY MODEL</span>
              <span className="spec-val">NASA PGDA Prod 69 (18.6y Libration)</span>
            </div>
          </div>

          <div className="provenance-citations">
            <h3 className="citations-heading">Peer-Reviewed Scientific Citations</h3>
            <ul className="citations-list">
              <li>
                <strong>Barker, M. K., et al. (2023)</strong>: A new lunar digital elevation model from Lunar Orbiter Laser Altimeter data. <em>The Planetary Science Journal</em>, 4(9), 173.
              </li>
              <li>
                <strong>Mazarico, E., et al. (2011)</strong>: Illumination conditions of the lunar polar regions using LOLA data. <em>Icarus</em>, 211(2), 1066–1081.
              </li>
              <li>
                <strong>Paige, D. A., et al. (2010)</strong>: Diviner Lunar Radiometer Experiment Investigation of the Lunar South Pole. <em>Science</em>, 330(6003), 479–482.
              </li>
              <li>
                <strong>Colaprete, A., et al. (2010)</strong>: Detection of water in the LCROSS ejecta plume. <em>Science</em>, 330(6003), 463–468.
              </li>
              <li>
                <strong>NASA Artemis Program (2022)</strong>: NASA Identifies Candidate Regions for Artemis III Lunar Landing. NASA Press Release 22-088.
              </li>
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
