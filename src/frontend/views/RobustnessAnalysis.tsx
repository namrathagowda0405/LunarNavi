import { ViewId } from '../Sidebar'
import { MONTE_CARLO_DISCLAIMER } from '../../engine/montecarlo'

interface RobustnessAnalysisProps {
  onNavigate?: (view: ViewId) => void
}

export function RobustnessAnalysis({ onNavigate }: RobustnessAnalysisProps) {
  const simulationHighlights = [
    {
      title: 'Triangular Parameter Sampling',
      desc: 'Each criterion value is perturbed within documented [low, high] orbiter error bounds, treating the nominal measurement as the most likely mode.',
    },
    {
      title: 'Strict Sequence Alignment',
      desc: 'PRNG draws are consumed in fixed order for every site and criterion, ensuring missing or fixed values in one site never alter the random stream for other sites.',
    },
    {
      title: 'Dynamic Weight Perturbation',
      desc: 'Stakeholder priority weights vary uniformly within ±20% and renormalize to 1.0, exploring how sensitive recommendations are to operational priority shifts.',
    },
    {
      title: 'Integrated Feasibility Filtering',
      desc: 'Each virtual scenario re-evaluates physical constraints before ranking; sites failing essential limits are disqualified from that iteration.',
    },
  ]

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header">
        <div className="section-tag">PROBABILISTIC DECISION SENSITIVITY</div>
        <div className="title-row">
          <h1 className="view-title">Robustness Analysis (Monte Carlo)</h1>
          <span className="status-chip status-chip--engine-ready" role="status">
            <span className="status-chip__dot" aria-hidden="true" />
            <span className="status-chip__text">Engine Built · Dataset Pending</span>
          </span>
        </div>
        <p className="view-description">
          The Monte Carlo simulation engine tests the stability and resilience of candidate lunar landing site recommendations
          across thousands of synthetic variations modeled on instrument measurement noise and weighting uncertainty.
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

      {/* Status & Architecture Overview */}
      <div className="results-grid">
        <section className="panel" aria-labelledby="heading-sim-status">
          <div className="panel-header">
            <span className="panel-tag">IMPLEMENTATION STATUS</span>
            <h2 id="heading-sim-status" className="panel-title">Engine Readiness</h2>
          </div>
          <dl className="summary-dl">
            <div className="summary-item">
              <dt className="summary-term">SIMULATION ALGORITHM</dt>
              <dd className="summary-val">Seeded Mulberry32 PRNG + Inverse-CDF Triangular</dd>
              <dd className="summary-sub">Deterministic, audit-ready trade study execution (src/engine/montecarlo.ts)</dd>
            </div>
            <div className="summary-item">
              <dt className="summary-term">DEFAULT ITERATION BUDGET</dt>
              <dd className="summary-val font-mono">2,000 Iterations</dd>
              <dd className="summary-sub">Benchmarked at ~100 ms execution time for 12 candidate landing sites</dd>
            </div>
            <div className="summary-item">
              <dt className="summary-term">STATUS LIMITATION</dt>
              <dd className="summary-val text-amber">Awaiting Candidate Dataset Verification (D2)</dd>
              <dd className="summary-sub">Simulation runs will be accessible in Results once real coordinates are verified</dd>
            </div>
          </dl>
        </section>

        <section className="panel" aria-labelledby="heading-sim-method">
          <div className="panel-header">
            <span className="panel-tag">MATHEMATICAL MODEL</span>
            <h2 id="heading-sim-method" className="panel-title">Simulation Methodology</h2>
          </div>
          <div className="method-list">
            {simulationHighlights.map((sh, idx) => (
              <div key={idx} className="method-item">
                <span className="method-tag font-mono">STEP 0{idx + 1}</span>
                <h3 className="method-title">{sh.title}</h3>
                <p className="method-desc">{sh.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Action Navigation */}
      {onNavigate && (
        <section className="panel panel-action-bar" aria-label="Navigation Actions">
          <div className="action-row-spaced">
            <div>
              <span className="action-tag font-mono">NEXT STEP IN DECISION WORKFLOW</span>
              <p className="action-text">Review and customize criteria weights in Mission Setup before running analysis.</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onNavigate('setup')}
            >
              Configure Mission Limits →
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
