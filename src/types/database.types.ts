/**
-- LunarNavi Supabase Database Types
-- Auto-generated style definitions matching migration 20261122000000_create_lunarnavi_schema.sql
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string
          name: string
          organization: string
          url: string
          version: string | null
          retrieval_date: string | null
          processing_method: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          organization: string
          url: string
          version?: string | null
          retrieval_date?: string | null
          processing_method?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          organization?: string
          url?: string
          version?: string | null
          retrieval_date?: string | null
          processing_method?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      criteria_definitions: {
        Row: {
          id: string
          name: string
          direction: 'benefit' | 'cost'
          unit: string
          default_weight: number
          description: string
          rationale: string | null
          source_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          direction: 'benefit' | 'cost'
          unit: string
          default_weight: number
          description: string
          rationale?: string | null
          source_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          direction?: 'benefit' | 'cost'
          unit?: string
          default_weight?: number
          description?: string
          rationale?: string | null
          source_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          id: string
          mission_type: 'science' | 'resource' | 'crewed' | 'communication'
          name: string
          description: string
          default_weights: Json
          constraints: Json
          is_official_preset: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          mission_type: 'science' | 'resource' | 'crewed' | 'communication'
          name: string
          description: string
          default_weights: Json
          constraints?: Json
          is_official_preset?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mission_type?: 'science' | 'resource' | 'crewed' | 'communication'
          name?: string
          description?: string
          default_weights?: Json
          constraints?: Json
          is_official_preset?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lunar_sites: {
        Row: {
          id: string
          name: string
          region: string
          latitude: number
          longitude: number
          elevation_m: number
          slope_deg: number
          slope_low: number | null
          slope_high: number | null
          roughness_m: number
          roughness_low: number | null
          roughness_high: number | null
          illumination_pct: number
          illumination_low: number | null
          illumination_high: number | null
          resource_score: number
          resource_low: number | null
          resource_high: number | null
          resource_evidence_kind: 'direct-observation' | 'scientific-evidence' | 'proxy' | 'unknown'
          communication_pct: number
          communication_low: number | null
          communication_high: number | null
          scientific_value: number | null
          scientific_value_low: number | null
          scientific_value_high: number | null
          designation: 'official-artemis-candidate' | 'scientific-research-location'
          source_organization: string
          source_url: string
          coordinate_frame: string
          coordinate_status: string
          is_psr: boolean
          psr_distance_km: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          region: string
          latitude: number
          longitude: number
          elevation_m: number
          slope_deg: number
          slope_low?: number | null
          slope_high?: number | null
          roughness_m: number
          roughness_low?: number | null
          roughness_high?: number | null
          illumination_pct: number
          illumination_low?: number | null
          illumination_high?: number | null
          resource_score: number
          resource_low?: number | null
          resource_high?: number | null
          resource_evidence_kind: 'direct-observation' | 'scientific-evidence' | 'proxy' | 'unknown'
          communication_pct: number
          communication_low?: number | null
          communication_high?: number | null
          scientific_value?: number | null
          scientific_value_low?: number | null
          scientific_value_high?: number | null
          designation: 'official-artemis-candidate' | 'scientific-research-location'
          source_organization: string
          source_url: string
          coordinate_frame?: string
          coordinate_status?: string
          is_psr?: boolean
          psr_distance_km?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          region?: string
          latitude?: number
          longitude?: number
          elevation_m?: number
          slope_deg?: number
          slope_low?: number | null
          slope_high?: number | null
          roughness_m?: number
          roughness_low?: number | null
          roughness_high?: number | null
          illumination_pct?: number
          illumination_low?: number | null
          illumination_high?: number | null
          resource_score?: number
          resource_low?: number | null
          resource_high?: number | null
          resource_evidence_kind?: 'direct-observation' | 'scientific-evidence' | 'proxy' | 'unknown'
          communication_pct?: number
          communication_low?: number | null
          communication_high?: number | null
          scientific_value?: number | null
          scientific_value_low?: number | null
          scientific_value_high?: number | null
          designation?: 'official-artemis-candidate' | 'scientific-research-location'
          source_organization?: string
          source_url?: string
          coordinate_frame?: string
          coordinate_status?: string
          is_psr?: boolean
          psr_distance_km?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      analysis_runs: {
        Row: {
          id: string
          mission_id: string | null
          mission_type: string
          weights: Json
          constraints: Json
          total_sites_evaluated: number
          feasible_sites_count: number
          primary_site_id: string | null
          primary_score: number | null
          backup_site_id: string | null
          rankings: Json
          simulation_parameters: Json | null
          monte_carlo_summary: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mission_id?: string | null
          mission_type: string
          weights: Json
          constraints: Json
          total_sites_evaluated: number
          feasible_sites_count: number
          primary_site_id?: string | null
          primary_score?: number | null
          backup_site_id?: string | null
          rankings: Json
          simulation_parameters?: Json | null
          monte_carlo_summary?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mission_id?: string | null
          mission_type?: string
          weights?: Json
          constraints?: Json
          total_sites_evaluated?: number
          feasible_sites_count?: number
          primary_site_id?: string | null
          primary_score?: number | null
          backup_site_id?: string | null
          rankings?: Json
          simulation_parameters?: Json | null
          monte_carlo_summary?: Json | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
