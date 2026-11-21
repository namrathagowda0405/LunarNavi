export function DataAndSources() {
  const principles = [
    {
      title: 'No invented data',
      summary:
        'Every quantitative figure in LunarNavi must originate from a verified orbital instrument, published topography model, or peer-reviewed lunar mission archive. Placeholder or synthetic data is never inserted.',
    },
    {
      title: 'Estimates never labelled measured',
      summary:
        'Every value is explicitly marked as measured, derived, or estimated. Computational models or orbital extrapolations are never presented as direct ground-truth measurements.',
    },
    {
      title: 'Resource potential is never presented as confirmed water or ice',
      summary:
        'Neutron spectrometer suppression and thermal modeling indicate hydrogen-bearing volatiles potential only. Unverified orbital signatures are never represented as certified accessible water ice.',
    },
    {
      title: 'Missing values and uncertainty are disclosed',
      summary:
        'Gaps in lunar coverage are openly designated as missing data (null) rather than filled with assumed values. High and low error bounds are always preserved.',
    },
    {
      title: 'Regional screening data is not high-resolution landing safety data',
      summary:
        'Broad orbital screening datasets (such as 30-meter to 100-meter digital elevation models) identify candidate exploration zones, but do not replace meter-scale terminal hazard detection.',
    },
  ]

  return (
    <div className="view-container">
      <header className="view-header">
        <div className="section-tag">METHODOLOGICAL RIGOR</div>
        <div className="title-row">
          <h1 className="view-title">Data & Sources</h1>
          <span className="status-chip status-chip--pending" role="status">
            <span className="status-chip__dot" aria-hidden="true" />
            <span className="status-chip__text">Pending</span>
          </span>
        </div>
        <p className="view-description">
          Scientific integrity is the primary design requirement of LunarNavi. Space mission planning
          demands absolute honesty about what is known, what is modeled, and what remains unmeasured.
        </p>
      </header>

      {/* Prototype Disclaimer Banner */}
      <section className="disclaimer-banner" role="alert" aria-label="Disclaimer">
        <div className="disclaimer-banner__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="disclaimer-banner__body">
          <h2 className="disclaimer-banner__title">Prototype for decision support. Not a landing safety certification tool.</h2>
          <p className="disclaimer-banner__text">
            LunarNavi provides macro-level decision-support and candidate ranking for early-phase mission
            trade studies. Terminal landing safety certification requires dedicated high-resolution hazard
            relative navigation (HRN) and terrain verification.
          </p>
        </div>
      </section>

      {/* Data Integrity Principles */}
      <section className="panel" aria-labelledby="principles-heading">
        <div className="panel-header">
          <span className="panel-tag">CORE PRINCIPLES</span>
          <h2 id="principles-heading" className="panel-title">Data-Integrity Principles</h2>
        </div>

        <ol className="principles-list">
          {principles.map((principle, index) => (
            <li key={principle.title} className="principle-item">
              <div className="principle-number" aria-hidden="true">
                {index + 1}
              </div>
              <div className="principle-content">
                <h3 className="principle-title">{principle.title}</h3>
                <p className="principle-text">{principle.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Authoritative Lunar Data Sources & Integration Status */}
      <section className="panel" aria-labelledby="sources-heading">
        <div className="panel-header">
          <span className="panel-tag">AUTHORITATIVE SOURCES</span>
          <h2 id="sources-heading" className="panel-title">NASA & Planetary Data System Sources</h2>
          <p className="panel-subtitle">
            Authoritative lunar datasets targeted for integration in future milestones. No unverified or synthetic datasets are loaded.
          </p>
        </div>

        <div className="grid-cards">
          <article className="info-card">
            <div className="card-badge">NASA LRO / LOLA</div>
            <h3 className="card-title">Lunar Orbiter Laser Altimeter</h3>
            <p className="card-text">
              Digital elevation models (DEM), topography, slope maps, and surface roughness metrics (20m–60m/px).
            </p>
            <div className="source-status font-mono">STATUS: PENDING INTEGRATION</div>
          </article>

          <article className="info-card">
            <div className="card-badge">NASA LRO / LROC NAC</div>
            <h3 className="card-title">Narrow Angle Camera</h3>
            <p className="card-text">
              Sub-meter optical imagery for visual terrain identification and multi-year solar illumination persistence studies.
            </p>
            <div className="source-status font-mono">STATUS: PENDING INTEGRATION</div>
          </article>

          <article className="info-card">
            <div className="card-badge">NASA LRO / DIVINER</div>
            <h3 className="card-title">Lunar Radiometer Experiment</h3>
            <p className="card-text">
              Surface and subsurface thermal measurements to assess cold traps and permanently shadowed regions (PSRs).
            </p>
            <div className="source-status font-mono">STATUS: PENDING INTEGRATION</div>
          </article>

          <article className="info-card">
            <div className="card-badge">NASA PDS / LP-NS</div>
            <h3 className="card-title">Lunar Prospector Neutron Spectrometer</h3>
            <p className="card-text">
              Epithermal neutron suppression maps indicative of volatile and hydrogen enrichment in polar craters.
            </p>
            <div className="source-status font-mono">STATUS: PENDING INTEGRATION</div>
          </article>
        </div>
      </section>
    </div>
  )
}
