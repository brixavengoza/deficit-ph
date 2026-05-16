export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          username: string | null;
          email: string | null;
          avatar_url: string | null;
          age: number | null;
          height_cm: number | null;
          start_weight_kg: number | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          username?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          age?: number | null;
          height_cm?: number | null;
          start_weight_kg?: number | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      user_preferences: {
        Row: {
          user_id: string;
          units: Database['public']['Enums']['unit_system'];
          theme: Database['public']['Enums']['theme_mode'];
          notifications_enabled: boolean;
          activity_level: Database['public']['Enums']['activity_level'];
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          units?: Database['public']['Enums']['unit_system'];
          theme?: Database['public']['Enums']['theme_mode'];
          notifications_enabled?: boolean;
          activity_level?: Database['public']['Enums']['activity_level'];
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      user_goals: {
        Row: {
          user_id: string;
          goal: Database['public']['Enums']['goal_type'];
          goal_weight_kg: number | null;
          daily_calorie_goal: number | null;
          protein_target_g: number | null;
          carbs_target_g: number | null;
          fat_target_g: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          goal?: Database['public']['Enums']['goal_type'];
          goal_weight_kg?: number | null;
          daily_calorie_goal?: number | null;
          protein_target_g?: number | null;
          carbs_target_g?: number | null;
          fat_target_g?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_goals']['Insert']>;
      };
      foods: {
        Row: {
          id: string;
          owner_user_id: string | null;
          name: string;
          kcal_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          fat_per_100g: number;
          serving_size_label: string | null;
          source: Database['public']['Enums']['food_source'];
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id?: string | null;
          name: string;
          kcal_per_100g: number;
          protein_per_100g?: number;
          carbs_per_100g?: number;
          fat_per_100g?: number;
          serving_size_label?: string | null;
          source?: Database['public']['Enums']['food_source'];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['foods']['Insert']>;
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_id: string | null;
          food_name_snapshot: string;
          kcal_per_100g_snapshot: number;
          protein_per_100g_snapshot: number;
          carbs_per_100g_snapshot: number;
          fat_per_100g_snapshot: number;
          quantity: number;
          unit: string;
          grams_equivalent: number;
          meal: Database['public']['Enums']['meal_type'];
          consumed_at: string;
          total_kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_id?: string | null;
          food_name_snapshot: string;
          kcal_per_100g_snapshot: number;
          protein_per_100g_snapshot?: number;
          carbs_per_100g_snapshot?: number;
          fat_per_100g_snapshot?: number;
          quantity: number;
          unit: string;
          grams_equivalent: number;
          meal: Database['public']['Enums']['meal_type'];
          consumed_at: string;
          total_kcal: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['food_logs']['Insert']>;
      };
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          weight_kg: number;
          note: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_at: string;
          weight_kg: number;
          note?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['weight_logs']['Insert']>;
      };
      hydration_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          volume_ml: number;
          note: string | null;
          source: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_at: string;
          volume_ml: number;
          note?: string | null;
          source?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['hydration_logs']['Insert']>;
      };
    };
    Views: {
      v_daily_nutrition_summary: {
        Row: {
          user_id: string | null;
          local_day: string | null;
          entries_count: number | null;
          total_kcal: number | null;
          total_protein_g: number | null;
          total_carbs_g: number | null;
          total_fat_g: number | null;
        };
      };
      v_daily_hydration_summary: {
        Row: {
          user_id: string | null;
          local_day: string | null;
          entries_count: number | null;
          total_volume_ml: number | null;
        };
      };
      v_latest_weight: {
        Row: {
          user_id: string | null;
          id: string | null;
          logged_at: string | null;
          weight_kg: number | null;
          note: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      v_streak_tracking_days: {
        Row: {
          user_id: string | null;
          local_day: string | null;
          has_food_log: boolean | null;
          has_hydration_log: boolean | null;
          has_weight_log: boolean | null;
          event_count: number | null;
        };
      };
    };
    Enums: {
      goal_type: 'lose' | 'maintain' | 'gain';
      activity_level: 'sedentary' | 'light' | 'moderate' | 'very';
      unit_system: 'metric' | 'imperial';
      theme_mode: 'auto' | 'light' | 'dark';
      meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
      food_source: 'user' | 'seed';
    };
  };
};
