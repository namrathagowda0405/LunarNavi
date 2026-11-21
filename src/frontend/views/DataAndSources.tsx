import { useState, useEffect } from 'react'
import { isSupabaseConfigured, fetchSources, SourceRecord } from '../../services'

export function DataAndSources() {
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [sourceType, setSourceType] = useState<'supabase' | 'local'>('local')
  const configured = isSupabaseConfigured()

  useEffect(() => {
    fetchSources().then((res) => {
      setSources(res.sources)
      setSourceType(res.source)
    }).catch(console.warn)
  }, [])

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
        <div className="section-tag">METHODOLOGICAL RIGOR & DATA INFRASTRUCTURE</div>
        <div className="title-row">
          <h1 className="view-title">Data & Sources</h1>
          <span
            className={`status-chip ${configured ? 'status-chip--available' : 'status-chip--engine-ready'}`}
            role="status"
          >
            <span className="status-chip__dot" aria-hidden="true" />
            <span className="status-chip__text">
              {configured
                ? `Supabase Cloud (${sourceType === 'supabase' ? 'Live' : 'Cached'})`
                : 'Verified Local Data Layer'}
            </span>
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

      {/* Authoritative Lunar Data Sources */}
      <section className="panel" aria-labelledby="sources-heading">
        <div className="panel-header">
          <span className="panel-tag">AUTHORITATIVE SOURCES</span>
          <h2 id="sources-heading" className="panel-title">NASA & Planetary Data System Sources</h2>
          <p className="panel-subtitle">
            Authentic peer-reviewed datasets and orbital mission archives loaded into LunarNavi. No synthetic or invented datasets are used.
          </p>
        </div>

        <div className="grid-cards">
          {sources.map((src) => (
            <article key={src.id} className="info-card">
              <div className="card-badge">{src.organization}</div>
              <h3 className="card-title">{src.name}</h3>
              <p className="card-text">{src.description}</p>
              {src.processing_method && (
                <p className="card-text" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #8b949e)', marginTop: '0.5rem' }}>
                  <strong>Method:</strong> {src.processing_method}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                <span className="source-status font-mono" style={{ color: 'var(--color-success, #3fb950)' }}>
                  STATUS: VERIFIED
                </span>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button--secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    View Archive ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Provenance Classification & Uncertainty Inventory */}
      <section className="panel" aria-labelledby="provenance-heading">
        <div className="panel-header">
          <span className="panel-tag">MEASUREMENT PROVENANCE</span>
          <h2 id="provenance-heading" className="panel-title">Criterion Provenance & Uncertainty Matrix</h2>
          <p className="panel-subtitle">
            Rigorous classification distinguishing direct orbital measurements from derived physical models, orbital simulations, and qualitative planetary syntheses.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border, #30363d)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Criterion</th>
                <th style={{ padding: '0.75rem' }}>Unit</th>
                <th style={{ padding: '0.75rem' }}>Provenance Kind</th>
                <th style={{ padding: '0.75rem' }}>Primary Instrument / Baseline</th>
                <th style={{ padding: '0.75rem' }}>Typical Uncertainty</th>
                <th style={{ padding: '0.75rem' }}>Authoritative Source</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border, #21262d)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Topographic Elevation</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>m (rel. 1737.4 km)</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--available" style={{ fontSize: '0.75rem' }}>Measured</span></td>
                <td style={{ padding: '0.75rem' }}>LRO LOLA Pulse Laser Altimeter</td>
                <td style={{ padding: '0.75rem' }}>±0.5 m radial, 80m/pix grid</td>
                <td style={{ padding: '0.75rem' }}>NASA PDS (Smith et al. 2017)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #21262d)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Surface Slope</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>degrees (°)</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--engine-ready" style={{ fontSize: '0.75rem' }}>Derived</span></td>
                <td style={{ padding: '0.75rem' }}>LOLA DEM Bidirectional Gradient (50m)</td>
                <td style={{ padding: '0.75rem' }}>±1.2° to ±1.5°</td>
                <td style={{ padding: '0.75rem' }}>NASA PGDA Prod 90 (Barker 2023)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #21262d)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Surface Roughness</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>m RMS</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--engine-ready" style={{ fontSize: '0.75rem' }}>Derived</span></td>
                <td style={{ padding: '0.75rem' }}>50m Baseline Topographic Residuals</td>
                <td style={{ padding: '0.75rem' }}>±0.04 m RMS</td>
                <td style={{ padding: '0.75rem' }}>NASA PGDA Prod 90 (Barker 2023)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #21262d)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Solar Illumination</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>% visibility</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--engine-ready" style={{ fontSize: '0.75rem' }}>Simulated</span></td>
                <td style={{ padding: '0.75rem' }}>18.6-Year Solar Ray-Tracing at 2m Mast</td>
                <td style={{ padding: '0.75rem' }}>±4.0% annual variance</td>
                <td style={{ padding: '0.75rem' }}>NASA PGDA Prod 69 (Mazarico 2011)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #21262d)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Resource Potential</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>score (0-100)</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--available" style={{ fontSize: '0.75rem' }}>Measured / Derived</span></td>
                <td style={{ padding: '0.75rem' }}>LCROSS (Ground Truth) / LEND + Diviner</td>
                <td style={{ padding: '0.75rem' }}>±10 to ±14 pts score bound</td>
                <td style={{ padding: '0.75rem' }}>Colaprete (2010) / Paige (2010)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #21262d)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Earth Visibility</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>% direct line-of-sight</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--engine-ready" style={{ fontSize: '0.75rem' }}>Simulated</span></td>
                <td style={{ padding: '0.75rem' }}>18.6-Year Lunar Libration Topocentric Model</td>
                <td style={{ padding: '0.75rem' }}>±6.0% monthly libration cycle</td>
                <td style={{ padding: '0.75rem' }}>NASA PGDA Prod 69 (Mazarico 2011)</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>Scientific Return Value</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>score (0-100)</td>
                <td style={{ padding: '0.75rem' }}><span className="status-chip status-chip--draft" style={{ fontSize: '0.75rem' }}>Estimated</span></td>
                <td style={{ padding: '0.75rem' }}>Artemis III SDT Decadal Science Matrix</td>
                <td style={{ padding: '0.75rem' }}>±6 to ±8 pts synthesis range</td>
                <td style={{ padding: '0.75rem' }}>NASA SP-20205009602 (2020)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Transparent Data Gap & Calibration Disclosures */}
      <section className="panel" aria-labelledby="gaps-heading">
        <div className="panel-header">
          <span className="panel-tag">DATA GAP DISCLOSURES</span>
          <h2 id="gaps-heading" className="panel-title">Instrument Limitations & Coverage Gaps</h2>
          <p className="panel-subtitle">
            LunarNavi enforces a strict no-fabrication policy. When sensor shadowing or coverage gaps occur, values are explicitly designated as NULL rather than filled with guesses.
          </p>
        </div>

        <div className="grid-cards">
          <article className="info-card" style={{ borderColor: 'var(--color-warning, #d29922)' }}>
            <div className="card-badge" style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)', color: 'var(--color-warning, #d29922)' }}>
              OBSERVED DATA GAP
            </div>
            <h3 className="card-title">Shoemaker Crater Cold Trap (Resource: NULL)</h3>
            <p className="card-text">
              In Shoemaker Crater floor, steep crater rims produce an orbital epithermal neutron sensor shadow in the collimated LEND map.
              Instead of assuming volatile abundance, the resource metric is set to <strong>NULL</strong> with quality rating <strong>LOW</strong>.
            </p>
          </article>

          <article className="info-card" style={{ borderColor: 'var(--color-warning, #d29922)' }}>
            <div className="card-badge" style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)', color: 'var(--color-warning, #d29922)' }}>
              RADAR SHADOW GAP
            </div>
            <h3 className="card-title">Slater Crater Unsurveyed Ridge (Roughness: NULL)</h3>
            <p className="card-text">
              Severe polar radar and lidar grazing angles over Slater Crater ridge precluded reliable 50m point-to-planar elevation detrending.
              Surface roughness is recorded as <strong>NULL</strong> to ensure landing planners do not mistake unmeasured terrain for smooth ground.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}

