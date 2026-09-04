/**
 * Supabase schema types for project `fxqurlhvtbpmydwmfpzc` (Trackk).
 *
 * GENERATED FILE - do not edit by hand. Regenerate after any migration with:
 *
 *   supabase login                 # once per machine
 *   npm run db:types
 *
 * Last synced: 2026-09-04, after dropping profiles.full_name and adding the avatars bucket.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      blocked_users: {
        Row: { blocked_id: string; blocker_id: string; created_at: string };
        Insert: { blocked_id: string; blocker_id: string; created_at?: string };
        Update: { blocked_id?: string; blocker_id?: string; created_at?: string };
        Relationships: [];
      };
      food_logs: {
        Row: {
          carbs_g: number;
          carbs_per_100g_snapshot: number;
          consumed_at: string;
          created_at: string;
          deleted_at: string | null;
          fat_g: number;
          fat_per_100g_snapshot: number;
          food_id: string | null;
          food_name_snapshot: string;
          grams_equivalent: number;
          id: string;
          kcal_per_100g_snapshot: number;
          meal: Database['public']['Enums']['meal_type'];
          protein_g: number;
          protein_per_100g_snapshot: number;
          quantity: number;
          total_kcal: number;
          unit: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          carbs_g?: number;
          carbs_per_100g_snapshot?: number;
          consumed_at: string;
          created_at?: string;
          deleted_at?: string | null;
          fat_g?: number;
          fat_per_100g_snapshot?: number;
          food_id?: string | null;
          food_name_snapshot: string;
          grams_equivalent: number;
          id?: string;
          kcal_per_100g_snapshot: number;
          meal: Database['public']['Enums']['meal_type'];
          protein_g?: number;
          protein_per_100g_snapshot?: number;
          quantity: number;
          total_kcal: number;
          unit: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          carbs_g?: number;
          carbs_per_100g_snapshot?: number;
          consumed_at?: string;
          created_at?: string;
          deleted_at?: string | null;
          fat_g?: number;
          fat_per_100g_snapshot?: number;
          food_id?: string | null;
          food_name_snapshot?: string;
          grams_equivalent?: number;
          id?: string;
          kcal_per_100g_snapshot?: number;
          meal?: Database['public']['Enums']['meal_type'];
          protein_g?: number;
          protein_per_100g_snapshot?: number;
          quantity?: number;
          total_kcal?: number;
          unit?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_logs_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
        ];
      };
      food_reports: {
        Row: {
          created_at: string;
          detail: string | null;
          food_id: string;
          id: string;
          reason: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          food_id: string;
          id?: string;
          reason: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          food_id?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_reports_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
        ];
      };
      foods: {
        Row: {
          brand: string | null;
          carbs_per_100g: number;
          created_at: string;
          deleted_at: string | null;
          fat_per_100g: number;
          fiber_per_100g: number;
          id: string;
          is_shared: boolean;
          is_verified: boolean;
          kcal_per_100g: number;
          moderation_state: Database['public']['Enums']['moderation_state'];
          name: string;
          owner_user_id: string | null;
          protein_per_100g: number;
          report_count: number;
          revision: number;
          serving_grams: number | null;
          serving_size_label: string | null;
          sodium_mg_per_100g: number;
          source: Database['public']['Enums']['food_source'];
          sugar_per_100g: number;
          updated_at: string;
          usage_count: number;
        };
        Insert: {
          brand?: string | null;
          carbs_per_100g?: number;
          created_at?: string;
          deleted_at?: string | null;
          fat_per_100g?: number;
          fiber_per_100g?: number;
          id?: string;
          is_shared?: boolean;
          is_verified?: boolean;
          kcal_per_100g: number;
          moderation_state?: Database['public']['Enums']['moderation_state'];
          name: string;
          owner_user_id?: string | null;
          protein_per_100g?: number;
          report_count?: number;
          revision?: number;
          serving_grams?: number | null;
          serving_size_label?: string | null;
          sodium_mg_per_100g?: number;
          source?: Database['public']['Enums']['food_source'];
          sugar_per_100g?: number;
          updated_at?: string;
          usage_count?: number;
        };
        Update: {
          brand?: string | null;
          carbs_per_100g?: number;
          created_at?: string;
          deleted_at?: string | null;
          fat_per_100g?: number;
          fiber_per_100g?: number;
          id?: string;
          is_shared?: boolean;
          is_verified?: boolean;
          kcal_per_100g?: number;
          moderation_state?: Database['public']['Enums']['moderation_state'];
          name?: string;
          owner_user_id?: string | null;
          protein_per_100g?: number;
          report_count?: number;
          revision?: number;
          serving_grams?: number | null;
          serving_size_label?: string | null;
          sodium_mg_per_100g?: number;
          source?: Database['public']['Enums']['food_source'];
          sugar_per_100g?: number;
          updated_at?: string;
          usage_count?: number;
        };
        Relationships: [];
      };
      hydration_logs: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          logged_at: string;
          note: string | null;
          source: string | null;
          updated_at: string;
          user_id: string;
          volume_ml: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          logged_at: string;
          note?: string | null;
          source?: string | null;
          updated_at?: string;
          user_id: string;
          volume_ml: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          logged_at?: string;
          note?: string | null;
          source?: string | null;
          updated_at?: string;
          user_id?: string;
          volume_ml?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          age: number | null;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          height_cm: number | null;
          onboarding_completed_at: string | null;
          start_weight_kg: number | null;
          ugc_terms_accepted_at: string | null;
          updated_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          age?: number | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          height_cm?: number | null;
          onboarding_completed_at?: string | null;
          start_weight_kg?: number | null;
          ugc_terms_accepted_at?: string | null;
          updated_at?: string;
          user_id: string;
          username?: string | null;
        };
        Update: {
          age?: number | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          height_cm?: number | null;
          onboarding_completed_at?: string | null;
          start_weight_kg?: number | null;
          ugc_terms_accepted_at?: string | null;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          carbs_target_g: number | null;
          created_at: string;
          daily_calorie_goal: number | null;
          fat_target_g: number | null;
          goal: Database['public']['Enums']['goal_type'];
          goal_weight_kg: number | null;
          protein_target_g: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          carbs_target_g?: number | null;
          created_at?: string;
          daily_calorie_goal?: number | null;
          fat_target_g?: number | null;
          goal?: Database['public']['Enums']['goal_type'];
          goal_weight_kg?: number | null;
          protein_target_g?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          carbs_target_g?: number | null;
          created_at?: string;
          daily_calorie_goal?: number | null;
          fat_target_g?: number | null;
          goal?: Database['public']['Enums']['goal_type'];
          goal_weight_kg?: number | null;
          protein_target_g?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          activity_level: Database['public']['Enums']['activity_level'];
          created_at: string;
          notifications_enabled: boolean;
          theme: Database['public']['Enums']['theme_mode'];
          timezone: string;
          units: Database['public']['Enums']['unit_system'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activity_level?: Database['public']['Enums']['activity_level'];
          created_at?: string;
          notifications_enabled?: boolean;
          theme?: Database['public']['Enums']['theme_mode'];
          timezone?: string;
          units?: Database['public']['Enums']['unit_system'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activity_level?: Database['public']['Enums']['activity_level'];
          created_at?: string;
          notifications_enabled?: boolean;
          theme?: Database['public']['Enums']['theme_mode'];
          timezone?: string;
          units?: Database['public']['Enums']['unit_system'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          logged_at: string;
          note: string | null;
          updated_at: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          logged_at: string;
          note?: string | null;
          updated_at?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          logged_at?: string;
          note?: string | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      v_daily_hydration_summary: {
        Row: {
          entries_count: number | null;
          local_day: string | null;
          total_volume_ml: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_daily_nutrition_summary: {
        Row: {
          entries_count: number | null;
          local_day: string | null;
          total_carbs_g: number | null;
          total_fat_g: number | null;
          total_kcal: number | null;
          total_protein_g: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_latest_weight: {
        Row: {
          created_at: string | null;
          id: string | null;
          logged_at: string | null;
          note: string | null;
          updated_at: string | null;
          user_id: string | null;
          weight_kg: number | null;
        };
        Relationships: [];
      };
      v_streak_tracking_days: {
        Row: {
          event_count: number | null;
          has_food_log: boolean | null;
          has_hydration_log: boolean | null;
          has_weight_log: boolean | null;
          local_day: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      bump_food_usage: { Args: { target_food_id: string }; Returns: undefined };
      delete_own_account: { Args: never; Returns: undefined };
      search_shared_foods: {
        Args: { max_results?: number; search_query: string };
        Returns: {
          author_name: string;
          brand: string;
          carbs_per_100g: number;
          fat_per_100g: number;
          fiber_per_100g: number;
          id: string;
          is_mine: boolean;
          is_verified: boolean;
          kcal_per_100g: number;
          name: string;
          protein_per_100g: number;
          serving_grams: number;
          serving_size_label: string;
          sodium_mg_per_100g: number;
          sugar_per_100g: number;
          usage_count: number;
        }[];
      };
      shared_foods_since: {
        Args: { max_results?: number; since_revision?: number };
        Returns: {
          brand: string;
          carbs_per_100g: number;
          fat_per_100g: number;
          fiber_per_100g: number;
          id: string;
          is_available: boolean;
          is_verified: boolean;
          kcal_per_100g: number;
          name: string;
          protein_per_100g: number;
          revision: number;
          serving_grams: number;
          serving_size_label: string;
          sodium_mg_per_100g: number;
          sugar_per_100g: number;
          usage_count: number;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      activity_level: 'sedentary' | 'light' | 'moderate' | 'very';
      food_source: 'user' | 'seed';
      goal_type: 'lose' | 'maintain' | 'gain';
      meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
      moderation_state: 'visible' | 'hidden' | 'removed';
      theme_mode: 'auto' | 'light' | 'dark';
      unit_system: 'metric' | 'imperial';
    };
    CompositeTypes: Record<never, never>;
  };
};

type DefaultSchema = Database['public'];

export type Tables<T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
  (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T];

export type DbFunctions = DefaultSchema['Functions'];
