import { useState, useId } from 'react'
import { CRITERION_IDS, CriterionId } from '../../engine/types'
import { CRITERION_DIRECTION } from '../../engine/criteria'
import { MissionProfile } from '../../engine/mission'
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
  getDefaultConstraintsForMission,
  getMissionPresetState,
  MISSION_WEIGHT_RATIONALE,
  MissionFormState,
  normalizeWeights,
  suggestedDirection,
  DEFAULT_MISSION_DURATIONS,
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

  const typeOpt = MISSION_TYPES.find((t) => t.id === formState.missionType)
  const currentRationale = MISSION_WEIGHT_RATIONALE[formState.missionType]

  // Calculate normalized shares for live display in advanced settings
  let normalizedShares: Record<CriterionId, number> | null = null
  let weightsError: string | null = null

  try {
    normalizedShares = normalizeWeights(formState.rawWeights)
  } catch (err: unknown) {
    weightsError = err instanceof Error ? err.message : String(err)
  }

  // Handlers for Mission Type
  const handleLoadDefaults = (typeId?: MissionTypeId) => {
    const targetType = typeId ?? formState.missionType
    const preset = getMissionPresetState(targetType, {
      arrivalDate: formState.arrivalDate,
      arrivalWindowDays: formState.arrivalWindowDays,
    })
    onFormChange({
      ...formState,
      missionType: targetType,
      durationDays: preset.durationDays,
      rawWeights: preset.rawWeights,
      constraints: preset.constraints,
    })
    setErrors([])
  }

  const handleTypeSelect = (typeId: MissionTypeId) => {
    handleLoadDefaults(typeId)
  }

  // Handlers for Schedule & Duration
  const handleArrivalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange({
      ...formState,
      arrivalDate: e.target.value,
    })
  }

  const handleArrivalWindowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormChange({
      ...formState,
      arrivalWindowDays: Number(e.target.value),
    })
  }

  const handleDurationChange = (days: number) => {
    onFormChange({
      ...formState,
      durationDays: days,
    })
  }

  // Handlers for Region
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormChange({
      ...formState,
      region: e.target.value as RegionId,
    })
  }

  // Handlers for Advanced Sliders
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

  // Handlers for Advanced Constraints
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

  const currentDuration = formState.durationDays ?? DEFAULT_MISSION_DURATIONS[formState.missionType] ?? 14
  const currentArrival = formState.arrivalDate ?? '2027-06-01'
  const currentWindow = formState.arrivalWindowDays ?? 7

  return (
    <div className="view-container">
      {/* View Header */}
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
          Define mission purpose, planned arrival date, and surface duration. Engineering priorities and safety constraints are mapped automatically.
        </p>
      </header>

      {/* SECTION 1: Mission Purpose (Required) */}
      <section className="form-section panel" aria-labelledby="heading-mission-type">
        <div className="panel-header">
          <span className="panel-tag">REQUIRED INPUT 1</span>
          <h2 id="heading-mission-type" className="panel-title">1. Mission Purpose</h2>
          <p className="panel-subtitle">
            Select your high-level mission objective. Each purpose automatically applies NASA-defensible criteria weights and safety limits.
          </p>
        </div>

        <div className="mission-type-grid" role="radiogroup" aria-labelledby="heading-mission-type">
          {MISSION_TYPES.map((type) => {
            const isSelected = formState.missionType === type.id
            const inputId = `mission-type-${type.id}`
            return (
              <div
                key={type.id}
                className={`mission-type-card ${isSelected ? 'mission-type-card--selected' : ''}`}
                onClick={() => handleTypeSelect(type.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleTypeSelect(type.id)
                  }
                }}
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
                  <label htmlFor={inputId} className="mission-type-card__title" style={{ cursor: 'pointer' }}>
                    {type.label}
                  </label>
                </div>
                <p className="mission-type-card__desc">{type.description}</p>
                {isSelected && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-teal)' }}>
                    ✓ Active Profile Loaded
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION 2: Mission Schedule & Duration (Required) */}
      <section className="form-section panel" aria-labelledby="heading-schedule">
        <div className="panel-header">
          <span className="panel-tag">REQUIRED INPUT 2 & 3</span>
          <h2 id="heading-schedule" className="panel-title">2. Arrival Schedule & Surface Duration</h2>
          <p className="panel-subtitle">
            Specify the operational timeline for lunar landing and surface operations.
          </p>
        </div>

        <div className="mission-schedule-grid">
          {/* Planned Arrival Date */}
          <div className="form-group">
            <label htmlFor="arrival-date-input" className="form-label">
              Expected Lunar Arrival Date <span className="required-mark">*</span>
            </label>
            <input
              type="date"
              id="arrival-date-input"
              className="form-input font-mono"
              min="2025-01-01"
              max="2035-12-31"
              value={currentArrival}
              onChange={handleArrivalDateChange}
              required
            />
            <p className="form-hint">
              Target arrival calendar date for mission launch and transit planning.
            </p>
          </div>

          {/* Arrival Window */}
          <div className="form-group">
            <label htmlFor="arrival-window-select" className="form-label">
              Arrival Window Flexibility
            </label>
            <select
              id="arrival-window-select"
              className="form-select font-mono"
              value={currentWindow}
              onChange={handleArrivalWindowChange}
            >
              <option value="0">Exact Target Date (±0 days)</option>
              <option value="6">Standard Orbital Window (±3 days)</option>
              <option value="14">Extended Launch Period (±7 days)</option>
              <option value="30">Seasonal Launch Window (±15 days)</option>
            </select>
            <p className="form-hint">
              Accounts for launch vehicle slips and lunar orbital transfer windows.
            </p>
          </div>

          {/* Surface Mission Duration */}
          <div className="form-group">
            <label htmlFor="duration-input" className="form-label">
              Surface Mission Stay <span className="required-mark">*</span> <span className="unit-tag">(Earth days)</span>
            </label>
            <input
              type="number"
              id="duration-input"
              className="form-input font-mono"
              min="1"
              max="730"
              value={currentDuration}
              onChange={(e) => handleDurationChange(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
            <div className="duration-presets" role="group" aria-label="Quick duration presets">
              <button
                type="button"
                className={`duration-chip ${currentDuration === 14 ? 'duration-chip--active' : ''}`}
                onClick={() => handleDurationChange(14)}
              >
                14d (1 Lunar Day)
              </button>
              <button
                type="button"
                className={`duration-chip ${currentDuration === 30 ? 'duration-chip--active' : ''}`}
                onClick={() => handleDurationChange(30)}
              >
                30d (1 Month)
              </button>
              <button
                type="button"
                className={`duration-chip ${currentDuration === 90 ? 'duration-chip--active' : ''}`}
                onClick={() => handleDurationChange(90)}
              >
                90d (Quarter)
              </button>
              <button
                type="button"
                className={`duration-chip ${currentDuration === 180 ? 'duration-chip--active' : ''}`}
                onClick={() => handleDurationChange(180)}
              >
                180d (Outpost)
              </button>
            </div>
            <p className="form-hint">
              Surface stay duration evaluates candidate site power and thermal viability.
            </p>
          </div>
        </div>

        {/* Scientific Modeling & Ephemeris Disclosure */}
        <div className="notice-banner notice-banner--info" role="note" style={{ marginTop: '1.25rem' }}>
          <span className="notice-icon" aria-hidden="true">🛰️</span>
          <div className="notice-content">
            <strong>Scientific Modeling & Ephemeris Limitation Disclosure</strong>
            <p style={{ margin: '0.25rem 0 0.25rem 0', fontSize: '0.85rem', lineHeight: '1.45' }}>
              • <strong>Duration Operational Gating</strong>: Missions exceeding 14 Earth days span past the lunar daytime window (~14.77 days) and require sustained high annual illumination to avoid cryogenic power failure during lunar darkness.<br />
              • <strong>Dataset Boundary</strong>: Evaluated illumination and Earth visibility metrics are derived from NASA PGDA Product 69 (18.6-year multi-year precession cycle simulation). Instantaneous hour-by-hour calendar date shadow casting requires SPICE orbit kernels not bundled in the client.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: Target Geographic Region */}
      <section className="form-section panel" aria-labelledby="heading-region">
        <div className="panel-header">
          <span className="panel-tag">REQUIRED INPUT 4</span>
          <h2 id="heading-region" className="panel-title">3. Target Lunar Region</h2>
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
            <strong>Data coverage note:</strong> Verified high-resolution dataset coverage is strictly active for candidate sites in the lunar south polar region (80°S – 90°S).
          </p>
        </div>
      </section>

      {/* SECTION 4: Error Box & Primary Action Buttons */}
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
            Reset to Defaults
          </button>
        </div>
      </section>

      {/* OPTIONAL ADVANCED SETTINGS (Collapsed Accordion) */}
      <details className="advanced-accordion">
        <summary>
          <span>⚙️ Advanced Engineering Settings & Criteria Overrides (Optional)</span>
          <span className="advanced-accordion__badge">Weights & Constraints</span>
        </summary>
        <div className="advanced-accordion-content">
          <div className="notice-banner notice-banner--info" role="note">
            <span className="notice-icon" aria-hidden="true">💡</span>
            <div className="notice-content">
              <strong>Technical Overrides Note</strong>
              <p style={{ margin: '0.2rem 0', fontSize: '0.825rem' }}>
                Weights and safety limits are pre-configured based on NASA Artemis and lunar surface studies. Manual modification is optional for sensitivity analysis.
              </p>
            </div>
          </div>

          {/* Advanced Priorities / Weights */}
          <div className="panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="panel-header panel-header--with-action">
              <div>
                <h3 className="panel-title" style={{ fontSize: '1rem' }}>Criteria Weights & Importance</h3>
                <p className="panel-subtitle">
                  Adjust relative weights from 0 (ignored) to 10 (highest priority). Shares normalize to 100%.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => handleLoadDefaults(formState.missionType)}
                >
                  Reset to {typeOpt?.label} Defaults
                </button>
                <button
                  type="button"
                  className="btn btn--subtle btn--small"
                  onClick={handleResetToEqual}
                >
                  Reset to Equal (5/10)
                </button>
              </div>
            </div>

            {currentRationale && (
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <strong>Documented default:</strong> {currentRationale.rationale}
              </p>
            )}

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
                        <span className="metric-raw">
                          Setting: <strong>{rawVal}</strong> / 10
                        </span>
                        <span className="metric-share">
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
                      />
                      <div className="share-bar" aria-hidden="true">
                        <div
                          className="share-bar__fill"
                          style={{ width: `${Math.min(100, share * 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="slider-row__description">
                      {CRITERION_DESCRIPTIONS[cid]} ({CRITERION_UNITS[cid]})
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Advanced Constraints */}
          <div className="panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="panel-header panel-header--with-action">
              <div>
                <h3 className="panel-title" style={{ fontSize: '1rem' }}>Physical Constraint Thresholds</h3>
                <p className="panel-subtitle">
                  Define engineering limits. Sites failing essential limits are filtered out before TOPSIS ranking.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={handleAddConstraint}
              >
                + Add constraint
              </button>
            </div>

            {formState.constraints.length === 0 ? (
              <div className="empty-constraints-notice" role="status">
                <span className="notice-icon" aria-hidden="true">🛡️</span>
                <div>
                  <p className="empty-constraints-text">
                    No constraints active. All sites will be ranked without feasibility filtering.
                  </p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    style={{ marginTop: '0.5rem' }}
                    onClick={() =>
                      onFormChange({
                        ...formState,
                        constraints: getDefaultConstraintsForMission(formState.missionType),
                      })
                    }
                  >
                    + Load Recommended {typeOpt?.label} Constraints
                  </button>
                </div>
              </div>
            ) : (
              <div className="constraints-list">
                {formState.constraints.map((c, index) => {
                  const unit = CRITERION_UNITS[c.criterion]
                  const passVal = c.passLimit.trim()
                  const margVal = c.marginalLimit.trim()
                  const isMax = c.direction === 'max'

                  let liveExplanation = ''
                  if (passVal !== '' && margVal !== '') {
                    if (isMax) {
                      liveExplanation = `≤ ${passVal} ${unit} is PASS; ${passVal}–${margVal} ${unit} is MARGINAL; > ${margVal} ${unit} is FAIL.`
                    } else {
                      liveExplanation = `≥ ${passVal} ${unit} is PASS; ${margVal}–${passVal} ${unit} is MARGINAL; < ${margVal} ${unit} is FAIL.`
                    }
                  } else {
                    liveExplanation = 'Enter both limits to see evaluation thresholds.'
                  }

                  return (
                    <article key={c.id} className="constraint-card">
                      <div className="constraint-card__header">
                        <span className="constraint-card__index">Constraint #{index + 1}</span>
                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          onClick={() => handleRemoveConstraint(c.id)}
                          aria-label={`Remove constraint #${index + 1}`}
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div className="constraint-grid">
                        <div className="form-group">
                          <label htmlFor={`crit-${c.id}`} className="form-label">
                            Criterion
                          </label>
                          <select
                            id={`crit-${c.id}`}
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

                        <div className="form-group">
                          <label htmlFor={`dir-${c.id}`} className="form-label">
                            Direction
                          </label>
                          <select
                            id={`dir-${c.id}`}
                            className="form-select"
                            value={c.direction}
                            onChange={(e) =>
                              handleUpdateConstraint(c.id, {
                                direction: e.target.value as 'max' | 'min',
                              })
                            }
                          >
                            <option value="max">Maximum limit (upper bound)</option>
                            <option value="min">Minimum limit (lower bound)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor={`pass-${c.id}`} className="form-label">
                            Pass limit <span className="unit-tag">({unit})</span>
                          </label>
                          <input
                            type="number"
                            id={`pass-${c.id}`}
                            className="form-input font-mono"
                            step="any"
                            value={c.passLimit}
                            onChange={(e) =>
                              handleUpdateConstraint(c.id, { passLimit: e.target.value })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`marg-${c.id}`} className="form-label">
                            Marginal limit <span className="unit-tag">({unit})</span>
                          </label>
                          <input
                            type="number"
                            id={`marg-${c.id}`}
                            className="form-input font-mono"
                            step="any"
                            value={c.marginalLimit}
                            onChange={(e) =>
                              handleUpdateConstraint(c.id, { marginalLimit: e.target.value })
                            }
                          />
                        </div>
                      </div>

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
                            <strong>Essential constraint:</strong> Candidate sites exceeding marginal limit are eliminated.
                          </span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label htmlFor={`rationale-${c.id}`} className="form-label">
                          Operational Rationale
                        </label>
                        <input
                          type="text"
                          id={`rationale-${c.id}`}
                          className="form-input"
                          value={c.rationale}
                          onChange={(e) =>
                            handleUpdateConstraint(c.id, { rationale: e.target.value })
                          }
                          placeholder="Document why this threshold is set..."
                        />
                      </div>

                      <div className="constraint-explanation">
                        <span className="explanation-icon" aria-hidden="true">📐</span>
                        <span>{liveExplanation}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}
