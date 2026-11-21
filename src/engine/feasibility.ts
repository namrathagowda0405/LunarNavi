import { CriterionId, Site } from './types'
import { Constraint, MissionProfile } from './mission'

// Feasibility status outcomes for an individual constraint or overall site evaluation.
export type FeasibilityStatus = 'Pass' | 'Marginal' | 'Fail' | 'Cannot Assess'

// Result of evaluating a single mission constraint against a site criterion.
export interface ConstraintResult {
  criterion: CriterionId
  direction: 'max' | 'min'
  essential: boolean
  value: number | null
  status: FeasibilityStatus
  reason: string
}

// Complete feasibility evaluation of a candidate landing site against a mission profile.
export interface FeasibilityResult {
  siteId: string
  missionId: string
  status: FeasibilityStatus
  eligible: boolean
  constraintResults: ConstraintResult[]
  reasons: string[]
}

/**
 * Evaluates a single numeric value against a mission constraint.
 *
 * @param value - The numerical criterion value from the site, or null if missing.
 * @param constraint - The mission constraint specifying direction and thresholds.
 * @returns FeasibilityStatus ('Pass', 'Marginal', 'Fail', or 'Cannot Assess').
 */
export function evaluateConstraint(
  value: number | null,
  constraint: Constraint
): FeasibilityStatus {
  if (value === null || typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Cannot Assess'
  }

  if (constraint.direction === 'max') {
    if (value <= constraint.passLimit) {
      return 'Pass'
    }
    if (value <= constraint.marginalLimit) {
      return 'Marginal'
    }
    return 'Fail'
  } else {
    // direction === 'min'
    if (value >= constraint.passLimit) {
      return 'Pass'
    }
    if (value >= constraint.marginalLimit) {
      return 'Marginal'
    }
    return 'Fail'
  }
}

/**
 * Formats a single plain-English sentence summarizing the constraint evaluation outcome.
 */
function buildConstraintReason(
  criterion: CriterionId,
  value: number | null,
  status: FeasibilityStatus,
  constraint: Constraint
): string {
  if (value === null || typeof value !== 'number' || !Number.isFinite(value)) {
    return `Criterion "${criterion}" value is missing, resulting in status Cannot Assess.`
  }

  if (constraint.direction === 'max') {
    if (status === 'Pass') {
      return `Criterion "${criterion}" value ${value} is at or below the pass limit of ${constraint.passLimit}, resulting in status Pass.`
    }
    if (status === 'Marginal') {
      return `Criterion "${criterion}" value ${value} exceeds the pass limit of ${constraint.passLimit} but meets the marginal limit of ${constraint.marginalLimit}, resulting in status Marginal.`
    }
    return `Criterion "${criterion}" value ${value} exceeds the marginal limit of ${constraint.marginalLimit}, resulting in status Fail.`
  } else {
    if (status === 'Pass') {
      return `Criterion "${criterion}" value ${value} is at or above the pass limit of ${constraint.passLimit}, resulting in status Pass.`
    }
    if (status === 'Marginal') {
      return `Criterion "${criterion}" value ${value} falls below the pass limit of ${constraint.passLimit} but meets the marginal limit of ${constraint.marginalLimit}, resulting in status Marginal.`
    }
    return `Criterion "${criterion}" value ${value} falls below the marginal limit of ${constraint.marginalLimit}, resulting in status Fail.`
  }
}

/**
 * Evaluates all constraints of a mission profile against a landing site.
 * Pure function with no side effects or mutations.
 *
 * Overall status check order:
 *  a. any ESSENTIAL constraint is Fail -> 'Fail'
 *  b. else any ESSENTIAL constraint is Cannot Assess -> 'Cannot Assess'
 *  c. else any ESSENTIAL constraint is Marginal, or any NON-essential constraint is Fail -> 'Marginal'
 *  d. else 'Pass'
 *
 * @param site - The candidate landing site.
 * @param mission - The mission profile with constraints.
 * @returns FeasibilityResult containing overall status, eligibility, and constraint-by-constraint details.
 */
export function evaluateFeasibility(
  site: Site,
  mission: MissionProfile
): FeasibilityResult {
  const constraintResults: ConstraintResult[] = mission.constraints.map((constraint) => {
    const criterionData = site.criteria[constraint.criterion]
    const value = criterionData !== undefined ? criterionData.value : null
    const status = evaluateConstraint(value, constraint)
    const reason = buildConstraintReason(constraint.criterion, value, status, constraint)

    return {
      criterion: constraint.criterion,
      direction: constraint.direction,
      essential: constraint.essential,
      value,
      status,
      reason,
    }
  })

  let hasEssentialFail = false
  let hasEssentialCannotAssess = false
  let hasEssentialMarginal = false
  let hasNonEssentialFail = false

  for (const cr of constraintResults) {
    if (cr.essential) {
      if (cr.status === 'Fail') {
        hasEssentialFail = true
      } else if (cr.status === 'Cannot Assess') {
        hasEssentialCannotAssess = true
      } else if (cr.status === 'Marginal') {
        hasEssentialMarginal = true
      }
    } else {
      if (cr.status === 'Fail') {
        hasNonEssentialFail = true
      }
    }
  }

  let status: FeasibilityStatus
  if (hasEssentialFail) {
    status = 'Fail'
  } else if (hasEssentialCannotAssess) {
    status = 'Cannot Assess'
  } else if (hasEssentialMarginal || hasNonEssentialFail) {
    status = 'Marginal'
  } else {
    status = 'Pass'
  }

  const eligible = status === 'Pass' || status === 'Marginal'
  const reasons = constraintResults
    .filter((cr) => cr.status !== 'Pass')
    .map((cr) => cr.reason)

  return {
    siteId: site.id,
    missionId: mission.id,
    status,
    eligible,
    constraintResults,
    reasons,
  }
}
