import { CRITERION_IDS } from '../../engine/types'
import { CRITERION_DIRECTION } from '../../engine/criteria'
import { MissionProfile } from '../../engine/mission'
import { MODULES } from '../moduleStatus'
import { StatusChip } from '../StatusChip'
import {
  CRITERION_LABELS,
  CRITERION_UNITS,
  MISSION_TYPES,
  REGION_OPTIONS,
} from '../missionTypes'
import { formatWeightShare, MissionFormState } from '../missionForm'

interface ResultsProps {
  formState: MissionFormState
  configuredMission: MissionProfile | null
  onEditMission: () => void
}

export function Results({
  formState,
  configuredMission,
  onEditMission,
}: ResultsProps) {
  // If no mission has been configured/analyzed yet:
  if (!configuredMission) {
    return (
      <div className="view-container">
        <header className="view-header">
          <div className="section-tag">MULTI-CRITERIA EVALUATION</div>
          <div className="title-row">
            <h1 className="view-title">Results & Ranking</h1>
            <span className="status-chip status-chip--engine-ready" role="status">
              <span className="status-chip__dot" aria-hidden="true" />
              <span className="status-chip__text">Engine Development</span>
            </span>
          </div>
          <p className="view-description">
            Mission-specific site rankings will be generated using the evaluation engine (TOPSIS ranking and feasibility filtering) when the candidate dataset and pipeline are ready.
          </p>
        </header>

        <section className="panel empty-state-panel" aria-label="No Mission Configured">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              ⚙️
            </div>
            <h2 className="empty-state-title">No mission configuration submitted yet.</h2>
            <p className="empty-state-text">
              Configure your operational priorities and limits in Mission Setup, then click "Analyze Landing Sites" to review your profile.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={onEditMission}
              style={{ marginTop: '1.25rem' }}
            >
              Go to Mission Setup
            </button>
          </div>
        </section>
      </div>
    )
  }

  const typeOpt = MISSION_TYPES.find((t) => t.id === formState.missionType)
  const regionOpt = REGION_OPTIONS.find((r) => r.id === formState.region)

  return (
    <div className="view-container">
      {/* Header */}
      <header className="view-header">
        <div className="section-tag">MISSION PROFILE COMPILED</div>
        <div className="title-row">
          <h1 className="view-title">Mission Configuration Ready</h1>
          <span className="status-badge-ready" role="status">
            <span className="status-badge-dot" aria-hidden="true" />
            Configured & Validated
          </span>
        </div>
        <p className="view-description">
          Your mission profile has passed all engineering schema rules and validation checks.
          It is staged in application state and ready for multi-criteria trade studies.
        </p>
      </header>

      {/* Honest Limitation Callout */}
      <section className="notice-banner notice-banner--warning" role="alert">
        <span className="notice-icon" aria-hidden="true">🔒</span>
        <div className="notice-content">
          <strong className="notice-title">Analysis cannot run until the candidate dataset is loaded.</strong>
          <p className="notice-text">
            The decision engine (TOPSIS ranking, feasibility filtering, and Monte Carlo simulation) is built and verified.
            However, candidate landing site data for the lunar south pole is currently being curated. No fake rankings or simulated site scores are shown.
          </p>
        </div>
      </section>

      {/* Action Row */}
      <div className="results-action-row">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onEditMission}
        >
          ← Edit mission
        </button>
      </div>

      {/* Mission Specifications Summary */}
      <div className="results-grid">
        {/* Panel 1: Overview */}
        <section className="panel" aria-labelledby="heading-summary-overview">
          <div className="panel-header">
            <span className="panel-tag">MISSION PARAMETERS</span>
            <h2 id="heading-summary-overview" className="panel-title">Operational Context</h2>
          </div>

          <dl className="summary-dl">
            <div className="summary-item">
              <dt className="summary-term">Mission Type</dt>
              <dd className="summary-val">{typeOpt?.label ?? formState.missionType}</dd>
              <dd className="summary-sub">{typeOpt?.description}</dd>
            </div>

            <div className="summary-item">
              <dt className="summary-term">Target Region</dt>
              <dd className="summary-val">{regionOpt?.label ?? formState.region}</dd>
              <dd className="summary-sub">Restricted to polar region with active orbiter data</dd>
            </div>

            <div className="summary-item">
              <dt className="summary-term">Profile Identifier</dt>
              <dd className="summary-val font-mono">{configuredMission.id}</dd>
            </div>
          </dl>
        </section>

        {/* Panel 2: Priority Weights */}
        <section className="panel" aria-labelledby="heading-summary-weights">
          <div className="panel-header">
            <span className="panel-tag">DECISION WEIGHTS</span>
            <h2 id="heading-summary-weights" className="panel-title">Normalized Priorities</h2>
            <p className="panel-subtitle">
              Relative weighting applied during TOPSIS geometric distance calculation (sums to 100%).
            </p>
          </div>

          <div className="weights-summary-list">
            {CRITERION_IDS.map((cid) => {
              const weight = configuredMission.weights[cid] ?? 0
              const percent = formatWeightShare(weight)
              const direction = CRITERION_DIRECTION[cid]

              return (
                <div key={cid} className="weight-summary-row">
                  <div className="weight-summary-info">
                    <span className="weight-summary-label">{CRITERION_LABELS[cid]}</span>
                    <span className="weight-summary-sub">
                      {direction === 'cost' ? 'Cost (lower is better)' : 'Benefit (higher is better)'}
                    </span>
                  </div>
                  <div className="weight-summary-bar-wrapper">
                    <div className="share-bar" aria-hidden="true">
                      <div
                        className="share-bar__fill"
                        style={{ width: `${Math.min(100, weight * 100)}%` }}
                      />
                    </div>
                    <span className="weight-summary-percent font-mono">{percent}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Panel 3: Constraints */}
      <section className="panel" aria-labelledby="heading-summary-constraints">
        <div className="panel-header">
          <span className="panel-tag">FEASIBILITY FILTER</span>
          <h2 id="heading-summary-constraints" className="panel-title">Configured Limits & Constraints</h2>
          <p className="panel-subtitle">
            Thresholds candidate sites must meet to qualify for ranking.
          </p>
        </div>

        {configuredMission.constraints.length === 0 ? (
          <div className="empty-constraints-notice" role="status">
            <p className="empty-constraints-text">
              No constraints specified. All candidate landing sites will be considered eligible and ranked purely on multi-criteria scores.
            </p>
          </div>
        ) : (
          <div className="constraints-table-wrapper">
            <table className="constraints-table" aria-label="Configured Mission Constraints">
              <thead>
                <tr>
                  <th scope="col">Criterion</th>
                  <th scope="col">Type</th>
                  <th scope="col">Pass Limit</th>
                  <th scope="col">Marginal Limit</th>
                  <th scope="col">Essential</th>
                  <th scope="col">Engineering Rationale</th>
                </tr>
              </thead>
              <tbody>
                {configuredMission.constraints.map((c, i) => {
                  const unit = CRITERION_UNITS[c.criterion]
                  return (
                    <tr key={i}>
                      <td>
                        <strong>{CRITERION_LABELS[c.criterion]}</strong>
                      </td>
                      <td>
                        <span className="direction-tag font-mono">
                          {c.direction === 'max' ? 'MAX (≤)' : 'MIN (≥)'}
                        </span>
                      </td>
                      <td className="font-mono">
                        {c.passLimit} <span className="unit-muted">{unit}</span>
                      </td>
                      <td className="font-mono">
                        {c.marginalLimit} <span className="unit-muted">{unit}</span>
                      </td>
                      <td>
                        {c.essential ? (
                          <span className="badge-essential">DISQUALIFYING</span>
                        ) : (
                          <span className="badge-advisory">ADVISORY</span>
                        )}
                      </td>
                      <td className="rationale-cell">{c.rationale}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Panel 4: Honest Readiness Checklist */}
      <section className="panel" aria-labelledby="heading-readiness">
        <div className="panel-header">
          <span className="panel-tag">INTEGRATION STATUS</span>
          <h2 id="heading-readiness" className="panel-title">Analytic Pipeline Readiness</h2>
          <p className="panel-subtitle">
            Status of the downstream analytical pipeline modules required to compute landing recommendations.
          </p>
        </div>

        <ul className="pipeline-readiness-list">
          <li className="readiness-item readiness-item--ready">
            <div className="readiness-status">
              <span className="readiness-check" aria-hidden="true">✓</span>
            </div>
            <div className="readiness-content">
              <div className="readiness-title-row">
                <span className="readiness-name">Mission Setup & Validation</span>
                <span className="badge-ready">READY</span>
              </div>
              <p className="readiness-desc">
                Mission weights, operational limits, and engineering constraints are configured and validated.
              </p>
            </div>
          </li>

          {MODULES.filter((m) =>
            ['site-dataset', 'feasibility', 'topsis', 'monte-carlo', 'map'].includes(m.id)
          ).map((m) => (
            <li key={m.id} className="readiness-item">
              <div className="readiness-status">
                <span className="readiness-clock" aria-hidden="true">⏳</span>
              </div>
              <div className="readiness-content">
                <div className="readiness-title-row">
                  <span className="readiness-name">{m.name}</span>
                  <StatusChip status={m.status} />
                </div>
                <p className="readiness-desc">{m.description}</p>
                <div className="readiness-detail">
                  <span className="detail-tag">Status detail:</span> {m.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
