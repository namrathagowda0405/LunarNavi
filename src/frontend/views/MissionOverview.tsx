import { MoonGraphic } from '../MoonGraphic'
import { MODULES } from '../moduleStatus'
import { StatusChip } from '../StatusChip'

export function AboutLunarNavi() {
  return (
    <div className="view-container">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-graphic-wrapper">
          <MoonGraphic />
        </div>
        <div className="hero-content">
          <div className="section-tag">MISSION-AWARE DECISION SUPPORT</div>
          <div className="title-row">
            <h1 id="hero-heading" className="hero-title">About LunarNavi</h1>
            <span className="status-chip status-chip--available" role="status">
              <span className="status-chip__dot" aria-hidden="true" />
              <span className="status-chip__text">Available</span>
            </span>
          </div>
          <p className="hero-description">
            LunarNavi assists space exploration teams in evaluating, comparing, and de-risking
            candidate lunar landing sites. It combines multi-criteria optimization, strict physical
            feasibility constraints, and rigorous sensitivity analysis to support mission planners.
          </p>
        </div>
      </section>

      {/* Core Questions Answered */}
      <section className="panel" aria-labelledby="questions-heading">
        <div className="panel-header">
          <span className="panel-tag">CAPABILITIES</span>
          <h2 id="questions-heading" className="panel-title">What LunarNavi Answers</h2>
        </div>
        <div className="grid-cards">
          <article className="info-card">
            <div className="card-step">1</div>
            <h3 className="card-title">Why a site is chosen</h3>
            <p className="card-text">
              Provides transparent, multi-criteria trade-offs balancing terrain hazards, science
              value, solar power, and communications coverage.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step">2</div>
            <h3 className="card-title">Whether it meets mission requirements</h3>
            <p className="card-text">
              Filters candidate sites against non-negotiable physical limits (pass, marginal, and fail)
              before applying ranking models.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step">3</div>
            <h3 className="card-title">How reliable the recommendation is under uncertainty</h3>
            <p className="card-text">
              Evaluates ranking robustness across measurement uncertainty ranges and orbiter data confidence intervals.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step">4</div>
            <h3 className="card-title">How changing priorities changes the winner</h3>
            <p className="card-text">
              Calculates decision-flip thresholds to identify how sensitive a site ranking is to
              stakeholder weighting shifts.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step">5</div>
            <h3 className="card-title">What the backup is</h3>
            <p className="card-text">
              Recommends independent, decorrelated backup landing sites for secondary targeting and contingency planning.
            </p>
          </article>
        </div>
      </section>

      {/* System Pipeline Status */}
      <section className="panel" aria-labelledby="pipeline-heading">
        <div className="panel-header">
          <span className="panel-tag">WORKFLOW PIPELINE</span>
          <h2 id="pipeline-heading" className="panel-title">System Pipeline & Module Status</h2>
          <p className="panel-subtitle">
            Every module in LunarNavi is shown below in chronological workflow order with its live implementation status.
          </p>
        </div>

        <ol className="pipeline-list">
          {MODULES.map((module, index) => (
            <li key={module.id} className="pipeline-item">
              <div className="pipeline-step" aria-label={`Step ${index + 1}`}>
                {index + 1}
              </div>
              <div className="pipeline-body">
                <div className="pipeline-header-row">
                  <h3 className="pipeline-name">{module.name}</h3>
                  <StatusChip status={module.status} />
                </div>
                <p className="pipeline-description">{module.description}</p>
                <div className="pipeline-detail">
                  <span className="pipeline-detail-label">Status detail:</span> {module.detail}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

// Keep MissionOverview alias for backwards compatibility
export const MissionOverview = AboutLunarNavi
