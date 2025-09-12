export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements_cache: {
        Row: {
          audio_data: string
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          language: string
          operator_id: string
        }
        Insert: {
          audio_data: string
          cache_key: string
          created_at?: string
          expires_at?: string
          id?: string
          language: string
          operator_id: string
        }
        Update: {
          audio_data?: string
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          language?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_cache_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          location: string | null
          name: string
          operator_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          location?: string | null
          name: string
          operator_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          location?: string | null
          name?: string
          operator_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          branch_id: string
          created_at: string
          departure_time: string
          destination: string
          estimated_time: string | null
          fleet_id: string | null
          fleet_image_url: string | null
          fleet_type: Database["public"]["Enums"]["fleet_type"]
          id: string
          plate_number: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          departure_time: string
          destination: string
          estimated_time?: string | null
          fleet_id?: string | null
          fleet_image_url?: string | null
          fleet_type: Database["public"]["Enums"]["fleet_type"]
          id?: string
          plate_number: string
          status: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          departure_time?: string
          destination?: string
          estimated_time?: string | null
          fleet_id?: string | null
          fleet_image_url?: string | null
          fleet_type?: Database["public"]["Enums"]["fleet_type"]
          id?: string
          plate_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departures_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_new_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          capacity: number | null
          created_at: string
          fleet_image_url: string | null
          fleet_type: Database["public"]["Enums"]["fleet_type"]
          id: string
          is_active: boolean | null
          name: string
          operator_id: string
          plate_number: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          fleet_image_url?: string | null
          fleet_type: Database["public"]["Enums"]["fleet_type"]
          id?: string
          is_active?: boolean | null
          name: string
          operator_id: string
          plate_number: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          fleet_image_url?: string | null
          fleet_type?: Database["public"]["Enums"]["fleet_type"]
          id?: string
          is_active?: boolean | null
          name?: string
          operator_id?: string
          plate_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      khmer_voice_scores: {
        Row: {
          created_at: string
          final_score: number
          id: string
          khmer_penalty: number
          operator_id: string | null
          original_score: number
          similarity_score: number
          test_date: string
          test_text: string
          transcribed_text: string | null
          updated_at: string
          voice_name: string
        }
        Insert: {
          created_at?: string
          final_score?: number
          id?: string
          khmer_penalty?: number
          operator_id?: string | null
          original_score?: number
          similarity_score?: number
          test_date?: string
          test_text: string
          transcribed_text?: string | null
          updated_at?: string
          voice_name: string
        }
        Update: {
          created_at?: string
          final_score?: number
          id?: string
          khmer_penalty?: number
          operator_id?: string | null
          original_score?: number
          similarity_score?: number
          test_date?: string
          test_text?: string
          transcribed_text?: string | null
          updated_at?: string
          voice_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "khmer_voice_scores_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_admins: {
        Row: {
          created_at: string
          id: string
          operator_id: string | null
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          operator_id?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          operator_id?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_admins_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_settings: {
        Row: {
          announcement_repeat_count: number
          announcement_scripts: Json
          auto_announcement_enabled: boolean
          created_at: string
          id: string
          operator_id: string
          updated_at: string
          voice_enabled: boolean
        }
        Insert: {
          announcement_repeat_count?: number
          announcement_scripts?: Json
          auto_announcement_enabled?: boolean
          created_at?: string
          id?: string
          operator_id: string
          updated_at?: string
          voice_enabled?: boolean
        }
        Update: {
          announcement_repeat_count?: number
          announcement_scripts?: Json
          auto_announcement_enabled?: boolean
          created_at?: string
          id?: string
          operator_id?: string
          updated_at?: string
          voice_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "operator_settings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: true
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          operator_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          operator_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          operator_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_preferences: {
        Row: {
          auto_selected_voice: string | null
          created_at: string
          id: string
          is_manual_override: boolean
          last_optimization_date: string | null
          operator_id: string | null
          preferred_voice: string
          tts_settings: Json
          updated_at: string
          voice_candidates: Json
        }
        Insert: {
          auto_selected_voice?: string | null
          created_at?: string
          id?: string
          is_manual_override?: boolean
          last_optimization_date?: string | null
          operator_id?: string | null
          preferred_voice?: string
          tts_settings?: Json
          updated_at?: string
          voice_candidates?: Json
        }
        Update: {
          auto_selected_voice?: string | null
          created_at?: string
          id?: string
          is_manual_override?: boolean
          last_optimization_date?: string | null
          operator_id?: string | null
          preferred_voice?: string
          tts_settings?: Json
          updated_at?: string
          voice_candidates?: Json
        }
        Relationships: [
          {
            foreignKeyName: "voice_preferences_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: true
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_operator_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      set_user_context: {
        Args: { user_role?: string; username: string } | { username: string }
        Returns: undefined
      }
    }
    Enums: {
      fleet_type: "VIP Van" | "Bus" | "Sleeping Bus"
      user_role: "super_admin" | "operator_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fleet_type: ["VIP Van", "Bus", "Sleeping Bus"],
      user_role: ["super_admin", "operator_admin"],
    },
  },
} as const
