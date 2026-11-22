import { useState, useMemo, useEffect } from 'react'
import { CRITERION_IDS, CriterionId } from '../../engine/types'
import { CRITERION_DIRECTION } from '../../engine/criteria'
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
  CRITERION_UNITS,
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
  onViewOnMap?: (siteId?: string) => void
}

/**
 * Generates an honest, plain-English interpretation of a criterion weight
 * in the context of the active mission profile.
 */
function getCriterionWeightExplanation(
  cid: CriterionId,
  weight: number,
  activeMission: MissionProfile,
  criteriaUsed: CriterionId[]
): string {
  const dir = CRITERION_DIRECTION[cid]
  const pct = Math.round(weight * 100)
  const sorted = [...criteriaUsed].sort(
    (a, b) => (activeMission.weights[b] ?? 0) - (activeMission.weights[a] ?? 0)
  )
  const isTop = sorted[0] === cid
  const isSecond = sorted[1] === cid

  let priorityText = ''
  if (isTop) {
    const nextCid = sorted[1]
    const nextLabel = nextCid ? CRITERION_LABELS[nextCid] : ''
    priorityText = `Highest mission priority (${pct}%). ${
      nextLabel
        ? `${CRITERION_LABELS[cid]} has greater importance for this mission than ${nextLabel}.`
        : 'Carries dominant ranking weight.'
    }`
  } else if (isSecond) {
    priorityText = `Secondary priority (${pct}%). Heavily balances candidate trade-offs.`
  } else if (weight >= 0.15) {
    priorityText = `Moderate priority (${pct}%). Meaningfully differentiates close contenders.`
  } else {
    priorityText = `Lower priority (${pct}%). Minor fine-tuning factor in final vector proximity.`
  }

  const dirText =
    dir === 'cost'
      ? 'Cost criterion (lower is better): minimizes touchdown hazard and surface slope tilt.'
      : 'Benefit criterion (higher is better): maximizes operational return.'

  return `${priorityText} ${dirText}`
}

export function Results({
  formState,
  configuredMission,
  activeMission: propActiveMission,
  onEditMission,
  onNavigate,
  onViewOnMap,
}: ResultsProps) {
  // Use prop active mission, or configured mission, or fall back to default profile for the current form state
  const activeMission: MissionProfile = useMemo(() => {
    if (propActiveMission) return propActiveMission
    if (configuredMission) return configuredMission
    return getDefaultMissionProfile(formState.missionType)
  }, [propActiveMission, configuredMission, formState.missionType])

  const [showHeadToHead, setShowHeadToHead] = useState<boolean>(true)
  const [showMathDetails, setShowMathDetails] = useState<boolean>(false)
  const [selectedMcSiteId, setSelectedMcSiteId] = useState<string | null>(null)
  const [inspectSite, setInspectSite] = useState<CentralizedSite | null>(null)

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

  // Admitted candidates for ranking and stochastic analysis (passed physical limits AND complete data for weighted criteria)
  const rankingEligibleSites = useMemo(() => {
    const excludedIds = new Set(rankingResult.excluded.map((e) => e.siteId))
    return feasibleSites.filter((s) => !excludedIds.has(s.id))
  }, [feasibleSites, rankingResult.excluded])

  // 3. Monte Carlo Robustness Analysis on ranking-eligible candidates (500 stochastic trials, seed 42)
  const monteCarloResult: MonteCarloResult | null = useMemo(() => {
    if (rankingEligibleSites.length === 0) return null
    try {
      return runMonteCarlo(rankingEligibleSites, activeMission, {
        seed: 42,
        iterations: 500,
        weightRelativeSpread: 0.15,
      })
    } catch (err) {
      console.warn('Monte Carlo computation warning:', err)
      return null
    }
  }, [rankingEligibleSites, activeMission])

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

  // Detailed per-candidate Monte Carlo simulation statistics table
  const mcTableStats = useMemo(() => {
    if (!monteCarloResult) return []
    const total = monteCarloResult.iterations || 500

    return rankingEligibleSites
      .map((site) => {
        const summary = monteCarloResult.sites.find((s) => s.siteId === site.id)
        const nominalScore = rankingResult.ranking.find((r) => r.id === site.id)
        const rank1Count = summary ? (summary.rankCounts[0] ?? 0) : 0
        const rank1Pct = (rank1Count / total) * 100
        const top2Count = summary
          ? (summary.rankCounts[0] ?? 0) + (summary.rankCounts[1] ?? 0)
          : 0
        const top2Pct = (top2Count / total) * 100
        const rankedIters = summary
          ? summary.rankCounts.reduce((a, b) => a + b, 0)
          : 0
        const rankSum = summary
          ? summary.rankCounts.reduce((acc, count, idx) => acc + count * (idx + 1), 0)
          : 0
        const avgRank = rankedIters > 0 ? (rankSum / rankedIters).toFixed(1) : '—'

        // Clearly documented robustness classification thresholds:
        // - Robust: Rank #1 in >= 70% of scenarios
        // - Moderately Stable: Rank #1 in 40%–69% OR Top-2 in >= 60%
        // - Sensitive: Rank #1 in < 40%
        let stability: 'Robust' | 'Moderately Stable' | 'Sensitive'
        let stabilityClass: string
        if (rank1Pct >= 70) {
          stability = 'Robust'
          stabilityClass = 'status-pill--pass'
        } else if (rank1Pct >= 40 || top2Pct >= 60) {
          stability = 'Moderately Stable'
          stabilityClass = 'status-pill--marginal'
        } else {
          stability = 'Sensitive'
          stabilityClass = 'status-pill--fail'
        }

        return {
          site,
          nominalRank: nominalScore ? nominalScore.rank : 999,
          nominalScore,
          summary,
          rank1Count,
          rank1Pct,
          top2Count,
          top2Pct,
          avgRank,
          stability,
          stabilityClass,
          notRankedCount: summary?.notRankedCount ?? 0,
        }
      })
      .sort((a, b) => a.nominalRank - b.nominalRank)
  }, [monteCarloResult, rankingEligibleSites, rankingResult.ranking])

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

  // Data-backed explanation for why the Primary site ranked #1
  const primaryWhyFirst = useMemo(() => {
    if (!topSite || !rankingResult.ranking[0]) {
      return {
        advantages: [],
        tradeOffs: [],
        runnerUpSite: undefined,
        runnerUpScore: undefined,
        leadMarginPct: '0',
      }
    }

    const runnerUpScore = rankingResult.ranking[1]
    const runnerUpSite = runnerUpScore ? siteMap.get(runnerUpScore.id) : undefined
    const leadMarginPct = runnerUpScore
      ? ((rankingResult.ranking[0].closeness - runnerUpScore.closeness) * 100).toFixed(2)
      : '100'

    const advantages: {
      cid: CriterionId
      label: string
      weightPct: number
      topVal: number
      runnerUpVal?: number
      unit: string
      isBestInClass: boolean
      advantageDescription: string
    }[] = []

    const tradeOffs: {
      cid: CriterionId
      label: string
      weightPct: number
      topVal: number
      runnerUpVal?: number
      unit: string
      tradeOffDescription: string
    }[] = []

    for (const cid of rankingResult.criteriaUsed) {
      const topCrit = topSite.criteria[cid]
      const topVal = topCrit?.value
      if (typeof topVal !== 'number') continue

      const isCost = CRITERION_DIRECTION[cid] === 'cost'
      const weight = activeMission.weights[cid] ?? 0
      const weightPct = Math.round(weight * 100)
      const label = CRITERION_LABELS[cid]
      const unit = CRITERION_UNITS[cid]

      // Check all ranking-eligible candidates for best-in-class
      const allVals = rankingEligibleSites
        .map((s) => s.criteria[cid]?.value)
        .filter((v): v is number => typeof v === 'number')

      const bestVal = isCost ? Math.min(...allVals) : Math.max(...allVals)
      const isBestInClass = topVal === bestVal

      const runnerUpVal = runnerUpSite?.criteria[cid]?.value ?? undefined
      const runnerUpName = runnerUpSite?.name ?? 'runner-up candidate'

      if (typeof runnerUpVal === 'number') {
        const isBetterThanRunnerUp = isCost ? topVal < runnerUpVal : topVal > runnerUpVal
        const isEqual = Math.abs(topVal - runnerUpVal) < 1e-6

        if (isBetterThanRunnerUp) {
          const diff = Math.abs(topVal - runnerUpVal)
          const diffFormatted = diff < 1 ? diff.toFixed(2) : diff.toFixed(1)
          advantages.push({
            cid,
            label,
            weightPct,
            topVal,
            runnerUpVal,
            unit,
            isBestInClass,
            advantageDescription: isCost
              ? `${diffFormatted}° gentler incline than ${runnerUpName} (${topVal}° vs ${runnerUpVal}°), significantly minimizing touchdown tilt and dynamic tip-over risk.`
              : `${diffFormatted} higher than ${runnerUpName} (${topVal} vs ${runnerUpVal}), delivering superior operational yield on a key mission priority.`
          })
        } else if (!isEqual) {
          const diff = Math.abs(topVal - runnerUpVal)
          const diffFormatted = diff < 1 ? diff.toFixed(2) : diff.toFixed(1)
          tradeOffs.push({
            cid,
            label,
            weightPct,
            topVal,
            runnerUpVal,
            unit,
            tradeOffDescription: isCost
              ? `${runnerUpName} has a slightly gentler slope by ${diffFormatted}° (${runnerUpVal}° vs ${topVal}°).`
              : `${runnerUpName} offers ${diffFormatted} higher value (${runnerUpVal} vs ${topVal}).`
          })
        } else if (isBestInClass) {
          advantages.push({
            cid,
            label,
            weightPct,
            topVal,
            runnerUpVal,
            unit,
            isBestInClass: true,
            advantageDescription: `Tied for best-in-class across all evaluated candidates (${topVal}).`
          })
        }
      } else if (isBestInClass) {
        advantages.push({
          cid,
          label,
          weightPct,
          topVal,
          unit,
          isBestInClass: true,
          advantageDescription: `Achieved the single best rating among all candidates (${topVal}).`
        })
      }
    }

    // Sort by weight descending
    advantages.sort((a, b) => b.weightPct - a.weightPct)
    tradeOffs.sort((a, b) => b.weightPct - a.weightPct)

    return { advantages, tradeOffs, runnerUpSite, runnerUpScore, leadMarginPct }
  }, [topSite, rankingResult, rankingEligibleSites, activeMission, siteMap])

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
                🚀 Launch: <strong>{formState.launchDate || 'Unspecified'}</strong>
              </span>
              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                📅 Arrival: <strong>{formState.arrivalDate || 'Unspecified'}</strong> {formState.arrivalWindowDays ? `(±${Math.round(formState.arrivalWindowDays / 2)}d)` : ''}
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
              Change Purpose in Setup
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => onNavigate('map')}
              >
                View on Lunar Map ↗
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
          <div className="stat-filter-label">ADMITTED TO RANKING</div>
          <div className="stat-filter-value font-mono text-teal">{rankingResult.ranking.length}</div>
          <div className="stat-filter-sub">Passed physical limits & criteria data complete</div>
        </div>

        <div className="stat-filter-card stat-filter-card--infeasible">
          <div className="stat-filter-label">DISQUALIFIED (INFEASIBLE)</div>
          <div className="stat-filter-value font-mono text-red">{feasibilitySummary.infeasibleCount}</div>
          <div className="stat-filter-sub">Failed essential slope/roughness limits</div>
        </div>

        <div className="stat-filter-card stat-filter-card--unknown">
          <div className="stat-filter-label">DATA GAPS & EXCLUDED</div>
          <div className="stat-filter-value font-mono text-yellow">
            {feasibilitySummary.unknownCount + rankingResult.excluded.length}
          </div>
          <div className="stat-filter-sub">Missing essential telemetry or unassessed metrics</div>
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
            Selecting different mission purposes dynamically recalculates ideal vector proximity and rankings.
          </div>
        </div>
      </section>

      {/* DIRECT LUNAR MAP PROMINENT ACTION BANNER */}
      {topSite && (
        <section
          className="panel"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            padding: '1.1rem 1.35rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          }}
          aria-label="Direct Map View Action"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: '#22c55e',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                PRIMARY #1
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#f8fafc' }}>{topSite.name}</strong>
              {backupSite && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span
                    style={{
                      background: '#f97316',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    BACKUP #{backupScore?.rank ?? 2}
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#fed7aa' }}>{backupSite.name}</strong>
                </>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Multi-criteria ranking finalized. Inspect recommended landing sites situated on the Lunar South Pole cartographic viewer with calibrated NASA LOLA terrain layers.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            style={{
              backgroundColor: '#22c55e',
              borderColor: '#22c55e',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.95rem',
              padding: '0.65rem 1.25rem',
              boxShadow: '0 0 16px rgba(34, 197, 94, 0.4)',
              cursor: 'pointer',
            }}
            onClick={() => (onViewOnMap ? onViewOnMap(topSite.id) : onNavigate?.('map'))}
          >
            🗺️ View Recommended Sites on Lunar Map ↗
          </button>
        </section>
      )}

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
                <h2
                  id="heading-top-recommendation"
                  className="winner-title"
                  style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}
                  onClick={() => setInspectSite(topSite)}
                  title="Click to view verified scientific measurements and dataset provenance"
                >
                  {topSite.name}
                </h2>
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

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => (onViewOnMap ? onViewOnMap(topSite.id) : onNavigate?.('map'))}
                >
                  Locate on Lunar Map ↗
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setInspectSite(topSite)}
                  title="View NASA dataset telemetry breakdown"
                >
                  Inspect Site Telemetry 🔍
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => onNavigate('robustness')}
                  >
                    Examine Robustness →
                  </button>
                )}
              </div>
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
              <h2
                id="heading-backup-recommendation"
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  margin: '0 0 0.25rem 0',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                }}
                onClick={() => setInspectSite(backupSite)}
                title="Click to view verified scientific measurements and dataset provenance"
              >
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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => (onViewOnMap ? onViewOnMap(backupSite.id) : onNavigate?.('map'))}
              >
                Locate Backup on Map ↗
              </button>
              <button
                type="button"
                className="btn btn--subtle btn--small"
                onClick={() => setInspectSite(backupSite)}
                title="View NASA dataset telemetry breakdown"
              >
                Inspect Telemetry 🔍
              </button>
            </div>
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

      {/* NO SUITABLE BACKUP CANDIDATE TRANSPARENCY NOTICE */}
      {!backupSite && topSite && (
        <section
          className="panel"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
          aria-label="Backup Landing Site Status"
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }} aria-hidden="true">⚠️</span>
            <div>
              <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>
                No Suitable Backup Landing Site Determined
              </strong>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Under the active mission profile and physical engineering constraints, only one candidate site ({topSite.name}) satisfies all non-negotiable physical constraints.
                In adherence to scientific integrity and NASA verification standards, LunarNavi does not fabricate hypothetical or unverified backup candidates. If an operational backup is mandatory, evaluate adjusting slope or solar constraints in Mission Setup.
              </p>
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

      {/* =====================================================================
          SECTION 4: TOPSIS ANALYSIS — HOW LANDING SITES ARE RANKED
          ===================================================================== */}
      <section className="panel" aria-labelledby="heading-topsis-analysis" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-tag">DECISION METHODOLOGY</span>
          <h2 id="heading-topsis-analysis" className="panel-title">
            TOPSIS Analysis — How Landing Sites Are Ranked
          </h2>
          <p className="panel-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            TOPSIS ranks candidate landing sites by comparing how close each site is to an ideal solution and how far it is from a worst-case solution, based on the criteria selected for the mission.
          </p>
        </div>

        {/* A & B. Mission-Specific Criteria and Importance Weights */}
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Mission Criteria & Importance Weights ({activeMission.name})
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Weights reflect operational priorities defined in the active mission profile. Only criteria with positive weights are admitted into the TOPSIS decision matrix.
          </p>

          <div className="table-responsive">
            <table className="comparison-table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '180px' }}>Criterion</th>
                  <th scope="col" style={{ width: '150px' }}>Preference Direction</th>
                  <th scope="col" style={{ width: '120px' }}>Mission Weight</th>
                  <th scope="col">Operational Meaning for this Mission</th>
                </tr>
              </thead>
              <tbody>
                {rankingResult.criteriaUsed.map((cid) => {
                  const weight = activeMission.weights[cid] ?? 0
                  const dir = CRITERION_DIRECTION[cid]
                  const explanation = getCriterionWeightExplanation(cid, weight, activeMission, rankingResult.criteriaUsed)

                  return (
                    <tr key={cid}>
                      <td style={{ fontWeight: 600 }}>
                        {CRITERION_LABELS[cid]}
                        <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {CRITERION_UNITS[cid]}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${dir === 'cost' ? 'status-pill--marginal' : 'status-pill--pass'}`} style={{ fontSize: '0.7rem' }}>
                          {dir === 'cost' ? 'Cost (Lower is Better)' : 'Benefit (Higher is Better)'}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>
                        {formatWeightShare(weight)} ({weight.toFixed(2)})
                      </td>
                      <td style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {explanation}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Dynamic Comparative Summary */}
          {sortedCriteriaByWeight.length >= 2 && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Priority Trade-off Summary: </strong>
              For this {activeMission.name} profile, <strong>{CRITERION_LABELS[sortedCriteriaByWeight[0]]} ({formatWeightShare(activeMission.weights[sortedCriteriaByWeight[0]] ?? 0)})</strong> holds greater importance than <strong>{CRITERION_LABELS[sortedCriteriaByWeight[1]]} ({formatWeightShare(activeMission.weights[sortedCriteriaByWeight[1]] ?? 0)})</strong>.
              All non-zero weighted criteria contribute to the multi-dimensional distance calculations.
            </div>
          )}
        </div>

        {/* C. TOPSIS Calculation Steps */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Six-Step TOPSIS Calculation Pipeline
            </h3>
            <button
              type="button"
              className="btn btn--subtle btn--small"
              onClick={() => setShowMathDetails((p) => !p)}
              style={{ fontSize: '0.75rem' }}
            >
              {showMathDetails ? 'Hide Mathematical Formulation ▲' : 'View Detailed Mathematical Formulation ▼'}
            </button>
          </div>

          <div className="topsis-steps-grid">
            <div className="topsis-step-card">
              <span className="topsis-step-num">STEP 1</span>
              <strong className="topsis-step-title">Data Matrix Extraction</strong>
              <p className="topsis-step-desc">
                Extract verified measurements from NASA datasets for the {rankingResult.criteriaUsed.length} weighted criteria across all {feasibleSites.length} feasible candidates.
              </p>
            </div>

            <div className="topsis-step-card">
              <span className="topsis-step-num">STEP 2</span>
              <strong className="topsis-step-title">Vector Normalization</strong>
              <p className="topsis-step-desc">
                Normalize raw measurements into dimensionless values to eliminate scale disparities between degrees, meters, and percentages.
              </p>
            </div>

            <div className="topsis-step-card">
              <span className="topsis-step-num">STEP 3</span>
              <strong className="topsis-step-title">Weight Application</strong>
              <p className="topsis-step-desc">
                Multiply normalized columns by mission weights reflecting {activeMission.name} priorities.
              </p>
            </div>

            <div className="topsis-step-card">
              <span className="topsis-step-num">STEP 4</span>
              <strong className="topsis-step-title">Ideal & Worst Reference Vectors</strong>
              <p className="topsis-step-desc">
                Identify the best reference solution (ideal positive vector) and the worst reference solution (anti-ideal negative vector).
              </p>
            </div>

            <div className="topsis-step-card">
              <span className="topsis-step-num">STEP 5</span>
              <strong className="topsis-step-title">Euclidean Separation Distances</strong>
              <p className="topsis-step-desc">
                Calculate the geometric distance from each candidate site to the ideal (d+) and to the worst-case (d-) solution.
              </p>
            </div>

            <div className="topsis-step-card">
              <span className="topsis-step-num">STEP 6</span>
              <strong className="topsis-step-title">Closeness Scoring & Ranking</strong>
              <p className="topsis-step-desc">
                Compute relative closeness C_i = d- / (d+ + d-). Sort candidate sites in descending order of closeness to determine final ranks.
              </p>
            </div>
          </div>

          {/* Expandable Mathematical Formulation Details */}
          {showMathDetails && (
            <div className="topsis-math-block" aria-label="TOPSIS Mathematical Formulation Details">
              <strong style={{ color: '#f8fafc', fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem' }}>
                Mathematical Formulation (Vector Normalization & Euclidean Metric)
              </strong>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Implemented in <code>src/engine/topsis.ts</code> as a pure mathematical matrix transformation:
              </p>
              <div className="topsis-math-formula">
                1. Vector Normalization: r_ij = x_ij / √( Σ_k x_kj² )
              </div>
              <div className="topsis-math-formula">
                2. Weighted Matrix: v_ij = w_j · r_ij  (where Σ w_j = 1.0)
              </div>
              <div className="topsis-math-formula">
                3. Ideal Solution: A* = &#123; max(v_ij | j ∈ Benefit), min(v_ij | j ∈ Cost) &#125;
              </div>
              <div className="topsis-math-formula">
                4. Anti-Ideal Solution: A⁻ = &#123; min(v_ij | j ∈ Benefit), max(v_ij | j ∈ Cost) &#125;
              </div>
              <div className="topsis-math-formula">
                5. Separation Distances: d⁺_i = √( Σ_j (v_ij - A*_j)² ),  d⁻_i = √( Σ_j (v_ij - A⁻_j)² )
              </div>
              <div className="topsis-math-formula">
                6. Relative Closeness: C_i = d⁻_i / (d⁺_i + d⁻_i),  where C_i ∈ [0, 1]
              </div>
            </div>
          )}
        </div>

        {/* E. Why the Primary site ranked first */}
        {topSite && topScore && (
          <div className="why-first-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="winner-rank-badge font-mono" style={{ fontSize: '0.75rem' }}>
                DECISION JUSTIFICATION
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>
                Why {topSite.name} Ranked #1
              </strong>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {topSite.name} achieved a TOPSIS relative closeness score of <strong>{(topScore.closeness * 100).toFixed(2)}%</strong> (C_1 = {topScore.closeness.toFixed(4)}), leading the runner-up {primaryWhyFirst.runnerUpSite ? `(${primaryWhyFirst.runnerUpSite.name})` : 'candidate'} by <strong>{primaryWhyFirst.leadMarginPct} percentage points</strong>.
              This ranking is grounded in actual physical measurements and mission criterion weights:
            </p>

            <div className="why-first-grid">
              {primaryWhyFirst.advantages.map((adv) => (
                <div key={adv.cid} className="why-first-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.825rem', color: 'var(--accent-teal)' }}>
                      {adv.label} ({adv.weightPct}% Weight)
                    </strong>
                    {adv.isBestInClass && (
                      <span className="status-pill status-pill--pass font-mono" style={{ fontSize: '0.65rem' }}>
                        Best-in-Class
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    Primary: <strong>{adv.topVal}{adv.unit ? ` ${adv.unit.split(' ')[0]}` : ''}</strong>
                    {adv.runnerUpVal !== undefined && (
                      <span style={{ color: 'var(--text-muted)' }}> vs Runner-Up: {adv.runnerUpVal}</span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {adv.advantageDescription}
                  </p>
                </div>
              ))}
            </div>

            {/* Trade-Off Disclosures (if any) */}
            {primaryWhyFirst.tradeOffs.length > 0 && (
              <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '6px', fontSize: '0.8rem' }}>
                <strong style={{ color: '#fbbf24' }}>Trade-Off Disclosure: </strong>
                {primaryWhyFirst.tradeOffs.map((to) => (
                  <span key={to.cid}>
                    In {to.label} ({to.weightPct}% weight), {to.tradeOffDescription}{' '}
                  </span>
                ))}
                However, because {topSite.name} maintained superior performance in higher-weighted criteria, its overall Euclidean distance to the ideal solution (d+ = {topScore.distanceToIdeal.toFixed(4)}) remained the shortest of all candidates.
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 5: ACTUAL TOPSIS RANKING TABLE
          ===================================================================== */}
      <section className="panel" aria-labelledby="heading-leaderboard" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-tag">OFFICIAL LEADERBOARD</span>
          <h2 id="heading-leaderboard" className="panel-title">Feasible Candidate Rankings (TOPSIS)</h2>
          <p className="panel-subtitle">
            Ranked by geometric relative closeness to the ideal solution vector (C_i = d⁻ / [d⁺ + d⁻]).
            Candidate sites that violated physical engineering limits were filtered prior to ranking.
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
                  <th scope="col" className="text-right" style={{ minWidth: '85px' }} title="Euclidean distance to ideal solution (lower is closer to ideal)">
                    d⁺ (Ideal)
                  </th>
                  <th scope="col" className="text-right" style={{ minWidth: '85px' }} title="Euclidean distance to worst anti-ideal solution (higher is farther from worst)">
                    d⁻ (Worst)
                  </th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Slope (°)</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Sun (%)</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Comms (%)</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Resource</th>
                  <th scope="col" className="text-right" style={{ minWidth: '80px' }}>Science</th>
                  {(onViewOnMap || onNavigate) && <th scope="col" className="col-action text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {rankingResult.ranking.map((score) => {
                  const site = siteMap.get(score.id)
                  if (!site) return null
                  const isTop = score.rank === 1
                  const isBackup = backupSite && score.id === backupSite.id

                  return (
                    <tr
                      key={score.id}
                      className={isTop ? 'leaderboard-row--top' : isBackup ? 'leaderboard-row--backup' : undefined}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span className={`rank-pill ${isTop ? 'rank-pill--first' : isBackup ? 'rank-pill--backup' : ''} font-mono`}>
                          #{score.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setInspectSite(site)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'inherit',
                              font: 'inherit',
                              cursor: 'pointer',
                              textAlign: 'left',
                              padding: 0,
                              textDecoration: 'underline',
                              textUnderlineOffset: '3px',
                            }}
                            title={`Inspect verified measurements for ${site.name}`}
                          >
                            <strong>{site.name}</strong>
                          </button>
                          {isTop && (
                            <span className="winner-rank-badge font-mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              PRIMARY #1
                            </span>
                          )}
                          {isBackup && (
                            <span className="backup-rank-badge font-mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              BACKUP #{score.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted text-nowrap">{site.region}</td>
                      <td>
                        <div className="score-cell text-nowrap">
                          <span className="font-mono score-num">
                            {(score.closeness * 100).toFixed(2)}%
                          </span>
                          <div className="score-bar" aria-hidden="true">
                            <div
                              className="score-bar__fill"
                              style={{ width: `${Math.min(100, score.closeness * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-right text-muted text-nowrap">
                        {score.distanceToIdeal.toFixed(4)}
                      </td>
                      <td className="font-mono text-right text-muted text-nowrap">
                        {score.distanceToAntiIdeal.toFixed(4)}
                      </td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.slope.value}°</td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.illumination.value}%</td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.communication.value}%</td>
                      <td className="font-mono text-right text-nowrap">
                        {site.criteria.resource.value !== null ? site.criteria.resource.value : '—'}
                      </td>
                      <td className="font-mono text-right text-nowrap">{site.criteria.science.value}</td>
                      {(onViewOnMap || onNavigate) && (
                        <td className="col-action text-center text-nowrap">
                          <button
                            type="button"
                            className="btn btn--subtle btn--small"
                            onClick={() => (onViewOnMap ? onViewOnMap(site.id) : onNavigate?.('map'))}
                            title={`Locate ${site.name} on Lunar Map`}
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

      {/* =====================================================================
          SECTION 6: MONTE CARLO ROBUSTNESS ANALYSIS — HOW STABLE IS RECOMMENDATION?
          ===================================================================== */}
      <section className="panel" aria-labelledby="heading-montecarlo-analysis" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-tag">SENSITIVITY & ROBUSTNESS AUDIT</span>
          <h2 id="heading-montecarlo-analysis" className="panel-title">
            Monte Carlo Robustness Analysis — How Stable Is the Recommendation?
          </h2>
          <p className="panel-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Monte Carlo robustness analysis repeatedly recalculates the ranking while varying the criterion weights within defined assumptions. It helps us determine whether the recommended site consistently ranks first or whether small changes in priorities could change the recommendation.
          </p>
        </div>

        {/* Mandatory Analytical Framing Notice */}
        <div className="notice-banner notice-banner--warning" role="alert" style={{ margin: '1rem 0' }}>
          <span className="notice-icon" aria-hidden="true">⚖️</span>
          <div className="notice-content">
            <strong className="notice-title">Analytical Framing & Scientific Boundary</strong>
            <p className="notice-text">
              Monte Carlo results measure how STABLE a recommendation is when data values and priorities vary within stated assumptions. They are NOT the probability that a site is safe, suitable or will succeed.
            </p>
          </div>
        </div>

        {/* Simulation Parameters Grid */}
        <div className="mc-sim-info-grid">
          <div className="mc-sim-card">
            <span className="mc-sim-label">SIMULATIONS PERFORMED</span>
            <span className="mc-sim-val text-teal">
              {monteCarloResult ? monteCarloResult.iterations.toLocaleString() : '500'} Trials
            </span>
            <span className="mc-sim-sub">
              Deterministic Mulberry32 PRNG (Audit Seed: {monteCarloResult?.seed ?? 42})
            </span>
          </div>

          <div className="mc-sim-card">
            <span className="mc-sim-label">WEIGHT VARIATION SPREAD</span>
            <span className="mc-sim-val text-yellow">
              ±{monteCarloResult ? (monteCarloResult.weightRelativeSpread * 100).toFixed(0) : '15'}%
            </span>
            <span className="mc-sim-sub">
              Uniform perturbation around active weights, renormalized to sum to 1.0
            </span>
          </div>

          <div className="mc-sim-card">
            <span className="mc-sim-label">SENSOR MEASUREMENT UNCERTAINTY</span>
            <span className="mc-sim-val" style={{ color: '#38bdf8' }}>
              Inverse-CDF Triangular
            </span>
            <span className="mc-sim-sub">
              Perturbs nominal values within published instrument error bounds [low, high]
            </span>
          </div>

          <div className="mc-sim-card">
            <span className="mc-sim-label">PHYSICAL SAFETY CONSTRAINTS</span>
            <span className="mc-sim-val" style={{ color: '#4ade80' }}>
              Fixed Limits
            </span>
            <span className="mc-sim-sub">
              Physical engineering thresholds (e.g. slope limits) remain strictly enforced
            </span>
          </div>
        </div>

        {/* Primary & Backup Robustness Findings */}
        {topSite && (
          <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            {(() => {
              const topStats = mcTableStats.find((s) => s.site.id === topSite.id)
              const backupStats = backupSite ? mcTableStats.find((s) => s.site.id === backupSite.id) : undefined
              const rank1Pct = topStats ? topStats.rank1Pct.toFixed(1) : '—'
              const stability = topStats?.stability ?? 'Robust'
              const stabilityClass = topStats?.stabilityClass ?? 'status-pill--pass'

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <span className="section-tag" style={{ marginBottom: '0.2rem' }}>STABILITY VERDICT</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        Primary Selection Stability: {topSite.name}
                      </h4>
                    </div>
                    <span className={`status-pill ${stabilityClass} font-mono`} style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}>
                      {stability.toUpperCase()} ({rank1Pct}% Rank #1)
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Under the tested weight variations, <strong>{topSite.name}</strong> ranked first in <strong>{rank1Pct}%</strong> of simulated scenarios.
                    {stability === 'Robust' && (
                      <> The recommendation is <strong>Robust</strong> (Rank #1 ≥ 70%), consistently retaining first place across wide priority fluctuations and sensor error margins.</>
                    )}
                    {stability === 'Moderately Stable' && (
                      <> The recommendation is <strong>Moderately Stable</strong> (Rank #1: 40%–69% or Top 2 ≥ 60%), leading in the majority of scenarios while allowing specific priority combinations to favor an alternative.</>
                    )}
                    {stability === 'Sensitive' && (
                      <> The recommendation is <strong>Sensitive</strong> (Rank #1 &lt; 40%), indicating that slight adjustments in stakeholder weights frequently swap the leading candidate.</>
                    )}
                  </p>

                  {backupSite && backupStats && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: '#fed7aa' }}>Backup Candidate Stability: </strong>
                      <strong>{backupSite.name}</strong> placed in the Top 2 in <strong>{backupStats.top2Pct.toFixed(1)}%</strong> of scenarios (with an average simulated rank of <strong>{backupStats.avgRank}</strong>), confirming its statistical stability as an operational fallback.
                    </div>
                  )}

                  {/* Explicit Explanation of What the Percentages Mean */}
                  <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#38bdf8' }}>What This Percentage Means: </strong>
                    An 87% (or similar) win rate means that under the tested weight variations, this site ranked first in 87% of simulated scenarios.
                    It does <strong>NOT</strong> represent a landing probability, mission success probability, touchdown safety score, or water presence likelihood.
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Actual Simulation Results Table */}
        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Monte Carlo Simulation Output Table
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Derived directly from 500 stochastic trials. Thresholds: <strong>Robust</strong> (Rank #1 ≥ 70%), <strong>Moderately Stable</strong> (Rank #1 40%–69% or Top 2 ≥ 60%), <strong>Sensitive</strong> (Rank #1 &lt; 40%).
          </p>

          <div className="table-responsive">
            <table className="comparison-table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '80px', textAlign: 'center' }}>TOPSIS Rank</th>
                  <th scope="col" style={{ minWidth: '180px' }}>Candidate Landing Site</th>
                  <th scope="col" style={{ minWidth: '120px' }}>Region</th>
                  <th scope="col" className="text-right" style={{ minWidth: '100px' }} title="Percentage of simulations where site ranked #1">
                    Ranked #1 (%)
                  </th>
                  <th scope="col" className="text-right" style={{ minWidth: '100px' }} title="Percentage of simulations where site placed in Top 2">
                    Top 2 (%)
                  </th>
                  <th scope="col" className="text-right" style={{ minWidth: '100px' }} title="Average rank across all simulations where site was eligible">
                    Average Rank
                  </th>
                  <th scope="col" className="text-center" style={{ minWidth: '130px' }}>
                    Stability Status
                  </th>
                  {(onViewOnMap || onNavigate) && <th scope="col" className="col-action text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {mcTableStats.map(({ site, nominalRank, rank1Pct, top2Pct, avgRank, stability, stabilityClass }) => {
                  const isTop = nominalRank === 1
                  const isBackup = backupSite && site.id === backupSite.id
                  const isSelected = selectedMcSiteId === site.id

                  return (
                    <tr
                      key={site.id}
                      onClick={() => setSelectedMcSiteId(site.id === selectedMcSiteId ? null : site.id)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'rgba(45, 212, 191, 0.08)'
                          : isTop
                          ? 'rgba(45, 212, 191, 0.03)'
                          : isBackup
                          ? 'rgba(249, 115, 22, 0.03)'
                          : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span className={`rank-pill ${isTop ? 'rank-pill--first' : isBackup ? 'rank-pill--backup' : ''} font-mono`}>
                          #{nominalRank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: isSelected ? 'var(--accent-teal)' : 'inherit' }}>
                            {site.name}
                          </strong>
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
                      <td className="text-right font-mono text-nowrap" style={{ fontWeight: isTop ? 700 : 400, color: rank1Pct >= 50 ? '#2dd4bf' : 'inherit' }}>
                        {rank1Pct.toFixed(1)}%
                      </td>
                      <td className="text-right font-mono text-nowrap" style={{ color: top2Pct >= 60 ? '#38bdf8' : 'inherit' }}>
                        {top2Pct.toFixed(1)}%
                      </td>
                      <td className="text-right font-mono text-nowrap">
                        {avgRank}
                      </td>
                      <td className="text-center text-nowrap">
                        <span className={`status-pill ${stabilityClass}`} style={{ fontSize: '0.725rem' }}>
                          {stability}
                        </span>
                      </td>
                      {(onViewOnMap || onNavigate) && (
                        <td className="col-action text-center text-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn--subtle btn--small"
                            onClick={() => (onViewOnMap ? onViewOnMap(site.id) : onNavigate?.('map'))}
                            title={`Locate ${site.name} on Lunar Map`}
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
        </div>

        {/* Visual Rank Frequency Distribution Breakdown */}
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Simulated Rank Distribution Frequency (Top Candidates)
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Visualizes placement frequencies across all 500 simulated scenarios for the leading candidates.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mcTableStats.slice(0, 4).map(({ site, nominalRank, summary }) => {
              if (!summary) return null
              const total = monteCarloResult?.iterations || 500
              const r1 = ((summary.rankCounts[0] ?? 0) / total) * 100
              const r2 = ((summary.rankCounts[1] ?? 0) / total) * 100
              const r3 = ((summary.rankCounts[2] ?? 0) / total) * 100
              const r4Plus = ((summary.rankCounts.slice(3).reduce((a, b) => a + b, 0)) / total) * 100
              const notRanked = ((summary.notRankedCount ?? 0) / total) * 100

              return (
                <div key={site.id} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>#{nominalRank}</span>
                      <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{site.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({site.region})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.725rem', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: '#2dd4bf' }}>Rank #1: {r1.toFixed(1)}%</span>
                      <span style={{ color: '#fb923c' }}>Rank #2: {r2.toFixed(1)}%</span>
                      <span style={{ color: '#38bdf8' }}>Rank #3: {r3.toFixed(1)}%</span>
                      {r4Plus > 0 && <span style={{ color: '#94a3b8' }}>Rank #4+: {r4Plus.toFixed(1)}%</span>}
                    </div>
                  </div>

                  {/* Multi-Segment Stacked Rank Distribution Bar */}
                  <div style={{ display: 'flex', height: '14px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                    {r1 > 0 && (
                      <div
                        style={{ width: `${r1}%`, background: '#2dd4bf' }}
                        title={`Rank #1: ${r1.toFixed(1)}% (${summary.rankCounts[0]} trials)`}
                      />
                    )}
                    {r2 > 0 && (
                      <div
                        style={{ width: `${r2}%`, background: '#fb923c' }}
                        title={`Rank #2: ${r2.toFixed(1)}% (${summary.rankCounts[1]} trials)`}
                      />
                    )}
                    {r3 > 0 && (
                      <div
                        style={{ width: `${r3}%`, background: '#38bdf8' }}
                        title={`Rank #3: ${r3.toFixed(1)}% (${summary.rankCounts[2]} trials)`}
                      />
                    )}
                    {r4Plus > 0 && (
                      <div
                        style={{ width: `${r4Plus}%`, background: '#64748b' }}
                        title={`Rank #4+: ${r4Plus.toFixed(1)}%`}
                      />
                    )}
                    {notRanked > 0 && (
                      <div
                        style={{ width: `${notRanked}%`, background: '#ef4444' }}
                        title={`Infeasible: ${notRanked.toFixed(1)}%`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FILTERED & DISQUALIFIED SITES BREAKDOWN */}
      <section className="panel" aria-labelledby="heading-disqualified">
        <div className="panel-header">
          <span className="panel-tag">EXCLUSION AUDIT</span>
          <h2 id="heading-disqualified" className="panel-title">
            Filtered & Excluded Sites ({feasibilitySummary.infeasibleCount + feasibilitySummary.unknownCount + rankingResult.excluded.length})
          </h2>
          <p className="panel-subtitle">
            Sites disqualified by the Feasibility Filter or excluded from TOPSIS ranking due to unassessed telemetry gaps, with full scientific transparency disclosures.
          </p>
        </div>

        <div className="excluded-sites-list">
          {/* 1. Sites excluded from ranking due to data gaps in active weighted criteria */}
          {rankingResult.excluded.map((ex) => {
            const site = siteMap.get(ex.siteId)
            return (
              <div key={ex.siteId} className="excluded-site-item excluded-site-item--unknown">
                <div className="excluded-site-header">
                  <div>
                    <strong className="excluded-site-name">{site?.name ?? ex.siteId}</strong>
                    {site?.region && <span className="excluded-site-region"> ({site.region})</span>}
                  </div>
                  <span className="feasibility-badge feasibility-badge--unknown">
                    ⚠️ EXCLUDED FROM RANKING (DATA GAP)
                  </span>
                </div>
                <ul className="excluded-site-reasons">
                  <li>{ex.reason}</li>
                </ul>
              </div>
            )
          })}

          {/* 2. Infeasible candidates failing physical engineering constraints */}
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

          {/* 3. Unknown candidates with missing essential safety telemetry */}
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

      {/* TECHNICAL PROVENANCE INSPECTION MODAL */}
      {inspectSite && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(4, 8, 18, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setInspectSite(null)}
        >
          <div
            className="panel"
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span
                    className={`badge-designation ${
                      inspectSite.designation === 'official-artemis-candidate'
                        ? 'badge-designation--artemis'
                        : 'badge-designation--research'
                    }`}
                  >
                    {inspectSite.designation === 'official-artemis-candidate'
                      ? 'Official Artemis III Candidate'
                      : 'Scientific Research Location'}
                  </span>
                  <span className="coord-badge font-mono">
                    {inspectSite.latitude.toFixed(2)}°S, {inspectSite.longitude.toFixed(2)}°E
                  </span>
                </div>
                <h2 id="inspect-modal-title" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {inspectSite.name}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Geological Complex: {inspectSite.region} · Frame: IAU DE421 · Org: {inspectSite.sourceOrganization}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--subtle btn--small"
                onClick={() => setInspectSite(null)}
                aria-label="Close Site Details"
                style={{ fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Verified Measurements Table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Verified Physical Topography & Telemetry
              </h4>
              <div className="table-responsive">
                <table style={{ width: '100%', fontSize: '0.825rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>Surface Slope (50m baseline)</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700, color: '#f8fafc' }}>
                        {inspectSite.measurements.slope.value !== null ? `${inspectSite.measurements.slope.value}°` : 'Unknown'}
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>NASA LOLA 50m GDR</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>Topographic Elevation</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700, color: 'var(--accent-teal)' }}>
                        {inspectSite.measurements.elevation.value !== null ? `${inspectSite.measurements.elevation.value > 0 ? '+' : ''}${inspectSite.measurements.elevation.value.toLocaleString()} m` : '—'}
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>LOLA 20m/px DEM</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>RMS Roughness (50m)</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700, color: inspectSite.measurements.roughness.value !== null ? '#f8fafc' : '#fbbf24' }}>
                        {inspectSite.measurements.roughness.value !== null ? `${inspectSite.measurements.roughness.value} m` : 'Unassessed'}
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>LOLA RMS Deviation</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>Annual Solar Illumination</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700, color: '#facc15' }}>
                        {inspectSite.measurements.illumination.value !== null ? `${inspectSite.measurements.illumination.value}%` : '—'}
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>PGDA 69 (Mazarico et al.)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>Direct Earth Line-of-Sight</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700, color: '#4ade80' }}>
                        {inspectSite.communicationModel.directEarthVisibilityPercent !== null ? `${inspectSite.communicationModel.directEarthVisibilityPercent}%` : '—'}
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Topocentric Libration (18.6y)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>Resource Grounding</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700 }}>
                        <span className={`badge-evidence badge-evidence--${inspectSite.resourceEvidence.kind}`}>
                          {inspectSite.resourceEvidence.kind.toUpperCase().replace('-', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inspectSite.resourceEvidence.citation}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.45rem 0', color: 'var(--text-secondary)' }}>Permanently Shadowed Region (PSR)</td>
                      <td className="font-mono text-right" style={{ padding: '0.45rem 0', fontWeight: 700, color: inspectSite.measurements.isPsr.value ? '#38bdf8' : '#94a3b8' }}>
                        {inspectSite.measurements.isPsr.value ? 'Inside Cold Trap' : `${inspectSite.measurements.psrDistanceKm} km to PSR`}
                      </td>
                      <td style={{ padding: '0.45rem 0 0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>LRO Diviner Thermal Atlas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scientific Provenance Summary */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)', padding: '0.85rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Resource Potential & Scientific Provenance:</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {inspectSite.resourceEvidence.summary}
              </p>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setInspectSite(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const siteId = inspectSite.id
                  setInspectSite(null)
                  if (onViewOnMap) {
                    onViewOnMap(siteId)
                  } else if (onNavigate) {
                    onNavigate('map')
                  }
                }}
              >
                Locate on Lunar Map ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
