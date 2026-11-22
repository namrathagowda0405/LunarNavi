import { useState, useId, useRef } from 'react'
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
  const launchInputRef = useRef<HTMLInputElement>(null)
  const arrivalInputRef = useRef<HTMLInputElement>(null)

  const typeOpt = MISSION_TYPES.find((t) => t.id === formState.missionType)
  const currentRationale = MISSION_WEIGHT_RATIONALE[formState.missionType]

  // Handlers for Mission Type
  const handleTypeSelect = (typeId: string) => {
    const opt = MISSION_TYPES.find((t) => t.id === typeId)
    if (!opt || !opt.enabled) return
    const validId = typeId as MissionTypeId
    const preset = getMissionPresetState(validId, {
      launchDate: formState.launchDate,
      arrivalDate: formState.arrivalDate,
      arrivalWindowDays: formState.arrivalWindowDays,
    })
    onFormChange({
      ...formState,
      missionType: validId,
      durationDays: preset.durationDays,
      rawWeights: preset.rawWeights,
      constraints: preset.constraints,
    })
    setErrors([])
  }

  // Handlers for Schedule & Duration
  const handleLaunchDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange({
      ...formState,
      launchDate: e.target.value,
    })
  }

  const handleArrivalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange({
      ...formState,
      arrivalDate: e.target.value,
    })
  }

  const handleClearLaunchDate = () => {
    onFormChange({
      ...formState,
      launchDate: '',
    })
    launchInputRef.current?.focus()
  }

  const handleClearArrivalDate = () => {
    onFormChange({
      ...formState,
      arrivalDate: '',
    })
    arrivalInputRef.current?.focus()
  }

  const handleDurationChange = (days: number) => {
    onFormChange({
      ...formState,
      durationDays: days,
    })
  }

  // Analyze Handler
  const handleAnalyze = () => {
    const validationErrors: string[] = []
    if (!formState.launchDate || !formState.launchDate.trim()) {
      validationErrors.push('Planned launch/departure date is required before analyzing landing sites.')
    }
    if (!formState.arrivalDate || !formState.arrivalDate.trim()) {
      validationErrors.push('Estimated lunar arrival date is required before analyzing landing sites.')
    }
    if (formState.launchDate && formState.arrivalDate) {
      const pLaunch = new Date(formState.launchDate)
      const pArrival = new Date(formState.arrivalDate)
      if (!isNaN(pLaunch.getTime()) && !isNaN(pArrival.getTime()) && pArrival.getTime() < pLaunch.getTime()) {
        validationErrors.push('Estimated lunar arrival date must be on or after the planned launch/departure date.')
      }
    }

    const result = buildMissionProfile(formState)
    const allErrors = [
      ...validationErrors,
      ...(result.ok ? [] : result.errors),
    ]

    if (allErrors.length > 0 || !result.profile) {
      setErrors(allErrors)
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
  const currentLaunch = formState.launchDate ?? ''
  const currentArrival = formState.arrivalDate ?? ''

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
            const isEnabled = type.enabled
            const inputId = `mission-type-${type.id}`
            return (
              <div
                key={type.id}
                className={`mission-type-card ${isSelected ? 'mission-type-card--selected' : ''} ${!isEnabled ? 'mission-type-card--disabled' : ''}`}
                style={!isEnabled ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                onClick={() => {
                  if (isEnabled) handleTypeSelect(type.id)
                }}
                role={isEnabled ? 'button' : undefined}
                tabIndex={isEnabled ? 0 : -1}
                aria-disabled={!isEnabled}
                onKeyDown={(e) => {
                  if (isEnabled && (e.key === 'Enter' || e.key === ' ')) {
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
                    disabled={!isEnabled}
                    onChange={() => {
                      if (isEnabled) handleTypeSelect(type.id)
                    }}
                    className="radio-control"
                  />
                  <label htmlFor={inputId} className="mission-type-card__title" style={{ cursor: isEnabled ? 'pointer' : 'not-allowed' }}>
                    {type.label}
                  </label>
                </div>
                <p className="mission-type-card__desc">{type.description}</p>
                {isSelected && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-teal)' }}>
                    ✓ Predefined Profile Active
                  </div>
                )}
                {!isEnabled && type.disabledReason && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.4',
                    }}
                  >
                    <span style={{ color: 'var(--status-marginal-text)', fontWeight: 600 }}>[Model Not Bundled]</span>{' '}
                    {type.disabledReason}
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
          <h2 id="heading-schedule" className="panel-title">2. Mission Schedule & Surface Duration</h2>
          <p className="panel-subtitle">
            Specify the operational timeline for lunar launch, landing, and surface operations.
          </p>
        </div>

        <div className="mission-schedule-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {/* Planned Launch Date */}
          <div className="form-group">
            <label htmlFor="launch-date-input" className="form-label">
              Planned Launch / Departure Date <span className="required-mark">*</span>
            </label>
            <div className="date-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                ref={launchInputRef}
                type="date"
                id="launch-date-input"
                className="form-input font-mono date-picker-input"
                min="2025-01-01"
                max="2035-12-31"
                value={currentLaunch}
                onChange={handleLaunchDateChange}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch {
                    // Fallback for browsers that don't support showPicker
                  }
                }}
                placeholder="Select date"
                required
                style={{
                  width: '100%',
                  paddingRight: currentLaunch ? '4.8rem' : '2.6rem',
                  cursor: 'pointer',
                  colorScheme: 'dark',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                {currentLaunch && (
                  <button
                    type="button"
                    className="date-clear-btn"
                    onClick={handleClearLaunchDate}
                    title="Clear launch date"
                    aria-label="Clear launch date"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem 0.45rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  className="date-picker-trigger-btn"
                  onClick={() => {
                    try {
                      launchInputRef.current?.showPicker?.()
                    } catch {
                      launchInputRef.current?.focus()
                    }
                  }}
                  title="Open calendar picker"
                  aria-label="Open calendar picker"
                  style={{
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    color: 'var(--accent-teal)',
                    cursor: 'pointer',
                    padding: '0.3rem 0.45rem',
                    fontSize: '0.9rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  📅
                </button>
              </div>
            </div>
            <p className="form-hint">
              Earth departure calendar date for translunar injection.
            </p>
          </div>

          {/* Planned Arrival Date */}
          <div className="form-group">
            <label htmlFor="arrival-date-input" className="form-label">
              Estimated Lunar Arrival Date <span className="required-mark">*</span>
            </label>
            <div className="date-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                ref={arrivalInputRef}
                type="date"
                id="arrival-date-input"
                className="form-input font-mono date-picker-input"
                min={currentLaunch || '2025-01-01'}
                max="2035-12-31"
                value={currentArrival}
                onChange={handleArrivalDateChange}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch {
                    // Fallback for browsers that don't support showPicker
                  }
                }}
                placeholder="Select date"
                required
                style={{
                  width: '100%',
                  paddingRight: currentArrival ? '4.8rem' : '2.6rem',
                  cursor: 'pointer',
                  colorScheme: 'dark',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                {currentArrival && (
                  <button
                    type="button"
                    className="date-clear-btn"
                    onClick={handleClearArrivalDate}
                    title="Clear arrival date"
                    aria-label="Clear arrival date"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem 0.45rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  className="date-picker-trigger-btn"
                  onClick={() => {
                    try {
                      arrivalInputRef.current?.showPicker?.()
                    } catch {
                      arrivalInputRef.current?.focus()
                    }
                  }}
                  title="Open calendar picker"
                  aria-label="Open calendar picker"
                  style={{
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    color: 'var(--accent-teal)',
                    cursor: 'pointer',
                    padding: '0.3rem 0.45rem',
                    fontSize: '0.9rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  📅
                </button>
              </div>
            </div>
            <p className="form-hint">
              Target arrival calendar date (must not precede launch date).
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
            <div className="duration-presets" role="group" aria-label="Quick duration presets" style={{ marginTop: '0.4rem' }}>
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
              • <strong>Transit & Operational Schedule</strong>: Launch date and arrival date define the translunar transit window (~5 days for standard Apollo/Artemis trajectory).<br />
              • <strong>Duration Operational Gating</strong>: Missions exceeding 14 Earth days span past the lunar daytime window (~14.77 days) and require sustained high annual illumination to avoid cryogenic power failure during lunar darkness.<br />
              • <strong>Dataset Boundary</strong>: Evaluated illumination and Earth visibility metrics are derived from NASA PGDA Product 69 (18.6-year multi-year precession cycle simulation). Instantaneous hour-by-hour calendar date shadow casting requires SPICE orbit kernels not bundled in the client.
            </p>
          </div>
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
