import { useState, useId } from 'react'
import { CRITERION_IDS, CriterionId } from '../../engine/types'
import { CRITERION_DIRECTION } from '../../engine/criteria'
import { ConstraintDirection, MissionProfile } from '../../engine/mission'
import {
  CRITERION_DESCRIPTIONS,
  CRITERION_LABELS,
  CRITERION_UNITS,
  MISSION_TYPES,
  MissionTypeId,
  REGION_OPTIONS,
  RegionId,
} from '../missionTypes'
import {
  buildMissionProfile,
  defaultFormState,
  formatWeightShare,
  FormConstraint,
  MissionFormState,
  normalizeWeights,
  suggestedDirection,
} from '../missionForm'

interface MissionSetupProps {
  formState: MissionFormState
  onFormChange: (nextState: MissionFormState) => void
  onAnalyzeSuccess: (profile: MissionProfile) => void
}

export function MissionSetup({
  formState,
  onFormChange,
  onAnalyzeSuccess,
}: MissionSetupProps) {
  const [errors, setErrors] = useState<string[]>([])
  const errorBoxId = useId()

  // Calculate normalized shares for live display
  let normalizedShares: Record<CriterionId, number> | null = null
  let weightsError: string | null = null

  try {
    normalizedShares = normalizeWeights(formState.rawWeights)
  } catch (err: unknown) {
    weightsError = err instanceof Error ? err.message : String(err)
  }

  // Handlers for Mission Type
  const handleTypeSelect = (typeId: MissionTypeId) => {
    onFormChange({
      ...formState,
      missionType: typeId,
    })
  }

  // Handlers for Region
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormChange({
      ...formState,
      region: e.target.value as RegionId,
    })
  }

  // Handlers for Sliders
  const handleWeightChange = (cid: CriterionId, val: number) => {
    onFormChange({
      ...formState,
      rawWeights: {
        ...formState.rawWeights,
        [cid]: val,
      },
    })
  }

  const handleResetToEqual = () => {
    onFormChange({
      ...formState,
      rawWeights: {
        slope: 5,
        roughness: 5,
        illumination: 5,
        resource: 5,
        communication: 5,
        science: 5,
      },
    })
  }

  // Handlers for Constraints
  const handleAddConstraint = () => {
    const defaultCid: CriterionId = 'slope'
    const newConstraint: FormConstraint = {
      id: `constraint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      criterion: defaultCid,
      direction: suggestedDirection(defaultCid),
      passLimit: '',
      marginalLimit: '',
      essential: true,
      rationale: '',
    }
    onFormChange({
      ...formState,
      constraints: [...formState.constraints, newConstraint],
    })
  }

  const handleRemoveConstraint = (id: string) => {
    onFormChange({
      ...formState,
      constraints: formState.constraints.filter((c) => c.id !== id),
    })
  }

  const handleUpdateConstraint = (
    id: string,
    updates: Partial<Omit<FormConstraint, 'id'>>
  ) => {
    onFormChange({
      ...formState,
      constraints: formState.constraints.map((c) => {
        if (c.id !== id) return c
        const updated = { ...c, ...updates }
        // If criterion changed and direction wasn't explicitly changed, auto-suggest direction
        if (updates.criterion && !updates.direction) {
          updated.direction = suggestedDirection(updates.criterion)
        }
        return updated
      }),
    })
  }

  // Analyze Handler
  const handleAnalyze = () => {
    const result = buildMissionProfile(formState)
    if (!result.ok || !result.profile) {
      setErrors(result.errors)
      // Scroll to error box if possible
      const el = document.getElementById(errorBoxId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      return
    }

    setErrors([])
    onAnalyzeSuccess(result.profile)
  }

  // Reset All Handler
  const handleResetAll = () => {
    onFormChange(defaultFormState())
    setErrors([])
  }

  return (
    <div className="view-container">
      <header className="view-header">
        <div className="section-tag">MISSION-AWARE DECISION CONFIGURATION</div>
        <div className="title-row">
          <h1 className="view-title">Mission Setup</h1>
          <span className="status-chip status-chip--planned" role="status">
            <span className="status-chip__dot" aria-hidden="true" />
            <span className="status-chip__text">Planned</span>
          </span>
        </div>
        <p className="view-description">
          Configure mission type, target region, physical constraints, and evaluation criteria weights for lunar landing site evaluation.
        </p>
      </header>

      {/* SECTION A: Mission Type */}
      <section className="form-section panel" aria-labelledby="heading-mission-type">
        <div className="panel-header">
          <span className="panel-tag">SECTION A</span>
          <h2 id="heading-mission-type" className="panel-title">1. Mission Type</h2>
          <p className="panel-subtitle">
            Select the high-level mission objective to label your profile.
          </p>
        </div>

        <div className="notice-banner notice-banner--info" role="note">
          <span className="notice-icon" aria-hidden="true">ℹ</span>
          <span className="notice-text">
            <strong>Mission presets are not available yet.</strong> Priorities below start at a neutral equal setting. Set them yourself.
          </span>
        </div>

        <div className="mission-type-grid" role="radiogroup" aria-labelledby="heading-mission-type">
          {MISSION_TYPES.map((type) => {
            const isSelected = formState.missionType === type.id
            const inputId = `mission-type-${type.id}`
            return (
              <label
                key={type.id}
                htmlFor={inputId}
                className={`mission-type-card ${isSelected ? 'mission-type-card--selected' : ''}`}
              >
                <div className="mission-type-card__header">
                  <input
                    type="radio"
                    id={inputId}
                    name="mission-type"
                    value={type.id}
                    checked={isSelected}
                    onChange={() => handleTypeSelect(type.id)}
                    className="radio-control"
                  />
                  <span className="mission-type-card__title">{type.label}</span>
                </div>
                <p className="mission-type-card__desc">{type.description}</p>
              </label>
            )
          })}
        </div>
      </section>

      {/* SECTION B: Landing Region */}
      <section className="form-section panel" aria-labelledby="heading-region">
        <div className="panel-header">
          <span className="panel-tag">SECTION B</span>
          <h2 id="heading-region" className="panel-title">2. Landing Region</h2>
          <p className="panel-subtitle">
            Specify the lunar geographic target zone for candidate site evaluation.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="region-select" className="form-label">
            Target Lunar Region
          </label>
          <select
            id="region-select"
            className="form-select"
            value={formState.region}
            onChange={handleRegionChange}
          >
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} disabled={!opt.enabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="form-hint">
            <strong>Data coverage note:</strong> Current dataset coverage is strictly limited to candidate sites in the lunar south polar region (80°S – 90°S). Other regions will be unlocked as global datasets are integrated.
          </p>
        </div>
      </section>

      {/* SECTION C: Mission Priorities */}
      <section className="form-section panel" aria-labelledby="heading-priorities">
        <div className="panel-header panel-header--with-action">
          <div>
            <span className="panel-tag">SECTION C</span>
            <h2 id="heading-priorities" className="panel-title">3. Mission Priorities</h2>
            <p className="panel-subtitle">
              Adjust relative weights from 0 (ignored) to 10 (highest priority). Shares are normalized to sum to 100%.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--subtle"
            onClick={handleResetToEqual}
            aria-label="Reset all weights to equal value of 5"
          >
            Reset to equal
          </button>
        </div>

        {weightsError && (
          <div className="notice-banner notice-banner--error" role="alert">
            <span className="notice-icon" aria-hidden="true">⚠️</span>
            <span className="notice-text">
              <strong>Priority validation error:</strong> {weightsError}
            </span>
          </div>
        )}

        <div className="sliders-list">
          {CRITERION_IDS.map((cid) => {
            const rawVal = formState.rawWeights[cid] ?? 0
            const share = normalizedShares ? normalizedShares[cid] : 0
            const sharePercent = normalizedShares ? formatWeightShare(share) : '0.0%'
            const direction = CRITERION_DIRECTION[cid]
            const dirLabel = direction === 'cost' ? 'Lower is better (cost)' : 'Higher is better (benefit)'
            const sliderId = `slider-${cid}`

            return (
              <div key={cid} className="slider-row">
                <div className="slider-row__header">
                  <div className="slider-row__label-group">
                    <label htmlFor={sliderId} className="slider-row__label">
                      {CRITERION_LABELS[cid]}
                    </label>
                    <span className={`direction-badge direction-badge--${direction}`}>
                      {dirLabel}
                    </span>
                  </div>
                  <div className="slider-row__metrics">
                    <span className="metric-raw" title="Raw slider setting">
                      Setting: <strong>{rawVal}</strong> / 10
                    </span>
                    <span className="metric-share" title="Normalized share of decision weight">
                      Share: <strong>{sharePercent}</strong>
                    </span>
                  </div>
                </div>

                <div className="slider-row__controls">
                  <input
                    type="range"
                    id={sliderId}
                    min="0"
                    max="10"
                    step="1"
                    value={rawVal}
                    onChange={(e) => handleWeightChange(cid, Number(e.target.value))}
                    className="range-slider"
                    aria-describedby={`desc-${cid}`}
                  />
                  <div className="share-bar" aria-hidden="true">
                    <div
                      className="share-bar__fill"
                      style={{ width: `${Math.min(100, share * 100)}%` }}
                    />
                  </div>
                </div>

                <p id={`desc-${cid}`} className="slider-row__description">
                  {CRITERION_DESCRIPTIONS[cid]} ({CRITERION_UNITS[cid]})
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION D: Mission Constraints */}
      <section className="form-section panel" aria-labelledby="heading-constraints">
        <div className="panel-header panel-header--with-action">
          <div>
            <span className="panel-tag">SECTION D</span>
            <h2 id="heading-constraints" className="panel-title">4. Mission Constraints</h2>
            <p className="panel-subtitle">
              Define operational threshold boundaries. Sites failing essential limits are filtered out before ranking.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleAddConstraint}
          >
            + Add constraint
          </button>
        </div>

        {formState.constraints.length === 0 ? (
          <div className="empty-constraints-notice" role="status">
            <span className="notice-icon" aria-hidden="true">🛡️</span>
            <p className="empty-constraints-text">
              No constraints added. Without constraints, no site is excluded on requirements.
            </p>
          </div>
        ) : (
          <div className="constraints-list">
            {formState.constraints.map((c, index) => {
              const unit = CRITERION_UNITS[c.criterion]
              const passVal = c.passLimit.trim()
              const marginalVal = c.marginalLimit.trim()

              // Generate live rule explanation
              let liveExplanation = ''
              if (c.direction === 'max') {
                liveExplanation = `Rule: Pass if value ≤ ${passVal || '[pass]'}; Marginal if value ≤ ${marginalVal || '[marginal]'}; Fail if value > ${marginalVal || '[marginal]'}.`
              } else {
                liveExplanation = `Rule: Pass if value ≥ ${passVal || '[pass]'}; Marginal if value ≥ ${marginalVal || '[marginal]'}; Fail if value < ${marginalVal || '[marginal]'}.`
              }
              const essentialNote = c.essential
                ? 'Essential constraint: Failing this threshold disqualifies the candidate site from ranking.'
                : 'Non-essential constraint: Failure will be noted in trade-off reports but does not disqualify the site.'

              return (
                <article key={c.id} className="constraint-card" aria-label={`Constraint ${index + 1}`}>
                  <div className="constraint-card__header">
                    <div className="constraint-card__title-group">
                      <span className="constraint-card__badge">CONSTRAINT #{index + 1}</span>
                      <span className="constraint-card__criterion-name">
                        {CRITERION_LABELS[c.criterion]}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveConstraint(c.id)}
                      aria-label={`Remove constraint ${index + 1} for ${CRITERION_LABELS[c.criterion]}`}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="constraint-grid">
                    {/* Criterion selection */}
                    <div className="form-group">
                      <label htmlFor={`crit-select-${c.id}`} className="form-label">
                        Evaluation Criterion
                      </label>
                      <select
                        id={`crit-select-${c.id}`}
                        className="form-select"
                        value={c.criterion}
                        onChange={(e) =>
                          handleUpdateConstraint(c.id, {
                            criterion: e.target.value as CriterionId,
                          })
                        }
                      >
                        {CRITERION_IDS.map((cid) => (
                          <option key={cid} value={cid}>
                            {CRITERION_LABELS[cid]} ({CRITERION_UNITS[cid]})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Direction */}
                    <div className="form-group">
                      <label htmlFor={`dir-select-${c.id}`} className="form-label">
                        Limit Direction
                      </label>
                      <select
                        id={`dir-select-${c.id}`}
                        className="form-select"
                        value={c.direction}
                        onChange={(e) =>
                          handleUpdateConstraint(c.id, {
                            direction: e.target.value as ConstraintDirection,
                          })
                        }
                      >
                        <option value="max">Max (upper bound — value must stay at or below)</option>
                        <option value="min">Min (lower bound — value must stay at or above)</option>
                      </select>
                    </div>

                    {/* Pass Limit */}
                    <div className="form-group">
                      <label htmlFor={`pass-input-${c.id}`} className="form-label">
                        Pass Limit <span className="unit-tag">({unit})</span>
                      </label>
                      <input
                        type="number"
                        id={`pass-input-${c.id}`}
                        step="any"
                        className="form-input"
                        placeholder="e.g. 10"
                        value={c.passLimit}
                        onChange={(e) =>
                          handleUpdateConstraint(c.id, { passLimit: e.target.value })
                        }
                      />
                    </div>

                    {/* Marginal Limit */}
                    <div className="form-group">
                      <label htmlFor={`marg-input-${c.id}`} className="form-label">
                        Marginal Limit <span className="unit-tag">({unit})</span>
                      </label>
                      <input
                        type="number"
                        id={`marg-input-${c.id}`}
                        step="any"
                        className="form-input"
                        placeholder="e.g. 15"
                        value={c.marginalLimit}
                        onChange={(e) =>
                          handleUpdateConstraint(c.id, { marginalLimit: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Essential Checkbox */}
                  <div className="form-checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={c.essential}
                        onChange={(e) =>
                          handleUpdateConstraint(c.id, { essential: e.target.checked })
                        }
                        className="checkbox-control"
                      />
                      <span>
                        <strong>Essential constraint:</strong> Failing this limit disqualifies the candidate site immediately.
                      </span>
                    </label>
                  </div>

                  {/* Rationale Textarea */}
                  <div className="form-group">
                    <label htmlFor={`rationale-${c.id}`} className="form-label">
                      Why this limit? (your reason) <span className="required-mark">*</span>
                    </label>
                    <textarea
                      id={`rationale-${c.id}`}
                      className="form-textarea"
                      rows={2}
                      placeholder="Document the engineering or operational rationale for this threshold (required)..."
                      value={c.rationale}
                      onChange={(e) =>
                        handleUpdateConstraint(c.id, { rationale: e.target.value })
                      }
                    />
                  </div>

                  {/* Live Explanation */}
                  <div className="constraint-explanation" aria-live="polite">
                    <div className="explanation-line">
                      <span className="explanation-icon" aria-hidden="true">📐</span>
                      <span>{liveExplanation}</span>
                    </div>
                    <div className="explanation-line explanation-line--sub">
                      <span>{essentialNote}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION E: Error Box & Action Buttons */}
      <section className="form-actions-panel panel" aria-label="Form Submission">
        {errors.length > 0 && (
          <div
            id={errorBoxId}
            className="error-box"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <div className="error-box__header">
              <span className="error-box__icon" aria-hidden="true">⚠️</span>
              <strong className="error-box__title">
                Please resolve the following {errors.length} issue{errors.length > 1 ? 's' : ''} before analyzing:
              </strong>
            </div>
            <ul className="error-box__list">
              {errors.map((err, i) => (
                <li key={i} className="error-box__item">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions-row">
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={handleAnalyze}
          >
            Analyze Landing Sites
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleResetAll}
          >
            Reset all
          </button>
        </div>
      </section>
    </div>
  )
}
