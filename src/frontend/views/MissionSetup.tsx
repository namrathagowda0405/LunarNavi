import { useState, useId } from 'react'
import { MissionProfile } from '../../engine/mission'
import {
  CRITERION_LABELS,
  CRITERION_UNITS,
  MISSION_TYPES,
  MissionTypeId,
} from '../missionTypes'
import {
  buildMissionProfile,
  getMissionPresetState,
  MISSION_WEIGHT_RATIONALE,
  MissionFormState,
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

  // Handlers for Mission Type
  const handleTypeSelect = (typeId: MissionTypeId) => {
    const preset = getMissionPresetState(typeId, {
      arrivalDate: formState.arrivalDate,
      arrivalWindowDays: formState.arrivalWindowDays,
    })
    onFormChange({
      ...formState,
      missionType: typeId,
      durationDays: preset.durationDays,
      rawWeights: preset.rawWeights,
      constraints: preset.constraints,
    })
    setErrors([])
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
    onFormChange(getMissionPresetState('science'))
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
          Define mission purpose, planned arrival date, and surface duration. Predefined engineering criteria,
          weights, and safety thresholds are applied automatically for decision-support evaluation.
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
                    ✓ Predefined Profile Active
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Applied Engineering Weights & Physical Constraints (Predefined & Defensible) */}
        <div
          className="active-preset-summary"
          style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-panel-elevated)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span className="section-tag" style={{ margin: 0 }}>
              APPLIED NASA-DEFENSIBLE STANDARDS
            </span>
            <span
              className="status-pill status-pill--pass font-mono"
              style={{ fontSize: '0.75rem' }}
            >
              ✓ Predefined Mission Logic Loaded
            </span>
          </div>

          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 0.4rem 0',
            }}
          >
            {currentRationale?.title ?? `${typeOpt?.label} Profile`}
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              margin: '0 0 1rem 0',
            }}
          >
            {currentRationale?.rationale}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Criteria Weight Allocation */}
            <div
              style={{
                background: 'var(--bg-panel)',
                padding: '0.875rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--accent-teal)',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                }}
              >
                CRITERIA WEIGHT ALLOCATION (TOPSIS)
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: '1.45',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {currentRationale?.weightsSummary}
              </p>
            </div>

            {/* Constraints Summary */}
            <div
              style={{
                background: 'var(--bg-panel)',
                padding: '0.875rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--accent-teal)',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                }}
              >
                ESSENTIAL SAFETY LIMITS (FEASIBILITY)
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.2rem',
                  fontSize: '0.825rem',
                  color: 'var(--text-primary)',
                  lineHeight: '1.45',
                }}
              >
                {formState.constraints
                  .filter((c) => c.essential)
                  .map((c) => (
                    <li key={c.id}>
                      <strong>{CRITERION_LABELS[c.criterion]}</strong>:{' '}
                      {c.direction === 'max' ? `≤ ${c.passLimit}` : `≥ ${c.passLimit}`}{' '}
                      {CRITERION_UNITS[c.criterion]}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {' '}
                        (marginal: {c.marginalLimit})
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
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

          {/* Arrival Window Flexibility */}
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

      {/* Target Geographic Scope Badge */}
      <section className="form-section panel" style={{ padding: '1rem 1.25rem' }} aria-label="Target Geographic Scope">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span className="section-tag" style={{ marginBottom: '0.2rem' }}>TARGET REGION COVERAGE</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Lunar South Polar Region (80°S – 90°S)
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Evaluation is locked to the high-resolution NASA PDS, LOLA, and Diviner scientific coverage zone.
            </p>
          </div>
          <span className="status-pill status-pill--pass font-mono" style={{ fontSize: '0.75rem' }}>
            NASA PDS High-Res Grid Active
          </span>
        </div>
      </section>

      {/* SECTION 3: Error Box & Primary Action Buttons */}
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
    </div>
  )
}
