import { CriterionId } from '../engine/types'

export type MissionTypeId = 'resource' | 'science' | 'crewed' | 'communication'

export interface MissionTypeOption {
  id: string
  label: string
  description: string
  enabled: boolean
  disabledReason?: string
}

export const MISSION_TYPES: MissionTypeOption[] = [
  {
    id: 'resource',
    label: 'Water-Ice Prospecting & Resource Exploration',
    description: 'Prioritizes volatile presence, proximity to permanently shadowed cold traps, and In-Situ Resource Utilization (ISRU) feasibility.',
    enabled: true,
  },
  {
    id: 'science',
    label: 'Lunar Scientific Exploration',
    description: 'Prioritizes sampling of South Pole-Aitken (SPA) basin ejecta, ancient crustal massifs, and planetary science return.',
    enabled: true,
  },
  {
    id: 'crewed',
    label: 'Lunar Surface Infrastructure & Habitat Development',
    description: 'Prioritizes Human Landing System (HLS) touchdown stability (slope ≤ 8°), sustained solar array power, and direct Earth communications.',
    enabled: true,
  },
  {
    id: 'communication',
    label: 'Communications Relay Infrastructure',
    description: 'Prioritizes elevated topographic plateaus and peaks with continuous line-of-sight Earth visibility (≥ 70%) for polar telecom relays.',
    enabled: true,
  },
  {
    id: 'rover',
    label: 'Rover-Based Surface Exploration',
    description: 'Long-range autonomous rover surface traverses between shadowed cold traps and illuminated charging stations.',
    enabled: false,
    disabledReason: 'Continuous micro-slope traverse pathfinding algorithms require sub-meter DEM tiles not bundled in current polar coverage.',
  },
  {
    id: 'astronomy',
    label: 'Astronomy & Scientific Observation',
    description: 'Deep-space optical observatories and low-frequency radio astronomy installations.',
    enabled: false,
    disabledReason: 'Radio astronomy requires lunar far-side radio-frequency interference (RFI) shielding models; not supported by south-pole nearside line-of-sight data.',
  },
  {
    id: 'cargo',
    label: 'Cargo Landing & Equipment Deployment',
    description: 'Heavy-lift uncrewed logistics landers and modular infrastructure delivery.',
    enabled: false,
    disabledReason: 'Heavy payload surface plume-regolith blast interaction models require discrete CFD boundary datasets not supported in current release.',
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
