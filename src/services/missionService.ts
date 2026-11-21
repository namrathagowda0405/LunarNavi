import { supabase, isSupabaseConfigured } from './supabaseClient'
import {
  DEFAULT_MISSION_PROFILES,
  MissionProfile,
  getDefaultMissionProfile,
} from '../engine/mission'
import { MissionTypeId } from '../frontend/missionTypes'
import { Database } from '../types/database.types'

type MissionRow = Database['public']['Tables']['missions']['Row']

/**
 * Maps a database row to the engine MissionProfile interface.
 */
export function mapRowToMissionProfile(row: MissionRow): MissionProfile {
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
 */
export async function fetchMissionProfiles(): Promise<{
  profiles: MissionProfile[]
  source: 'supabase' | 'local'
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { profiles: Object.values(DEFAULT_MISSION_PROFILES), source: 'local' }
  }

  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('id', { ascending: true })

    if (error || !data || data.length === 0) {
      return { profiles: Object.values(DEFAULT_MISSION_PROFILES), source: 'local' }
    }

    return {
      profiles: data.map(mapRowToMissionProfile),
      source: 'supabase',
    }
  } catch {
    return { profiles: Object.values(DEFAULT_MISSION_PROFILES), source: 'local' }
  }
}

/**
 * Saves a user-customized mission configuration to Supabase.
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
    const insertPayload: Database['public']['Tables']['missions']['Insert'] = {
      id: profile.id,
      mission_type: typeId,
      name: profile.name,
      description: profile.description,
      default_weights: profile.weights,
      constraints: profile.constraints as unknown as Database['public']['Tables']['missions']['Insert']['constraints'],
      is_official_preset: false,
    }

    const { data, error } = await supabase
      .from('missions')
      .upsert(insertPayload, { onConflict: 'id' })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data.id }
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
