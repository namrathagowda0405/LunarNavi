import { useState, useMemo, useEffect } from 'react'
import { CRITERION_IDS } from '../../engine/types'
import { MissionProfile, getDefaultMissionProfile } from '../../engine/mission'
import { rankSites, TopsisScore } from '../../engine/topsis'
import { filterFeasibleSites, evaluateAllSites } from '../../engine/feasibility'
import { runMonteCarlo, MonteCarloResult } from '../../engine/montecarlo'
import { saveAnalysisRun } from '../../services/analysisService'
import {
  CANDIDATE_SITES,
  CentralizedSite,
  getDecorrelatedBackupSite,
} from '../../data/candidateSites'
import {
  CRITERION_LABELS,
  MISSION_TYPES,
  REGION_OPTIONS,
} from '../missionTypes'
import { formatWeightShare, MissionFormState } from '../missionForm'
import { ViewId } from '../Sidebar'

interface ResultsProps {
  formState: MissionFormState
  configuredMission: MissionProfile | null
  activeMission?: MissionProfile | null
  onEditMission: () => void
  onNavigate?: (view: ViewId) => void
}

export function Results({
  formState,
  configuredMission,
  activeMission: propActiveMission,
  onEditMission,
  onNavigate,
}: ResultsProps) {
  // Use prop active mission, or configured mission, or fall back to default profile for the current form state
  const activeMission: MissionProfile = useMemo(() => {
    if (propActiveMission) return propActiveMission
    if (configuredMission) return configuredMission
    return getDefaultMissionProfile(formState.missionType)
  }, [propActiveMission, configuredMission, formState.missionType])

  const [showHeadToHead, setShowHeadToHead] = useState<boolean>(true)

  // 1. Feasibility filtering
  const centralizedSites = CANDIDATE_SITES as CentralizedSite[]

  const feasibilitySummary = useMemo(() => {
    return evaluateAllSites(centralizedSites, activeMission)
  }, [centralizedSites, activeMission])

  const feasibleSites = useMemo(() => {
    return filterFeasibleSites(centralizedSites, activeMission)
  }, [centralizedSites, activeMission])

  // 2. TOPSIS multi-criteria ranking on feasible sites
  const rankingResult = useMemo(() => {
    return rankSites(feasibleSites, activeMission)
  }, [feasibleSites, activeMission])

  // 3. Monte Carlo Robustness Analysis on feasible sites (500 stochastic trials, seed 42)
  const monteCarloResult: MonteCarloResult | null = useMemo(() => {
    if (feasibleSites.length === 0) return null
    try {
      return runMonteCarlo(feasibleSites, activeMission, {
        seed: 42,
        iterations: 500,
        weightRelativeSpread: 0.15,
      })
    } catch (err) {
      console.warn('Monte Carlo computation warning:', err)
      return null
    }
  }, [feasibleSites, activeMission])

  // Fast Monte Carlo stats lookup
  const mcStatsMap = useMemo(() => {
    const map = new Map<string, { winRate: number; top3Rate: number }>()
    if (!monteCarloResult) return map

    const iters = monteCarloResult.iterations || 500
    for (const siteSum of monteCarloResult.sites) {
      const top3Count = siteSum.rankCounts.slice(0, 3).reduce((a, b) => a + b, 0)
      map.set(siteSum.siteId, {
        winRate: siteSum.winFrequency,
        top3Rate: top3Count / iters,
      })
    }
    return map
  }, [monteCarloResult])

  // Fast site lookup
  const siteMap = useMemo(() => {
    return new Map(centralizedSites.map((s) => [s.id, s]))
  }, [centralizedSites])

  const typeOpt = MISSION_TYPES.find((t) => t.id === formState.missionType)
  const regionOpt = REGION_OPTIONS.find((r) => r.id === formState.region)

  // Top Recommendation (#1 TOPSIS winner)
  const topScore: TopsisScore | undefined = rankingResult.ranking[0]
  const topSite: CentralizedSite | undefined = topScore ? siteMap.get(topScore.id) : undefined
  const topMc = topScore ? mcStatsMap.get(topScore.id) : undefined

  // Backup Recommendation (Highest-ranking decorrelated runner-up)
  const backupSite: CentralizedSite | undefined = useMemo(() => {
    if (!topSite) return undefined
    return getDecorrelatedBackupSite(
      topSite.id,
      rankingResult.ranking.map((r) => r.id)
    )
  }, [topSite, rankingResult.ranking])

  const backupScore: TopsisScore | undefined = useMemo(() => {
    if (!backupSite) return undefined
    return rankingResult.ranking.find((r) => r.id === backupSite.id)
  }, [backupSite, rankingResult.ranking])

  const backupMc = backupSite ? mcStatsMap.get(backupSite.id) : undefined

  // Top criteria by weight for sensitivity insight
  const sortedCriteriaByWeight = useMemo(() => {
    return [...CRITERION_IDS].sort(
      (a, b) => (activeMission.weights[b] ?? 0) - (activeMission.weights[a] ?? 0)
    )
  }, [activeMission.weights])

  // Automatically log/persist analysis run to Supabase (or session ledger fallback)
  useEffect(() => {
    if (!topScore) return
    const topSummary = topScore ? mcStatsMap.get(topScore.id) : undefined
    saveAnalysisRun({
      missionId: activeMission.id,
      missionType: formState.missionType,
      weights: activeMission.weights,
      constraints: activeMission.constraints,
      totalSitesEvaluated: centralizedSites.length,
      feasibleSitesCount: feasibleSites.length,
      primarySiteId: topScore.id,
      primaryScore: topScore.closeness,
      backupSiteId: backupSite?.id,
      rankings: rankingResult.ranking.map((r, idx) => ({
        id: r.id,
        rank: idx + 1,
        closeness: r.closeness,
        distanceToIdeal: r.distanceToIdeal,
        distanceToAntiIdeal: r.distanceToAntiIdeal,
      })),
      simulationParameters: {
        iterations: 500,
        weightRelativeSpread: 0.15,
        seed: 42,
      },
      monteCarloSummary: topSummary
        ? {
            topSiteId: topScore.id,
            topSiteWinRate: topSummary.winRate,
            topSiteTop3Rate: topSummary.top3Rate,
            nominalRank: 1,
          }
        : undefined,
    }).catch(() => {
      // Non-blocking background persistence
    })
  }, [
    activeMission.id,
    activeMission.weights,
    activeMission.constraints,
    formState.missionType,
    topScore?.id,
    topScore?.closeness,
    backupSite?.id,
    feasibleSites.length,
    centralizedSites.length,
    rankingResult.ranking,
    mcStatsMap,
  ])

  return (
    <div className="view-container">
      {/* View Header */}
      <header className="view-header">
        <div className="section-tag">MULTI-CRITERIA DECISION ANALYSIS</div>
        <div className="title-row">
          <h1 className="view-title">Landing Site Results & Rankings</h1>
          <span className="status-badge-ready" role="status">
            <span className="status-badge-dot" aria-hidden="true" />
            TOPSIS Vector Analysis & Monte Carlo Ready
          </span>
        </div>
        <p className="view-description">
          Geometric multi-criteria ranking using TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution),
          coupled with 500-iteration Monte Carlo robustness analysis.
          Only candidate sites that meet all physical engineering constraints are admitted for decision analysis.
        </p>
      </header>

      {/* Mission Profile Status Banner */}
      <section className="notice-banner notice-banner--info" role="region" aria-label="Active Mission Context">
        <span className="notice-icon" aria-hidden="true">🎯</span>
        <div className="notice-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>Active Decision Profile: {activeMission.name} ({typeOpt?.label}) — Target: {regionOpt?.label ?? 'Lunar South Pole'}</strong>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
              {activeMission.description}
            </p>
            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}>
              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                📅 Arrival: <strong>{formState.arrivalDate ?? '2027-06-01'}</strong> {formState.arrivalWindowDays ? `(±${Math.round(formState.arrivalWindowDays / 2)}d)` : ''}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                ⏳ Stay Duration: <strong>{formState.durationDays ?? 14} Earth days</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={onEditMission}
            >
              Adjust Priorities in Setup
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => onNavigate('sites')}
              >
                View Feasibility Breakdown
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Triage Stats Row */}
      <div className="feasibility-stats-grid">
        <div className="stat-filter-card">
          <div className="stat-filter-label">TOTAL EVALUATED SITES</div>
          <div className="stat-filter-value font-mono">{centralizedSites.length}</div>
          <div className="stat-filter-sub">Curated lunar south pole dataset</div>
        </div>

        <div className="stat-filter-card stat-filter-card--feasible">
          <div className="stat-filter-label">FEASIBLE CANDIDATES</div>
          <div className="stat-filter-value font-mono text-teal">{feasibleSites.length}</div>
          <div className="stat-filter-sub">Admitted to TOPSIS ranking matrix</div>
        </div>

        <div className="stat-filter-card stat-filter-card--infeasible">
          <div className="stat-filter-label">INFEASIBLE FILTERED</div>
          <div className="stat-filter-value font-mono text-red">{feasibilitySummary.infeasibleCount}</div>
          <div className="stat-filter-sub">Failed essential slope/rough/solar limits</div>
        </div>

        <div className="stat-filter-card stat-filter-card--unknown">
          <div className="stat-filter-label">UNKNOWN / DATA GAP</div>
          <div className="stat-filter-value font-mono text-yellow">{feasibilitySummary.unknownCount}</div>
          <div className="stat-filter-sub">Missing critical telemetry · Safety unverified</div>
        </div>
      </div>

      {/* MISSION WEIGHT SENSITIVITY INSIGHT */}
      <section className="panel" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }} aria-label="Weight Sensitivity Analysis">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span className="section-tag" style={{ marginBottom: '0.2rem' }}>WEIGHT SENSITIVITY DRIVER</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Dominant Ranking Priorities for <strong>{activeMission.name}</strong>:{' '}
              {sortedCriteriaByWeight.slice(0, 3).map((cid, i) => (
                <span key={cid} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {CRITERION_LABELS[cid]} ({formatWeightShare(activeMission.weights[cid] ?? 0)}){i < 2 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Changing weights in Mission Setup dynamically recalculates ideal vector proximity and rankings.
          </div>
        </div>
      </section>

      {/* TOP RECOMMENDATION WINNER BANNER */}
      {topSite && topScore && (
        <section className="winner-card panel" aria-labelledby="heading-top-recommendation">
          <div className="winner-card__glow" aria-hidden="true" />
          <div className="winner-card__content">
            <div className="winner-badge-row">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="winner-rank-badge font-mono">RANK #1 PRIMARY SELECTION</span>
                <span
                  className={`badge-designation ${
                    topSite.designation === 'official-artemis-candidate'
                      ? 'badge-designation--artemis'
                      : 'badge-designation--research'
                  }`}
                >
                  {topSite.designation === 'official-artemis-candidate' ? 'Official Artemis III' : 'Research Landmark'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="winner-closeness font-mono">
                  TOPSIS Score: <strong>{(topScore.closeness * 100).toFixed(2)}%</strong> (C_i = {topScore.closeness.toFixed(4)})
                </span>
                {topMc && (
                  <span className="status-pill status-pill--pass font-mono" style={{ fontSize: '0.75rem' }}>
                    Robustness Win Rate: <strong>{(topMc.winRate * 100).toFixed(1)}%</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="winner-main">
              <div>
                <h2 id="heading-top-recommendation" className="winner-title">{topSite.name}</h2>
                <div className="winner-meta">
                  <span className="site-region-tag">{topSite.region}</span>
                  <span className="coord-badge">
                    {topSite.latitude.toFixed(2)}°S, {topSite.longitude.toFixed(2)}°E
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Frame: DE421 · Org: {topSite.sourceOrganization}
                  </span>
                </div>
              </div>

              {onNavigate && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onNavigate('map')}
                  >
                    Locate on Lunar Map ↗
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => onNavigate('robustness')}
                  >
                    Examine Robustness →
                  </button>
                </div>
              )}
            </div>

            {/* Metrics Snapshot */}
            <div className="winner-metrics-grid">
              <div className="winner-metric-cell">
                <span className="winner-metric-label">Surface Slope</span>
                <span className="winner-metric-val font-mono">{topSite.criteria.slope.value}°</span>
                <span className="winner-metric-sub">
                  Benign landing incline (lower is safer)
                </span>
              </div>

              <div className="winner-metric-cell">
                <span className="winner-metric-label">Solar Illumination</span>
                <span className="winner-metric-val font-mono">{topSite.criteria.illumination.value}%</span>
                <span className="winner-metric-sub">
                  Annual cumulative sunlight visibility
                </span>
              </div>

              <div className="winner-metric-cell">
                <span className="winner-metric-label">Earth Visibility</span>
                <span className="winner-metric-val font-mono">{topSite.criteria.communication.value}%</span>
                <span className="winner-metric-sub">
                  Direct line-of-sight communications
                </span>
              </div>

              <div className="winner-metric-cell">
                <span className="winner-metric-label">Resource Potential</span>
                <span className="winner-metric-val font-mono">
                  {topSite.criteria.resource.value !== null ? `${topSite.criteria.resource.value} / 100` : 'Unassessed'}
                </span>
                <span className="winner-metric-sub">
                  {topSite.resourceEvidence.kind.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BACKUP / ALTERNATIVE RECOMMENDATION CARD */}
      {backupSite && backupScore && (
        <section className="backup-card" aria-labelledby="heading-backup-recommendation">
          <div className="backup-badge-row">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="backup-rank-badge font-mono">RANK #{backupScore.rank} BACKUP RECOMMENDATION</span>
              <span
                className={`badge-designation ${
                  backupSite.designation === 'official-artemis-candidate'
                    ? 'badge-designation--artemis'
                    : 'badge-designation--research'
                }`}
              >
                {backupSite.designation === 'official-artemis-candidate' ? 'Official Artemis III' : 'Research Landmark'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                TOPSIS Score: <strong>{(backupScore.closeness * 100).toFixed(2)}%</strong> (C_i = {backupScore.closeness.toFixed(4)})
              </span>
              {backupMc && (
                <span className="status-pill status-pill--marginal font-mono" style={{ fontSize: '0.75rem' }}>
                  Robustness Win Rate: <strong>{(backupMc.winRate * 100).toFixed(1)}%</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 id="heading-backup-recommendation" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                {backupSite.name}
              </h2>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <span className="site-region-tag">{backupSite.region}</span>
                <span className="coord-badge">
                  {backupSite.latitude.toFixed(2)}°S, {backupSite.longitude.toFixed(2)}°E
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Org: {backupSite.sourceOrganization}
                </span>
              </div>
            </div>

            {onNavigate && (
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => onNavigate('map')}
              >
                Locate Backup on Map ↗
              </button>
            )}
          </div>

          {/* Technical Rationale Callout */}
          <div className="backup-rationale-box">
            <strong>Operational Backup Justification:</strong> Geographically decorrelated from the primary selection ({topSite?.name})
            by being situated in a separate lunar geological complex (<strong>{backupSite.region}</strong> vs {topSite?.region}).
            Provides critical mission redundancy in case of localized landing hazards, unforeseen shadow periods, or topocentric communications masking during surface operations.
          </div>

          {/* Metrics Snapshot */}
          <div className="winner-metrics-grid" style={{ marginTop: '0.75rem' }}>
            <div className="winner-metric-cell">
              <span className="winner-metric-label">Surface Slope</span>
              <span className="winner-metric-val font-mono">{backupSite.criteria.slope.value}°</span>
              <span className="winner-metric-sub">LOLA 50m incline</span>
            </div>

            <div className="winner-metric-cell">
              <span className="winner-metric-label">Solar Illumination</span>
              <span className="winner-metric-val font-mono">{backupSite.criteria.illumination.value}%</span>
              <span className="winner-metric-sub">Annual solar visibility</span>
            </div>

            <div className="winner-metric-cell">
              <span className="winner-metric-label">Earth Visibility</span>
              <span className="winner-metric-val font-mono">{backupSite.criteria.communication.value}%</span>
              <span className="winner-metric-sub">Direct line-of-sight</span>
            </div>

            <div className="winner-metric-cell">
              <span className="winner-metric-label">Resource Potential</span>
              <span className="winner-metric-val font-mono">
                {backupSite.criteria.resource.value !== null ? `${backupSite.criteria.resource.value} / 100` : 'Unassessed'}
              </span>
              <span className="winner-metric-sub">
                {backupSite.resourceEvidence.kind.replace('-', ' ')}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* HEAD-TO-HEAD PRIMARY VS BACKUP COMPARISON */}
      {topSite && backupSite && (
        <section className="panel" style={{ marginBottom: '1.5rem' }} aria-label="Primary vs Backup Head-to-Head Comparison">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <span className="panel-tag">DECISION TRADE-OFF ANALYSIS</span>
              <h2 className="panel-title" style={{ fontSize: '1.15rem' }}>
                Primary Selection vs. Backup Recommendation
              </h2>
            </div>
            <button
              type="button"
              className="btn btn--subtle btn--small"
              onClick={() => setShowHeadToHead((p) => !p)}
            >
              {showHeadToHead ? 'Collapse Comparison ▲' : 'Expand Comparison ▼'}
            </button>
          </div>

          {showHeadToHead && (
            <div className="table-responsive">
              <table className="comparison-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '200px' }}>Evaluation Metric</th>
                    <th scope="col" style={{ color: '#2dd4bf' }}>
                      Primary: {topSite.name} (#1)
                    </th>
                    <th scope="col" style={{ color: '#fbbf24' }}>
                      Backup: {backupSite.name} (#{backupScore?.rank})
                    </th>
                    <th scope="col">Operational Trade-off</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">TOPSIS Closeness (C_i)</th>
                    <td className="font-mono" style={{ color: '#2dd4bf', fontWeight: 700 }}>
                      {topScore ? (topScore.closeness * 100).toFixed(2) : '—'}%
                    </td>
                    <td className="font-mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                      {backupScore ? (backupScore.closeness * 100).toFixed(2) : '—'}%
                    </td>
                    <td>
                      Primary leads by{' '}
                      {topScore && backupScore
                        ? `${((topScore.closeness - backupScore.closeness) * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Monte Carlo Win Rate</th>
                    <td className="font-mono">
                      {topMc ? `${(topMc.winRate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="font-mono">
                      {backupMc ? `${(backupMc.winRate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td>Statistical stability across 500 stochastic trials</td>
                  </tr>
                  <tr>
                    <th scope="row">Geographic Region</th>
                    <td>{topSite.region}</td>
                    <td>{backupSite.region}</td>
                    <td>Distinct geological setting (decorrelated risks)</td>
                  </tr>
                  <tr>
                    <th scope="row">Landing Slope</th>
                    <td className="font-mono">{topSite.criteria.slope.value}°</td>
                    <td className="font-mono">{backupSite.criteria.slope.value}°</td>
                    <td>
                      {topSite.criteria.slope.value! < backupSite.criteria.slope.value!
                        ? `${topSite.name} is ${((backupSite.criteria.slope.value! - topSite.criteria.slope.value!)).toFixed(1)}° gentler`
                        : `${backupSite.name} is gentler`}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Solar Illumination</th>
                    <td className="font-mono">{topSite.criteria.illumination.value}%</td>
                    <td className="font-mono">{backupSite.criteria.illumination.value}%</td>
                    <td>
                      {topSite.criteria.illumination.value! >= backupSite.criteria.illumination.value!
                        ? `${topSite.name} has more annual sunlight`
                        : `${backupSite.name} has more annual sunlight`}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Earth Line of Sight</th>
                    <td className="font-mono">{topSite.criteria.communication.value}%</td>
                    <td className="font-mono">{backupSite.criteria.communication.value}%</td>
                    <td>Direct communication window over libration</td>
                  </tr>
                  <tr>
                    <th scope="row">Resource Evidence</th>
                    <td>
                      <span className={`badge-evidence badge-evidence--${topSite.resourceEvidence.kind}`}>
                        {topSite.resourceEvidence.kind.toUpperCase()}
                      </span>{' '}
                      ({topSite.criteria.resource.value ?? 'Unassessed'})
                    </td>
                    <td>
                      <span className={`badge-evidence badge-evidence--${backupSite.resourceEvidence.kind}`}>
                        {backupSite.resourceEvidence.kind.toUpperCase()}
                      </span>{' '}
                      ({backupSite.criteria.resource.value ?? 'Unassessed'})
                    </td>
                    <td>Evidence grounding: ground truth vs proxy</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TOPSIS RANKED LEADERBOARD */}
      <section className="panel" aria-labelledby="heading-leaderboard">
        <div className="panel-header">
          <span className="panel-tag">OFFICIAL LEADERBOARD</span>
          <h2 id="heading-leaderboard" className="panel-title">Feasible Candidate Rankings (TOPSIS)</h2>
          <p className="panel-subtitle">
            Ranked by geometric relative closeness to the ideal solution vector (C_i = S^- / [S^+ + S^-]).
            Robustness win rates calculated from 500 Monte Carlo stochastic iterations with weight and measurement margin perturbations.
          </p>
        </div>

        {rankingResult.ranking.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No feasible candidate sites found.</h3>
            <p className="empty-state-text">
              All candidate sites failed one or more essential constraints under the current mission profile.
              Consider relaxing constraints in Mission Setup to evaluate trade-offs.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: '1rem' }}
              onClick={onEditMission}
            >
              Adjust Constraints in Mission Setup
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="leaderboard-table" aria-label="TOPSIS Site Rankings">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '65px', textAlign: 'center' }}>Rank</th>
                  <th scope="col" style={{ minWidth: '180px' }}>Candidate Landing Site</th>
                  <th scope="col" style={{ minWidth: '120px' }}>Region</th>
                  <th scope="col" style={{ minWidth: '140px' }}>TOPSIS Score (C_i)</th>
                  <th scope="col" style={{ minWidth: '110px' }} title="Percentage of 500 Monte Carlo iterations where this site ranked #1">
                    MC Win Rate
                  </th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }} title="Percentage of iterations where this site ranked in Top 3">
                    Top 3 %
                  </th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Slope (°)</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Sun (%)</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Comms (%)</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Resource</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Science</th>
                  {onNavigate && <th scope="col" className="col-action text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {rankingResult.ranking.map((score) => {
                  const site = siteMap.get(score.id)
                  if (!site) return null
                  const isTop = score.rank === 1
                  const isBackup = backupSite && score.id === backupSite.id
                  const mc = mcStatsMap.get(score.id)

                  return (
                    <tr
                      key={score.id}
                      className={isTop ? 'leaderboard-row--top' : undefined}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span className={`rank-pill ${isTop ? 'rank-pill--first' : ''} font-mono`}>
                          #{score.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                          <strong>{site.name}</strong>
                          {isTop && (
                            <span className="winner-rank-badge font-mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              PRIMARY
                            </span>
                          )}
                          {isBackup && (
                            <span className="backup-rank-badge font-mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              BACKUP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted text-nowrap">{site.region}</td>
                      <td>
                        <div className="score-cell text-nowrap">
                          <span className="font-mono score-num">
                            {score.closeness.toFixed(4)}
                          </span>
                          <div className="score-bar" aria-hidden="true">
                            <div
                              className="score-bar__fill"
                              style={{ width: `${Math.min(100, score.closeness * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        {mc ? (
                          <div className="mc-cell font-mono text-nowrap">
                            <div className="mc-bar-track" aria-hidden="true">
                              <div
                                className="mc-bar-fill"
                                style={{ width: `${Math.min(100, mc.winRate * 100)}%` }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', minWidth: '42px' }}>
                              {(mc.winRate * 100).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted font-mono">—</span>
                        )}
                      </td>
                      <td className="font-mono text-muted text-right text-nowrap">
                        {mc ? `${(mc.top3Rate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.slope.value}°</td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.illumination.value}%</td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.communication.value}%</td>
                      <td className="font-mono text-right text-nowrap">
                        {site.criteria.resource.value !== null ? site.criteria.resource.value : '—'}
                      </td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.science.value}</td>
                      {onNavigate && (
                        <td className="col-action text-center text-nowrap">
                          <button
                            type="button"
                            className="btn btn--subtle btn--small"
                            onClick={() => onNavigate('map')}
                          >
                            Map ↗
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FILTERED & DISQUALIFIED SITES BREAKDOWN */}
      <section className="panel" aria-labelledby="heading-disqualified">
        <div className="panel-header">
          <span className="panel-tag">EXCLUSION AUDIT</span>
          <h2 id="heading-disqualified" className="panel-title">
            Filtered & Excluded Sites ({feasibilitySummary.infeasibleCount + feasibilitySummary.unknownCount})
          </h2>
          <p className="panel-subtitle">
            Sites disqualified by the Feasibility Filter prior to TOPSIS ranking, with documented physical constraint violations and data transparency disclosures.
          </p>
        </div>

        <div className="excluded-sites-list">
          {feasibilitySummary.infeasible.map(({ site, result }) => (
            <div key={site.id} className="excluded-site-item excluded-site-item--infeasible">
              <div className="excluded-site-header">
                <div>
                  <strong className="excluded-site-name">{site.name}</strong>
                  <span className="excluded-site-region"> ({site.region})</span>
                </div>
                <span className="feasibility-badge feasibility-badge--fail">
                  ✕ DISQUALIFIED (INFEASIBLE)
                </span>
              </div>
              <ul className="excluded-site-reasons">
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ))}

          {feasibilitySummary.unknown.map(({ site, result }) => (
            <div key={site.id} className="excluded-site-item excluded-site-item--unknown">
              <div className="excluded-site-header">
                <div>
                  <strong className="excluded-site-name">{site.name}</strong>
                  <span className="excluded-site-region"> ({site.region})</span>
                </div>
                <span className="feasibility-badge feasibility-badge--unknown">
                  ⚠️ CANNOT ASSESS (MISSING TELEMETRY)
                </span>
              </div>
              <ul className="excluded-site-reasons">
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
