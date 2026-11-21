import { StatusChip } from '../StatusChip'

interface AnalysisCardInfo {
  id: string
  title: string
  tag: string
  status: 'engine-ready' | 'planned'
  description: string
}

export function Analysis() {
  const analysisModules: AnalysisCardInfo[] = [
    {
      id: 'feasibility',
      title: 'Feasibility Filter',
      tag: 'STAGE 1 · CONSTRAINTS',
      status: 'engine-ready',
      description:
        'Filters candidate landing sites against essential and non-essential mission constraints to establish baseline eligibility.',
    },
    {
      id: 'topsis',
      title: 'Ranking (TOPSIS)',
      tag: 'STAGE 2 · MULTI-CRITERIA',
      status: 'planned',
      description:
        'Ranks eligible candidate sites by calculating geometric distance to the ideal and negative-ideal solution benchmarks.',
    },
    {
      id: 'monte-carlo',
      title: 'Robustness (Monte Carlo)',
      tag: 'STAGE 3 · SIMULATION',
      status: 'planned',
      description:
        'Simulates thousands of perturbed parameter variations to evaluate how stably a site holds its top ranking.',
    },
    {
      id: 'primary-backup',
      title: 'Primary and Backup Site',
      tag: 'STAGE 4 · SELECTION',
      status: 'planned',
      description:
        'Identifies the top-ranked primary landing site and pairs it with an independent, decorrelated backup site for mission resilience.',
    },
    {
      id: 'decision-flip',
      title: 'Decision Flip',
      tag: 'STAGE 5 · SENSITIVITY',
      status: 'planned',
      description:
        'Calculates the minimum shift in criteria weighting required to flip the top recommended landing site to an alternative.',
    },
    {
      id: 'data-uncertainty',
      title: 'Data Uncertainty',
      tag: 'STAGE 6 · DATA QUALITY',
      status: 'planned',
      description:
        'Conducts simplified sensitivity analysis to determine which criteria error bounds most strongly influence site viability.',
    },
    {
      id: 'pareto',
      title: 'Pareto Indicator',
      tag: 'STAGE 7 · OPTIMALITY',
      status: 'planned',
      description:
        'Identifies non-dominated candidate sites where no other site performs strictly better across all criteria simultaneously.',
    },
  ]

  return (
    <div className="view-container">
      <header className="view-header">
        <div className="section-tag">ANALYTIC PIPELINE</div>
        <h1 className="view-title">Analysis Methods</h1>
        <p className="view-description">
          LunarNavi structures landing site selection through an integrated multi-stage decision pipeline.
          Each analytic module is implemented and validated independently before integration into the dashboard.
        </p>
      </header>

      <div className="analysis-grid">
        {analysisModules.map((module) => (
          <article key={module.id} className="analysis-card">
            <div className="analysis-card__header">
              <span className="card-badge">{module.tag}</span>
              <StatusChip status={module.status} />
            </div>
            <h2 className="analysis-card__title">{module.title}</h2>
            <p className="analysis-card__text">{module.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
