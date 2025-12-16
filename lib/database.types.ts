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
      sticky_notes: {
        Row: {
          id: string
          content: string
          category: 'To-Do' | '메모' | '아이디어' | '회의록'
          color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
          is_completed: boolean
          created_at: string
          updated_at: string
          user_id: string | null
          meeting_id: string | null
          meeting_title: string | null
          is_meeting_mode: boolean | null
        }
        Insert: {
          id?: string
          content: string
          category: 'To-Do' | '메모' | '아이디어' | '회의록'
          color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
          is_completed?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string | null
          meeting_id?: string | null
          meeting_title?: string | null
          is_meeting_mode?: boolean | null
        }
        Update: {
          id?: string
          content?: string
          category?: 'To-Do' | '메모' | '아이디어' | '회의록'
          color?: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
          is_completed?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string | null
          meeting_id?: string | null
          meeting_title?: string | null
          is_meeting_mode?: boolean | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
