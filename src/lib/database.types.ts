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
      drive_logs: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string
          start_soc: number
          end_soc: number
          distance_km: number
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time?: string
          end_time?: string
          start_soc: number
          end_soc: number
          distance_km: number
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string
          start_soc?: number
          end_soc?: number
          distance_km?: number
          notes?: string
          created_at?: string
        }
      }
      charging_sessions: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string
          start_soc: number
          end_soc: number
          kwh_added: number
          cost: number
          location: string
          is_full_charge: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time?: string
          end_time?: string
          start_soc: number
          end_soc: number
          kwh_added?: number
          cost?: number
          location?: string
          is_full_charge?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string
          start_soc?: number
          end_soc?: number
          kwh_added?: number
          cost?: number
          location?: string
          is_full_charge?: boolean
          created_at?: string
        }
      }
      battery_calibrations: {
        Row: {
          id: string
          user_id: string
          calibration_date: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          calibration_date?: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          calibration_date?: string
          notes?: string
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          kwh_price: number
          petrol_price: number
          battery_capacity_kwh: number
          avg_petrol_consumption: number
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kwh_price?: number
          petrol_price?: number
          battery_capacity_kwh?: number
          avg_petrol_consumption?: number
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kwh_price?: number
          petrol_price?: number
          battery_capacity_kwh?: number
          avg_petrol_consumption?: number
          updated_at?: string
          created_at?: string
        }
      }
    }
  }
}
