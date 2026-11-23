/**
 * Hand-written to match supabase/migrations. Regenerate with
 * `npx supabase gen types typescript --project-id <id>` after schema changes.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      exercise_progress: {
        Row: {
          user_id: string;
          exercise_id: string;
          status: "attempted" | "completed";
          attempts: number;
          hints_used: number;
          completed_at: string | null;
          code: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      activity_days: {
        Row: { user_id: string; day: string; created_at: string };
        Insert: { user_id?: string; day: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      upsert_exercise_progress: {
        Args: {
          p_exercise_id: string;
          p_status: "attempted" | "completed";
          p_attempts: number;
          p_hints_used: number;
          p_completed_at: string | null;
          p_code: string | null;
          p_updated_at: string;
        };
        Returns: undefined;
      };
      consume_ai_quota: {
        Args: { p_limit: number };
        Returns: { allowed: boolean; used: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
