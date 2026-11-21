import { CriterionId } from '../engine/types'

export type MissionTypeId = 'science' | 'resource' | 'crewed' | 'communication'

export interface MissionTypeOption {
  id: MissionTypeId
  label: string
  description: string
}

export const MISSION_TYPES: MissionTypeOption[] = [
  {
    id: 'science',
    label: 'Science',
    description: 'Prioritises the scientific value of the site.',
  },
  {
    id: 'resource',
    label: 'Resource Exploration',
    description: 'Prioritises potential access to lunar resources.',
  },
  {
    id: 'crewed',
    label: 'Crewed Base',
    description: 'Prioritises conditions for a crewed surface base.',
  },
  {
    id: 'communication',
    label: 'Communication',
    description: 'Prioritises communication visibility.',
  },
]

export type RegionId = 'south-pole' | 'equatorial' | 'far-side'

export interface RegionOption {
  id: RegionId
  label: string
  enabled: boolean
  hint?: string
}

export const REGION_OPTIONS: RegionOption[] = [
  {
    id: 'south-pole',
    label: 'Lunar South Pole Region (80°S – 90°S)',
    enabled: true,
  },
  {
    id: 'equatorial',
    label: 'Equatorial / Nearside Regions (disabled — no data yet)',
    enabled: false,
    hint: 'Current data coverage is limited to the south polar region.',
  },
  {
    id: 'far-side',
    label: 'Far Side Highlands (disabled — no data yet)',
    enabled: false,
    hint: 'Current data coverage is limited to the south polar region.',
  },
]

export const CRITERION_LABELS: Record<CriterionId, string> = {
  slope: 'Slope',
  roughness: 'Terrain Roughness',
  illumination: 'Illumination',
  resource: 'Resource Potential',
  communication: 'Communication Visibility',
  science: 'Scientific Value',
}

export const CRITERION_UNITS: Record<CriterionId, string> = {
  slope: 'degrees (°)',
  roughness: 'meters (m)',
  illumination: 'percentage (%)',
  resource: 'wt% / ppm index',
  communication: 'percentage (%)',
  science: 'priority score (0–100)',
}

export const CRITERION_DESCRIPTIONS: Record<CriterionId, string> = {
  slope: 'Terrain inclination angle affecting lander touchdown stability and tip-over risk.',
  roughness: 'Micro-topographic roughness, boulder distribution, and landing gear hazard.',
  illumination: 'Sunlight availability required for solar power generation and thermal survival.',
  resource: 'Orbital indicators of water ice and permanently shadowed volatiles.',
  communication: 'Direct line-of-sight visibility to Earth for telemetry and command links.',
  science: 'Exploration priority score based on planetary science and geology objectives.',
}
