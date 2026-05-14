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
      rooms: {
        Row: {
          id: string
          room_number: string
          has_attached_bathroom: boolean
          current_status: 'available' | 'booked'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          room_number: string
          has_attached_bathroom?: boolean
          current_status?: 'available' | 'booked'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          room_number?: string
          has_attached_bathroom?: boolean
          current_status?: 'available' | 'booked'
          is_active?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          customer_name: string
          phone_number: string | null
          room_id: string | null
          check_in_date: string
          check_out_date: string | null
          status: 'active' | 'upcoming' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          phone_number?: string | null
          room_id?: string | null
          check_in_date: string
          check_out_date?: string | null
          status?: 'active' | 'upcoming' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          phone_number?: string | null
          room_id?: string | null
          check_in_date?: string
          check_out_date?: string | null
          status?: 'active' | 'upcoming' | 'completed'
          created_at?: string
        }
      }
      hall_bookings: {
        Row: {
          id: string
          customer_name: string
          phone_number: string | null
          event_date: string
          start_time: string
          end_time: string
          purpose: string | null
          status: 'confirmed' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          phone_number?: string | null
          event_date: string
          start_time: string
          end_time: string
          purpose?: string | null
          status?: 'confirmed' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          phone_number?: string | null
          event_date?: string
          start_time?: string
          end_time?: string
          purpose?: string | null
          status?: 'confirmed' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
    }
  }
}
