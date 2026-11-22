import { CriterionId } from './types'

// Direction of preference for an evaluation criterion.
// benefit = higher value is better, cost = lower value is better.
export type CriterionDirection = 'benefit' | 'cost'

// benefit = higher is better, cost = lower is better. These are starting definitions
// and must be confirmed against the project's criteria definitions document before real analysis.
export const CRITERION_DIRECTION: Record<CriterionId, CriterionDirection> = {
  slope: 'cost',
  roughness: 'cost',
  illumination: 'benefit',
  resource: 'benefit',
  communication: 'benefit',
  science: 'benefit',
}
