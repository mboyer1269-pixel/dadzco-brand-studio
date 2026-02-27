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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generation_logs: {
        Row: {
          collection_id: string | null
          created_at: string
          design_id: string | null
          duration_ms: number | null
          error_message: string | null
          estimated_cost: number | null
          fallback_from: string | null
          fallback_used: boolean | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model_provider: string
          model_used: string
          output_tokens: number | null
          status: string
          task_type: string
          user_id: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          design_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          fallback_from?: string | null
          fallback_used?: boolean | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_provider: string
          model_used: string
          output_tokens?: number | null
          status?: string
          task_type: string
          user_id?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          design_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          fallback_from?: string | null
          fallback_used?: boolean | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_provider?: string
          model_used?: string
          output_tokens?: number | null
          status?: string
          task_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_logs_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_logs_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_rules: {
        Row: {
          brand_file_id: string | null
          category: string
          created_at: string
          forbidden_keywords: Json | null
          id: string
          palette: Json | null
          raw_summary: string | null
          rules: Json
          rules_locked: boolean
          typography: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_file_id?: string | null
          category?: string
          created_at?: string
          forbidden_keywords?: Json | null
          id?: string
          palette?: Json | null
          raw_summary?: string | null
          rules?: Json
          rules_locked?: boolean
          typography?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_file_id?: string | null
          category?: string
          created_at?: string
          forbidden_keywords?: Json | null
          id?: string
          palette?: Json | null
          raw_summary?: string | null
          rules?: Json
          rules_locked?: boolean
          typography?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_rules_brand_file_id_fkey"
            columns: ["brand_file_id"]
            isOneToOne: false
            referencedRelation: "brand_files"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_events: {
        Row: {
          collection_id: string
          created_at: string
          event_type: string
          forced: boolean | null
          from_status: string | null
          gate_results: Json | null
          id: string
          to_status: string | null
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          event_type: string
          forced?: boolean | null
          from_status?: string | null
          gate_results?: Json | null
          id?: string
          to_status?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          event_type?: string
          forced?: boolean | null
          from_status?: string | null
          gate_results?: Json | null
          id?: string
          to_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_events_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          collection_id: string
          cost: number | null
          created_at: string
          design_id: string
          id: string
          margin: number | null
          personalization: boolean | null
          position: number | null
          retail_price: number | null
          sku: string | null
        }
        Insert: {
          collection_id: string
          cost?: number | null
          created_at?: string
          design_id: string
          id?: string
          margin?: number | null
          personalization?: boolean | null
          position?: number | null
          retail_price?: number | null
          sku?: string | null
        }
        Update: {
          collection_id?: string
          cost?: number | null
          created_at?: string
          design_id?: string
          id?: string
          margin?: number | null
          personalization?: boolean | null
          position?: number | null
          retail_price?: number | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_scores: {
        Row: {
          adn_alignment: number
          anti_kitsch_compliance: number
          collection_id: string
          created_at: string
          final_score: number
          id: string
          margin_strength: number
          market_differentiation: number
          pod_feasibility: number
          scored_at: string
          scored_by: string | null
          viral_potential: number
        }
        Insert: {
          adn_alignment?: number
          anti_kitsch_compliance?: number
          collection_id: string
          created_at?: string
          final_score?: number
          id?: string
          margin_strength?: number
          market_differentiation?: number
          pod_feasibility?: number
          scored_at?: string
          scored_by?: string | null
          viral_potential?: number
        }
        Update: {
          adn_alignment?: number
          anti_kitsch_compliance?: number
          collection_id?: string
          created_at?: string
          final_score?: number
          id?: string
          margin_strength?: number
          market_differentiation?: number
          pod_feasibility?: number
          scored_at?: string
          scored_by?: string | null
          viral_potential?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_scores_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          adn_score: number | null
          created_at: string
          description: string | null
          final_score: number | null
          financial_gate_passed: boolean | null
          id: string
          lifecycle_status: string
          margin_validated: boolean | null
          metadata: Json | null
          name: string
          risk_score: number | null
          season: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adn_score?: number | null
          created_at?: string
          description?: string | null
          final_score?: number | null
          financial_gate_passed?: boolean | null
          id?: string
          lifecycle_status?: string
          margin_validated?: boolean | null
          metadata?: Json | null
          name: string
          risk_score?: number | null
          season?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adn_score?: number | null
          created_at?: string
          description?: string | null
          final_score?: number | null
          financial_gate_passed?: boolean | null
          id?: string
          lifecycle_status?: string
          margin_validated?: boolean | null
          metadata?: Json | null
          name?: string
          risk_score?: number | null
          season?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_tags: {
        Row: {
          design_id: string
          tag_id: string
        }
        Insert: {
          design_id: string
          tag_id: string
        }
        Update: {
          design_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_tags_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      design_versions: {
        Row: {
          created_at: string
          design_id: string
          id: string
          image_url: string | null
          metadata: Json | null
          prompt: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          design_id: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          prompt?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          design_id?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          prompt?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_versions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          metadata: Json | null
          mode: string
          negative_space_pct: number | null
          palette_locked: boolean | null
          print_type: string | null
          product_type: string | null
          prompt: string | null
          seed: number | null
          status: string
          style_strength: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          mode?: string
          negative_space_pct?: number | null
          palette_locked?: boolean | null
          print_type?: string | null
          product_type?: string | null
          prompt?: string | null
          seed?: number | null
          status?: string
          style_strength?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          mode?: string
          negative_space_pct?: number | null
          palette_locked?: boolean | null
          print_type?: string | null
          product_type?: string | null
          prompt?: string | null
          seed?: number | null
          status?: string
          style_strength?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      export_pack_items: {
        Row: {
          cost_cad: number | null
          created_at: string
          export_pack_id: string
          id: string
          margin: number | null
          mockup_url: string | null
          printfile_placeholders: Json | null
          product_type: string | null
          retail_price_cad: number | null
          sku_name: string
        }
        Insert: {
          cost_cad?: number | null
          created_at?: string
          export_pack_id: string
          id?: string
          margin?: number | null
          mockup_url?: string | null
          printfile_placeholders?: Json | null
          product_type?: string | null
          retail_price_cad?: number | null
          sku_name: string
        }
        Update: {
          cost_cad?: number | null
          created_at?: string
          export_pack_id?: string
          id?: string
          margin?: number | null
          mockup_url?: string | null
          printfile_placeholders?: Json | null
          product_type?: string | null
          retail_price_cad?: number | null
          sku_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_pack_items_export_pack_id_fkey"
            columns: ["export_pack_id"]
            isOneToOne: false
            referencedRelation: "export_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      export_packs: {
        Row: {
          collection_id: string
          created_at: string
          created_by: string
          folder_path: string
          id: string
          manifest: Json
          status: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          created_by: string
          folder_path: string
          id?: string
          manifest?: Json
          status?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          created_by?: string
          folder_path?: string
          id?: string
          manifest?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_packs_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          created_at: string
          export_type: string
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          export_type: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          export_type?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_tasks: {
        Row: {
          cash_alert: boolean
          category: string
          collection_id: string | null
          created_at: string
          date: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_alert?: boolean
          category?: string
          collection_id?: string | null
          created_at?: string
          date: string
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_alert?: boolean
          category?: string
          collection_id?: string | null
          created_at?: string
          date?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_tasks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      production_jobs: {
        Row: {
          collection_id: string | null
          completed_at: string | null
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          model_id: string | null
          provider: string
          sku_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          collection_id?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          model_id?: string | null
          provider?: string
          sku_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          collection_id?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          model_id?: string | null
          provider?: string
          sku_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          collection_id: string | null
          created_at: string
          design_id: string | null
          hero_image_brief: string | null
          id: string
          instagram_caption: string | null
          mythology: string | null
          punchlines: string[] | null
          shopify_description: string | null
          status: string
          tiktok_caption: string | null
          updated_at: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          design_id?: string | null
          hero_image_brief?: string | null
          id?: string
          instagram_caption?: string | null
          mythology?: string | null
          punchlines?: string[] | null
          shopify_description?: string | null
          status?: string
          tiktok_caption?: string | null
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          design_id?: string | null
          hero_image_brief?: string | null
          id?: string
          instagram_caption?: string | null
          mythology?: string | null
          punchlines?: string[] | null
          shopify_description?: string | null
          status?: string
          tiktok_caption?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_alerts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          severity: string
          title: string
          trigger_day: number | null
          trigger_type: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          severity?: string
          title: string
          trigger_day?: number | null
          trigger_type?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          severity?: string
          title?: string
          trigger_day?: number | null
          trigger_type?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      collection_lifecycle_status:
        | "idea"
        | "strategy_review"
        | "mockup_stage"
        | "approved_for_production"
        | "in_production"
        | "ready_for_export"
        | "exported"
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
      app_role: ["admin", "user"],
      collection_lifecycle_status: [
        "idea",
        "strategy_review",
        "mockup_stage",
        "approved_for_production",
        "in_production",
        "ready_for_export",
        "exported",
      ],
    },
  },
} as const
