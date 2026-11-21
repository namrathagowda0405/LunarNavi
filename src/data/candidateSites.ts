/**
 * LunarNavi - Candidate Landing Sites Multi-Criteria Evaluation Dataset
 *
 * Re-exports the centralized candidate sites dataset to preserve backward compatibility.
 * All candidate sites conform to Site, CandidateLocation, and CentralizedSite interfaces.
 */

export {
  CENTRALIZED_CANDIDATE_SITES as CANDIDATE_SITES,
  CENTRALIZED_CANDIDATE_SITES,
  type CentralizedSite,
  type SiteDesignation,
  type ResourceEvidenceKind,
  type ExtractedMeasurement,
  type ResourceEvidence,
  type CommunicationModel,
  getSiteById,
  getOfficialArtemisSites,
  getScientificResearchSites,
  getDecorrelatedBackupSite,
  toCandidateLocation,
} from './centralizedSites'
