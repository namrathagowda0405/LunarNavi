import { CRITERION_IDS, CriterionId } from '../../engine/types'
import { StatusChip } from '../StatusChip'

const CRITERION_LABELS: Record<CriterionId, string> = {
  slope: 'Surface Slope',
  roughness: 'Surface Roughness',
  illumination: 'Solar Illumination',
  resource: 'Water Ice & Volatiles Potential',
  communication: 'Direct-to-Earth Communication',
  science: 'Scientific Priority Value',
}

export function CandidateSites() {
  return (
    <div className="view-container">
      <header className="view-header">
        <div className="section-tag">DATASET STATUS</div>
        <div className="title-row">
          <h1 className="view-title">Candidate Sites</h1>
          <StatusChip status="in-preparation" customLabel="Dataset being researched" />
        </div>
        <p className="view-description">
          Candidate landing sites represent candidate target regions on the lunar surface.
          Each site holds verified topographical, scientific, and communications data along with
          traceable uncertainty bounds.
        </p>
      </header>

      {/* Empty State */}
      <section className="panel empty-state-panel" aria-label="Dataset Status">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
          </div>
          <h2 className="empty-state-title">No candidate dataset loaded yet.</h2>
          <p className="empty-state-text">
            The dataset of real lunar candidate sites is being prepared.
          </p>
        </div>
      </section>

      {/* Site Value Specification Card */}
      <section className="panel" aria-labelledby="schema-heading">
        <div className="panel-header">
          <span className="panel-tag">DATA DISCLOSURE CONTRACT</span>
          <h2 id="schema-heading" className="panel-title">What Every Site Criterion Carries</h2>
          <p className="panel-subtitle">
            To prevent overconfidence, LunarNavi enforces transparency on every measurement.
            When the dataset is loaded, each criterion value will carry:
          </p>
        </div>

        <div className="grid-cards">
          <article className="info-card">
            <div className="card-badge">NOMINAL VALUE</div>
            <h3 className="card-title">Value</h3>
            <p className="card-text">
              The primary assessment metric, or null when data is missing. Missing values are
              never guessed or silently substituted.
            </p>
          </article>

          <article className="info-card">
            <div className="card-badge">BOUNDS</div>
            <h3 className="card-title">Low / High Uncertainty Range</h3>
            <p className="card-text">
              Uncertainty intervals representing instrument error margins, seasonal variance, or
              confidence bounds for sensitivity analysis.
            </p>
          </article>

          <article className="info-card">
            <div className="card-badge">PROVENANCE</div>
            <h3 className="card-title">Data Source</h3>
            <p className="card-text">
              The specific satellite instrument, digital elevation model, or peer-reviewed publication
              responsible for the measurement.
            </p>
          </article>

          <article className="info-card">
            <div className="card-badge">CONFIDENCE</div>
            <h3 className="card-title">Quality Rating</h3>
            <p className="card-text">
              An explicit reliability indicator (high, medium, or low) reflecting data fidelity and resolution.
            </p>
          </article>

          <article className="info-card">
            <div className="card-badge">METHODOLOGY</div>
            <h3 className="card-title">Value Kind Label</h3>
            <p className="card-text">
              A strict methodological classification: measured (direct instrument), derived
              (computed physical model), or estimated (approximated).
            </p>
          </article>
        </div>
      </section>

      {/* Six Criteria List */}
      <section className="panel" aria-labelledby="criteria-scope-heading">
        <div className="panel-header">
          <span className="panel-tag">CRITERIA COVERAGE</span>
          <h2 id="criteria-scope-heading" className="panel-title">Required Evaluation Criteria</h2>
          <p className="panel-subtitle">
            Every candidate site in the dataset must provide data across all six criteria:
          </p>
        </div>

        <div className="tags-grid">
          {CRITERION_IDS.map((id) => (
            <div key={id} className="criterion-pill">
              <span className="criterion-pill__name">{CRITERION_LABELS[id]}</span>
              <span className="criterion-pill__id">({id})</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
