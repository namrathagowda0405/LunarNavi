import { isSupabaseConfigured } from '../../services'

interface ScientificDataSource {
  id: string
  name: string
  purpose: string
  product: string
  organization: string
  url: string
}

interface EvaluationCriterionData {
  category: string
  unit: string
  status: 'Verified / source-backed' | 'Derived from source data' | 'Estimated' | 'Unavailable'
  statusClass: string
  role: string
  primarySource: string
}

interface QualityStatusDefinition {
  status: 'Verified / source-backed' | 'Derived from source data' | 'Estimated' | 'Unavailable'
  badgeClass: string
  summary: string
  example: string
}

// 1. Authoritative scientific sources genuinely used by LunarNavi
const KEY_DATA_SOURCES: ScientificDataSource[] = [
  {
    id: 'lola-elevation',
    name: 'Lunar Orbiter Laser Altimeter (LOLA)',
    purpose: 'Provides digital elevation models for topographic elevation and terrain heights across the lunar south pole.',
    product: 'LOLA Gridded Data Record (LDEM_80S_80M)',
    organization: 'NASA Planetary Data System (PDS) / GSFC',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  },
  {
    id: 'pgda-prod-90',
    name: 'A New View of the Lunar South Pole (PGDA Product 90)',
    purpose: 'Provides multi-scale slope gradients and RMS surface roughness at 50m baseline for lander tip-over and hazard evaluation.',
    product: 'NASA PGDA Product 90 (Barker et al. 2023)',
    organization: 'NASA Planetary Geodynamics Data Archive / GSFC',
    url: 'https://pgda.gsfc.nasa.gov/products/90',
  },
  {
    id: 'pgda-prod-69',
    name: 'Illumination Conditions of Lunar Polar Regions (PGDA Product 69)',
    purpose: 'Provides cumulative solar illumination percentages, permanent shadow masks (PSRs), and direct line-of-sight Earth visibility over an 18.6-year cycle.',
    product: 'NASA PGDA Product 69 (Mazarico et al. 2011)',
    organization: 'NASA Planetary Geodynamics Data Archive / GSFC',
    url: 'https://pgda.gsfc.nasa.gov/products/69',
  },
  {
    id: 'lro-lend-lcross',
    name: 'Lunar Exploration Neutron Detector (LEND) & LCROSS',
    purpose: 'Provides orbital epithermal neutron suppression and impact ground truth indicating hydrogen-bearing volatiles and water-ice potential.',
    product: 'LRO LEND Data Archive & LCROSS Volatile Results',
    organization: 'NASA PDS Geosciences / IKI / ARC',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lend.htm',
  },
  {
    id: 'lro-diviner',
    name: 'Diviner Lunar Radiometer Experiment',
    purpose: 'Provides polar thermal measurements and maximum annual surface temperature maps to delineate permanent cold traps where volatiles remain stable.',
    product: 'Diviner Polar Temperature Atlas (Paige et al. 2010)',
    organization: 'NASA / UCLA / LRO Science Team',
    url: 'https://diviner.ucla.edu/',
  },
  {
    id: 'artemis-sdt-report',
    name: 'NASA Artemis III Science Definition Team Report',
    purpose: 'Provides decadal planetary exploration priorities, South Pole-Aitken basin sampling objectives, and official Artemis candidate regional definitions.',
    product: 'NASA SP-20205009602 Candidate Evaluation Framework',
    organization: 'NASA Science Mission Directorate (SMD)',
    url: 'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
  },
]

// 2. Data categories actually used in candidate site calculations
const EVALUATION_DATA_CATEGORIES: EvaluationCriterionData[] = [
  {
    category: 'Terrain & Elevation',
    unit: 'meters (rel. 1737.4 km reference sphere)',
    status: 'Verified / source-backed',
    statusClass: 'status-pill--verified',
    role: 'Establishes base elevation and topographic relief to assess landing altitude and surrounding mountain shadowing.',
    primarySource: 'LRO LOLA Pulse Laser Altimeter',
  },
  {
    category: 'Surface Slope',
    unit: 'degrees (°) at 50m baseline',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    role: 'Evaluates landing incline to prevent lander tilt and structural tip-over risk during touchdown.',
    primarySource: 'LOLA DEM Bidirectional Gradient (Barker et al. 2023)',
  },
  {
    category: 'Terrain Roughness',
    unit: 'meters RMS at 50m baseline',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    role: 'Measures sub-crater obstacle distribution and boulder frequency to verify landing footpad clearance.',
    primarySource: 'LOLA 50m Topographic Residuals (Barker et al. 2023)',
  },
  {
    category: 'Solar Illumination',
    unit: 'percentage (%) cumulative annual sunlight',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    role: 'Determines solar array power generation and battery recharge viability during surface operations.',
    primarySource: '18.6-Year Solar Ray-Tracing at 2m Mast (Mazarico et al. 2011)',
  },
  {
    category: 'Water-Ice & Resource Evidence',
    unit: 'volatile proxy score (0–100) & evidence classification',
    status: 'Estimated',
    statusClass: 'status-pill--estimated',
    role: 'Identifies proximity to volatile cold traps and permanently shadowed regions (PSRs) for in-situ resource utilization.',
    primarySource: 'Collimated LEND Neutron Suppression & Diviner Thermal Traps',
  },
  {
    category: 'Communication Visibility',
    unit: 'percentage (%) direct line-of-sight to Earth',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    role: 'Evaluates continuous telemetry, voice, and command uplink/downlink coverage across lunar libration cycles.',
    primarySource: '18.6-Year Topocentric Horizon Libration Model (Mazarico et al. 2011)',
  },
  {
    category: 'Scientific Return Value',
    unit: 'priority index (0–100)',
    status: 'Estimated',
    statusClass: 'status-pill--estimated',
    role: 'Balances scientific return against engineering constraints based on South Pole-Aitken basin sampling priorities.',
    primarySource: 'NASA Artemis III SDT Decadal Science Matrix (NASA SP-20205009602)',
  },
]

// 3. Truthful data quality status definitions
const QUALITY_STATUS_DEFINITIONS: QualityStatusDefinition[] = [
  {
    status: 'Verified / source-backed',
    badgeClass: 'status-pill--verified',
    summary: 'Direct instrument soundings from orbiting spacecraft with published calibration and coordinate referencing.',
    example: 'LOLA pulse laser altimeter measurements (±0.5 m radial elevation).',
  },
  {
    status: 'Derived from source data',
    badgeClass: 'status-pill--derived',
    summary: 'Computed directly from verified primary measurements using documented physical, geometric, or ray-tracing models.',
    example: '50m surface slopes and 18.6-year solar ray-tracing over elevation models.',
  },
  {
    status: 'Estimated',
    badgeClass: 'status-pill--estimated',
    summary: 'Inferred from indirect orbital signatures or expert decadal syntheses; uncertified until in-situ surface ground-truth.',
    example: 'Neutron flux volatile proxy scores and planetary science decadal priorities.',
  },
  {
    status: 'Unavailable',
    badgeClass: 'status-pill--unavailable',
    summary: 'Data missing due to sensor shadowing or steep grazing angles; explicitly recorded as NULL rather than filled with guesses.',
    example: 'Shoemaker crater epithermal neutron sensor shadow (resource unassessed).',
  },
]

export function DataAndSources() {
  const isCloudConnected = isSupabaseConfigured()

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header">
        <div className="section-tag">SCIENTIFIC TRANSPARENCY & DATA PROVENANCE</div>
        <div className="title-row">
          <h1 className="view-title">Data & Sources</h1>
          <span
            className={`status-chip ${isCloudConnected ? 'status-chip--available' : 'status-chip--engine-ready'}`}
            role="status"
          >
            <span className="status-chip__dot" aria-hidden="true" />
            <span className="status-chip__text">
              {isCloudConnected ? 'Supabase Database Connected' : 'Verified Local Scientific Dataset'}
            </span>
          </span>
        </div>
        <p className="view-description">
          Authoritative planetary science datasets and orbital instruments used by LunarNavi for south polar landing-site evaluation.
        </p>
      </header>

      {/* D. Scientific Transparency & Analytical Boundary Statement */}
      <section className="disclaimer-banner" role="alert" aria-label="Scientific Transparency Statement">
        <div className="disclaimer-banner__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="disclaimer-banner__body">
          <h2 className="disclaimer-banner__title">
            Scientific Transparency & Mission Evaluation Boundary
          </h2>
          <p className="disclaimer-banner__text">
            LunarNavi is a decision-support prototype designed for preliminary landing-site trade studies. All candidate evaluations, feasibility determinations, and multi-criteria rankings depend strictly on available scientific data and implemented mission evaluation models. Space mission planning demands complete honesty regarding what is measured, what is derived through computational physics, and what remains unassessed. Terminal landing safety certification requires dedicated high-resolution hazard relative navigation (HRN) and terrain verification.
          </p>
          <p className="disclaimer-banner__text" style={{ marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
            Every dataset below includes a direct link to the original planetary archive so users can independently verify all measurements, coordinate frames, and instrument calibrations.
          </p>
        </div>
      </section>

      {/* A. Key Scientific Data Sources */}
      <section className="panel" aria-labelledby="sources-heading" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-tag">AUTHORITATIVE SOURCES</span>
          <h2 id="sources-heading" className="panel-title">Key Scientific Data Sources</h2>
          <p className="panel-subtitle">
            Authentic scientific archives and published planetary products genuinely connected to LunarNavi's data pipeline.
          </p>
        </div>

        <div className="table-responsive">
          <table className="comparison-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: '220px' }}>Scientific Source</th>
                <th scope="col" style={{ minWidth: '280px' }}>What LunarNavi Uses It For</th>
                <th scope="col" style={{ minWidth: '200px' }}>Dataset / Product Name</th>
                <th scope="col" style={{ minWidth: '110px', textAlign: 'center' }}>Archive Link</th>
              </tr>
            </thead>
            <tbody>
              {KEY_DATA_SOURCES.map((src) => (
                <tr key={src.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{src.name}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {src.organization}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {src.purpose}
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.775rem', color: 'var(--accent-teal)' }}>
                    {src.product}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--subtle btn--small"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      title={`Open official archive for ${src.name}`}
                    >
                      Source Archive ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* B. Data Used in Site Evaluation */}
      <section className="panel" aria-labelledby="categories-heading" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-tag">EVALUATION CRITERIA</span>
          <h2 id="categories-heading" className="panel-title">Data Categories Used in Site Evaluation</h2>
          <p className="panel-subtitle">
            Physical topography, solar illumination, resource indicators, and operational parameters utilized by LunarNavi's feasibility filter and TOPSIS ranking engine.
          </p>
        </div>

        <div className="table-responsive">
          <table className="comparison-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: '180px' }}>Data Category</th>
                <th scope="col" style={{ minWidth: '130px' }}>Metric / Unit</th>
                <th scope="col" style={{ minWidth: '160px' }}>Verification Status</th>
                <th scope="col" style={{ minWidth: '200px' }}>Primary Instrument / Baseline</th>
                <th scope="col" style={{ minWidth: '260px' }}>Role in Landing-Site Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {EVALUATION_DATA_CATEGORIES.map((item) => (
                <tr key={item.category}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.category}
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {item.unit}
                  </td>
                  <td>
                    <span className={`status-pill ${item.statusClass}`} style={{ fontSize: '0.675rem' }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {item.primarySource}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C. Data Quality & Verification Statuses */}
      <section className="panel" aria-labelledby="quality-heading">
        <div className="panel-header">
          <span className="panel-tag">DATA INTEGRITY CLASSIFICATION</span>
          <h2 id="quality-heading" className="panel-title">Data Quality & Verification Statuses</h2>
          <p className="panel-subtitle">
            Standardized classification distinguishing direct instrument soundings from derived physical models, indirect planetary estimates, and missing sensor coverage.
          </p>
        </div>

        <div className="topsis-steps-grid" style={{ marginTop: '0.85rem' }}>
          {QUALITY_STATUS_DEFINITIONS.map((def) => (
            <div key={def.status} className="topsis-step-card" style={{ gap: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`status-pill ${def.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                  {def.status}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {def.summary}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Example:</strong> {def.example}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>No-Fabrication Policy: </strong>
          Gaps in lunar coverage (such as steep radar grazing angles or epithermal neutron sensor shadows) are recorded as <strong>Unavailable (NULL)</strong> rather than filled with assumed values. Candidate sites with missing essential measurements cannot be judged safely feasible and are clearly flagged.
        </div>
      </section>
    </div>
  )
}
