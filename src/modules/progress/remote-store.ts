import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BrowserSupabase } from "@/shared/supabase/browser";
import type { Database } from "@/shared/supabase/database.types";
import type { ExerciseProgress, ProgressState } from "./types";

type Row = Database["public"]["Tables"]["exercise_progress"]["Row"];

export function rowToRecord(row: Row): ExerciseProgress {
  return {
    exerciseId: row.exercise_id,
    status: row.status,
    attempts: row.attempts,
    hintsUsed: row.hints_used,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    code: row.code,
  };
}

/** Supabase adapter. All access is scoped by RLS to the signed-in user. */
export class RemoteProgressStore {
  constructor(
    private readonly supabase: BrowserSupabase,
    private readonly userId: string,
  ) {}

  async fetchAll(): Promise<ProgressState> {
    const [progress, days] = await Promise.all([
      this.supabase
        .from("exercise_progress")
        .select(
          "user_id, exercise_id, status, attempts, hints_used, completed_at, code, updated_at, created_at",
        )
        .eq("user_id", this.userId)
        .limit(1000),
      this.supabase
        .from("activity_days")
        .select("day")
        .eq("user_id", this.userId)
        .limit(5000),
    ]);
    if (progress.error)
      throw new Error(`Loading progress failed: ${progress.error.message}`);
    if (days.error)
      throw new Error(`Loading streak days failed: ${days.error.message}`);
    return {
      exercises: Object.fromEntries(
        progress.data.map((r) => [r.exercise_id, rowToRecord(r)]),
      ),
      activityDays: days.data.map((d) => d.day).sort(),
    };
  }

  async push(delta: ProgressState): Promise<void> {
    for (const r of Object.values(delta.exercises)) {
      const { error } = await this.supabase.rpc("upsert_exercise_progress", {
        p_exercise_id: r.exerciseId,
        p_status: r.status,
        p_attempts: r.attempts,
        p_hints_used: r.hintsUsed,
        p_completed_at: r.completedAt,
        p_code: r.code,
        p_updated_at: r.updatedAt,
      });
      if (error)
        throw new Error(`Saving ${r.exerciseId} failed: ${error.message}`);
    }
    if (delta.activityDays.length) {
      const { error } = await this.supabase.from("activity_days").upsert(
        delta.activityDays.map((day) => ({ day })),
        { onConflict: "user_id,day", ignoreDuplicates: true },
      );
      if (error) throw new Error(`Saving streak failed: ${error.message}`);
    }
  }

  async reset(): Promise<void> {
    const a = await this.supabase
      .from("exercise_progress")
      .delete()
      .eq("user_id", this.userId);
    if (a.error) throw new Error(a.error.message);
    const b = await this.supabase
      .from("activity_days")
      .delete()
      .eq("user_id", this.userId);
    if (b.error) throw new Error(b.error.message);
  }

  /** Live updates from other tabs/devices. */
  subscribe(
    onExercise: (r: ExerciseProgress) => void,
    onDay: (day: string) => void,
  ): () => void {
    const channel: RealtimeChannel = this.supabase
      .channel(`progress:${this.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exercise_progress",
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          onExercise(rowToRecord(payload.new as Row));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_days",
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => onDay((payload.new as { day: string }).day),
      )
      .subscribe();
    return () => {
      void this.supabase.removeChannel(channel);
    };
  }
}
