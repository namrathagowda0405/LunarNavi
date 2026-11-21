/**
 * LunarNavi Supabase Database Types
 *
 * Comprehensive TypeScript definitions matching both:
 * 1. The 10 foundational normalized tables created in Supabase:
 *    - data_sources
 *    - dataset_versions
 *    - lunar_sites
 *    - criteria
 *    - site_measurements
 *    - mission_profiles
 *    - mission_criteria_weights
 *    - analysis_runs
 *    - analysis_results
 *    - simulation_runs
 * 2. Legacy schema compatibility tables:
 *    - sources
 *    - criteria_definitions
 *    - missions
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
      // ------------------------------------------------------------------------
      // 1. DATA SOURCES (Authoritative Organizations & Missions)
      // ------------------------------------------------------------------------
      data_sources: {
        Row: {
          id: string
          name: string
          organization: string
          url: string
          description: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          organization: string
          url: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          organization?: string
          url?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ------------------------------------------------------------------------
      // 2. DATASET VERSIONS (Specific Instrument Releases & Baselines)
      // ------------------------------------------------------------------------
      dataset_versions: {
        Row: {
          id: string
          source_id: string
          version_name: string
          retrieval_date: string | null
          processing_method: string | null
          resolution: string | null
          created_at: string
        }
        Insert: {
          id: string
          source_id: string
          version_name: string
          retrieval_date?: string | null
          processing_method?: string | null
          resolution?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          version_name?: string
          retrieval_date?: string | null
          processing_method?: string | null
          resolution?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dataset_versions_source_id_fkey'
            columns: ['source_id']
            referencedRelation: 'data_sources'
            referencedColumns: ['id']
          }
        ]
      }

      // ------------------------------------------------------------------------
      // 3. LUNAR SITES (Curated Landing Locations & Coordinates)
      // ------------------------------------------------------------------------
      lunar_sites: {
        Row: {
          id: string
          name: string
          region: string
          latitude: number
          longitude: number
          elevation_m: number
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
          // Flattened compatibility fields (optional in 10-table schema)
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
        }
        Insert: {
          id: string
          name: string
          region: string
          latitude: number
          longitude: number
          elevation_m: number
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
        }
        Update: {
          id?: string
          name?: string
          region?: string
          latitude?: number
          longitude?: number
          elevation_m?: number
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
        }
        Relationships: []
      }

      // ------------------------------------------------------------------------
      // 4. CRITERIA (Scientific Evaluation Criteria Specifications)
      // ------------------------------------------------------------------------
      criteria: {
        Row: {
          id: string
          name: string
          direction: 'benefit' | 'cost'
          unit: string
          default_weight: number
          description: string
          rationale: string | null
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
          created_at?: string
        }
        Relationships: []
      }

      // ------------------------------------------------------------------------
      // 5. SITE MEASUREMENTS (Normalized Measurements & Uncertainty Bounds)
      // ------------------------------------------------------------------------
      site_measurements: {
        Row: {
          id: string
          site_id: string
          criterion_id: string
          dataset_version_id: string | null
          value: number | null
          uncertainty_low: number | null
          uncertainty_high: number | null
          unit: string
          value_kind: 'measured' | 'derived' | 'estimated'
          quality_rating: 'high' | 'medium' | 'low'
          source_citation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          criterion_id: string
          dataset_version_id?: string | null
          value: number | null
          uncertainty_low?: number | null
          uncertainty_high?: number | null
          unit: string
          value_kind: 'measured' | 'derived' | 'estimated'
          quality_rating: 'high' | 'medium' | 'low'
          source_citation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          criterion_id?: string
          dataset_version_id?: string | null
          value?: number | null
          uncertainty_low?: number | null
          uncertainty_high?: number | null
          unit?: string
          value_kind?: 'measured' | 'derived' | 'estimated'
          quality_rating?: 'high' | 'medium' | 'low'
          source_citation?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'site_measurements_site_id_fkey'
            columns: ['site_id']
            referencedRelation: 'lunar_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'site_measurements_criterion_id_fkey'
            columns: ['criterion_id']
            referencedRelation: 'criteria'
            referencedColumns: ['id']
          }
        ]
      }

      // ------------------------------------------------------------------------
      // 6. MISSION PROFILES (Operational Objectives & Constraints)
      // ------------------------------------------------------------------------
      mission_profiles: {
        Row: {
          id: string
          mission_type: 'science' | 'resource' | 'crewed' | 'communication'
          name: string
          description: string
          is_official_preset: boolean
          constraints: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          mission_type: 'science' | 'resource' | 'crewed' | 'communication'
          name: string
          description: string
          is_official_preset?: boolean
          constraints?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mission_type?: 'science' | 'resource' | 'crewed' | 'communication'
          name?: string
          description?: string
          is_official_preset?: boolean
          constraints?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // ------------------------------------------------------------------------
      // 7. MISSION CRITERIA WEIGHTS (Normalized Weight Allocations)
      // ------------------------------------------------------------------------
      mission_criteria_weights: {
        Row: {
          id: string
          mission_id: string
          criterion_id: string
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          mission_id: string
          criterion_id: string
          weight: number
          created_at?: string
        }
        Update: {
          id?: string
          mission_id?: string
          criterion_id?: string
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mission_criteria_weights_mission_id_fkey'
            columns: ['mission_id']
            referencedRelation: 'mission_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mission_criteria_weights_criterion_id_fkey'
            columns: ['criterion_id']
            referencedRelation: 'criteria'
            referencedColumns: ['id']
          }
        ]
      }

      // ------------------------------------------------------------------------
      // 8. ANALYSIS RUNS (Decision Audit Ledger)
      // ------------------------------------------------------------------------
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
          rankings?: Json
          simulation_parameters?: Json | null
          monte_carlo_summary?: Json | null
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
          rankings?: Json
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

      // ------------------------------------------------------------------------
      // 9. ANALYSIS RESULTS (Per-Site TOPSIS Output for Each Run)
      // ------------------------------------------------------------------------
      analysis_results: {
        Row: {
          id: string
          run_id: string
          site_id: string
          rank: number
          closeness: number
          distance_to_ideal: number
          distance_to_anti_ideal: number
          is_feasible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          site_id: string
          rank: number
          closeness: number
          distance_to_ideal: number
          distance_to_anti_ideal: number
          is_feasible?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          site_id?: string
          rank?: number
          closeness?: number
          distance_to_ideal?: number
          distance_to_anti_ideal?: number
          is_feasible?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_results_run_id_fkey'
            columns: ['run_id']
            referencedRelation: 'analysis_runs'
            referencedColumns: ['id']
          }
        ]
      }

      // ------------------------------------------------------------------------
      // 10. SIMULATION RUNS (Monte Carlo Sensitivity Statistics)
      // ------------------------------------------------------------------------
      simulation_runs: {
        Row: {
          id: string
          run_id: string
          iterations: number
          weight_spread: number
          seed: number
          top_site_id: string
          top_site_win_rate: number
          top_site_top3_rate: number
          nominal_rank: number | null
          rank_distribution: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          iterations: number
          weight_spread: number
          seed: number
          top_site_id: string
          top_site_win_rate: number
          top_site_top3_rate: number
          nominal_rank?: number | null
          rank_distribution?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          iterations?: number
          weight_spread?: number
          seed?: number
          top_site_id?: string
          top_site_win_rate?: number
          top_site_top3_rate?: number
          nominal_rank?: number | null
          rank_distribution?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'simulation_runs_run_id_fkey'
            columns: ['run_id']
            referencedRelation: 'analysis_runs'
            referencedColumns: ['id']
          }
        ]
      }

      // ------------------------------------------------------------------------
      // BACKWARD COMPATIBILITY TABLES (5-Table Flattened Schema Support)
      // ------------------------------------------------------------------------
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
