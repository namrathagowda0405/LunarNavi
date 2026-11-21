import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MISSION_PROFILES,
  getAllDefaultMissionProfiles,
  getDefaultMissionProfile,
  validateMissions,
} from '../src/engine/mission'
import {
  evaluateFeasibility,
  evaluateAllSites,
  filterFeasibleSites,
} from '../src/engine/feasibility'
import { rankSites } from '../src/engine/topsis'
import { CANDIDATE_SITES } from '../src/data/candidateSites'
import { CRITERION_IDS } from '../src/engine/types'
import {
  getDefaultRawWeightsForMission,
  getDefaultConstraintsForMission,
  getMissionPresetState,
  normalizeWeights,
  buildMissionProfile,
} from '../src/frontend/missionForm'

describe('Mission Profiles & Feasibility Engine Milestone', () => {
  describe('Mission Profile Presets & Engine Schema', () => {
    it('defines all four required mission profiles', () => {
      const requiredProfiles = ['science', 'resource', 'crewed', 'communication']
      for (const id of requiredProfiles) {
        expect(DEFAULT_MISSION_PROFILES[id]).toBeDefined()
        expect(DEFAULT_MISSION_PROFILES[id].id).toBe(`mission-${id}`)
      }
    })

    it('all four default mission profiles pass validateMissions with zero errors', () => {
      const profiles = getAllDefaultMissionProfiles()
      expect(profiles).toHaveLength(4)

      const result = validateMissions(profiles)
      expect(result.ok).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('each mission profile weights sum to 1.0 within tolerance and includes all six criteria', () => {
      const profiles = getAllDefaultMissionProfiles()

      for (const profile of profiles) {
        // All 6 criteria present
        for (const cid of CRITERION_IDS) {
          expect(profile.weights[cid]).toBeDefined()
          expect(typeof profile.weights[cid]).toBe('number')
          expect(profile.weights[cid]).toBeGreaterThanOrEqual(0)
        }

        const sum = Object.values(profile.weights).reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1.0, 6)
      }
    })

    it('getDefaultMissionProfile returns a deep clone and falls back to science for unknown id', () => {
      const scienceProfile = getDefaultMissionProfile('science')
      expect(scienceProfile.id).toBe('mission-science')

      // Mutation of clone does not mutate original preset
      scienceProfile.name = 'Mutated Name'
      expect(DEFAULT_MISSION_PROFILES.science.name).not.toBe('Mutated Name')

      const unknownProfile = getDefaultMissionProfile('unknown-type')
      expect(unknownProfile.id).toBe('mission-science')
    })

    it('preset raw weights normalize to the expected decimal weights', () => {
      const missionTypes = ['science', 'resource', 'crewed', 'communication'] as const

      for (const mType of missionTypes) {
        const raw = getDefaultRawWeightsForMission(mType)
        const normalized = normalizeWeights(raw)
        const expected = DEFAULT_MISSION_PROFILES[mType].weights

        for (const cid of CRITERION_IDS) {
          expect(normalized[cid]).toBeCloseTo(expected[cid], 5)
        }
      }
    })

    it('buildMissionProfile builds valid profiles from getMissionPresetState', () => {
      const missionTypes = ['science', 'resource', 'crewed', 'communication'] as const

      for (const mType of missionTypes) {
        const defaultConstraints = getDefaultConstraintsForMission(mType)
        expect(defaultConstraints.length).toBeGreaterThanOrEqual(3)

        const formState = getMissionPresetState(mType)
        const built = buildMissionProfile(formState)

        expect(built.ok).toBe(true)
        expect(built.errors).toEqual([])
        expect(built.profile).not.toBeNull()
        expect(built.profile?.constraints.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('Feasibility Engine Evaluation on Authentic Candidate Sites', () => {
    it('evaluates all 16 candidate sites across all 4 mission profiles without crashing', () => {
      const profiles = getAllDefaultMissionProfiles()

      for (const profile of profiles) {
        const summary = evaluateAllSites(CANDIDATE_SITES, profile)
        expect(summary.totalCount).toBe(16)
        expect(summary.feasibleCount + summary.infeasibleCount + summary.unknownCount).toBe(16)
      }
    })

    it('Crewed Base profile enforces strict slope (<= 8° pass, <= 10° marginal) and disqualifies steep sites', () => {
      const crewed = DEFAULT_MISSION_PROFILES.crewed

      // artemis-amundsen-rim has slope 12.5° (> 10° marginal limit)
      const amundsen = CANDIDATE_SITES.find((s) => s.id === 'artemis-amundsen-rim')!
      const amundsenResult = evaluateFeasibility(amundsen, crewed)

      expect(amundsenResult.status).toBe('Fail')
      expect(amundsenResult.category).toBe('infeasible')
      expect(amundsenResult.eligible).toBe(false)
      expect(amundsenResult.reasons.some((r) => r.includes('slope') && r.includes('Fail'))).toBe(true)

      // cal-cabeus-lcross has illumination 1.5% (< 35% marginal limit for crewed) and slope 14.8°
      const cabeus = CANDIDATE_SITES.find((s) => s.id === 'cal-cabeus-lcross')!
      const cabeusResult = evaluateFeasibility(cabeus, crewed)

      expect(cabeusResult.status).toBe('Fail')
      expect(cabeusResult.category).toBe('infeasible')
      expect(cabeusResult.eligible).toBe(false)

      // Malapert Massif (slope 5.6°, roughness 0.12, illumination 89%, comms 94%) passes all crewed limits!
      const malapert = CANDIDATE_SITES.find((s) => s.id === 'artemis-malapert-massif')!
      const malapertResult = evaluateFeasibility(malapert, crewed)

      expect(malapertResult.status).toBe('Pass')
      expect(malapertResult.category).toBe('feasible')
      expect(malapertResult.eligible).toBe(true)
    })

    it('Science Mission profile evaluates science priority, slope, and roughness constraints correctly', () => {
      const scienceMission = DEFAULT_MISSION_PROFILES.science
      const summary = evaluateAllSites(CANDIDATE_SITES, scienceMission)

      expect(summary.feasibleCount).toBeGreaterThan(0)
      // Every feasible site has eligible === true
      for (const item of summary.feasible) {
        expect(item.result.eligible).toBe(true)
        expect(item.result.status === 'Pass' || item.result.status === 'Marginal').toBe(true)
      }
    })

    it('Resource Exploration profile prioritizes resource indicators and requires resource constraint', () => {
      const resourceMission = DEFAULT_MISSION_PROFILES.resource
      const summary = evaluateAllSites(CANDIDATE_SITES, resourceMission)
      expect(summary.feasibleCount).toBeGreaterThan(0)

      // Haworth (resource: 88.0) and Nobile Rim 1 (resource: 74.0) have high resource potential
      const haworth = CANDIDATE_SITES.find((s) => s.id === 'artemis-haworth')!
      const haworthResult = evaluateFeasibility(haworth, resourceMission)

      const resConstraint = haworthResult.constraintResults.find((c) => c.criterion === 'resource')
      expect(resConstraint?.status).toBe('Pass')
    })
  })

  describe('Unknown / Missing Data Transparency', () => {
    it('candidate site with missing essential data evaluates to Cannot Assess (unknown) and is NEVER eligible', () => {
      // cal-shoemaker-unassessed has resource === null
      const shoemaker = CANDIDATE_SITES.find((s) => s.id === 'cal-shoemaker-unassessed')!
      expect(shoemaker.criteria.resource.value).toBeNull()

      // Under Resource Exploration, resource is an essential constraint
      const resourceMission = DEFAULT_MISSION_PROFILES.resource
      const result = evaluateFeasibility(shoemaker, resourceMission)

      expect(result.status).toBe('Cannot Assess')
      expect(result.category).toBe('unknown')
      expect(result.eligible).toBe(false)
      expect(result.reasons.some((r) => r.includes('resource') && r.includes('missing'))).toBe(true)
    })

    it('candidate site with missing essential roughness evaluates to Cannot Assess (unknown)', () => {
      // cal-slater-radar-shadow has roughness === null
      const slater = CANDIDATE_SITES.find((s) => s.id === 'cal-slater-radar-shadow')!
      expect(slater.criteria.roughness.value).toBeNull()

      // Under Science Mission, roughness is an essential constraint
      const scienceMission = DEFAULT_MISSION_PROFILES.science
      const result = evaluateFeasibility(slater, scienceMission)

      expect(result.status).toBe('Cannot Assess')
      expect(result.category).toBe('unknown')
      expect(result.eligible).toBe(false)
      expect(result.reasons.some((r) => r.includes('roughness') && r.includes('missing'))).toBe(true)
    })

    it('filterFeasibleSites excludes both infeasible and unknown candidate sites', () => {
      const crewed = DEFAULT_MISSION_PROFILES.crewed
      const feasible = filterFeasibleSites(CANDIDATE_SITES, crewed)

      const feasibleIds = new Set(feasible.map((s) => s.id))

      // Infeasible sites must NOT be included
      expect(feasibleIds.has('artemis-amundsen-rim')).toBe(false)
      expect(feasibleIds.has('cal-cabeus-lcross')).toBe(false)

      // Unknown sites must NOT be included
      expect(feasibleIds.has('cal-shoemaker-unassessed')).toBe(false)
      expect(feasibleIds.has('cal-slater-radar-shadow')).toBe(false)

      // Feasible sites must be included
      expect(feasibleIds.has('artemis-malapert-massif')).toBe(true)
      expect(feasibleIds.has('artemis-connecting-ridge')).toBe(true)
    })
  })

  describe('Integration with TOPSIS Multi-Criteria Ranking', () => {
    it('ranks only feasible sites, returning deterministic scores with rank 1 winner', () => {
      const crewed = DEFAULT_MISSION_PROFILES.crewed
      const feasibleSites = filterFeasibleSites(CANDIDATE_SITES, crewed)

      expect(feasibleSites.length).toBeGreaterThan(0)

      const rankingResult = rankSites(feasibleSites, crewed)

      expect(rankingResult.ranking).toHaveLength(feasibleSites.length)
      expect(rankingResult.ranking[0].rank).toBe(1)
      expect(rankingResult.ranking[0].closeness).toBeGreaterThan(0)
      expect(rankingResult.ranking[0].closeness).toBeLessThanOrEqual(1.0)

      // Verify descending order of closeness
      for (let i = 1; i < rankingResult.ranking.length; i++) {
        expect(rankingResult.ranking[i - 1].closeness).toBeGreaterThanOrEqual(
          rankingResult.ranking[i].closeness
        )
        expect(rankingResult.ranking[i].rank).toBe(i + 1)
      }
    })

    it('different mission profiles yield different TOPSIS winners reflecting operational priorities', () => {
      // Communication mission prioritizes comms (40%) and illumination (20%)
      const commMission = DEFAULT_MISSION_PROFILES.communication
      const commFeasible = filterFeasibleSites(CANDIDATE_SITES, commMission)
      const commRanking = rankSites(commFeasible, commMission)

      // Under communication mission, Malapert Massif (94% comms, 89% sun) should rank at the top
      expect(commRanking.ranking[0].id).toBe('artemis-malapert-massif')

      // Resource mission prioritizes resources (35%)
      const resMission = DEFAULT_MISSION_PROFILES.resource
      const resFeasible = filterFeasibleSites(CANDIDATE_SITES, resMission)
      const resRanking = rankSites(resFeasible, resMission)

      // Haworth (88 resource) or Nobile Rim 1 (74 resource) rank at the very top under Resource profile
      const topResSiteId = resRanking.ranking[0].id
      expect(['artemis-haworth', 'artemis-nobile-rim-1']).toContain(topResSiteId)
    })
  })
})
