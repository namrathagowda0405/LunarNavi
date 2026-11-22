import { isSupabaseConfigured } from '../../services'

type CoverageStatus = 'Verified / available' | 'Derived from source data' | 'Unavailable / insufficient'

interface ScientificDataSource {
  id: string
  name: string
  organization: string
  dataObtained: string
  status: CoverageStatus
  statusClass: string
  url: string
}

// Authoritative scientific sources genuinely used by LunarNavi
const DATA_SOURCES: ScientificDataSource[] = [
  {
    id: 'lola-elevation',
    name: 'Lunar Orbiter Laser Altimeter (LOLA)',
    organization: 'NASA Planetary Data System (PDS) / GSFC',
    dataObtained: 'Digital elevation models measuring surface topography and heights across the lunar south pole.',
    status: 'Verified / available',
    statusClass: 'status-pill--verified',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  },
  {
    id: 'pgda-prod-90',
    name: 'LOLA 50m Slope & Roughness (PGDA Product 90)',
    organization: 'NASA Planetary Geodynamics Data Archive / GSFC',
    dataObtained: 'Multi-scale slope gradients and RMS roughness at 50-meter baseline for touchdown hazard assessment.',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    url: 'https://pgda.gsfc.nasa.gov/products/90',
  },
  {
    id: 'pgda-prod-69',
    name: 'Polar Illumination & Earth Visibility (PGDA Product 69)',
    organization: 'NASA Planetary Geodynamics Data Archive / GSFC',
    dataObtained: 'Cumulative solar illumination percentages and direct line-of-sight Earth communication visibility over an 18.6-year cycle.',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    url: 'https://pgda.gsfc.nasa.gov/products/69',
  },
  {
    id: 'lro-lend-lcross',
    name: 'Lunar Exploration Neutron Detector (LEND) & LCROSS',
    organization: 'NASA PDS Geosciences / LCROSS',
    dataObtained: 'Epithermal neutron suppression maps and impact spectrometer data indicating hydrogen volatiles and water-ice potential.',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lend.htm',
  },
  {
    id: 'lro-diviner',
    name: 'Diviner Lunar Radiometer Experiment',
    organization: 'NASA / UCLA',
    dataObtained: 'Polar surface thermal measurements and cold-trap boundaries identifying permanently shadowed regions (PSRs).',
    status: 'Derived from source data',
    statusClass: 'status-pill--derived',
    url: 'https://diviner.ucla.edu/',
  },
  {
    id: 'artemis-sdt-report',
    name: 'NASA Artemis III Science Definition Team Report',
    organization: 'NASA Science Mission Directorate',
    dataObtained: 'Official Artemis candidate regional boundaries and planetary decadal science return priorities.',
    status: 'Verified / available',
    statusClass: 'status-pill--verified',
    url: 'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
  },
]

export function DataAndSources() {
  const isCloudConnected = isSupabaseConfigured()

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div className="section-tag">SCIENTIFIC PROVENANCE</div>
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
          LunarNavi uses lunar scientific datasets to evaluate candidate landing sites.
        </p>
      </header>

      {/* Main Panel: Sources & Coverage Status */}
      <section className="panel" aria-labelledby="sources-heading">
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <span className="panel-tag">AUTHORITATIVE DATASETS</span>
          <h2 id="sources-heading" className="panel-title">Scientific Data Sources</h2>
        </div>

        {/* Coverage Status Indication */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
          }}
        >
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Data Coverage Status:
          </span>
          <span className="status-pill status-pill--verified">Verified / available</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Direct orbital soundings</span>
          <span style={{ color: 'var(--border-subtle)' }}>•</span>
          <span className="status-pill status-pill--derived">Derived from source data</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Physical & ray-tracing models</span>
          <span style={{ color: 'var(--border-subtle)' }}>•</span>
          <span className="status-pill status-pill--unavailable">Unavailable / insufficient</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sensor shadow gaps (unassessed)</span>
        </div>

        {/* Clean, Scannable Sources Table */}
        <div className="table-responsive">
          <table className="comparison-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: '220px' }}>Dataset / Source</th>
                <th scope="col" style={{ minWidth: '300px' }}>Data Obtained</th>
                <th scope="col" style={{ minWidth: '150px' }}>Coverage Status</th>
                <th scope="col" style={{ minWidth: '120px', textAlign: 'center' }}>Original Source</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((src) => (
                <tr key={src.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                      {src.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {src.organization}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {src.dataObtained}
                  </td>
                  <td>
                    <span className={`status-pill ${src.statusClass}`}>
                      {src.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--subtle btn--small"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                      title={`Open official archive for ${src.name}`}
                    >
                      Archive Link ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
