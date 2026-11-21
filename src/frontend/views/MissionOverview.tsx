import { MoonGraphic } from '../MoonGraphic'

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

      {/* System Architecture & Aerospace Verification */}
      <section className="panel" aria-labelledby="pipeline-heading">
        <div className="panel-header">
          <span className="panel-tag">AEROSPACE ARCHITECTURE</span>
          <h2 id="pipeline-heading" className="panel-title">Decision Support Architecture & Verification</h2>
          <p className="panel-subtitle">
            Authoritative, mathematically verified decision pipeline built for lunar exploration planning.
          </p>
        </div>

        <div className="grid-cards" style={{ marginTop: '1rem' }}>
          <article className="info-card">
            <div className="card-step font-mono">01</div>
            <h3 className="card-title">Physical Feasibility Filtering</h3>
            <p className="card-text">
              Deterministic gatekeeper that evaluates candidate sites against non-negotiable physical thresholds
              (slope, roughness, illumination, comms) before any scoring occurs. Disqualified sites cannot win.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step font-mono">02</div>
            <h3 className="card-title">TOPSIS Multi-Criteria Optimization</h3>
            <p className="card-text">
              Vector-normalized Euclidean distance ranking against positive-ideal and negative-ideal solutions.
              Weights reflect mission-specific engineering priorities (resource, science, crewed, comms).
            </p>
          </article>

          <article className="info-card">
            <div className="card-step font-mono">03</div>
            <h3 className="card-title">Monte Carlo Stochastic Robustness</h3>
            <p className="card-text">
              Simulates sensor noise and stakeholder weighting variations across 500–2,000 runs using a seeded
              PRNG to evaluate rank stability, win frequencies, and decision-flip vulnerability.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step font-mono">04</div>
            <h3 className="card-title">Interactive Polar Cartography</h3>
            <p className="card-text">
              Canvas-rendered polar stereographic projection with NASA LOLA DEM, slope, roughness, illumination,
              and PSR cold-trap overlays with sub-kilometer IAU DE421 coordinate alignment.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step font-mono">05</div>
            <h3 className="card-title">Curated Candidate Lunar Sites</h3>
            <p className="card-text">
              16 real lunar south pole sites (+2 calibration test targets) curated from NASA Artemis landing studies,
              CLPS targets, and peer-reviewed polar science literature. Zero synthetic or fabricated records.
            </p>
          </article>

          <article className="info-card">
            <div className="card-step font-mono">06</div>
            <h3 className="card-title">Relational Cloud Persistence</h3>
            <p className="card-text">
              10 PostgreSQL tables with Row-Level Security (RLS) tracking data sources, dataset versions, sites,
              measurements, mission profiles, criteria weights, analysis runs, and simulation runs.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}

// Keep MissionOverview alias for backwards compatibility
export const MissionOverview = AboutLunarNavi
