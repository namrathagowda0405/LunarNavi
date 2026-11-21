import { describe, it, expect } from 'vitest'
import {
  CENTRALIZED_CANDIDATE_SITES,
  getSiteById,
  getOfficialArtemisSites,
  getScientificResearchSites,
  getDecorrelatedBackupSite,
  toCandidateLocation,
} from '../src/data/centralizedSites'
import { validateCandidateLocations } from '../src/engine/locations'
import { DEFAULT_MISSION_PROFILES } from '../src/engine/mission'
import { evaluateAllSites, filterFeasibleSites } from '../src/engine/feasibility'
import { rankSites } from '../src/engine/topsis'
import { runMonteCarlo } from '../src/engine/montecarlo'

describe('Mission Data Pipeline & Candidate Site Integration', () => {
  describe('1. Centralized Candidate Sites Data Contract & Authenticity', () => {
    it('contains at least 8 verified lunar south pole candidate locations (has 16)', () => {
      expect(CENTRALIZED_CANDIDATE_SITES.length).toBeGreaterThanOrEqual(8)
      expect(CENTRALIZED_CANDIDATE_SITES.length).toBe(16)
    })

    it('each candidate site conforms to CandidateLocation schema and passes validation', () => {
      const candidateLocations = CENTRALIZED_CANDIDATE_SITES.map(toCandidateLocation)
      const validationResult = validateCandidateLocations(candidateLocations, { maxLatitude: -80.0 })
      expect(validationResult.ok).toBe(true)
      expect(validationResult.errors).toEqual([])
    })

    it('every site has valid HTTPS source URL, source organization, description, and DE421 convention', () => {
      for (const site of CENTRALIZED_CANDIDATE_SITES) {
        expect(site.id).toBeTruthy()
        expect(site.name).toBeTruthy()
        expect(site.region).toBeTruthy()
        expect(site.latitude).toBeLessThanOrEqual(-80.0)
        expect(site.latitude).toBeGreaterThanOrEqual(-90.0)
        expect(site.sourceUrl.startsWith('https://')).toBe(true)
        expect(site.sourceOrganization).toBeTruthy()
        expect(site.description).toBeTruthy()
        expect(site.coordinateConvention).toContain('DE421')
        expect(site.coordinateStatus).toBe('verified')
        expect(['official-artemis-candidate', 'scientific-research-location']).toContain(
          site.designation
        )
      }
    })

    it('distinguishes official Artemis III candidate regions from scientific research locations', () => {
      const officialSites = getOfficialArtemisSites()
      const researchSites = getScientificResearchSites()

      expect(officialSites.length).toBe(13)
      expect(researchSites.length).toBe(3)

      for (const site of officialSites) {
        expect(site.designation).toBe('official-artemis-candidate')
        expect(site.sourceOrganization).toContain('Artemis')
      }

      for (const site of researchSites) {
        expect(site.designation).toBe('scientific-research-location')
      }
    })
  })

  describe('2. Real Data Extraction & Scientific Provenance', () => {
    it('all measurements retain unit, dataset citation, source URL, and sampling method', () => {
      for (const site of CENTRALIZED_CANDIDATE_SITES) {
        const m = site.measurements

        // Elevation
        expect(m.elevation.unit).toBe('m')
        expect(m.elevation.dataset).toContain('LOLA')
        expect(m.elevation.sourceUrl.startsWith('https://')).toBe(true)
        expect(m.elevation.samplingMethod).toBeTruthy()

        // Slope
        expect(m.slope.unit).toBe('°')
        expect(m.slope.dataset).toContain('LOLA')
        expect(m.slope.sourceUrl.startsWith('https://')).toBe(true)
        expect(m.slope.samplingMethod).toBeTruthy()

        // Roughness
        expect(m.roughness.unit).toBe('m')
        expect(m.roughness.dataset).toContain('LOLA')
        expect(m.roughness.sourceUrl.startsWith('https://')).toBe(true)

        // Illumination
        expect(m.illumination.unit).toBe('%')
        expect(m.illumination.dataset).toContain('PGDA')
        expect(m.illumination.sourceUrl.startsWith('https://')).toBe(true)
        expect(m.illumination.samplingMethod).toBeTruthy()

        // PSR
        expect(m.isPsr.unit).toBe('boolean')
        expect(typeof m.isPsr.value).toBe('boolean')
        expect(typeof m.psrDistanceKm).toBe('number')
      }
    })

    it('unassessed metrics are explicitly null with quality low and NEVER fabricated', () => {
      const slater = getSiteById('cal-slater-radar-shadow')!
      expect(slater).toBeDefined()
      expect(slater.measurements.roughness.value).toBeNull()
      expect(slater.measurements.roughness.quality).toBe('low')
      expect(slater.criteria.roughness.value).toBeNull()

      const shoemaker = getSiteById('cal-shoemaker-unassessed')!
      expect(shoemaker).toBeDefined()
      expect(shoemaker.criteria.resource.value).toBeNull()
      expect(shoemaker.resourceEvidence.kind).toBe('unknown')
      expect(shoemaker.resourceEvidence.score).toBeNull()
    })
  })

  describe('3. Evidence-Based Resource Potential Classification', () => {
    it('correctly classifies Cabeus LCROSS as direct-observation ground truth', () => {
      const lcross = getSiteById('cal-cabeus-lcross')!
      expect(lcross).toBeDefined()
      expect(lcross.resourceEvidence.kind).toBe('direct-observation')
      expect(lcross.resourceEvidence.score).toBe(95.0)
      expect(lcross.resourceEvidence.citation).toContain('Colaprete')
      expect(lcross.resourceEvidence.directObservation).toContain('5.5')
      expect(lcross.resourceEvidence.directObservation).toContain('water')
      expect(lcross.measurements.isPsr.value).toBe(true)
    })

    it('classifies VIPER Nobile Rim 1 and Haworth as scientific-evidence', () => {
      const nobile = getSiteById('artemis-nobile-rim-1')!
      expect(nobile.resourceEvidence.kind).toBe('scientific-evidence')
      expect(nobile.resourceEvidence.summary).toContain('VIPER')
      expect(nobile.resourceEvidence.score).toBe(74.0)

      const haworth = getSiteById('artemis-haworth')!
      expect(haworth.resourceEvidence.kind).toBe('scientific-evidence')
      expect(haworth.resourceEvidence.score).toBe(88.0)
    })

    it('classifies solar peaks like Malapert Massif and Peak Near Shackleton as proxies', () => {
      const malapert = getSiteById('artemis-malapert-massif')!
      expect(malapert.resourceEvidence.kind).toBe('proxy')
      expect(malapert.measurements.psrDistanceKm).toBeGreaterThan(3.0)

      const shackletonPeak = getSiteById('artemis-peak-near-shackleton')!
      expect(shackletonPeak.resourceEvidence.kind).toBe('proxy')
    })
  })

  describe('4. Realistic Communication Visibility Model', () => {
    it('all sites document direct-to-Earth line of sight over libration cycle and relay requirement', () => {
      for (const site of CENTRALIZED_CANDIDATE_SITES) {
        const comm = site.communicationModel
        expect(comm.assumedScenario).toBeTruthy()
        expect(comm.assumedScenario.toLowerCase()).toContain('libration')
        expect(typeof comm.relaySupported).toBe('boolean')
        expect(comm.dataset).toBeTruthy()
        expect(comm.sourceUrl.startsWith('https://')).toBe(true)

        if (comm.directEarthVisibilityPercent !== null) {
          expect(comm.directEarthVisibilityPercent).toBeGreaterThanOrEqual(0)
          expect(comm.directEarthVisibilityPercent).toBeLessThanOrEqual(100)
        }
      }
    })

    it('Malapert Massif exhibits superior line-of-sight (94%) due to summit elevation', () => {
      const malapert = getSiteById('artemis-malapert-massif')!
      expect(malapert.communicationModel.directEarthVisibilityPercent).toBe(94.0)
      expect(malapert.criteria.communication.value).toBe(94.0)
    })

    it('crater interior floors suffer severe line-of-sight obstruction and mandate relays', () => {
      const cabeus = getSiteById('cal-cabeus-lcross')!
      expect(cabeus.communicationModel.directEarthVisibilityPercent).toBe(12.0)
      expect(cabeus.communicationModel.relaySupported).toBe(true)
    })
  })

  describe('5. End-to-End Decision Pipeline Execution', () => {
    it('executes full pipeline: Coords -> Feasibility -> TOPSIS -> Monte Carlo -> Winner & Backup', () => {
      const mission = DEFAULT_MISSION_PROFILES.science

      // 1. Feasibility
      const summary = evaluateAllSites(CENTRALIZED_CANDIDATE_SITES, mission)
      expect(summary.feasibleCount).toBeGreaterThan(0)

      // 2. Filter feasible
      const feasible = filterFeasibleSites(CENTRALIZED_CANDIDATE_SITES, mission)
      expect(feasible.length).toBe(summary.feasibleCount)

      // 3. TOPSIS Ranking
      const topsis = rankSites(feasible, mission)
      expect(topsis.ranking.length).toBe(feasible.length - topsis.excluded.length)
      expect(topsis.ranking[0].rank).toBe(1)

      // 4. Monte Carlo Robustness
      const mc = runMonteCarlo(feasible, mission, { seed: 42, iterations: 200 })
      expect(mc.sites.length).toBe(feasible.length)
      const topSiteMc = mc.sites.find((s) => s.siteId === topsis.ranking[0].id)
      expect(topSiteMc).toBeDefined()
      expect(topSiteMc!.winFrequency).toBeGreaterThanOrEqual(0)

      // 5. Decorrelated Backup Selection
      const primaryId = topsis.ranking[0].id
      const primarySite = getSiteById(primaryId)!
      const backupSite = getDecorrelatedBackupSite(
        primaryId,
        topsis.ranking.map((r) => r.id)
      )

      expect(backupSite).toBeDefined()
      expect(backupSite!.id).not.toBe(primaryId)
      // Must be from a different region for risk diversification
      expect(backupSite!.region).not.toBe(primarySite.region)
    })

    it('dynamically updates feasibility, rankings, and primary recommendation when mission changes', () => {
      const crewed = DEFAULT_MISSION_PROFILES.crewed
      const resource = DEFAULT_MISSION_PROFILES.resource
      const comms = DEFAULT_MISSION_PROFILES.communication

      // Crewed Base
      const crewedFeasible = filterFeasibleSites(CENTRALIZED_CANDIDATE_SITES, crewed)
      const crewedTopsis = rankSites(crewedFeasible, crewed)
      expect(crewedTopsis.ranking[0].id).toBe('artemis-malapert-massif')

      // Resource Exploration
      const resFeasible = filterFeasibleSites(CENTRALIZED_CANDIDATE_SITES, resource)
      const resTopsis = rankSites(resFeasible, resource)
      // Haworth (resource 88) or Nobile Rim 1 (resource 74) rank top!
      const resWinner = resTopsis.ranking[0].id
      expect(resWinner === 'artemis-haworth' || resWinner === 'artemis-nobile-rim-1').toBe(true)
      // Resource winner is different from crewed base winner!
      expect(resWinner).not.toBe(crewedTopsis.ranking[0].id)

      // Communication Mission
      const commsFeasible = filterFeasibleSites(CENTRALIZED_CANDIDATE_SITES, comms)
      const commsTopsis = rankSites(commsFeasible, comms)
      // Malapert Massif has 94% Earth visibility and wins communication profile decisively
      expect(commsTopsis.ranking[0].id).toBe('artemis-malapert-massif')
    })
  })
})
