import { useState, useMemo } from 'react'
import { CRITERION_IDS } from '../../engine/types'
import { MissionProfile, getDefaultMissionProfile } from '../../engine/mission'
import {
  evaluateAllSites,
  FeasibilityCategory,
} from '../../engine/feasibility'
import {
  CANDIDATE_SITES,
  CentralizedSite,
  getSiteById,
} from '../../data/candidateSites'
import {
  CRITERION_LABELS,
  CRITERION_UNITS,
} from '../missionTypes'
import { MissionFormState } from '../missionForm'
import { ViewId } from '../Sidebar'

interface CandidateSitesProps {
  configuredMission?: MissionProfile | null
  activeMission?: MissionProfile | null
  formState?: MissionFormState
  onNavigate?: (view: ViewId) => void
}

type CategoryFilter = 'all' | FeasibilityCategory

export function CandidateSites({
  configuredMission,
  activeMission: propActiveMission,
  formState,
  onNavigate,
}: CandidateSitesProps) {
  // Use active mission if available, or fall back to configured / default profile for the current form state type
  const activeMission: MissionProfile = useMemo(() => {
    if (propActiveMission) return propActiveMission
    if (configuredMission) return configuredMission
    const missionTypeId = formState?.missionType ?? 'science'
    return getDefaultMissionProfile(missionTypeId)
  }, [propActiveMission, configuredMission, formState?.missionType])

  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [inspectSite, setInspectSite] = useState<CentralizedSite | null>(null)
  const [compareSiteIds, setCompareSiteIds] = useState<string[]>([])
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Cast candidate sites to CentralizedSite[] for access to rich provenance
  const centralizedSites = CANDIDATE_SITES as CentralizedSite[]

  // Evaluate all candidate sites against active mission profile
  const evaluationSummary = useMemo(() => {
    return evaluateAllSites(centralizedSites, activeMission)
  }, [centralizedSites, activeMission])

  // Filtered sites based on category and search
  const filteredSites = useMemo(() => {
    return evaluationSummary.all.filter(({ site, result }) => {
      // Category filter
      if (selectedFilter !== 'all' && result.category !== selectedFilter) {
        return false
      }
      // Text search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        const matchesName = site.name.toLowerCase().includes(q)
        const matchesRegion = site.region.toLowerCase().includes(q)
        const matchesId = site.id.toLowerCase().includes(q)
        if (!matchesName && !matchesRegion && !matchesId) return false
      }
      return true
    })
  }, [evaluationSummary, selectedFilter, searchQuery])

  const toggleCompareSite = (siteId: string) => {
    setCompareSiteIds((prev) => {
      if (prev.includes(siteId)) {
        return prev.filter((id) => id !== siteId)
      } else {
        if (prev.length >= 4) {
          alert('You can compare a maximum of 4 candidate sites at once.')
          return prev
        }
        return [...prev, siteId]
      }
    })
  }

  const comparedSites = useMemo(() => {
    return compareSiteIds
      .map((id) => getSiteById(id))
      .filter((s): s is CentralizedSite => s !== undefined)
  }, [compareSiteIds])

  return (
    <div className="view-container">
      {/* View Header */}
      <header className="view-header">
        <div className="section-tag">FEASIBILITY FILTER & SITE VERIFICATION</div>
        <div className="title-row">
          <h1 className="view-title">Candidate Landing Sites</h1>
          <span className="status-badge-ready" role="status">
            <span className="status-badge-dot" aria-hidden="true" />
            {centralizedSites.length} Verified Sites Evaluated
          </span>
        </div>
        <p className="view-description">
          Authentic NASA Artemis III candidate regions and polar ground truth targets evaluated against
          operational physical constraints. In strict accordance with engineering transparency,
          unassessed parameters are never assumed safe.
        </p>
      </header>

      {/* Active Mission Banner */}
      <section className="notice-banner notice-banner--info" role="region" aria-label="Active Mission Context">
        <span className="notice-icon" aria-hidden="true">🎯</span>
        <div className="notice-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>Active Feasibility Profile: {activeMission.name}</strong>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
              {activeMission.description}
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => onNavigate('setup')}
            >
              Modify Constraints in Setup →
            </button>
          )}
        </div>
      </section>

      {/* Triage Stat Cards & Filter Controls */}
      <div className="feasibility-stats-grid">
        <button
          type="button"
          className={`stat-filter-card ${selectedFilter === 'all' ? 'stat-filter-card--active' : ''}`}
          onClick={() => setSelectedFilter('all')}
        >
          <div className="stat-filter-label">ALL CANDIDATES</div>
          <div className="stat-filter-value font-mono">{evaluationSummary.totalCount}</div>
          <div className="stat-filter-sub">Curated landing targets</div>
        </button>

        <button
          type="button"
          className={`stat-filter-card stat-filter-card--feasible ${selectedFilter === 'feasible' ? 'stat-filter-card--active' : ''}`}
          onClick={() => setSelectedFilter('feasible')}
        >
          <div className="stat-filter-label">FEASIBLE (ELIGIBLE)</div>
          <div className="stat-filter-value font-mono text-teal">{evaluationSummary.feasibleCount}</div>
          <div className="stat-filter-sub">Passes physical limits · Ranked in TOPSIS</div>
        </button>

        <button
          type="button"
          className={`stat-filter-card stat-filter-card--infeasible ${selectedFilter === 'infeasible' ? 'stat-filter-card--active' : ''}`}
          onClick={() => setSelectedFilter('infeasible')}
        >
          <div className="stat-filter-label">INFEASIBLE (DISQUALIFIED)</div>
          <div className="stat-filter-value font-mono text-red">{evaluationSummary.infeasibleCount}</div>
          <div className="stat-filter-sub">Fails essential slope, rough, or solar limits</div>
        </button>

        <button
          type="button"
          className={`stat-filter-card stat-filter-card--unknown ${selectedFilter === 'unknown' ? 'stat-filter-card--active' : ''}`}
          onClick={() => setSelectedFilter('unknown')}
        >
          <div className="stat-filter-label">UNKNOWN (CANNOT ASSESS)</div>
          <div className="stat-filter-value font-mono text-yellow">{evaluationSummary.unknownCount}</div>
          <div className="stat-filter-sub">Missing data · Safety unverified</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="feasibility-toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="form-input search-input"
            placeholder="Search candidate sites by name, region, or coordinates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="view-mode-toggle" style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              className={`btn btn--small ${viewMode === 'table' ? 'btn--primary' : 'btn--subtle'}`}
              onClick={() => setViewMode('table')}
              title="Display high-density comparison table with aligned coordinates and criteria"
            >
              📊 Table View
            </button>
            <button
              type="button"
              className={`btn btn--small ${viewMode === 'cards' ? 'btn--primary' : 'btn--subtle'}`}
              onClick={() => setViewMode('cards')}
              title="Display detailed individual site inspection cards"
            >
              🗂️ Cards View
            </button>
          </div>
          {compareSiteIds.length > 0 && (
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => setShowCompareModal(true)}
            >
              Compare Selected ({compareSiteIds.length}) →
            </button>
          )}
          <div className="toolbar-count font-mono">
            Showing <strong>{filteredSites.length}</strong> of <strong>{evaluationSummary.totalCount}</strong> sites
          </div>
        </div>
      </div>

      {/* Candidate Sites Content: Empty State, Master Table View, or Card View */}
      {filteredSites.length === 0 ? (
        <div className="panel empty-state-panel">
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">🔭</span>
            <h2 className="empty-state-title">No candidate sites match your filter.</h2>
            <p className="empty-state-text">
              Try selecting "All Candidates" or adjusting your search keyword.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setSelectedFilter('all')
                setSearchQuery('')
              }}
            >
              Reset filters
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-responsive">
          <table className="master-candidate-table" aria-label="Candidate Landing Sites Table">
            <thead>
              <tr>
                <th scope="col" className="col-site">Candidate Landing Site</th>
                <th scope="col" className="col-region">Region</th>
                <th scope="col" className="col-lat text-right">Latitude</th>
                <th scope="col" className="col-lon text-right">Longitude</th>
                <th scope="col" className="col-elevation text-right">Elevation</th>
                <th scope="col" className="col-type">Type</th>
                <th scope="col" className="col-feasibility">Feasibility Status</th>
                <th scope="col" className="col-metric text-right">Slope (°)</th>
                <th scope="col" className="col-metric text-right">Sun (%)</th>
                <th scope="col" className="col-metric text-right">Comms (%)</th>
                <th scope="col" className="col-metric text-right">Resource</th>
                <th scope="col" className="col-action text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map(({ site, result }) => {
                const isFeasible = result.category === 'feasible'
                const isInfeasible = result.category === 'infeasible'
                const isUnknown = result.category === 'unknown'
                const centSite = site as CentralizedSite
                const isCompared = compareSiteIds.includes(site.id)

                return (
                  <tr key={site.id}>
                    <td className="col-site">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <strong>{site.name}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {centSite.sourceOrganization}
                        </span>
                      </div>
                    </td>
                    <td className="col-region text-muted">{site.region}</td>
                    <td className="col-lat font-mono text-right text-nowrap">
                      {site.latitude.toFixed(2)}° S
                    </td>
                    <td className="col-lon font-mono text-right text-nowrap">
                      {site.longitude.toFixed(2)}° E
                    </td>
                    <td className="col-elevation font-mono text-right text-nowrap">
                      {centSite.measurements.elevation.value !== null
                        ? `${centSite.measurements.elevation.value > 0 ? '+' : ''}${centSite.measurements.elevation.value.toLocaleString()} m`
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="col-type text-nowrap">
                      {centSite.designation && (
                        <span
                          className={`badge-designation ${
                            centSite.designation === 'official-artemis-candidate'
                              ? 'badge-designation--artemis'
                              : 'badge-designation--research'
                          }`}
                        >
                          {centSite.designation === 'official-artemis-candidate'
                            ? 'Artemis III'
                            : 'Research'}
                        </span>
                      )}
                    </td>
                    <td className="col-feasibility text-nowrap">
                      {isFeasible && (
                        <span className="feasibility-badge feasibility-badge--pass">
                          ✓ {result.status}
                        </span>
                      )}
                      {isInfeasible && (
                        <span
                          className="feasibility-badge feasibility-badge--fail"
                          title={result.reasons.join('; ')}
                        >
                          ✕ Disqualified
                        </span>
                      )}
                      {isUnknown && (
                        <span
                          className="feasibility-badge feasibility-badge--unknown"
                          title={result.reasons.join('; ')}
                        >
                          ? Unknown
                        </span>
                      )}
                    </td>
                    <td className="col-metric font-mono text-right text-nowrap">
                      {site.criteria.slope.value !== null ? `${site.criteria.slope.value}°` : '—'}
                    </td>
                    <td className="col-metric font-mono text-right text-nowrap">
                      {site.criteria.illumination.value !== null ? `${site.criteria.illumination.value}%` : '—'}
                    </td>
                    <td className="col-metric font-mono text-right text-nowrap">
                      {site.criteria.communication.value !== null ? `${site.criteria.communication.value}%` : '—'}
                    </td>
                    <td className="col-metric font-mono text-right text-nowrap">
                      {site.criteria.resource.value !== null ? site.criteria.resource.value : '—'}
                    </td>
                    <td className="col-action text-center text-nowrap">
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn--subtle btn--small"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem' }}
                          onClick={() => setInspectSite(centSite)}
                          title="Scientific provenance & telemetry"
                        >
                          Details 🔍
                        </button>
                        <button
                          type="button"
                          className={`btn btn--small ${isCompared ? 'btn--primary' : 'btn--subtle'}`}
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem' }}
                          onClick={() => toggleCompareSite(site.id)}
                          title="Select site for comparison"
                        >
                          {isCompared ? '✓ Selected' : '+ Compare'}
                        </button>
                        {onNavigate && (
                          <button
                            type="button"
                            className="btn btn--subtle btn--small"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem' }}
                            onClick={() => onNavigate('map')}
                            title="Inspect on Lunar Map"
                          >
                            Map ↗
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Candidate Sites Card List */
        <div className="candidate-sites-list">
          {filteredSites.map(({ site, result }) => {
            const isFeasible = result.category === 'feasible'
            const isInfeasible = result.category === 'infeasible'
            const isUnknown = result.category === 'unknown'
            const centSite = site as CentralizedSite
            const isCompared = compareSiteIds.includes(site.id)

            // Calculate real metrics count
            const realMetricCount = Object.values(site.criteria).filter((c) => c.value !== null).length
            const isComplete = realMetricCount === 6

            return (
              <article
                key={site.id}
                className={`site-feasibility-card ${
                  isFeasible
                    ? 'site-feasibility-card--feasible'
                    : isInfeasible
                    ? 'site-feasibility-card--infeasible'
                    : 'site-feasibility-card--unknown'
                }`}
                aria-label={`Landing Site: ${site.name}`}
              >
                {/* Header */}
                <header className="site-card-header">
                  <div className="site-card-title-group">
                    <div className="site-card-meta">
                      <span className="site-region-tag">{site.region}</span>
                      <span className="coord-badge">
                        {site.latitude.toFixed(2)}°S, {site.longitude.toFixed(2)}°E
                      </span>
                      {centSite.designation && (
                        <span
                          className={`badge-designation ${
                            centSite.designation === 'official-artemis-candidate'
                              ? 'badge-designation--artemis'
                              : 'badge-designation--research'
                          }`}
                        >
                          {centSite.designation === 'official-artemis-candidate'
                            ? 'OFFICIAL ARTEMIS III REGION'
                            : 'SCIENTIFIC RESEARCH LOCATION'}
                        </span>
                      )}
                      {centSite.resourceEvidence && (
                        <span className={`badge-evidence badge-evidence--${centSite.resourceEvidence.kind}`}>
                          {centSite.resourceEvidence.kind.toUpperCase().replace('-', ' ')}
                        </span>
                      )}
                    </div>
                    <h2 className="site-card-title">{site.name}</h2>
                  </div>

                  <div className="site-card-badge-group">
                    {/* Compare Button */}
                    <button
                      type="button"
                      className={`btn btn--small ${isCompared ? 'btn--primary' : 'btn--subtle'}`}
                      style={{ fontSize: '0.725rem' }}
                      onClick={() => toggleCompareSite(site.id)}
                      title="Select site for side-by-side comparison"
                    >
                      {isCompared ? '✓ Selected to Compare' : '+ Compare'}
                    </button>

                    {isFeasible && (
                      <span className="feasibility-badge feasibility-badge--pass">
                        <span className="badge-icon">✓</span>
                        FEASIBLE · {result.status.toUpperCase()}
                      </span>
                    )}
                    {isInfeasible && (
                      <span className="feasibility-badge feasibility-badge--fail">
                        <span className="badge-icon">✕</span>
                        INFEASIBLE · DISQUALIFIED
                      </span>
                    )}
                    {isUnknown && (
                      <span className="feasibility-badge feasibility-badge--unknown">
                        <span className="badge-icon">?</span>
                        UNKNOWN · DATA GAP
                      </span>
                    )}
                  </div>
                </header>

                {/* Data Availability Indicator Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.25rem 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>
                    Data Coverage:{' '}
                    <strong style={{ color: isComplete ? '#4ade80' : '#fbbf24' }}>
                      {realMetricCount}/6 Authentic Metrics
                    </strong>
                    {!isComplete && ' (Missing parameters explicitly unassessed)'}
                  </span>
                  <span>
                    Organization:{' '}
                    <a
                      href={centSite.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-teal)' }}
                    >
                      {centSite.sourceOrganization} ↗
                    </a>
                  </span>
                </div>

                {/* Infeasibility or Unknown Callout Notice */}
                {!isFeasible && result.reasons.length > 0 && (
                  <div
                    className={`site-failure-banner ${
                      isInfeasible ? 'site-failure-banner--fail' : 'site-failure-banner--unknown'
                    }`}
                  >
                    <span className="failure-icon" aria-hidden="true">
                      {isInfeasible ? '🚫' : '⚠️'}
                    </span>
                    <div className="failure-details">
                      <strong>
                        {isInfeasible
                          ? 'Physical Constraint Violations (Disqualifying):'
                          : 'Unverified Assessment (Missing Critical Telemetry):'}
                      </strong>
                      <ul className="failure-reasons-list">
                        {result.reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Criteria Table */}
                <div className="site-criteria-table-wrapper">
                  <table className="site-criteria-table" aria-label={`Criteria assessment for ${site.name}`}>
                    <thead>
                      <tr>
                        <th scope="col">Criterion</th>
                        <th scope="col">Assessment</th>
                        <th scope="col">Uncertainty Bound</th>
                        <th scope="col">Data Source & Fidelity</th>
                        <th scope="col">Constraint Evaluation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CRITERION_IDS.map((cid) => {
                        const critVal = site.criteria[cid]
                        const constraintResult = result.constraintResults.find(
                          (cr) => cr.criterion === cid
                        )
                        const unit = CRITERION_UNITS[cid]
                        const isValueNull = critVal.value === null

                        return (
                          <tr key={cid}>
                            <td>
                              <strong>{CRITERION_LABELS[cid]}</strong>
                            </td>
                            <td>
                              {isValueNull ? (
                                <span className="value-missing font-mono">null (Unassessed)</span>
                              ) : (
                                <span className="font-mono value-primary">
                                  {critVal.value} <span className="unit-muted">{unit}</span>
                                </span>
                              )}
                            </td>
                            <td className="font-mono">
                              {isValueNull || critVal.low === null || critVal.high === null ? (
                                <span className="unit-muted">—</span>
                              ) : (
                                `[${critVal.low}, ${critVal.high}]`
                              )}
                            </td>
                            <td>
                              <div className="source-info">
                                <span className="source-name">{critVal.source}</span>
                                <span className={`quality-badge quality-badge--${critVal.quality}`}>
                                  {critVal.quality.toUpperCase()} QUALITY · {critVal.kind.toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td>
                              {constraintResult ? (
                                <div className="constraint-cell">
                                  <span
                                    className={`status-pill status-pill--${constraintResult.status
                                      .toLowerCase()
                                      .replace(/\s+/g, '-')}`}
                                  >
                                    {constraintResult.status}
                                  </span>
                                  {constraintResult.status !== 'Pass' && (
                                    <span className="constraint-cell-hint">
                                      {constraintResult.reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="unit-muted font-mono">No constraint</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <footer className="site-card-footer">
                  <div className="site-card-actions">
                    <button
                      type="button"
                      className="btn btn--subtle btn--small"
                      onClick={() => setInspectSite(centSite)}
                    >
                      Scientific Provenance & Telemetry 🔍
                    </button>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--small"
                        onClick={() => onNavigate('map')}
                      >
                        Inspect on Lunar Map ↗
                      </button>
                    )}
                    {isFeasible && onNavigate && (
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        onClick={() => onNavigate('results')}
                      >
                        View in TOPSIS Rankings →
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {/* FLOATING COMPARISON BAR */}
      {compareSiteIds.length > 0 && (
        <section className="comparison-floating-bar" aria-label="Candidate Comparison Bar">
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

      {/* SCIENTIFIC PROVENANCE & DETAILED TELEMETRY MODAL */}
      {inspectSite && (
        <div className="comparison-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-provenance-title">
          <div className="comparison-modal-content panel" style={{ maxWidth: '780px' }}>
            <div className="comparison-modal-header">
              <div>
                <span className="section-tag">AUTHENTIC SCIENTIFIC PROVENANCE</span>
                <h2 id="modal-provenance-title" className="comparison-modal-title">
                  {inspectSite.name} — Technical Provenance & Telemetry
                </h2>
                <p className="panel-subtitle" style={{ margin: 0 }}>
                  {inspectSite.region} (<span className="text-nowrap font-mono">{inspectSite.latitude.toFixed(2)}°S, {inspectSite.longitude.toFixed(2)}°E</span>) · Frame: DE421
                </p>
              </div>
              <button
                type="button"
                className="inspection-close-btn"
                onClick={() => setInspectSite(null)}
                aria-label="Close Technical Provenance"
              >
                ×
              </button>
            </div>

            <div style={{ maxHeight: '68vh', overflowY: 'auto', marginTop: '1rem' }}>
              {/* Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Mission Overview & Description
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {inspectSite.description}
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Source: <strong>{inspectSite.sourceOrganization}</strong> (
                  <a href={inspectSite.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-teal)' }}>
                    Official Publication ↗
                  </a>
                  )
                </div>
              </div>

              {/* Real Measurements Table */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Extracted Physical Telemetry (NASA Datasets)
                </h3>
                <table className="comparison-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th scope="col">Measurement</th>
                      <th scope="col">Value</th>
                      <th scope="col">Dataset & Origin</th>
                      <th scope="col">Sampling Method</th>
                      <th scope="col">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>LOLA Elevation</td>
                      <td className="font-mono">
                        {inspectSite.measurements.elevation.value !== null
                          ? `${inspectSite.measurements.elevation.value} m`
                          : 'null'}
                      </td>
                      <td>{inspectSite.measurements.elevation.dataset}</td>
                      <td>{inspectSite.measurements.elevation.samplingMethod}</td>
                      <td>
                        <span className={`quality-badge quality-badge--${inspectSite.measurements.elevation.quality}`}>
                          {inspectSite.measurements.elevation.quality.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Surface Slope</td>
                      <td className="font-mono">{inspectSite.measurements.slope.value}°</td>
                      <td>{inspectSite.measurements.slope.dataset}</td>
                      <td>{inspectSite.measurements.slope.samplingMethod}</td>
                      <td>
                        <span className={`quality-badge quality-badge--${inspectSite.measurements.slope.quality}`}>
                          {inspectSite.measurements.slope.quality.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Surface Roughness (RMS)</td>
                      <td className="font-mono">
                        {inspectSite.measurements.roughness.value !== null
                          ? `${inspectSite.measurements.roughness.value} m`
                          : 'UNASSESSED'}
                      </td>
                      <td>{inspectSite.measurements.roughness.dataset}</td>
                      <td>{inspectSite.measurements.roughness.samplingMethod}</td>
                      <td>
                        <span className={`quality-badge quality-badge--${inspectSite.measurements.roughness.quality}`}>
                          {inspectSite.measurements.roughness.quality.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Solar Illumination</td>
                      <td className="font-mono">{inspectSite.measurements.illumination.value}%</td>
                      <td>{inspectSite.measurements.illumination.dataset}</td>
                      <td>{inspectSite.measurements.illumination.samplingMethod}</td>
                      <td>
                        <span className={`quality-badge quality-badge--${inspectSite.measurements.illumination.quality}`}>
                          {inspectSite.measurements.illumination.quality.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Permanently Shadowed (PSR)</td>
                      <td className="font-mono">
                        {inspectSite.measurements.isPsr.value ? 'YES (0 km)' : `NO (${inspectSite.measurements.psrDistanceKm} km)`}
                      </td>
                      <td>{inspectSite.measurements.isPsr.dataset}</td>
                      <td>{inspectSite.measurements.isPsr.samplingMethod}</td>
                      <td>
                        <span className={`quality-badge quality-badge--${inspectSite.measurements.isPsr.quality}`}>
                          {inspectSite.measurements.isPsr.quality.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Resource Evidence Deep Dive */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Evidence-Based Resource Potential
                </h3>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.875rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge-evidence badge-evidence--${inspectSite.resourceEvidence.kind}`}>
                      {inspectSite.resourceEvidence.kind.toUpperCase().replace('-', ' ')}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Citation: <strong>{inspectSite.resourceEvidence.citation}</strong>
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {inspectSite.resourceEvidence.summary}
                  </p>
                  {inspectSite.resourceEvidence.directObservation && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#4ade80' }}>
                      <strong>Direct Physical Observation:</strong> {inspectSite.resourceEvidence.directObservation}
                    </div>
                  )}
                  {inspectSite.resourceEvidence.thermalEvidence && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Thermal Environment (Diviner):</strong> {inspectSite.resourceEvidence.thermalEvidence}
                    </div>
                  )}
                  {inspectSite.resourceEvidence.neutronDeficitEvidence && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Epithermal Neutron Deficit (LEND):</strong> {inspectSite.resourceEvidence.neutronDeficitEvidence}
                    </div>
                  )}
                </div>
              </div>

              {/* Communication Visibility Deep Dive */}
              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Realistic Communication Visibility Model
                </h3>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span>
                      Direct-to-Earth Line of Sight: <strong>{inspectSite.communicationModel.directEarthVisibilityPercent}%</strong>
                    </span>
                    <span>
                      Lunar Orbital Relay: <strong>{inspectSite.communicationModel.relaySupported ? 'Supported' : 'No'}</strong>
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                    <strong>Assumed Operational Scenario:</strong> {inspectSite.communicationModel.assumedScenario}
                  </p>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Dataset: {inspectSite.communicationModel.dataset} ({inspectSite.communicationModel.modelNote})
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setInspectSite(null)}
              >
                Close Technical Provenance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE SITE COMPARISON MODAL */}
      {showCompareModal && (
        <div className="comparison-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-candidate-comparison-title">
          <div className="comparison-modal-content panel">
            <div className="comparison-modal-header">
              <div>
                <span className="section-tag">MULTI-SITE CROSS EVALUATION</span>
                <h2 id="modal-candidate-comparison-title" className="comparison-modal-title">
                  Candidate Sites Side-by-Side Comparison
                </h2>
                <p className="panel-subtitle" style={{ margin: 0 }}>
                  Active Mission Profile: <strong>{activeMission.name}</strong>. Cross-comparison of physical feasibility, NASA measurements, and scientific evidence.
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
                      const res = evaluationSummary.all.find((a) => a.site.id === site.id)?.result
                      return (
                        <td key={site.id}>
                          {res?.category === 'feasible' && (
                            <span className="badge-triage badge-triage--pass">
                              PASS ({res.status})
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
    </div>
  )
}
