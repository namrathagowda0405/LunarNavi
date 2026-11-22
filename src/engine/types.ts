// The fixed list of evaluation criteria used to score and rank lunar landing sites.
export const CRITERION_IDS = [
  'slope',
  'roughness',
  'illumination',
  'resource',
  'communication',
  'science',
] as const

// The identifier for one of the six standard lunar evaluation criteria.
export type CriterionId = (typeof CRITERION_IDS)[number]

// Indicates how the value was obtained: directly measured by instruments, derived from physical models, or estimated.
export type ValueKind = 'measured' | 'derived' | 'estimated'

// The confidence or quality level of the data (high, medium, or low).
export type Quality = 'high' | 'medium' | 'low'

// Numerical assessment and uncertainty bounds for a single criterion at a site.
// A value of null means "missing data"; missing data must be disclosed, never guessed.
export interface CriterionValue {
  value: number | null
  low: number | null
  high: number | null
  kind: ValueKind
  quality: Quality
  source: string
  note?: string
}

// A candidate lunar landing site with geographic coordinates and evaluation criteria assessments.
export interface Site {
  id: string
  name: string
  region: string
  latitude: number
  longitude: number
  criteria: Record<CriterionId, CriterionValue>
}

// The result of validating a collection of sites, indicating success or listing any validation errors.
export interface ValidationResult {
  ok: boolean
  errors: string[]
}
