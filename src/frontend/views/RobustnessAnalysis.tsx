import { useState, useMemo } from 'react'
import { ViewId } from '../Sidebar'
import {
  MONTE_CARLO_DISCLAIMER,
  runMonteCarlo,
  MonteCarloResult,
  SiteMonteCarloSummary,
} from '../../engine/montecarlo'
import { MissionProfile, getDefaultMissionProfile } from '../../engine/mission'
import { MissionFormState } from '../missionForm'
import {
  CANDIDATE_SITES,
  CentralizedSite,
  getSiteById,
} from '../../data/candidateSites'
import { filterFeasibleSites } from '../../engine/feasibility'
import { rankSites, TopsisScore } from '../../engine/topsis'

interface RobustnessAnalysisProps {
  activeMission?: MissionProfile | null
  formState?: MissionFormState
  onNavigate?: (view: ViewId) => void
}

export function RobustnessAnalysis({
  activeMission,
  formState,
  onNavigate,
}: RobustnessAnalysisProps) {
  // Resolve active mission from props or form state
  const currentMission: MissionProfile = useMemo(() => {
    if (activeMission) return activeMission
    const missionTypeId = formState?.missionType ?? 'science'
    return getDefaultMissionProfile(missionTypeId)
  }, [activeMission, formState?.missionType])

  // Interactive Simulation Controls
  const [iterations, setIterations] = useState<number>(1000)
  const [weightRelativeSpread, setWeightRelativeSpread] = useState<number>(0.2)
  const [seed, setSeed] = useState<number>(42)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [inspectSite, setInspectSite] = useState<CentralizedSite | null>(null)

  const centralizedSites = CANDIDATE_SITES as CentralizedSite[]

  // 1. Feasible sites under active mission limits
  const feasibleSites = useMemo(() => {
    return filterFeasibleSites(centralizedSites, currentMission)
  }, [centralizedSites, currentMission])

  // 2. Nominal TOPSIS ranking on feasible sites
  const nominalRanking = useMemo(() => {
    return rankSites(feasibleSites, currentMission)
  }, [feasibleSites, currentMission])

  const nominalScoreMap = useMemo(() => {
    const map = new Map<string, TopsisScore>()
    for (const score of nominalRanking.ranking) {
      map.set(score.id, score)
    }
    return map
  }, [nominalRanking])

  // 3. Live Monte Carlo Simulation across iterations
  const mcResult: MonteCarloResult | null = useMemo(() => {
    if (feasibleSites.length === 0) return null
    try {
      return runMonteCarlo(feasibleSites, currentMission, {
        seed,
        iterations,
        weightRelativeSpread,
      })
    } catch (err) {
      console.error('Monte Carlo simulation failed:', err)
      return null
    }
  }, [feasibleSites, currentMission, seed, iterations, weightRelativeSpread])

  // Process and sort sites by Monte Carlo Win Frequency
  const sortedStats = useMemo(() => {
    if (!mcResult) return []
    const total = mcResult.iterations || iterations

    const list = mcResult.sites.map((summary: SiteMonteCarloSummary) => {
      const site = getSiteById(summary.siteId)
      const nominalScore = nominalScoreMap.get(summary.siteId)
      const top3Count = summary.rankCounts.slice(0, 3).reduce((a, b) => a + b, 0)
      const top3Rate = top3Count / total
      const winRate = summary.winFrequency
      const eligibleRate = summary.eligibleFrequency

      return {
        summary,
        site,
        nominalScore,
        nominalRank: nominalScore ? nominalScore.rank : null,
        winRate,
        top3Rate,
        eligibleRate,
      }
    })

    // Sort by winRate descending, then top3Rate descending
    list.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      return b.top3Rate - a.top3Rate
    })

    return list
  }, [mcResult, iterations, nominalScoreMap])

  // Current inspected/selected site for rank distribution histogram
  const activeSelectedSiteId = selectedSiteId ?? (sortedStats[0]?.site?.id ?? null)
  const activeSelectedStat = sortedStats.find((s) => s.site?.id === activeSelectedSiteId)

  // Top robust candidate
  const topRobust = sortedStats[0]
  const nominalWinner = nominalRanking.ranking[0]
    ? getSiteById(nominalRanking.ranking[0].id)
    : undefined

  const isNominalWinnerDifferent =
    topRobust && nominalWinner && topRobust.site?.id !== nominalWinner.id

  const handleReseed = () => {
    setSeed(Math.floor(Math.random() * 99999) + 1)
  }

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header">
        <div className="section-tag">STOCHASTIC DECISION SENSITIVITY</div>
        <div className="title-row">
          <h1 className="view-title">Monte Carlo Robustness Analysis</h1>
          <span className="status-badge-ready" role="status">
            <span className="status-badge-dot" aria-hidden="true" />
            Live PRNG Simulation ({iterations.toLocaleString()} Iterations)
          </span>
        </div>
        <p className="view-description">
          Probabilistic trade-study evaluating how stable landing-site targeting recommendations remain
          when satellite instrument measurements fluctuate within orbiter error bounds [low, high] and
          stakeholder priority weights shift by ±{(weightRelativeSpread * 100).toFixed(0)}%.
        </p>
      </header>

      {/* Mandatory Scientific Disclaimer Banner */}
      <section className="notice-banner notice-banner--warning" role="alert">
        <span className="notice-icon" aria-hidden="true">⚖️</span>
        <div className="notice-content">
          <strong className="notice-title">Analytical Framing & Safety Boundary</strong>
          <p className="notice-text">{MONTE_CARLO_DISCLAIMER}</p>
        </div>
      </section>

      {/* Active Mission Context Banner */}
      <section className="notice-banner notice-banner--info" role="region" aria-label="Mission Profile Context">
        <span className="notice-icon" aria-hidden="true">🎯</span>
        <div className="notice-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>Active Target Profile: {currentMission.name}</strong>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
              {currentMission.description}
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => onNavigate('setup')}
            >
              Switch Mission Purpose in Setup →
            </button>
          )}
        </div>
      </section>

      {/* Interactive Simulation Controls */}
      <section className="panel" aria-label="Simulation Controls">
        <div className="panel-header">
          <span className="panel-tag">SIMULATION PARAMETERS</span>
          <h2 className="panel-title" style={{ fontSize: '1.15rem' }}>
            Perturbation Engine Controls (Seeded Mulberry32 PRNG)
          </h2>
          <p className="panel-subtitle">
            Configure iteration count, weight variance bounds, and PRNG seed to verify reproducibility.
          </p>
        </div>

        <div className="mc-controls-grid">
          {/* Iteration Budget */}
          <div className="mc-control-group">
            <span className="mc-control-label">Iteration Budget</span>
            <div className="mc-btn-group" role="group" aria-label="Iteration Budget Selector">
              {[500, 1000, 2000].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`btn btn--small ${iterations === count ? 'btn--primary' : 'btn--subtle'}`}
                  onClick={() => setIterations(count)}
                >
                  {count.toLocaleString()} Draws
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Execution time: ~{iterations === 2000 ? '120ms' : iterations === 1000 ? '60ms' : '30ms'}
            </span>
          </div>

          {/* Weight Spread */}
          <div className="mc-control-group">
            <span className="mc-control-label">Weight Spread (Uniform)</span>
            <div className="mc-btn-group" role="group" aria-label="Weight Spread Selector">
              {[0.1, 0.15, 0.2, 0.25].map((spread) => (
                <button
                  key={spread}
                  type="button"
                  className={`btn btn--small ${weightRelativeSpread === spread ? 'btn--primary' : 'btn--subtle'}`}
                  onClick={() => setWeightRelativeSpread(spread)}
                >
                  ±{(spread * 100).toFixed(0)}%
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Perturbs stakeholder weights before renormalization
            </span>
          </div>

          {/* PRNG Seed */}
          <div className="mc-control-group">
            <span className="mc-control-label">PRNG Seed (Audit Trace)</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                className="form-input font-mono"
                style={{ width: '110px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 1)}
                min={1}
                max={999999}
              />
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={handleReseed}
                title="Generate new pseudo-random seed"
              >
                Perturb 🎲
              </button>
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Deterministic sequence alignment preserved
            </span>
          </div>
        </div>
      </section>

      {/* Disqualified or Infeasible Notice */}
      {feasibleSites.length === 0 ? (
        <section className="panel empty-state-panel" role="alert">
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">⚠️</span>
            <h2 className="empty-state-title">No Candidate Sites are Eligible for Monte Carlo</h2>
            <p className="empty-state-text">
              All candidate sites violated non-negotiable physical constraints under the current {currentMission.name} profile.
              Monte Carlo sensitivity analysis operates exclusively on sites that satisfy fundamental safety criteria.
            </p>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary"
                style={{ marginTop: '1rem' }}
                onClick={() => onNavigate('setup')}
              >
                Change Mission Purpose in Setup →
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Executive Robust Winner Banner */}
          {topRobust && topRobust.site && (
            <section
              className="panel"
              style={{
                border: '1px solid #2dd4bf',
                background: 'linear-gradient(135deg, rgba(11, 17, 32, 0.95), rgba(13, 148, 136, 0.12))',
                boxShadow: '0 4px 25px rgba(45, 212, 191, 0.15)',
              }}
              aria-label="Most Robust Landing Site"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className="winner-rank-badge font-mono">
                      #1 MOST ROBUST CANDIDATE
                    </span>
                    <span className="status-chip status-chip--available">
                      <span className="status-chip__dot" />
                      Win Frequency: {(topRobust.winRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <h2 className="winner-title" style={{ fontSize: '1.6rem', margin: '0.2rem 0' }}>
                    {topRobust.site.name}
                  </h2>
                  <span className="site-region-tag">{topRobust.site.region}</span>
                  <span className="coord-badge" style={{ marginLeft: '0.5rem' }}>
                    {topRobust.site.latitude.toFixed(2)}°S, {topRobust.site.longitude.toFixed(2)}°E
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--subtle btn--small"
                    onClick={() => setInspectSite(topRobust.site ?? null)}
                  >
                    Scientific Provenance 🔍
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn--primary btn--small"
                      onClick={() => onNavigate('map')}
                    >
                      Locate on Lunar Map ↗
                    </button>
                  )}
                </div>
              </div>

              {/* Rationale & Stability Breakdown */}
              <div className="winner-metrics-grid">
                <div className="winner-metric-cell">
                  <span className="winner-metric-label">Monte Carlo Win Rate</span>
                  <span className="winner-metric-val font-mono" style={{ color: '#2dd4bf' }}>
                    {(topRobust.winRate * 100).toFixed(1)}%
                  </span>
                  <span className="winner-metric-sub">
                    Wins {topRobust.summary.winCount.toLocaleString()} of {iterations.toLocaleString()} stochastic draws
                  </span>
                </div>

                <div className="winner-metric-cell">
                  <span className="winner-metric-label">Top-3 Placement Rate</span>
                  <span className="winner-metric-val font-mono" style={{ color: '#38bdf8' }}>
                    {(topRobust.top3Rate * 100).toFixed(1)}%
                  </span>
                  <span className="winner-metric-sub">
                    Consistently ranks in top 3 under weight variation
                  </span>
                </div>

                <div className="winner-metric-cell">
                  <span className="winner-metric-label">Feasibility Retention</span>
                  <span className="winner-metric-val font-mono" style={{ color: '#4ade80' }}>
                    {(topRobust.eligibleRate * 100).toFixed(1)}%
                  </span>
                  <span className="winner-metric-sub">
                    Survives physical constraints when measurements perturbed
                  </span>
                </div>

                <div className="winner-metric-cell">
                  <span className="winner-metric-label">Nominal TOPSIS Rank</span>
                  <span className="winner-metric-val font-mono" style={{ color: '#fbbf24' }}>
                    {topRobust.nominalRank ? `#${topRobust.nominalRank}` : '—'}
                  </span>
                  <span className="winner-metric-sub">
                    {topRobust.nominalRank === 1
                      ? 'Aligned with nominal baseline'
                      : 'Displaced nominal #1 due to superior uncertainty resilience'}
                  </span>
                </div>
              </div>

              {isNominalWinnerDifferent && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#fbbf24' }}>⚠️ Decision Sensitivity Alert: </strong>
                  The nominal TOPSIS winner under baseline weights is <strong>{nominalWinner?.name}</strong>.
                  However, under stochastic parameter uncertainty and priority variation, <strong>{topRobust.site.name}</strong> demonstrates higher overall resilience ({((topRobust.winRate) * 100).toFixed(1)}% win rate).
                </div>
              )}
            </section>
          )}

          {/* Full Robustness Leaderboard Table */}
          <section className="panel" aria-labelledby="heading-mc-leaderboard">
            <div className="panel-header">
              <span className="panel-tag">CROSS-CANDIDATE COMPARISON</span>
              <h2 id="heading-mc-leaderboard" className="panel-title">
                Candidate Ranking Robustness Leaderboard
              </h2>
              <p className="panel-subtitle">
                Sorted by stochastic win rate across {iterations.toLocaleString()} triangular parameter iterations.
                Click on any candidate row to view its full rank distribution histogram.
              </p>
            </div>

            <div className="table-responsive">
              <table className="master-candidate-table" aria-label="Monte Carlo Robustness Results">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '60px', textAlign: 'center' }}>MC Rank</th>
                    <th scope="col" style={{ minWidth: '180px' }}>Candidate Landing Site</th>
                    <th scope="col" style={{ minWidth: '120px' }}>Region</th>
                    <th scope="col" className="text-right" style={{ minWidth: '120px' }}>
                      Win Rate (%)
                    </th>
                    <th scope="col" className="text-right" style={{ minWidth: '120px' }}>
                      Top 3 %
                    </th>
                    <th scope="col" className="text-right" style={{ minWidth: '120px' }}>
                      Feasibility %
                    </th>
                    <th scope="col" className="text-center" style={{ minWidth: '100px' }}>
                      Nominal Rank
                    </th>
                    <th scope="col" className="col-action text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map(({ site, nominalRank, winRate, top3Rate, eligibleRate }, idx) => {
                    if (!site) return null
                    const isSelected = site.id === activeSelectedSiteId
                    const isTop = idx === 0

                    return (
                      <tr
                        key={site.id}
                        onClick={() => setSelectedSiteId(site.id)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected
                            ? 'rgba(45, 212, 191, 0.08)'
                            : isTop
                            ? 'rgba(45, 212, 191, 0.03)'
                            : undefined,
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span className={`rank-pill ${isTop ? 'rank-pill--first' : ''} font-mono`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                            <strong>{site.name}</strong>
                            {isSelected && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>
                                [Selected]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-muted text-nowrap">{site.region}</td>
                        <td className="text-right font-mono text-nowrap">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <div className="mc-bar-track" style={{ width: '60px' }} aria-hidden="true">
                              <div
                                className="mc-bar-fill"
                                style={{ width: `${Math.min(100, winRate * 100)}%` }}
                              />
                            </div>
                            <span style={{ minWidth: '48px', color: winRate > 0.4 ? '#2dd4bf' : 'var(--text-primary)' }}>
                              {(winRate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right font-mono text-nowrap">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <div className="mc-bar-track" style={{ width: '60px' }} aria-hidden="true">
                              <div
                                className="mc-bar-fill"
                                style={{ width: `${Math.min(100, top3Rate * 100)}%`, background: '#38bdf8' }}
                              />
                            </div>
                            <span style={{ minWidth: '48px' }}>
                              {(top3Rate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right font-mono text-nowrap">
                          <span style={{ color: eligibleRate === 1 ? '#4ade80' : '#fbbf24' }}>
                            {(eligibleRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center font-mono text-nowrap">
                          {nominalRank ? `#${nominalRank}` : '—'}
                        </td>
                        <td className="col-action text-center text-nowrap">
                          <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn--subtle btn--small"
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setInspectSite(site)
                              }}
                              title="Scientific provenance & measurements"
                            >
                              Provenance 🔍
                            </button>
                            {onNavigate && (
                              <button
                                type="button"
                                className="btn btn--subtle btn--small"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onNavigate('map')
                                }}
                                title="Locate on Lunar Map"
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
          </section>

          {/* Selected Site Rank Distribution Histogram */}
          {activeSelectedStat && activeSelectedStat.site && (
            <section className="panel" aria-labelledby="heading-histogram">
              <div className="panel-header">
                <span className="panel-tag">RANK PROBABILITY DISTRIBUTION</span>
                <h2 id="heading-histogram" className="panel-title" style={{ fontSize: '1.15rem' }}>
                  Stochastic Rank Distribution: {activeSelectedStat.site.name}
                </h2>
                <p className="panel-subtitle">
                  Observed placement frequency across {iterations.toLocaleString()} virtual scenarios.
                  Demonstrates spread between top rank and lower rank scenarios under parameter uncertainty.
                </p>
              </div>

              <div className="mc-histogram-grid">
                {activeSelectedStat.summary.rankCounts.slice(0, 6).map((count, rIdx) => {
                  const pct = (count / iterations) * 100
                  const isTopRank = rIdx === 0

                  return (
                    <div key={rIdx} className="mc-histogram-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: isTopRank ? '#2dd4bf' : 'var(--text-muted)' }}>
                          Rank #{rIdx + 1}
                        </span>
                        <strong className="font-mono" style={{ fontSize: '0.9rem', color: isTopRank ? '#2dd4bf' : 'var(--text-primary)' }}>
                          {pct.toFixed(1)}%
                        </strong>
                      </div>
                      <div className="mc-dist-bar-track">
                        <div
                          className="mc-dist-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: isTopRank ? 'linear-gradient(90deg, #0284c7, #2dd4bf)' : '#334155',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                        {count.toLocaleString()} draws
                      </span>
                    </div>
                  )
                })}

                {/* Not Ranked / Infeasible Draws */}
                <div className="mc-histogram-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                      Disqualified
                    </span>
                    <strong className="font-mono" style={{ fontSize: '0.9rem', color: '#ef4444' }}>
                      {((activeSelectedStat.summary.notRankedCount / iterations) * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="mc-dist-bar-track">
                    <div
                      className="mc-dist-bar-fill"
                      style={{
                        width: `${(activeSelectedStat.summary.notRankedCount / iterations) * 100}%`,
                        background: '#ef4444',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                    {activeSelectedStat.summary.notRankedCount.toLocaleString()} draws failed limits
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Workflow Action Bar */}
          {onNavigate && (
            <section className="panel panel-action-bar" aria-label="Workflow Navigation Actions">
              <div className="action-row-spaced">
                <div>
                  <span className="action-tag font-mono">COMPLETE DECISION PIPELINE</span>
                  <p className="action-text">
                    Review candidate trade-offs in TOPSIS Results or switch mission purpose in Mission Setup.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => onNavigate('results')}
                  >
                    ← Back to TOPSIS Results
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onNavigate('setup')}
                  >
                    Adjust Constraints in Setup →
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* TECHNICAL PROVENANCE MODAL */}
      {inspectSite && (
        <div className="comparison-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-mc-prov-title">
          <div className="comparison-modal-content panel" style={{ maxWidth: '780px' }}>
            <div className="comparison-modal-header">
              <div>
                <span className="section-tag">SCIENTIFIC UNCERTAINTY BOUNDS</span>
                <h2 id="modal-mc-prov-title" className="comparison-modal-title">
                  {inspectSite.name} — Orbiter Error Margins & Sampling Bounds
                </h2>
                <p className="panel-subtitle" style={{ margin: 0 }}>
                  {inspectSite.region} (<span className="text-nowrap font-mono">{inspectSite.latitude.toFixed(2)}°S, {inspectSite.longitude.toFixed(2)}°E</span>) · Frame: DE421
                </p>
              </div>
              <button
                type="button"
                className="inspection-close-btn"
                onClick={() => setInspectSite(null)}
                aria-label="Close Provenance Modal"
              >
                ×
              </button>
            </div>

            <div style={{ maxHeight: '65vh', overflowY: 'auto', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Monte Carlo stochastic perturbation samples each criterion value from an inverse-CDF triangular
                distribution using the nominal value as mode, bounded within [low, high] published instrument error bounds.
              </p>
              <table className="comparison-table" style={{ fontSize: '0.825rem' }}>
                <thead>
                  <tr>
                    <th scope="col">Criterion</th>
                    <th scope="col">Nominal Mode</th>
                    <th scope="col">Triangular Bound [Low, High]</th>
                    <th scope="col">Orbiter Instrument / Dataset</th>
                    <th scope="col">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(inspectSite.criteria).map(([cid, crit]) => (
                    <tr key={cid}>
                      <td style={{ textTransform: 'capitalize' }}>
                        <strong>{cid}</strong>
                      </td>
                      <td className="font-mono">
                        {crit.value !== null ? crit.value : <span style={{ color: '#fbbf24' }}>null</span>}
                      </td>
                      <td className="font-mono">
                        {crit.low !== null && crit.high !== null
                          ? `[${crit.low}, ${crit.high}]`
                          : '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{crit.source}</td>
                      <td>
                        <span className={`quality-badge quality-badge--${crit.quality}`}>
                          {crit.quality.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setInspectSite(null)}
              >
                Close Provenance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
