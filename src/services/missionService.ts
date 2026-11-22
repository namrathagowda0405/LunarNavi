import { supabase, isSupabaseConfigured } from './supabaseClient'
import {
  DEFAULT_MISSION_PROFILES,
  MissionProfile,
  getDefaultMissionProfile,
} from '../engine/mission'
import { MissionTypeId } from '../frontend/missionTypes'
import { Database, Json } from '../types/database.types'

export type LegacyMissionRow = Database['public']['Tables']['missions']['Row']
export type MissionProfileRow = Database['public']['Tables']['mission_profiles']['Row']
export type MissionCriteriaWeightRow = Database['public']['Tables']['mission_criteria_weights']['Row']

/**
 * Maps a legacy database row to the engine MissionProfile interface.
 */
export function mapRowToMissionProfile(row: LegacyMissionRow): MissionProfile {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    weights: (row.default_weights as unknown) as Record<string, number>,
    constraints: (row.constraints as unknown) as MissionProfile['constraints'],
  }
}

/**
 * Fetches all available mission profiles from Supabase with local fallback.
 * Checks:
 * 1. Normalized 10-table schema (mission_profiles + mission_criteria_weights)
 * 2. Legacy schema (missions)
 * 3. Local engine presets (DEFAULT_MISSION_PROFILES)
 */
export async function fetchMissionProfiles(): Promise<{
  profiles: MissionProfile[]
  source: 'supabase' | 'local'
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { profiles: Object.values(DEFAULT_MISSION_PROFILES), source: 'local' }
  }

  // 1. Try fetching from 10-table schema (mission_profiles + mission_criteria_weights)
  try {
    const { data: profilesData, error: profilesError } = await supabase
      .from('mission_profiles')
      .select('*')
      .order('id', { ascending: true })

    if (!profilesError && profilesData && profilesData.length > 0) {
      // Fetch associated criteria weights
      let weightsByMission = new Map<string, Record<string, number>>()
      try {
        const { data: weightsData } = await supabase
          .from('mission_criteria_weights')
          .select('*')

        if (weightsData && weightsData.length > 0) {
          for (const w of weightsData) {
            if (!weightsByMission.has(w.mission_id)) {
              weightsByMission.set(w.mission_id, {})
            }
            weightsByMission.get(w.mission_id)![w.criterion_id] = Number(w.weight)
          }
        }
      } catch {
        // Fall back to default preset weights if weights table is unavailable
      }

      const mapped: MissionProfile[] = profilesData.map((p) => {
        const defaultWeights = DEFAULT_MISSION_PROFILES[p.mission_type as MissionTypeId]?.weights || {}
        const assignedWeights = weightsByMission.get(p.id) || defaultWeights
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          weights: assignedWeights,
          constraints: (p.constraints as unknown) as MissionProfile['constraints'],
        }
      })

      return { profiles: mapped, source: 'supabase' }
    }
  } catch {
    // Proceed to legacy missions check
  }

  // 2. Try fetching from legacy missions table
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('id', { ascending: true })

    if (!error && data && data.length > 0) {
      return {
        profiles: data.map(mapRowToMissionProfile),
        source: 'supabase',
      }
    }
  } catch {
    // Proceed to local fallback
  }

  return { profiles: Object.values(DEFAULT_MISSION_PROFILES), source: 'local' }
}

/**
 * Saves a user-customized mission configuration to Supabase.
 * Updates both 10-table normalized schema and legacy missions table if available.
 */
export async function saveCustomMissionProfile(
  profile: MissionProfile,
  typeId: MissionTypeId
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: true,
      id: profile.id,
      error: 'Stored in local memory (Supabase unconfigured)',
    }
  }

  try {
    // 1. Upsert to 10-table mission_profiles
    try {
      const profilePayload = {
        id: profile.id,
        mission_type: typeId,
        name: profile.name,
        description: profile.description,
        constraints: (profile.constraints as unknown) as Json,
        is_official_preset: false,
      }

      await supabase
        .from('mission_profiles')
        .upsert(profilePayload, { onConflict: 'id' })

      // Upsert weights to mission_criteria_weights
      const weightEntries = Object.entries(profile.weights).map(([critId, wt]) => ({
        id: `${profile.id}-${critId}`,
        mission_id: profile.id,
        criterion_id: critId,
        weight: wt,
      }))

      if (weightEntries.length > 0) {
        await supabase
          .from('mission_criteria_weights')
          .upsert(weightEntries, { onConflict: 'id' })
      }
    } catch {
      // Proceed to legacy table upsert
    }

    // 2. Also upsert to legacy missions table for full backward compatibility
    try {
      const insertPayload: Database['public']['Tables']['missions']['Insert'] = {
        id: profile.id,
        mission_type: typeId,
        name: profile.name,
        description: profile.description,
        default_weights: profile.weights,
        constraints: profile.constraints as unknown as Database['public']['Tables']['missions']['Insert']['constraints'],
        is_official_preset: false,
      }

      await supabase
        .from('missions')
        .upsert(insertPayload, { onConflict: 'id' })
    } catch {
      // Ignore legacy errors if 10-table succeeded
    }

    return { success: true, id: profile.id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

/**
 * Retrieves a mission profile by type ID with fallback.
 */
export function getMissionProfileByType(typeId: MissionTypeId): MissionProfile {
  return getDefaultMissionProfile(typeId)
}
