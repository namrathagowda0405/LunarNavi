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
    isFeasible?: boolean
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
    rankDistribution?: Record<number, number>
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
 * Persists an analysis run to Supabase.
 * Writes to:
 * 1. `analysis_runs` (core run metadata and parameters)
 * 2. `analysis_results` (individual site TOPSIS rankings, closeness, and distances)
 * 3. `simulation_runs` (Monte Carlo sensitivity summary and win rates)
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
    // 1. Insert into analysis_runs
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

    const { data: runData, error: runError } = await supabase
      .from('analysis_runs')
      .insert(insertPayload)
      .select('id')
      .single()

    if (runError) {
      console.warn('Could not save analysis run to Supabase analysis_runs:', runError.message)
      return { success: true, id: localId, error: runError.message }
    }

    const savedRunId = runData.id

    // 2. Insert site rankings into analysis_results if available
    if (record.rankings && record.rankings.length > 0) {
      try {
        const resultsPayload: Database['public']['Tables']['analysis_results']['Insert'][] = record.rankings.map(
          (r) => ({
            run_id: savedRunId,
            site_id: r.id,
            rank: r.rank,
            closeness: r.closeness,
            distance_to_ideal: r.distanceToIdeal,
            distance_to_anti_ideal: r.distanceToAntiIdeal,
            is_feasible: r.isFeasible ?? true,
          })
        )

        await supabase.from('analysis_results').insert(resultsPayload)
      } catch (resultsErr) {
        // Log but do not fail the overall run save
        console.warn('Could not insert into analysis_results:', resultsErr)
      }
    }

    // 3. Insert Monte Carlo summary into simulation_runs if available
    if (record.monteCarloSummary) {
      try {
        const simPayload: Database['public']['Tables']['simulation_runs']['Insert'] = {
          run_id: savedRunId,
          iterations: record.simulationParameters?.iterations ?? 1000,
          weight_spread: record.simulationParameters?.weightRelativeSpread ?? 0.2,
          seed: record.simulationParameters?.seed ?? 42,
          top_site_id: record.monteCarloSummary.topSiteId,
          top_site_win_rate: record.monteCarloSummary.topSiteWinRate,
          top_site_top3_rate: record.monteCarloSummary.topSiteTop3Rate,
          nominal_rank: record.monteCarloSummary.nominalRank,
          rank_distribution: (record.monteCarloSummary.rankDistribution as unknown) as Json,
        }

        await supabase.from('simulation_runs').insert(simPayload)
      } catch (simErr) {
        // Log but do not fail the overall run save
        console.warn('Could not insert into simulation_runs:', simErr)
      }
    }

    return { success: true, id: savedRunId }
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
