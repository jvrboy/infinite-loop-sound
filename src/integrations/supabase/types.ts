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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_alerts: {
        Row: {
          acknowledged: boolean
          context: Json
          created_at: string
          id: string
          kind: string
          message: string
          severity: string
        }
        Insert: {
          acknowledged?: boolean
          context?: Json
          created_at?: string
          id?: string
          kind: string
          message: string
          severity?: string
        }
        Update: {
          acknowledged?: boolean
          context?: Json
          created_at?: string
          id?: string
          kind?: string
          message?: string
          severity?: string
        }
        Relationships: []
      }
      alert_rules: {
        Row: {
          comparator: string
          created_at: string
          direction: string | null
          enabled: boolean
          id: string
          metric: string
          name: string
          notes: string | null
          threshold: number
          updated_at: string
        }
        Insert: {
          comparator?: string
          created_at?: string
          direction?: string | null
          enabled?: boolean
          id?: string
          metric: string
          name: string
          notes?: string | null
          threshold?: number
          updated_at?: string
        }
        Update: {
          comparator?: string
          created_at?: string
          direction?: string | null
          enabled?: boolean
          id?: string
          metric?: string
          name?: string
          notes?: string | null
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
          last4: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
          last4: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
          last4?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          auto_telegram: boolean
          id: number
          min_score: number
          pairs: string[]
          skip_news: boolean
          theme: string
          timeframes: string[]
        }
        Insert: {
          auto_telegram?: boolean
          id?: number
          min_score?: number
          pairs?: string[]
          skip_news?: boolean
          theme?: string
          timeframes?: string[]
        }
        Update: {
          auto_telegram?: boolean
          id?: number
          min_score?: number
          pairs?: string[]
          skip_news?: boolean
          theme?: string
          timeframes?: string[]
        }
        Relationships: []
      }
      bot_pnl_daily: {
        Row: {
          day: string
          gross: number
          losses: number
          trades: number
          updated_at: string
          wins: number
        }
        Insert: {
          day: string
          gross?: number
          losses?: number
          trades?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          day?: string
          gross?: number
          losses?: number
          trades?: number
          updated_at?: string
          wins?: number
        }
        Relationships: []
      }
      bot_trades: {
        Row: {
          account_type: string
          closed_at: string | null
          contract_id: string | null
          created_at: string
          direction: string
          entry: number | null
          error: string | null
          id: string
          last_error_at: string | null
          lot: number
          pair: string
          payout: number | null
          profit: number | null
          retry_count: number
          status: string
        }
        Insert: {
          account_type?: string
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          direction: string
          entry?: number | null
          error?: string | null
          id?: string
          last_error_at?: string | null
          lot: number
          pair: string
          payout?: number | null
          profit?: number | null
          retry_count?: number
          status?: string
        }
        Update: {
          account_type?: string
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          direction?: string
          entry?: number | null
          error?: string | null
          id?: string
          last_error_at?: string | null
          lot?: number
          pair?: string
          payout?: number | null
          profit?: number | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      bot_trades_dlq: {
        Row: {
          contract_id: string | null
          created_at: string
          id: string
          last_error: string | null
          next_retry_at: string
          resolved: boolean
          retry_count: number
          trade_id: string
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string
          resolved?: boolean
          retry_count?: number
          trade_id: string
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string
          resolved?: boolean
          retry_count?: number
          trade_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      divergence_validations: {
        Row: {
          created_at: string
          div_type: string | null
          id: string
          is_valid: boolean
          notes: string | null
          osc_pivots: Json
          oscillator: string
          pair: string
          price_pivots: Json
          timeframe: string
        }
        Insert: {
          created_at?: string
          div_type?: string | null
          id?: string
          is_valid: boolean
          notes?: string | null
          osc_pivots?: Json
          oscillator: string
          pair: string
          price_pivots?: Json
          timeframe: string
        }
        Update: {
          created_at?: string
          div_type?: string | null
          id?: string
          is_valid?: boolean
          notes?: string | null
          osc_pivots?: Json
          oscillator?: string
          pair?: string
          price_pivots?: Json
          timeframe?: string
        }
        Relationships: []
      }
      economic_events_cache: {
        Row: {
          currency: string
          event_time: string
          fetched_at: string
          forecast: string | null
          id: string
          impact: string
          previous: string | null
          title: string
        }
        Insert: {
          currency: string
          event_time: string
          fetched_at?: string
          forecast?: string | null
          id?: string
          impact?: string
          previous?: string | null
          title: string
        }
        Update: {
          currency?: string
          event_time?: string
          fetched_at?: string
          forecast?: string | null
          id?: string
          impact?: string
          previous?: string | null
          title?: string
        }
        Relationships: []
      }
      keepalive_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          notes: string | null
          ok: boolean
          source: string
          zo_error: string | null
          zo_ok: boolean | null
          zo_status: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          notes?: string | null
          ok?: boolean
          source?: string
          zo_error?: string | null
          zo_ok?: boolean | null
          zo_status?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          notes?: string | null
          ok?: boolean
          source?: string
          zo_error?: string | null
          zo_ok?: boolean | null
          zo_status?: number | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          confluence: Json
          created_at: string
          direction: string
          entry: number
          id: string
          pair: string
          rating: string
          result: string | null
          score: number
          sent_telegram: boolean
          sl: number
          status: string
          timeframe: string
          tp1: number
          tp2: number
          tp3: number
          user_marked: string | null
        }
        Insert: {
          confluence?: Json
          created_at?: string
          direction: string
          entry: number
          id?: string
          pair: string
          rating: string
          result?: string | null
          score: number
          sent_telegram?: boolean
          sl: number
          status?: string
          timeframe: string
          tp1: number
          tp2: number
          tp3: number
          user_marked?: string | null
        }
        Update: {
          confluence?: Json
          created_at?: string
          direction?: string
          entry?: number
          id?: string
          pair?: string
          rating?: string
          result?: string | null
          score?: number
          sent_telegram?: boolean
          sl?: number
          status?: string
          timeframe?: string
          tp1?: number
          tp2?: number
          tp3?: number
          user_marked?: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          id: number
          last_ping: string
          notes: string | null
          ws_ok: boolean
        }
        Insert: {
          id?: number
          last_ping?: string
          notes?: string | null
          ws_ok?: boolean
        }
        Update: {
          id?: number
          last_ping?: string
          notes?: string | null
          ws_ok?: boolean
        }
        Relationships: []
      }
      trade_journal: {
        Row: {
          created_at: string
          id: string
          note: string
          outcome: string | null
          pair: string
          rr: number | null
          screenshot: string | null
          tags: string[]
          trade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          outcome?: string | null
          pair?: string
          rr?: number | null
          screenshot?: string | null
          tags?: string[]
          trade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          outcome?: string | null
          pair?: string
          rr?: number | null
          screenshot?: string | null
          tags?: string[]
          trade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_subscribers: {
        Row: {
          active: boolean
          chat_id: number
          created_at: string
          id: string
          min_score: number
          username: string | null
        }
        Insert: {
          active?: boolean
          chat_id: number
          created_at?: string
          id?: string
          min_score?: number
          username?: string | null
        }
        Update: {
          active?: boolean
          chat_id?: number
          created_at?: string
          id?: string
          min_score?: number
          username?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          endpoint: string
          error: string | null
          headers: Json
          id: string
          ip: string | null
          payload: Json
          signature_valid: boolean
          source: string
          status_code: number
        }
        Insert: {
          created_at?: string
          endpoint: string
          error?: string | null
          headers?: Json
          id?: string
          ip?: string | null
          payload?: Json
          signature_valid?: boolean
          source: string
          status_code?: number
        }
        Update: {
          created_at?: string
          endpoint?: string
          error?: string | null
          headers?: Json
          id?: string
          ip?: string | null
          payload?: Json
          signature_valid?: boolean
          source?: string
          status_code?: number
        }
        Relationships: []
      }
      webhook_idempotency: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          signal_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          signal_id?: string | null
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          signal_id?: string | null
          source?: string
        }
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_delivery_at: string | null
          min_score: number
          secret: string | null
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_delivery_at?: string | null
          min_score?: number
          secret?: string | null
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_delivery_at?: string | null
          min_score?: number
          secret?: string | null
          url?: string
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
    Enums: {},
  },
} as const
