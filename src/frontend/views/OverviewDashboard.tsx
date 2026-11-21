import { ViewId } from '../Sidebar'
import { MoonGraphic } from '../MoonGraphic'

interface OverviewDashboardProps {
  onNavigate: (view: ViewId) => void
}

export function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  const workflowSteps = [
    {
      step: 1,
      title: 'Mission Setup',
      tag: 'STEP 1',
      status: 'Operational',
      statusClass: 'status-badge-engine',
      desc: 'Define mission purpose, planned arrival date, and stay duration. Predefined engineering standards applied.',
      view: 'setup' as ViewId,
    },
    {
      step: 2,
      title: 'Lunar Map',
      tag: 'STEP 2',
      status: 'Operational',
      statusClass: 'status-badge-engine',
      desc: 'Explore authentic NASA LOLA south-pole topography with live cursor elevation and candidate markers.',
      view: 'map' as ViewId,
    },
    {
      step: 3,
      title: 'Feasibility Evaluation',
      tag: 'STEP 3',
      status: 'Operational',
      statusClass: 'status-badge-engine',
      desc: 'Filter candidates through pass/marginal physical constraints to eliminate non-compliant sites.',
      view: 'sites' as ViewId,
    },
    {
      step: 4,
      title: 'TOPSIS Ranking',
      tag: 'STEP 4',
      status: 'Operational',
      statusClass: 'status-badge-engine',
      desc: 'Score eligible candidate sites by geometric closeness to the multi-criteria ideal solution.',
      view: 'results' as ViewId,
    },
    {
      step: 5,
      title: 'Monte Carlo Robustness',
      tag: 'STEP 5',
      status: 'Operational',
      statusClass: 'status-badge-engine',
      desc: 'Simulate sensor noise and weight fluctuations across 500-2,000 iterations to measure ranking stability.',
      view: 'robustness' as ViewId,
    },
    {
      step: 6,
      title: 'Final Recommendation',
      tag: 'STEP 6',
      status: 'Operational',
      statusClass: 'status-badge-engine',
      desc: 'Synthesize primary and contingency landing sites with documented engineering trade-offs.',
      view: 'results' as ViewId,
    },
  ]

  return (
    <div className="view-container">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-graphic-wrapper">
          <MoonGraphic />
        </div>
        <div className="hero-content">
          <div className="section-tag">LUNAR LANDING SITE DECISION SUPPORT</div>
          <h1 id="hero-title" className="hero-title">LunarNavi</h1>
          <p className="hero-description">
            Mission-Aware Lunar Landing Site Decision Support System.
            LunarNavi combines multi-criteria optimization, physical feasibility filtering, and
            probabilistic sensitivity simulations to de-risk candidate landing site targeting at the lunar south pole.
          </p>

          {/* Prominent Action Entry Points */}
          <div className="hero-actions-row">
            <button
              type="button"
              className="btn btn--primary btn--large"
              onClick={() => onNavigate('setup')}
            >
              Configure Mission →
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--large"
              onClick={() => onNavigate('map')}
            >
              Open Lunar Map ↗
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--large"
              onClick={() => {
                const el = document.getElementById('heading-workflow')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
                else onNavigate('about')
              }}
            >
              Explore Project Workflow ↓
            </button>
          </div>
        </div>
      </section>

      {/* Mission Status Banner */}
      <section className="mission-status-panel panel" aria-label="Current Mission Operational Status">
        <div className="mission-status-grid">
          <div className="status-col">
            <span className="status-label font-mono">MISSION CONTEXT</span>
            <span className="status-value">South Polar Exploration (80°S – 90°S)</span>
          </div>
          <div className="status-col">
            <span className="status-label font-mono">SYSTEM OPERATIONAL STATUS</span>
            <span className="status-badge-live">
              <span className="pulse-dot" aria-hidden="true" />
              SYSTEM ACTIVE · DASHBOARD AVAILABLE
            </span>
          </div>
          <div className="status-col">
            <span className="status-label font-mono">DATA INTEGRITY</span>
            <span className="status-value text-teal">ZERO SYNTHETIC REPLACEMENTS · AUDIT HONEST</span>
          </div>
        </div>
      </section>

      {/* Decision Workflow Pipeline */}
      <section className="panel workflow-panel" aria-labelledby="heading-workflow">
        <div className="panel-header">
          <span className="panel-tag">ANALYTIC PIPELINE</span>
          <h2 id="heading-workflow" className="panel-title">Decision Support Workflow</h2>
          <p className="panel-subtitle">
            LunarNavi guides mission planners through six sequential stages from physical constraints to robust site targeting.
          </p>
        </div>

        <div className="workflow-steps-container">
          {workflowSteps.map((ws, idx) => (
            <div key={ws.step} className="workflow-card-wrapper">
              <button
                type="button"
                className="workflow-step-card"
                onClick={() => onNavigate(ws.view)}
                aria-label={`Go to ${ws.title}`}
              >
                <div className="workflow-step-header">
                  <span className="step-tag font-mono">{ws.tag}</span>
                  <span className={`status-badge-pill ${ws.statusClass}`}>{ws.status}</span>
                </div>
                <h3 className="step-title">{ws.title}</h3>
                <p className="step-desc">{ws.desc}</p>
                <span className="step-link font-mono">Open View →</span>
              </button>
              {idx < workflowSteps.length - 1 && (
                <div className="workflow-connector" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
