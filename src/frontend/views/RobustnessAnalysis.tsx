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
  getDecorrelatedBackupSite,
} from '../../data/candidateSites'
import { filterFeasibleSites } from '../../engine/feasibility'
import { rankSites, TopsisScore } from '../../engine/topsis'
import { CRITERION_IDS } from '../../engine/types'
import { CRITERION_DIRECTION } from '../../engine/criteria'
import { CRITERION_LABELS, CRITERION_UNITS } from '../missionTypes'

interface RobustnessAnalysisProps {
  activeMission?: MissionProfile | null
  formState?: MissionFormState
  onNavigate?: (view: ViewId) => void
}

type ActiveSectionTab = 'all' | 'topsis' | 'montecarlo' | 'interactive'

export function RobustnessAnalysis({
  activeMission,
  formState,
  onNavigate,
}: RobustnessAnalysisProps) {
  // Navigation / Filter Tab
  const [activeTab, setActiveTab] = useState<ActiveSectionTab>('all')

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

  // Sites admitted for ranking (feasible + complete data on weighted criteria)
  const rankingEligibleSites = useMemo(() => {
    const excludedIds = new Set(nominalRanking.excluded.map((e) => e.siteId))
    return feasibleSites.filter((s) => !excludedIds.has(s.id))
  }, [feasibleSites, nominalRanking.excluded])

  const nominalScoreMap = useMemo(() => {
    const map = new Map<string, TopsisScore>()
    for (const score of nominalRanking.ranking) {
      map.set(score.id, score)
    }
    return map
  }, [nominalRanking])

  // Primary and decorrelated backup sites
  const primarySite = useMemo(() => {
    return nominalRanking.ranking[0] ? getSiteById(nominalRanking.ranking[0].id) : undefined
  }, [nominalRanking])

  const backupSite = useMemo(() => {
    if (!primarySite) return undefined
    return getDecorrelatedBackupSite(
      primarySite.id,
      nominalRanking.ranking.map((r) => r.id)
    )
  }, [primarySite, nominalRanking])

  // 3. Live Detailed TOPSIS Calculation Breakdown
  const topsisCalculation = useMemo(() => {
    if (rankingEligibleSites.length === 0 || nominalRanking.criteriaUsed.length === 0) {
      return null
    }

    const criteria = nominalRanking.criteriaUsed
    const m = rankingEligibleSites.length

    // Raw matrix: [m alternatives x n criteria]
    const rawMatrix = rankingEligibleSites.map((site) =>
      criteria.map((cid) => site.criteria[cid].value as number)
    )

    // Vector norms per column: sqrt(sum(x_ij^2))
    const colNorms = criteria.map((_, colIdx) => {
      let sumSq = 0
      for (let rowIdx = 0; rowIdx < m; rowIdx++) {
        const val = rawMatrix[rowIdx][colIdx]
        sumSq += val * val
      }
      return Math.sqrt(sumSq)
    })

    // Normalized matrix: r_ij = x_ij / colNorm
    const normMatrix = rawMatrix.map((row) =>
      row.map((val, colIdx) => (colNorms[colIdx] === 0 ? 0 : val / colNorms[colIdx]))
    )

    // Weighted matrix: v_ij = w_j * r_ij
    const weights = nominalRanking.weightsUsed
    const weightedMatrix = normMatrix.map((row) =>
      row.map((val, colIdx) => val * weights[colIdx])
    )

    return {
      criteria,
      rawMatrix,
      colNorms,
      normMatrix,
      weightedMatrix,
      weights,
      ideal: nominalRanking.ideal,
      antiIdeal: nominalRanking.antiIdeal,
      rows: rankingEligibleSites.map((site, rowIdx) => ({
        site,
        raw: rawMatrix[rowIdx],
        norm: normMatrix[rowIdx],
        weighted: weightedMatrix[rowIdx],
        score: nominalScoreMap.get(site.id)!,
      })),
    }
  }, [rankingEligibleSites, nominalRanking, nominalScoreMap])

  // 4. Live Monte Carlo Simulation across iterations
  const mcResult: MonteCarloResult | null = useMemo(() => {
    if (rankingEligibleSites.length === 0) return null
    try {
      return runMonteCarlo(rankingEligibleSites, currentMission, {
        seed,
        iterations,
        weightRelativeSpread,
      })
    } catch (err) {
      console.error('Monte Carlo simulation failed:', err)
      return null
    }
  }, [rankingEligibleSites, currentMission, seed, iterations, weightRelativeSpread])

  // Process and sort sites by Monte Carlo Win Frequency
  const sortedStats = useMemo(() => {
    if (!mcResult) return []
    const total = mcResult.iterations || iterations

    const list = mcResult.sites.map((summary: SiteMonteCarloSummary) => {
      const site = getSiteById(summary.siteId)
      const nominalScore = nominalScoreMap.get(summary.siteId)
      const top2Count = (summary.rankCounts[0] ?? 0) + (summary.rankCounts[1] ?? 0)
      const top2Rate = top2Count / total
      const top3Count = summary.rankCounts.slice(0, 3).reduce((a, b) => a + b, 0)
      const top3Rate = top3Count / total
      const winRate = summary.winFrequency
      const eligibleRate = summary.eligibleFrequency

      // Calculate average rank among ranked iterations
      let rankSum = 0
      let rankedCount = 0
      summary.rankCounts.forEach((count, idx) => {
        rankSum += (idx + 1) * count
        rankedCount += count
      })
      const averageRank = rankedCount > 0 ? rankSum / rankedCount : null

      // Robustness classification based on implemented thresholds
      let robustnessClass: 'Highly Robust' | 'Moderately Robust' | 'Sensitive / Fragile'
      if (winRate >= 0.5 || (top2Rate >= 0.85 && eligibleRate >= 0.95)) {
        robustnessClass = 'Highly Robust'
      } else if (winRate >= 0.2 || top2Rate >= 0.6) {
        robustnessClass = 'Moderately Robust'
      } else {
        robustnessClass = 'Sensitive / Fragile'
      }

      return {
        summary,
        site,
        nominalScore,
        nominalRank: nominalScore ? nominalScore.rank : null,
        winRate,
        top2Rate,
        top3Rate,
        averageRank,
        eligibleRate,
        robustnessClass,
      }
    })

    // Sort by winRate descending, then top2Rate descending
    list.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      return b.top2Rate - a.top2Rate
    })

    return list
  }, [mcResult, iterations, nominalScoreMap])

  // Current inspected/selected site for rank distribution histogram
  const activeSelectedSiteId = selectedSiteId ?? (sortedStats[0]?.site?.id ?? null)
  const activeSelectedStat = sortedStats.find((s) => s.site?.id === activeSelectedSiteId)

  // Top robust candidate
  const topRobust = sortedStats[0]
  const nominalWinner = primarySite

  const isNominalWinnerDifferent =
    topRobust && nominalWinner && topRobust.site?.id !== nominalWinner.id

  const handleReseed = () => {
    setSeed(Math.floor(Math.random() * 99999) + 1)
  }

  const showSectionTopsis = activeTab === 'all' || activeTab === 'topsis'
  const showSectionMc = activeTab === 'all' || activeTab === 'montecarlo'
  const showSectionEngine = activeTab === 'all' || activeTab === 'interactive'

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header">
        <div className="section-tag">MATHEMATICAL METHODOLOGY & ROBUSTNESS AUDIT</div>
        <div className="title-row">
          <h1 className="view-title">TOPSIS & Monte Carlo Robustness Analysis</h1>
          <span className="status-badge-ready" role="status">
            <span className="status-badge-dot" aria-hidden="true" />
            Live PRNG Simulation ({iterations.toLocaleString()} Iterations · Seed {seed})
          </span>
        </div>
        <p className="view-description">
          A comprehensive educational and technical guide to Multi-Criteria Decision Analysis (TOPSIS)
          and Stochastic Uncertainty Simulation (Monte Carlo), demonstrating both general mathematical
          foundations and their specific application to lunar south-pole landing-site selection.
        </p>
      </header>

      {/* Mandatory Analytical Framing & Safety Disclaimer */}
      <section className="notice-banner notice-banner--warning" role="alert">
        <span className="notice-icon" aria-hidden="true">⚖️</span>
        <div className="notice-content">
          <strong className="notice-title">Analytical Framing & Safety Boundary</strong>
          <p className="notice-text">
            {MONTE_CARLO_DISCLAIMER} TOPSIS establishes relative preference among evaluated candidate
            alternatives; it does NOT certify absolute engineering safety. Terminal landing touchdown
            requires real-time Terrain Relative Navigation (TRN) and autonomous hazard avoidance.
          </p>
        </div>
      </section>

      {/* Active Mission Profile Banner */}
      <section className="notice-banner notice-banner--info" role="region" aria-label="Mission Profile Context">
        <span className="notice-icon" aria-hidden="true">🎯</span>
        <div className="notice-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>Active Evaluation Profile: {currentMission.name}</strong>
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
              Modify Mission Profile in Setup →
            </button>
          )}
        </div>
      </section>

      {/* Section Filter / Navigation Pills */}
      <nav className="analysis-nav-pills" aria-label="Page Sections">
        <button
          type="button"
          className={`analysis-nav-btn ${activeTab === 'all' ? 'analysis-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Sections (Complete Guide)
        </button>
        <button
          type="button"
          className={`analysis-nav-btn ${activeTab === 'topsis' ? 'analysis-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('topsis')}
        >
          Section 1: TOPSIS Analysis
        </button>
        <button
          type="button"
          className={`analysis-nav-btn ${activeTab === 'montecarlo' ? 'analysis-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('montecarlo')}
        >
          Section 2: Monte Carlo Simulation
        </button>
        <button
          type="button"
          className={`analysis-nav-btn ${activeTab === 'interactive' ? 'analysis-nav-btn--active' : ''}`}
          onClick={() => setActiveTab('interactive')}
        >
          Section 3: Live Interactive Engine
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* SECTION 1 — TOPSIS ANALYSIS                                               */}
      {/* ========================================================================= */}
      {showSectionTopsis && (
        <section aria-labelledby="heading-section-1" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="section-badge-theory">GENERAL MATHEMATICAL THEORY</span>
            <span className="section-badge-app">LUNARNAVI APPLICATION</span>
          </div>

          <h2 id="heading-section-1" className="section-heading" style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>
            SECTION 1 — TOPSIS Multi-Criteria Decision Analysis
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
            Technique for Order Preference by Similarity to Ideal Solution: A geometric multi-attribute
            framework that ranks discrete alternatives by their relative Euclidean proximity to ideal and anti-ideal reference points.
          </p>

          {/* PART A: General Theory */}
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header">
              <span className="panel-tag">THEORETICAL FOUNDATION</span>
              <h3 className="panel-title" style={{ fontSize: '1.2rem' }}>
                PART A — Understanding TOPSIS (General Theory)
              </h3>
              <p className="panel-subtitle">
                Independent mathematical principles, formula motivations, and geometric derivations.
              </p>
            </div>

            {/* 1. What is TOPSIS? */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                1. What is TOPSIS?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <strong>TOPSIS</strong> stands for <strong>Technique for Order Preference by Similarity to Ideal Solution</strong>.
                Developed by Ching-Lai Hwang and Kwangsun Yoon in 1981, it is a foundational method in
                <strong> Multi-Criteria Decision Analysis (MCDA)</strong> and Multi-Attribute Decision Making (MADM).
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
                <strong>The Problem It Solves:</strong> Complex real-world decisions require selecting or ranking a finite set of
                discrete candidate options when evaluated across multiple, competing quantitative criteria. Because criteria
                naturally possess different physical units (e.g. monetary cost, mass in kilograms, angles in degrees, efficiency percentages)
                and differing stakeholder priorities, direct numerical comparison is impossible without rigorous normalization and weighting.
              </p>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderLeft: '3px solid var(--accent-teal)', borderRadius: '0 6px 6px 0', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>General Everyday Analogy:</strong> Consider purchasing an electric vehicle (EV). Candidate cars have conflicting attributes:
                Purchase Price (cost criterion — lower is better), Battery Range (benefit criterion — higher is better), Vehicle Curb Weight (cost),
                and Acceleration (benefit). No single car dominates on every criterion simultaneously. TOPSIS establishes a rigorous geometric
                trade-off surface to identify the vehicle that achieves the most balanced compromise across all weighted attributes.
              </div>
            </div>

            {/* 2. On What Principle Does It Work? */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                2. On What Principle Does It Work?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                The core principle of TOPSIS is elegant and intuitive:
              </p>
              <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(45, 212, 191, 0.06)', border: '1px solid rgba(45, 212, 191, 0.25)', borderRadius: '6px', margin: '0.65rem 0', fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                <em>"The chosen alternative should have the shortest geometric distance to the Positive Ideal Solution and the longest geometric distance from the Negative Ideal Solution."</em>
              </div>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.65, paddingLeft: '1.25rem' }}>
                <li>
                  <strong>Positive Ideal Solution ($A^*$ or $v^+$):</strong> An artificial composite benchmark formed by taking the best observed performance value across all alternatives for every criterion.
                </li>
                <li>
                  <strong>Negative Ideal Solution ($A^-$ or $v^-$):</strong> An artificial composite benchmark formed by taking the worst observed performance value across all alternatives for every criterion.
                </li>
                <li>
                  <strong>Why distance from both reference points matters:</strong> An alternative could be relatively close to the positive ideal on several criteria, but dangerously close to the negative ideal on one critical constraint. Measuring relative closeness balances both extremes and penalizes severe weakness.
                </li>
                <li>
                  <strong>Relative Proximity Ranking:</strong> By calculating each candidate's relative closeness ratio ($C_i$), alternatives are ranked on a continuous dimensionless scale from $0.0$ to $1.0$.
                </li>
              </ul>
            </div>

            {/* 3. Step-by-Step Mathematical Formulas */}
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                3. Mathematical Formulation (Step-by-Step Derivations)
              </h4>

              <div className="topsis-steps-grid">
                {/* Step 1 */}
                <div className="topsis-step-card">
                  <span className="topsis-step-num">STEP 1</span>
                  <div className="topsis-step-title">Form the Decision Matrix ($X$)</div>
                  <p className="topsis-step-desc">
                    Construct an $m \times n$ matrix where row $i$ represents candidate alternative $i$ ($i = 1, \dots, m$)
                    and column $j$ represents evaluation criterion $j$ ($j = 1, \dots, n$).
                  </p>
                  <div className="topsis-math-formula font-mono">
                    X = [x_ij]_(m × n)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    x_ij is the raw quantitative measurement of candidate i on criterion j.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="topsis-step-card">
                  <span className="topsis-step-num">STEP 2</span>
                  <div className="topsis-step-title">Vector Normalization (r_ij)</div>
                  <p className="topsis-step-desc">
                    Vector normalization divides each element by the Euclidean L2-norm of its criterion column,
                    mapping all columns to unit length and eliminating unit dependencies.
                  </p>
                  <div className="topsis-math-formula font-mono">
                    r_ij = x_ij / √(∑_k=1^m (x_kj)²)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Denominator represents the column vector Euclidean length. Normalized r_ij in [0, 1] satisfies sum_i(r_ij²) = 1.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="topsis-step-card">
                  <span className="topsis-step-num">STEP 3</span>
                  <div className="topsis-step-title">Weighted Normalization (v_ij)</div>
                  <p className="topsis-step-desc">
                    Multiply each normalized column by its corresponding criterion weight w_j.
                    Weights represent relative stakeholder importance and are normalized such that sum_j(w_j) = 1.
                  </p>
                  <div className="topsis-math-formula font-mono">
                    v_ij = w_j · r_ij
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    v_ij defines the weighted geometric coordinates of candidate i in n-dimensional decision space.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="topsis-step-card">
                  <span className="topsis-step-num">STEP 4</span>
                  <div className="topsis-step-title">Determine Ideal Solutions (v_j+, v_j-)</div>
                  <p className="topsis-step-desc">
                    Identify the positive ideal v_j+ and negative ideal v_j- based on criterion preference direction:
                  </p>
                  <div className="topsis-math-formula font-mono" style={{ fontSize: '0.75rem' }}>
                    Benefit (J+): v_j+ = max(v_ij), v_j- = min(v_ij)<br />
                    Cost (J-): v_j+ = min(v_ij), v_j- = max(v_ij)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    For cost criteria (hazard/tilt), smaller is safer, so ideal takes the minimum. For benefit, larger is ideal.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="topsis-step-card">
                  <span className="topsis-step-num">STEP 5</span>
                  <div className="topsis-step-title">Euclidean Separation Distances (D_i+, D_i-)</div>
                  <p className="topsis-step-desc">
                    Calculate the Euclidean geometric distance from candidate point v_i to the ideal point v+ and negative ideal point v-.
                  </p>
                  <div className="topsis-math-formula font-mono" style={{ fontSize: '0.75rem' }}>
                    D_i+ = √(∑_j=1^n (v_ij - v_j+)²)<br />
                    D_i- = √(∑_j=1^n (v_ij - v_j-)²)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Derived directly from the Pythagorean theorem in n-dimensional Euclidean space R^n.
                  </p>
                </div>

                {/* Step 6 & 7 */}
                <div className="topsis-step-card">
                  <span className="topsis-step-num">STEPS 6 & 7</span>
                  <div className="topsis-step-title">Closeness ($C_i$) & Ranking</div>
                  <p className="topsis-step-desc">
                    Compute the relative closeness coefficient $C_i$. Rank alternatives in descending order of $C_i$.
                  </p>
                  <div className="topsis-math-formula font-mono">
                    C_i = D_i- / (D_i+ + D_i-)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    $0 \le C_i \le 1$. As $D_i^+ \to 0$, $C_i \to 1.0$ (best). As $D_i^- \to 0$, $C_i \to 0.0$ (worst).
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Limitations of TOPSIS */}
            <div style={{ marginTop: '1.5rem', padding: '0.85rem 1.1rem', background: 'rgba(251, 191, 36, 0.04)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '6px' }}>
              <h4 style={{ color: '#fbbf24', fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>
                4. Methodological Limitations of TOPSIS
              </h4>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.55, margin: 0, paddingLeft: '1.25rem' }}>
                <li>
                  <strong>Subjectivity of Weights:</strong> Closeness scores directly reflect stakeholder weight choices. Shifting weight from science to slope can change the leading candidate.
                </li>
                <li>
                  <strong>Rank Reversal:</strong> Introducing or removing a candidate changes the column maximums and minimums, altering the ideal vectors and potentially shifting existing relative rankings.
                </li>
                <li>
                  <strong>Normalization Assumptions:</strong> Vector normalization preserves $\ell_2$ column lengths, but different schemes (such as linear min-max) can yield slightly different distance ratios.
                </li>
                <li>
                  <strong>Decision-Support Boundary:</strong> A high closeness score represents relative multi-attribute preference among evaluated candidates; it cannot guarantee absolute landing safety or replace terminal hazard detection.
                </li>
              </ul>
            </div>
          </div>

          {/* PART B: How LunarNavi Applies TOPSIS */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-tag">LUNARNAVI APPLICATION</span>
              <h3 className="panel-title" style={{ fontSize: '1.2rem' }}>
                PART B — How LunarNavi Applies TOPSIS to Lunar Landing-Site Selection
              </h3>
              <p className="panel-subtitle">
                Implementation trace using real lunar south-pole datasets, active mission weights, and deterministic matrix operations.
              </p>
            </div>

            {/* Implementation Pipeline Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>1. Candidate Sites Pool</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  12 candidate regions located in the lunar south polar region (80°S–90°S), including official Artemis III candidate zones and NASA decadal science exploration targets.
                </p>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>2. Authoritative Datasets Used</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  LOLA DEM (elevation), LOLA PGDA Prod 90 (50m slopes & roughness), PGDA Prod 69 (18.6-yr illumination & Earth visibility), LEND/LCROSS (water-ice volatiles), Diviner (thermal traps).
                </p>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>3. Two-Stage Preprocessing & No-Fabrication</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Hard feasibility constraints eliminate non-negotiable safety failures first. Sites with unassessed sensor/radar data gaps (NULL) are excluded with transparent reasons rather than filled with guesses.
                </p>
              </div>
            </div>

            {/* Active Criteria, Direction & Normalized Weights Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                Active Mission Criteria, Preference Directions & Weights ({currentMission.name})
              </h4>
              <div className="table-responsive">
                <table className="comparison-table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th scope="col">Criterion</th>
                      <th scope="col">Measurement Unit</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Direction</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Active Weight</th>
                      <th scope="col">Scientific & Operational Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CRITERION_IDS.map((cid) => {
                      const weight = currentMission.weights[cid] ?? 0
                      const dir = CRITERION_DIRECTION[cid]
                      const isCost = dir === 'cost'

                      return (
                        <tr key={cid}>
                          <td><strong>{CRITERION_LABELS[cid]}</strong></td>
                          <td className="font-mono text-muted">{CRITERION_UNITS[cid]}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-pill ${isCost ? 'status-pill--marginal' : 'status-pill--pass'}`} style={{ fontSize: '0.675rem' }}>
                              {isCost ? 'COST (MIN)' : 'BENEFIT (MAX)'}
                            </span>
                          </td>
                          <td className="font-mono text-right" style={{ color: weight > 0 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                            {(weight * 100).toFixed(1)}%
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.785rem' }}>
                            {cid === 'slope' && 'Minimizes lander tip-over risk on uneven terrain during touchdown.'}
                            {cid === 'roughness' && 'Minimizes footpad obstacle collision and boulder hazards.'}
                            {cid === 'illumination' && 'Maximizes solar array power generation and thermal survival.'}
                            {cid === 'resource' && 'Maximizes access to volatile water-ice cold traps for In-Situ Resource Utilization.'}
                            {cid === 'communication' && 'Maximizes direct-to-Earth line-of-sight telemetry and command uplink.'}
                            {cid === 'science' && 'Maximizes sampling return for South Pole-Aitken basin planetary geology.'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live TOPSIS Matrix Calculation Table */}
            {topsisCalculation && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                  Live TOPSIS Calculation Table: Admitted Candidates ({topsisCalculation.rows.length} Feasible Sites)
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  Exact values computed from real LRO measurements, normalized by column Euclidean norms, weighted, and evaluated against ideal points:
                </p>

                <div className="table-responsive">
                  <table className="comparison-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th scope="col">Candidate Landing Site</th>
                        <th scope="col" style={{ textAlign: 'center' }}>Nominal Rank</th>
                        <th scope="col" style={{ textAlign: 'right' }}>Dist. to Ideal ($D_i^+$)</th>
                        <th scope="col" style={{ textAlign: 'right' }}>Dist. to Anti-Ideal ($D_i^-$)</th>
                        <th scope="col" style={{ textAlign: 'right' }}>Closeness ($C_i$)</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topsisCalculation.rows
                        .slice()
                        .sort((a, b) => a.score.rank - b.score.rank)
                        .map(({ site, score }) => {
                          const isPrimary = score.rank === 1
                          const isBackup = backupSite && site.id === backupSite.id

                          return (
                            <tr
                              key={site.id}
                              style={{
                                backgroundColor: isPrimary
                                  ? 'rgba(45, 212, 191, 0.08)'
                                  : isBackup
                                  ? 'rgba(249, 115, 22, 0.05)'
                                  : undefined,
                              }}
                            >
                              <td>
                                <strong>{site.name}</strong>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {site.region} ({site.latitude.toFixed(1)}°S, {site.longitude.toFixed(1)}°E)
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`rank-pill ${isPrimary ? 'rank-pill--first' : isBackup ? 'rank-pill--backup' : ''} font-mono`}>
                                  #{score.rank}
                                </span>
                              </td>
                              <td className="font-mono text-right" style={{ color: 'var(--text-secondary)' }}>
                                {score.distanceToIdeal.toFixed(4)}
                              </td>
                              <td className="font-mono text-right" style={{ color: 'var(--text-secondary)' }}>
                                {score.distanceToAntiIdeal.toFixed(4)}
                              </td>
                              <td className="font-mono text-right" style={{ color: isPrimary ? 'var(--accent-teal)' : 'var(--text-primary)', fontWeight: 700 }}>
                                {score.closeness.toFixed(4)}
                              </td>
                              <td>
                                {isPrimary ? (
                                  <span className="status-pill status-pill--pass" style={{ fontSize: '0.675rem' }}>
                                    PRIMARY SITE
                                  </span>
                                ) : isBackup ? (
                                  <span className="status-pill status-pill--marginal" style={{ fontSize: '0.675rem' }}>
                                    BACKUP SITE
                                  </span>
                                ) : (
                                  <span className="status-pill status-pill--derived" style={{ fontSize: '0.675rem' }}>
                                    EVALUATED
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Mathematical Details Accordion */}
                <details className="math-details-toggle">
                  <summary className="math-summary-title">
                    <span>View Column Vector Norms & Ideal Coordinate Vectors ($v^+, v^-$)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-teal)' }}>[Expand Math]</span>
                  </summary>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                      {topsisCalculation.criteria.map((cid, cIdx) => (
                        <div key={cid} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{CRITERION_LABELS[cid]}</strong>
                          <div className="font-mono text-muted" style={{ fontSize: '0.725rem', marginTop: '0.2rem' }}>
                            Norm: {topsisCalculation.colNorms[cIdx].toFixed(3)}<br />
                            Weight: {(topsisCalculation.weights[cIdx] * 100).toFixed(1)}%<br />
                            v+: {topsisCalculation.ideal[cIdx].toFixed(4)}<br />
                            v-: {topsisCalculation.antiIdeal[cIdx].toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Why Primary & Backup Sites Were Selected */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {primarySite && (
                <div className="why-first-card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span className="rank-pill rank-pill--first font-mono">#1</span>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      Why {primarySite.name} Ranked First
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {primarySite.name} attained the highest closeness coefficient ($C_i = {nominalRanking.ranking[0]?.closeness.toFixed(4)}$)
                    by minimizing distance to the positive ideal while maintaining the greatest separation from the negative ideal.
                    Its gentle surface slope ({primarySite.criteria.slope.value}°), low roughness ({primarySite.criteria.roughness.value}m RMS),
                    and superior solar illumination ({primarySite.criteria.illumination.value}%) provide an optimal multi-attribute compromise.
                  </p>
                </div>
              )}

              {backupSite && (
                <div className="why-first-card" style={{ margin: 0, borderColor: 'rgba(249, 115, 22, 0.4)', background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span className="rank-pill rank-pill--backup font-mono">BACKUP</span>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      Why {backupSite.name} Was Selected as Backup
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Selected via regional decorrelation (<code>getDecorrelatedBackupSite</code>). {backupSite.name} is the highest-ranking
                    feasible candidate located in a distinct geographical region ({backupSite.region}) from the primary site.
                    This prevents common-mode localized terrain shadowing, communications masking, or plume dispersion risks
                    from compromising both sites simultaneously.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2 — MONTE CARLO ANALYSIS                                          */}
      {/* ========================================================================= */}
      {showSectionMc && (
        <section aria-labelledby="heading-section-2" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="section-badge-theory">GENERAL MATHEMATICAL THEORY</span>
            <span className="section-badge-app">LUNARNAVI APPLICATION</span>
          </div>

          <h2 id="heading-section-2" className="section-heading" style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>
            SECTION 2 — Monte Carlo Ranking Robustness Analysis
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
            Stochastic simulation evaluating how stably landing-site recommendations persist when orbiter instrument
            measurements fluctuate within sensor uncertainty bounds and mission priority weights vary.
          </p>

          {/* PART A: General Theory */}
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header">
              <span className="panel-tag">THEORETICAL FOUNDATION</span>
              <h3 className="panel-title" style={{ fontSize: '1.2rem' }}>
                PART A — Understanding Monte Carlo Simulation (General Theory)
              </h3>
              <p className="panel-subtitle">
                Stochastic sampling principles, mathematical formulation, and robustness metrics independent of LunarNavi.
              </p>
            </div>

            {/* 1. What is Monte Carlo? */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                1. What is Monte Carlo Simulation?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <strong>Monte Carlo simulation</strong> is a class of computational algorithms that rely on repeated random
                sampling to obtain numerical results for mathematical systems containing uncertainty. Originating in 1946 with
                Stanislaw Ulam, John von Neumann, and Nicholas Metropolis during the Manhattan Project at Los Alamos, the method
                was named after the famed Monte Carlo Casino in Monaco due to the inherent randomness of roulette.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
                <strong>Why Repeated Random Sampling?</strong> In complex engineering models, inputs are rarely single exact numbers;
                they contain measurement error, sensor noise, calibration bounds, and human preference uncertainty. A single
                deterministic calculation evaluates only one idealized point in parameter space, masking whether a solution
                is fragile or resilient. By sampling thousands of randomized scenarios across plausible input distributions,
                Monte Carlo maps input uncertainty directly to an empirical distribution of output realizations.
              </p>
            </div>

            {/* 2. General Workflow */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                2. General Workflow of a Monte Carlo Analysis (7 Steps)
              </h4>
              <ol style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.65, paddingLeft: '1.25rem' }}>
                <li><strong>Define the Mathematical Model:</strong> Establish deterministic equations $Y = f(X)$.</li>
                <li><strong>Identify Uncertain Inputs:</strong> Categorize parameters subject to noise, measurement error, or subjective variation.</li>
                <li><strong>Assign Probability Distributions:</strong> Select appropriate probability density functions (e.g. Uniform, Triangular, Gaussian).</li>
                <li><strong>Generate Random Samples:</strong> Draw independent pseudo-random sample vectors $X_k$ from the defined distributions.</li>
                <li><strong>Evaluate Model Repeatedly:</strong> Run the deterministic model $f(X_k)$ for each iteration $k = 1, \dots, N$.</li>
                <li><strong>Aggregate Output Realizations:</strong> Collect output states [Y_1, Y_2, ..., Y_N].</li>
                <li><strong>Analyze Statistical Distributions:</strong> Calculate summary statistics (frequencies, percentiles, stability rates).</li>
              </ol>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderLeft: '3px solid var(--accent-teal)', borderRadius: '0 6px 6px 0', marginTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                <strong>Core Analytical Truth:</strong> The validity of any Monte Carlo simulation depends strictly on the realism of its input assumptions and probability distributions. Running more iterations increases numerical precision, but cannot correct flawed physics or biased data ("garbage in, garbage out").
              </div>
            </div>

            {/* 3. Mathematical Explanation */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                3. Mathematical Formulation & Frequency Estimation
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Let X denote the vector of uncertain inputs distributed according to probability distribution D_X:
              </p>
              <div className="topsis-math-block font-mono" style={{ margin: '0.5rem 0' }}>
                X ~ D_X<br />
                Y_k = f(X_k),  for iteration k = 1, 2, ..., N
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                For any discrete outcome event E (such as candidate i attaining Rank 1), the empirical frequency is estimated as:
              </p>
              <div className="topsis-math-block font-mono" style={{ margin: '0.5rem 0' }}>
                P̂(E) = (1 / N) · ∑_k=1^N I(E_k)
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                where I(E_k) is an indicator function returning 1 if event E occurs in iteration k and 0 otherwise.
                By the <strong>Law of Large Numbers (LLN)</strong> and <strong>Central Limit Theorem (CLT)</strong>, the standard error
                of the estimated frequency scales inversely with the square root of iterations:
              </p>
              <div className="topsis-math-formula font-mono" style={{ fontSize: '0.8rem' }}>
                Standard Error = √[ P̂(1 - P̂) / N ] ∝ O(1 / √N)
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                Increasing iterations from 500 to 2,000 cuts random sampling error in half, ensuring statistical convergence.
              </p>
            </div>

            {/* 4. What is Robustness Analysis? */}
            <div style={{ padding: '0.85rem 1.1rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px' }}>
              <h4 style={{ color: '#38bdf8', fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>
                4. What is Robustness Analysis?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                In multi-criteria decision making, <strong>robustness</strong> measures how resilient a recommendation is against
                inevitable variations in data and priorities. A site is considered <em>robust</em> if it consistently ranks at or near
                the top across diverse perturbations. Crucially:
              </p>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.55, margin: '0.4rem 0 0 0', paddingLeft: '1.25rem' }}>
                <li><strong>Robustness is NOT Accuracy:</strong> A model can be robustly wrong if systematic instrument calibration biases exist.</li>
                <li><strong>Ranking Stability is NOT Landing Success:</strong> Monte Carlo win rate measures mathematical stability under stated trade-offs, not the physical touchdown survival probability.</li>
              </ul>
            </div>
          </div>

          {/* PART B: How LunarNavi Applies Monte Carlo */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-tag">LUNARNAVI APPLICATION</span>
              <h3 className="panel-title" style={{ fontSize: '1.2rem' }}>
                PART B — How LunarNavi Tests Landing-Site Recommendation Robustness
              </h3>
              <p className="panel-subtitle">
                Exact perturbation models, seeded PRNG algorithms, and mathematical metrics implemented in LunarNavi.
              </p>
            </div>

            {/* Perturbation Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>1. Physical Measurements Perturbation</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Sampled from an <strong>inverse-CDF triangular distribution</strong> bounded by published orbiter error margins $[low, high]$ with nominal mode. Missing values ($null$) are never guessed.
                </p>
                <div className="font-mono text-muted" style={{ fontSize: '0.725rem', marginTop: '0.4rem' }}>
                  x_ij^(k) ~ Triangular(low, mode, high)
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>2. Stakeholder Weights Perturbation</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Mission weights $w_j$ are uniformly perturbed by relative spread $\pm \delta$ ($\pm{(weightRelativeSpread * 100).toFixed(0)}\%$) and renormalized to sum strictly to $1.0$.
                </p>
                <div className="font-mono text-muted" style={{ fontSize: '0.725rem', marginTop: '0.4rem' }}>
                  w_j' = w_j · [1 + δ·(2u - 1)], u ~ U(0,1)
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>3. Seeded Mulberry32 PRNG</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Guarantees 100% deterministic, bit-level reproducibility across repeated simulation runs. Audit-ready verification for flight trade studies.
                </p>
                <div className="font-mono text-muted" style={{ fontSize: '0.725rem', marginTop: '0.4rem' }}>
                  PRNG Seed: {seed} (Audit Trace)
                </div>
              </div>
            </div>

            {/* Implemented Metrics & Formulas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                Implemented Mathematical Metrics & Formulas
              </h4>
              <div className="topsis-steps-grid">
                <div className="topsis-step-card">
                  <span className="topsis-step-num">METRIC 1</span>
                  <div className="topsis-step-title">Win Rate (Rank-1 Frequency)</div>
                  <div className="topsis-math-formula font-mono">
                    WinRate_i = (Count(Rank_i = 1) / N) · 100%
                  </div>
                  <p className="topsis-step-desc">
                    Percentage of simulation iterations where candidate $i$ ranked #1 in TOPSIS.
                  </p>
                </div>

                <div className="topsis-step-card">
                  <span className="topsis-step-num">METRIC 2</span>
                  <div className="topsis-step-title">Top-2 / Top-3 Placement Rate</div>
                  <div className="topsis-math-formula font-mono">
                    Top2_i = (Count(Rank_i ≤ 2) / N) · 100%
                  </div>
                  <p className="topsis-step-desc">
                    Measures whether a candidate consistently remains a viable primary or backup option under variance.
                  </p>
                </div>

                <div className="topsis-step-card">
                  <span className="topsis-step-num">METRIC 3</span>
                  <div className="topsis-step-title">Average Simulated Rank</div>
                  <div className="topsis-math-formula font-mono">
                    AvgRank_i = (∑ Rank_i,k) / N_ranked
                  </div>
                  <p className="topsis-step-desc">
                    Mean rank across all valid runs where the site satisfied feasibility limits.
                  </p>
                </div>

                <div className="topsis-step-card">
                  <span className="topsis-step-num">METRIC 4</span>
                  <div className="topsis-step-title">Feasibility Retention Rate</div>
                  <div className="topsis-math-formula font-mono">
                    FeasRate_i = (Count(Feasible_i) / N) · 100%
                  </div>
                  <p className="topsis-step-desc">
                    Percentage of runs where perturbed measurements still satisfy all hard engineering constraints.
                  </p>
                </div>
              </div>
            </div>

            {/* Implemented Robustness Classification Thresholds */}
            <div style={{ padding: '0.85rem 1.1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', margin: '0 0 0.4rem 0' }}>
                Implemented Robustness Classification Thresholds
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(45, 212, 191, 0.06)', borderLeft: '3px solid #2dd4bf', borderRadius: '0 4px 4px 0' }}>
                  <strong style={{ color: '#2dd4bf' }}>Highly Robust</strong>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                    Win Rate $\ge 50\%$ or Top-2 $\ge 85\%$ with feasibility $\ge 95\%$. Highly stable targeting.
                  </p>
                </div>

                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(56, 189, 248, 0.06)', borderLeft: '3px solid #38bdf8', borderRadius: '0 4px 4px 0' }}>
                  <strong style={{ color: '#38bdf8' }}>Moderately Robust</strong>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                    Win Rate $20\% \le W &lt; 50\%$ or Top-2 $\ge 60\%$. Viable backup with parameter sensitivity.
                  </p>
                </div>

                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(251, 191, 36, 0.06)', borderLeft: '3px solid #fbbf24', borderRadius: '0 4px 4px 0' }}>
                  <strong style={{ color: '#fbbf24' }}>Sensitive / Fragile</strong>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                    Win Rate $&lt; 20\%$. Highly vulnerable to priority shifts or terrain measurement variations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3 — LIVE INTERACTIVE SIMULATION ENGINE                            */}
      {/* ========================================================================= */}
      {showSectionEngine && (
        <section aria-labelledby="heading-section-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="section-badge-app">LIVE INTERACTIVE ENGINE</span>
          </div>

          <h2 id="heading-section-3" className="section-heading" style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>
            SECTION 3 — Live Interactive Simulation Engine
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
            Adjust simulation iteration budgets, priority weight variance bounds, and PRNG seeds to execute real-time sensitivity tests.
          </p>

          {/* Interactive Simulation Controls Panel */}
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header">
              <span className="panel-tag">SIMULATION PARAMETERS</span>
              <h3 className="panel-title" style={{ fontSize: '1.15rem' }}>
                Perturbation Engine Controls (Seeded Mulberry32 PRNG)
              </h3>
              <p className="panel-subtitle">
                Configure iteration budget, weight spread, and PRNG seed to verify deterministic convergence.
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
          </div>

          {/* Disqualified or Infeasible Notice */}
          {feasibleSites.length === 0 ? (
            <div className="panel empty-state-panel" role="alert">
              <div className="empty-state">
                <span className="empty-state-icon" aria-hidden="true">⚠️</span>
                <h3 className="empty-state-title">No Candidate Sites are Eligible for Monte Carlo</h3>
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
                    Adjust Constraints in Setup →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Executive Robust Winner Banner */}
              {topRobust && topRobust.site && (
                <div
                  className="panel"
                  style={{
                    border: '1px solid #2dd4bf',
                    background: 'linear-gradient(135deg, rgba(11, 17, 32, 0.95), rgba(13, 148, 136, 0.12))',
                    boxShadow: '0 4px 25px rgba(45, 212, 191, 0.15)',
                    marginBottom: '1.5rem',
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
                      <h3 className="winner-title" style={{ fontSize: '1.6rem', margin: '0.2rem 0' }}>
                        {topRobust.site.name}
                      </h3>
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
                      <span className="winner-metric-label">Top-2 / Top-3 Rate</span>
                      <span className="winner-metric-val font-mono" style={{ color: '#38bdf8' }}>
                        {(topRobust.top2Rate * 100).toFixed(1)}% / {(topRobust.top3Rate * 100).toFixed(1)}%
                      </span>
                      <span className="winner-metric-sub">
                        Consistently ranks in top 2 under weight variation
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
                </div>
              )}

              {/* Full Robustness Leaderboard Table */}
              <div className="panel" aria-labelledby="heading-mc-leaderboard" style={{ marginBottom: '1.5rem' }}>
                <div className="panel-header">
                  <span className="panel-tag">CROSS-CANDIDATE COMPARISON</span>
                  <h3 id="heading-mc-leaderboard" className="panel-title">
                    Candidate Ranking Robustness Leaderboard
                  </h3>
                  <p className="panel-subtitle">
                    Sorted by stochastic win rate across {iterations.toLocaleString()} triangular parameter iterations.
                    Click any row to view its rank distribution histogram.
                  </p>
                </div>

                <div className="table-responsive">
                  <table className="master-candidate-table" aria-label="Monte Carlo Robustness Results">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: '60px', textAlign: 'center' }}>MC Rank</th>
                        <th scope="col" style={{ minWidth: '180px' }}>Candidate Landing Site</th>
                        <th scope="col" style={{ minWidth: '120px' }}>Region</th>
                        <th scope="col" className="text-right" style={{ minWidth: '120px' }}>Win Rate (%)</th>
                        <th scope="col" className="text-right" style={{ minWidth: '100px' }}>Top 2 %</th>
                        <th scope="col" className="text-right" style={{ minWidth: '100px' }}>Avg Rank</th>
                        <th scope="col" className="text-right" style={{ minWidth: '100px' }}>Feasibility %</th>
                        <th scope="col" className="text-center" style={{ minWidth: '120px' }}>Classification</th>
                        <th scope="col" className="col-action text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStats.map(({ site, winRate, top2Rate, averageRank, eligibleRate, robustnessClass }, idx) => {
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
                                <div className="mc-bar-track" style={{ width: '55px' }} aria-hidden="true">
                                  <div
                                    className="mc-bar-fill"
                                    style={{ width: `${Math.min(100, winRate * 100)}%` }}
                                  />
                                </div>
                                <span style={{ minWidth: '45px', color: winRate > 0.4 ? '#2dd4bf' : 'var(--text-primary)' }}>
                                  {(winRate * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="text-right font-mono text-nowrap">
                              {(top2Rate * 100).toFixed(1)}%
                            </td>
                            <td className="text-right font-mono text-nowrap text-muted">
                              {averageRank ? averageRank.toFixed(1) : '—'}
                            </td>
                            <td className="text-right font-mono text-nowrap">
                              <span style={{ color: eligibleRate === 1 ? '#4ade80' : '#fbbf24' }}>
                                {(eligibleRate * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-center text-nowrap">
                              <span
                                className={`status-pill ${
                                  robustnessClass === 'Highly Robust'
                                    ? 'status-pill--pass'
                                    : robustnessClass === 'Moderately Robust'
                                    ? 'status-pill--derived'
                                    : 'status-pill--marginal'
                                }`}
                                style={{ fontSize: '0.675rem' }}
                              >
                                {robustnessClass}
                              </span>
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
                                  title="Scientific provenance & error bounds"
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
              </div>

              {/* Selected Site Rank Probability Distribution Histogram */}
              {activeSelectedStat && activeSelectedStat.site && (
                <div className="panel" aria-labelledby="heading-histogram" style={{ marginBottom: '1.5rem' }}>
                  <div className="panel-header">
                    <span className="panel-tag">RANK PROBABILITY DISTRIBUTION</span>
                    <h3 id="heading-histogram" className="panel-title" style={{ fontSize: '1.15rem' }}>
                      Stochastic Rank Distribution: {activeSelectedStat.site.name}
                    </h3>
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

                    {/* Disqualified Draws */}
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
                </div>
              )}
            </>
          )}

          {/* Workflow Action Bar */}
          {onNavigate && (
            <div className="panel panel-action-bar" aria-label="Workflow Navigation Actions">
              <div className="action-row-spaced">
                <div>
                  <span className="action-tag font-mono">COMPLETE DECISION PIPELINE</span>
                  <p className="action-text">
                    Review candidate trade-offs in TOPSIS Results or switch mission profile in Mission Setup.
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
                    Adjust Profile in Setup →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TECHNICAL PROVENANCE MODAL */}
      {inspectSite && (
        <div className="comparison-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-mc-prov-title">
          <div className="comparison-modal-content panel" style={{ maxWidth: '780px' }}>
            <div className="comparison-modal-header">
              <div>
                <span className="section-tag">SCIENTIFIC UNCERTAINTY BOUNDS</span>
                <h3 id="modal-mc-prov-title" className="comparison-modal-title">
                  {inspectSite.name} — Orbiter Error Margins & Sampling Bounds
                </h3>
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
