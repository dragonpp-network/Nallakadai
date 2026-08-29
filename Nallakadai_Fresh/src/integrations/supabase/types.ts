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
      admin_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          locked_until: string | null
          mobile: string
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          mobile: string
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          mobile?: string
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          active: boolean
          address: string
          collection_timing: string
          created_at: string
          id: string
          name: string
          next_opening_note: string | null
          pickup_address: string
          show_prices: boolean
          support_number: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          active?: boolean
          address?: string
          collection_timing?: string
          created_at?: string
          id?: string
          name: string
          next_opening_note?: string | null
          pickup_address?: string
          show_prices?: boolean
          support_number?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          active?: boolean
          address?: string
          collection_timing?: string
          created_at?: string
          id?: string
          name?: string
          next_opening_note?: string | null
          pickup_address?: string
          show_prices?: boolean
          support_number?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          name: string
          name_ta: string
          sort_order: number
          tint: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name: string
          name_ta?: string
          sort_order?: number
          tint?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name?: string
          name_ta?: string
          sort_order?: number
          tint?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          active: boolean
          address: string
          alt_mobile: string | null
          area: string
          branch_id: string
          created_at: string
          delivery_mode: string
          id: string
          map_link: string
          mobile: string
          name: string
          preferred_delivery_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          alt_mobile?: string | null
          area?: string
          branch_id: string
          created_at?: string
          delivery_mode?: string
          id?: string
          map_link?: string
          mobile: string
          name: string
          preferred_delivery_time?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          alt_mobile?: string | null
          area?: string
          branch_id?: string
          created_at?: string
          delivery_mode?: string
          id?: string
          map_link?: string
          mobile?: string
          name?: string
          preferred_delivery_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_items: {
        Row: {
          cap_qty: number | null
          created_at: string
          cycle_id: string
          id: string
          item_id: string
          max_qty: number | null
          min_qty: number | null
          price: number
        }
        Insert: {
          cap_qty?: number | null
          created_at?: string
          cycle_id: string
          id?: string
          item_id: string
          max_qty?: number | null
          min_qty?: number | null
          price?: number
        }
        Update: {
          cap_qty?: number | null
          created_at?: string
          cycle_id?: string
          id?: string
          item_id?: string
          max_qty?: number | null
          min_qty?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cycle_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          branch_id: string
          close_at: string | null
          created_at: string
          cycle_no: number
          delivery_date: string | null
          id: string
          manual_override: string | null
          open_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          close_at?: string | null
          created_at?: string
          cycle_no: number
          delivery_date?: string | null
          id?: string
          manual_override?: string | null
          open_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          close_at?: string | null
          created_at?: string
          cycle_no?: number
          delivery_date?: string | null
          id?: string
          manual_override?: string | null
          open_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          id: string
          image_url: string | null
          max_qty: number
          min_qty: number
          name_en: string
          name_ta: string
          presets: number[]
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          max_qty?: number
          min_qty?: number
          name_en: string
          name_ta?: string
          presets?: number[]
          supplier_id?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          max_qty?: number
          min_qty?: number
          name_en?: string
          name_ta?: string
          presets?: number[]
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          name_en: string
          name_ta: string
          order_id: string
          price: number
          qty: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          name_en: string
          name_ta?: string
          order_id: string
          price?: number
          qty: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          name_en?: string
          name_ta?: string
          order_id?: string
          price?: number
          qty?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_entered: boolean
          branch_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          cycle_id: string
          delivery_address: string
          delivery_mode: string
          id: string
          non_collected: boolean
          non_collection_reason: string | null
          note: string | null
          order_no: string
          preferred_delivery_time: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_entered?: boolean
          branch_id: string
          cancel_reason?: string | null
          created_at?: string
          customer_id: string
          cycle_id: string
          delivery_address?: string
          delivery_mode: string
          id?: string
          non_collected?: boolean
          non_collection_reason?: string | null
          note?: string | null
          order_no?: string
          preferred_delivery_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_entered?: boolean
          branch_id?: string
          cancel_reason?: string | null
          created_at?: string
          customer_id?: string
          cycle_id?: string
          delivery_address?: string
          delivery_mode?: string
          id?: string
          non_collected?: boolean
          non_collection_reason?: string | null
          note?: string | null
          order_no?: string
          preferred_delivery_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string
          contact_person: string
          created_at: string
          id: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          contact_person?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          contact_person?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          mobile: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "branch_admin" | "super_admin"
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
      app_role: ["branch_admin", "super_admin"],
    },
  },
} as const
