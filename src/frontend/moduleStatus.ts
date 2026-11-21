// This file is the single place to update when a milestone finishes.

export type ModuleStatus = 'engine-ready' | 'in-preparation' | 'planned'

export interface ModuleInfo {
  id: string
  name: string
  description: string
  status: ModuleStatus
  detail: string
}

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  'engine-ready': 'Engine built · not connected',
  'in-preparation': 'In preparation',
  'planned': 'Planned',
}

export const MODULES: ModuleInfo[] = [
  {
    id: 'mission-profile',
    name: 'Mission Profile Specification',
    description: 'Defines criterion weights, pass/marginal limit constraints, and operational rationale.',
    status: 'engine-ready',
    detail: 'Engine and interactive setup form connected; candidate dataset pending',
  },
  {
    id: 'site-dataset',
    name: 'Candidate Site Dataset',
    description: 'Curated lunar landing sites with evaluation criteria and uncertainty bounds.',
    status: 'in-preparation',
    detail: 'Format and validation built; dataset being researched',
  },
  {
    id: 'feasibility',
    name: 'Feasibility Filter',
    description: 'Evaluates candidate sites against essential and non-essential mission limits.',
    status: 'engine-ready',
    detail: 'Built and tested; not connected to the interface',
  },
  {
    id: 'topsis',
    name: 'TOPSIS Multi-Criteria Ranking',
    description: 'Ranks eligible candidate landing sites using distance to ideal and negative-ideal solutions.',
    status: 'planned',
    detail: 'Planned',
  },
  {
    id: 'monte-carlo',
    name: 'Monte Carlo Robustness',
    description: 'Tests ranking stability across simulated measurement variations and uncertainty bounds.',
    status: 'planned',
    detail: 'Planned',
  },
  {
    id: 'primary-selection',
    name: 'Primary Site Selection',
    description: 'Identifies the top-performing compliant landing site based on mission priorities.',
    status: 'planned',
    detail: 'Planned',
  },
  {
    id: 'backup-selection',
    name: 'Backup Site Selection',
    description: 'Selects an independent, decorrelated alternative landing site for contingency planning.',
    status: 'planned',
    detail: 'Planned',
  },
  {
    id: 'decision-flip',
    name: 'Decision Flip Sensitivity',
    description: 'Calculates the minimum shift in weights or site metrics required to change the top recommendation.',
    status: 'planned',
    detail: 'Planned',
  },
  {
    id: 'data-uncertainty',
    name: 'Data Uncertainty Analysis',
    description: 'Analyzes how confidence intervals and data quality affect site recommendations.',
    status: 'planned',
    detail: 'Simplified sensitivity analysis; not a full Value of Information analysis',
  },
  {
    id: 'pareto',
    name: 'Pareto Dominance Indicator',
    description: 'Flags candidate sites that are non-dominated across all evaluation criteria.',
    status: 'planned',
    detail: 'Simple non-dominated badge',
  },
  {
    id: 'map',
    name: 'Lunar Surface Map',
    description: 'Visual spatial representation of candidate landing sites on the lunar surface.',
    status: 'planned',
    detail: 'Static map first',
  },
  {
    id: 'results-dashboard',
    name: 'Results Dashboard',
    description: 'Unified decision-support interface summarizing feasibility, rankings, and sensitivity.',
    status: 'planned',
    detail: 'Planned',
  },
]
