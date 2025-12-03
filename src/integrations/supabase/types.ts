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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_location_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_location_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_location_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_logs_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: number
          organization_id: string | null
          payload: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: number
          organization_id?: string | null
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: number
          organization_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_stub: {
        Row: {
          created_at: string
          organization_id: string
          plan: string | null
          status: Database["public"]["Enums"]["billing_status"]
          stripe_customer_id: string | null
          stripe_sub_id: string | null
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          plan?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          plan?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_stub_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          id: string
          last_output_json: Json | null
          last_output_text: string | null
          location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          id?: string
          last_output_json?: Json | null
          last_output_text?: string | null
          location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          id?: string
          last_output_json?: Json | null
          last_output_text?: string | null
          location_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fetch_snapshots: {
        Row: {
          created_at: string
          endpoint: string
          filters: Json | null
          id: string
          location_id: string
          response_body: Json | null
          status_code: number | null
          tenant_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          filters?: Json | null
          id?: string
          location_id: string
          response_body?: Json | null
          status_code?: number | null
          tenant_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          filters?: Json | null
          id?: string
          location_id?: string
          response_body?: Json | null
          status_code?: number | null
          tenant_id?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          created_by: string | null
          default_group_ids: Json | null
          emulator_url: string
          id: string
          name: string
          playtomic_url: string | null
          tenant_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_group_ids?: Json | null
          emulator_url?: string
          id?: string
          name: string
          playtomic_url?: string | null
          tenant_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_group_ids?: Json | null
          emulator_url?: string
          id?: string
          name?: string
          playtomic_url?: string | null
          tenant_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_default: boolean
          linked_event_id: string | null
          module: string | null
          name: string
          org_id: string
          summary_variant: string | null
          updated_at: string
          whatsapp_group: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          linked_event_id?: string | null
          module?: string | null
          name: string
          org_id: string
          summary_variant?: string | null
          updated_at?: string
          whatsapp_group?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          linked_event_id?: string | null
          module?: string | null
          name?: string
          org_id?: string
          summary_variant?: string | null
          updated_at?: string
          whatsapp_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_automation_settings: {
        Row: {
          org_id: string
          updated_at: string
          updated_by: string
          wa_confirmed: boolean
          wa_group_availability: string | null
          wa_group_competitions: string | null
          wa_group_matches: string | null
        }
        Insert: {
          org_id: string
          updated_at?: string
          updated_by: string
          wa_confirmed?: boolean
          wa_group_availability?: string | null
          wa_group_competitions?: string | null
          wa_group_matches?: string | null
        }
        Update: {
          org_id?: string
          updated_at?: string
          updated_by?: string
          wa_confirmed?: boolean
          wa_group_availability?: string | null
          wa_group_competitions?: string | null
          wa_group_matches?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_automation_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          club_name: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          playtomic_club_url: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          club_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          playtomic_club_url?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          club_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          playtomic_club_url?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          location_id: string | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sends: {
        Row: {
          category: string
          created_at: string
          frequency: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          org_id: string
          status: string
          target: string
          template_id: string
          time_utc: string
          updated_at: string
          whatsapp_group: string
        }
        Insert: {
          category: string
          created_at?: string
          frequency?: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          org_id: string
          status?: string
          target: string
          template_id: string
          time_utc: string
          updated_at?: string
          whatsapp_group: string
        }
        Update: {
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          org_id?: string
          status?: string
          target?: string
          template_id?: string
          time_utc?: string
          updated_at?: string
          whatsapp_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sends_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sends_v2: {
        Row: {
          category: string
          created_at: string
          created_by: string
          date_end_utc: string | null
          date_start_utc: string | null
          event_id: string | null
          id: string
          is_one_off: boolean | null
          last_error: string | null
          last_run_at_utc: string | null
          last_status: string | null
          name: string
          next_run_at_utc: string
          org_id: string
          run_at_utc: string | null
          status: string
          summary_variant: string | null
          target: string
          template_id: string
          time_local: string
          tz: string
          updated_at: string
          whatsapp_group: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          date_end_utc?: string | null
          date_start_utc?: string | null
          event_id?: string | null
          id?: string
          is_one_off?: boolean | null
          last_error?: string | null
          last_run_at_utc?: string | null
          last_status?: string | null
          name: string
          next_run_at_utc: string
          org_id: string
          run_at_utc?: string | null
          status?: string
          summary_variant?: string | null
          target: string
          template_id: string
          time_local: string
          tz: string
          updated_at?: string
          whatsapp_group: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          date_end_utc?: string | null
          date_start_utc?: string | null
          event_id?: string | null
          id?: string
          is_one_off?: boolean | null
          last_error?: string | null
          last_run_at_utc?: string | null
          last_status?: string | null
          name?: string
          next_run_at_utc?: string
          org_id?: string
          run_at_utc?: string | null
          status?: string
          summary_variant?: string | null
          target?: string
          template_id?: string
          time_local?: string
          tz?: string
          updated_at?: string
          whatsapp_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sends_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sends_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      send_logs: {
        Row: {
          channel: string
          created_at: string
          id: string
          location_id: string
          payload: Json | null
          request_url: string
          response_body: string | null
          status_code: number | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          location_id: string
          payload?: Json | null
          request_url: string
          response_body?: string | null
          status_code?: number | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          location_id?: string
          payload?: Json | null
          request_url?: string
          response_body?: string | null
          status_code?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      send_logs_v2: {
        Row: {
          category: string
          id: string
          message_excerpt: string | null
          org_id: string
          response_text: string | null
          schedule_id: string | null
          sent_at: string
          status: string
          whatsapp_group: string
        }
        Insert: {
          category: string
          id?: string
          message_excerpt?: string | null
          org_id: string
          response_text?: string | null
          schedule_id?: string | null
          sent_at?: string
          status: string
          whatsapp_group: string
        }
        Update: {
          category?: string
          id?: string
          message_excerpt?: string | null
          org_id?: string
          response_text?: string | null
          schedule_id?: string | null
          sent_at?: string
          status?: string
          whatsapp_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_logs_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_logs_v2_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sends_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_renders: {
        Row: {
          created_at: string
          created_by: string
          height: number
          id: string
          image_path: string
          image_url: string
          message_content_raw: string
          message_content_resolved: string
          org_id: string
          source: string
          summary_variant: string | null
          template_id: string
          width: number
        }
        Insert: {
          created_at?: string
          created_by: string
          height: number
          id?: string
          image_path: string
          image_url: string
          message_content_raw: string
          message_content_resolved: string
          org_id: string
          source: string
          summary_variant?: string | null
          template_id: string
          width: number
        }
        Update: {
          created_at?: string
          created_by?: string
          height?: number
          id?: string
          image_path?: string
          image_url?: string
          message_content_raw?: string
          message_content_resolved?: string
          org_id?: string
          source?: string
          summary_variant?: string | null
          template_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_post_renders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "social_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_schedules: {
        Row: {
          category: string
          compiled_payload: Json
          created_at: string
          created_by: string
          event_id: string | null
          frequency: string
          id: string
          last_run_at_utc: string | null
          next_run_at_utc: string | null
          org_id: string
          run_at_utc: string
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          category: string
          compiled_payload: Json
          created_at?: string
          created_by: string
          event_id?: string | null
          frequency?: string
          id?: string
          last_run_at_utc?: string | null
          next_run_at_utc?: string | null
          org_id: string
          run_at_utc: string
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          compiled_payload?: Json
          created_at?: string
          created_by?: string
          event_id?: string | null
          frequency?: string
          id?: string
          last_run_at_utc?: string | null
          next_run_at_utc?: string | null
          org_id?: string
          run_at_utc?: string
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "social_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_renders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          org_id: string
          payload: Json | null
          result_url: string
          run_at_utc: string
          source: string
          status: string
          summary_variant: string
          target: string
          template_id: string | null
          variant_key: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inputs: Json
          org_id: string
          payload?: Json | null
          result_url: string
          run_at_utc: string
          source: string
          status?: string
          summary_variant: string
          target: string
          template_id?: string | null
          variant_key?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          org_id?: string
          payload?: Json | null
          result_url?: string
          run_at_utc?: string
          source?: string
          status?: string
          summary_variant?: string
          target?: string
          template_id?: string | null
          variant_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_renders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_renders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "social_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_run_at_utc: string | null
          next_run_at_utc: string
          org_id: string
          source: string
          status: string
          summary_variant: string
          target: string
          template_id: string
          time_local: string
          tz: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_run_at_utc?: string | null
          next_run_at_utc: string
          org_id: string
          source: string
          status?: string
          summary_variant: string
          target: string
          template_id: string
          time_local: string
          tz: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_run_at_utc?: string | null
          next_run_at_utc?: string
          org_id?: string
          source?: string
          status?: string
          summary_variant?: string
          target?: string
          template_id?: string
          time_local?: string
          tz?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "social_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_templates: {
        Row: {
          bg_fit: string | null
          bg_natural_h: number | null
          bg_natural_w: number | null
          bg_offset_x: number | null
          bg_offset_y: number | null
          bg_url: string
          canvas_h: number
          canvas_w: number
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          layers: Json
          name: string
          org_id: string
          source_category: string | null
          summary_variant: string | null
          updated_at: string
        }
        Insert: {
          bg_fit?: string | null
          bg_natural_h?: number | null
          bg_natural_w?: number | null
          bg_offset_x?: number | null
          bg_offset_y?: number | null
          bg_url: string
          canvas_h?: number
          canvas_w?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          layers: Json
          name: string
          org_id: string
          source_category?: string | null
          summary_variant?: string | null
          updated_at?: string
        }
        Update: {
          bg_fit?: string | null
          bg_natural_h?: number | null
          bg_natural_w?: number | null
          bg_offset_x?: number | null
          bg_offset_y?: number | null
          bg_url?: string
          canvas_h?: number
          canvas_w?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          layers?: Json
          name?: string
          org_id?: string
          source_category?: string | null
          summary_variant?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      wa_messages_log: {
        Row: {
          category: string
          created_at: string
          emulator_result: Json | null
          emulator_url: string
          id: string
          payload_message: string
          status: string
          template_id: string | null
          tenant_id: string
          whatsapp_group_name: string
        }
        Insert: {
          category: string
          created_at?: string
          emulator_result?: Json | null
          emulator_url: string
          id?: string
          payload_message: string
          status: string
          template_id?: string | null
          tenant_id: string
          whatsapp_group_name: string
        }
        Update: {
          category?: string
          created_at?: string
          emulator_result?: Json | null
          emulator_url?: string
          id?: string
          payload_message?: string
          status?: string
          template_id?: string | null
          tenant_id?: string
          whatsapp_group_name?: string
        }
        Relationships: []
      }
      wa_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_routes: {
        Row: {
          category: Database["public"]["Enums"]["automation_category"]
          confirmed_added: boolean
          created_at: string
          group_name: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["automation_category"]
          confirmed_added?: boolean
          created_at?: string
          group_name: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["automation_category"]
          confirmed_added?: boolean
          created_at?: string
          group_name?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      get_current_user_location_id: { Args: never; Returns: string }
      get_user_org_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { p_user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_org_owner_or_manager: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      onboarding_create_org_and_membership: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
        }
        Returns: string
      }
      onboarding_create_org_and_profile: {
        Args: { p_first_name: string; p_last_name: string; p_phone: string }
        Returns: string
      }
      onboarding_finalize: {
        Args: { p_org_id: string; p_routes: Json }
        Returns: undefined
      }
      onboarding_save_automation_settings: {
        Args: {
          p_org_id: string
          p_wa_confirmed: boolean
          p_wa_group_availability: string
          p_wa_group_competitions: string
          p_wa_group_matches: string
        }
        Returns: undefined
      }
      onboarding_set_tenant: {
        Args: {
          p_club_url: string
          p_org_id: string
          p_tenant_id: string
          p_tenant_name: string
        }
        Returns: undefined
      }
      onboarding_update_tenant_details: {
        Args: {
          p_club_url: string
          p_org_id: string
          p_tenant_id: string
          p_tenant_name?: string
        }
        Returns: undefined
      }
      process_scheduled_sends: { Args: never; Returns: undefined }
      run_scheduled_sends_v2: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "location_admin"
      automation_category:
        | "court_availability"
        | "partial_matches"
        | "competitions_academies"
      billing_status: "trialing" | "active" | "past_due" | "canceled"
      user_role: "super_admin" | "org_admin" | "org_member"
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
      app_role: ["admin", "editor", "viewer", "location_admin"],
      automation_category: [
        "court_availability",
        "partial_matches",
        "competitions_academies",
      ],
      billing_status: ["trialing", "active", "past_due", "canceled"],
      user_role: ["super_admin", "org_admin", "org_member"],
    },
  },
} as const
