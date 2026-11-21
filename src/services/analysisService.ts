import { supabase, isSupabaseConfigured } from './supabaseClient'
import { Database, Json } from '../types/database.types'

export interface AnalysisRunRecord {
  missionId?: string
  missionType: string
  weights: Record<string, number>
  constraints: unknown[]
  totalSitesEvaluated: number
  feasibleSitesCount: number
  primarySiteId: string
  primaryScore: number
  backupSiteId?: string
  rankings: Array<{
    id: string
    rank: number
    closeness: number
    distanceToIdeal: number
    distanceToAntiIdeal: number
  }>
  simulationParameters?: {
    iterations: number
    weightRelativeSpread: number
    seed: number
  }
  monteCarloSummary?: {
    topSiteId: string
    topSiteWinRate: number
    topSiteTop3Rate: number
    nominalRank: number | null
  }
  notes?: string
}

export interface StoredAnalysisRun {
  id: string
  missionType: string
  primarySiteId: string | null
  primaryScore: number | null
  backupSiteId: string | null
  feasibleSitesCount: number
  createdAt: string
  rankings: unknown
  monteCarloSummary: unknown
}

// In-memory fallback session history for offline / unconfigured mode
const localSessionHistory: StoredAnalysisRun[] = []

/**
 * Persists an analysis run (TOPSIS results + Monte Carlo summary) to Supabase.
 */
export async function saveAnalysisRun(
  record: AnalysisRunRecord
): Promise<{ success: boolean; id?: string; error?: string }> {
  const localId = `local-run-${Date.now()}`
  const localEntry: StoredAnalysisRun = {
    id: localId,
    missionType: record.missionType,
    primarySiteId: record.primarySiteId,
    primaryScore: record.primaryScore,
    backupSiteId: record.backupSiteId ?? null,
    feasibleSitesCount: record.feasibleSitesCount,
    createdAt: new Date().toISOString(),
    rankings: record.rankings,
    monteCarloSummary: record.monteCarloSummary ?? null,
  }
  localSessionHistory.unshift(localEntry)

  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: true,
      id: localId,
    }
  }

  try {
    const insertPayload: Database['public']['Tables']['analysis_runs']['Insert'] = {
      mission_id: record.missionId ?? null,
      mission_type: record.missionType,
      weights: (record.weights as unknown) as Json,
      constraints: (record.constraints as unknown) as Json,
      total_sites_evaluated: record.totalSitesEvaluated,
      feasible_sites_count: record.feasibleSitesCount,
      primary_site_id: record.primarySiteId,
      primary_score: record.primaryScore,
      backup_site_id: record.backupSiteId ?? null,
      rankings: (record.rankings as unknown) as Json,
      simulation_parameters: (record.simulationParameters as unknown) as Json,
      monte_carlo_summary: (record.monteCarloSummary as unknown) as Json,
      notes: record.notes ?? null,
    }

    const { data, error } = await supabase
      .from('analysis_runs')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      console.warn('Could not save analysis run to Supabase:', error.message)
      return { success: true, id: localId, error: error.message }
    }

    return { success: true, id: data.id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: true, id: localId, error: msg }
  }
}

/**
 * Retrieves recent analysis runs from Supabase or local session history.
 */
export async function fetchRecentAnalysisRuns(
  limit: number = 10
): Promise<{ runs: StoredAnalysisRun[]; source: 'supabase' | 'local' }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { runs: localSessionHistory.slice(0, limit), source: 'local' }
  }

  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .select('id, mission_type, primary_site_id, primary_score, backup_site_id, feasible_sites_count, created_at, rankings, monte_carlo_summary')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data || data.length === 0) {
      return { runs: localSessionHistory.slice(0, limit), source: 'local' }
    }

    const runs: StoredAnalysisRun[] = data.map((row) => ({
      id: row.id,
      missionType: row.mission_type,
      primarySiteId: row.primary_site_id,
      primaryScore: row.primary_score,
      backupSiteId: row.backup_site_id,
      feasibleSitesCount: row.feasible_sites_count,
      createdAt: row.created_at,
      rankings: row.rankings,
      monteCarloSummary: row.monte_carlo_summary,
    }))

    return { runs, source: 'supabase' }
  } catch {
    return { runs: localSessionHistory.slice(0, limit), source: 'local' }
  }
}
