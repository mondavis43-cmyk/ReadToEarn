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
      profiles: {
        Row: {
          id: string
          email: string
          available_balance: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          available_balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          available_balance?: number
          created_at?: string
        }
      }
      books: {
        Row: {
          id: number
          title: string
          author: string
          cover_url: string | null
          bounty_amount: number
        }
        Insert: {
          id?: number
          title: string
          author: string
          cover_url?: string | null
          bounty_amount: number
        }
        Update: {
          id?: number
          title?: string
          author?: string
          cover_url?: string | null
          bounty_amount?: number
        }
      }
      questions: {
        Row: {
          id: number
          book_id: number
          question_text: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: string
        }
        Insert: {
          id?: number
          book_id: number
          question_text: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: string
        }
        Update: {
          id?: number
          book_id?: number
          question_text?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          correct_answer?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: number
          user_id: string
          book_id: number
          score: number
          passed: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          book_id: number
          score: number
          passed: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          book_id?: number
          score?: number
          passed?: boolean
          created_at?: string
        }
      }
      completed_books: {
        Row: {
          id: number
          user_id: string
          book_id: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          book_id: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          book_id?: number
          created_at?: string
        }
      }
      cashout_requests: {
        Row: {
          id: number
          user_id: string
          amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          amount: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          amount?: number
          status?: string
          created_at?: string
        }
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
  }
}
