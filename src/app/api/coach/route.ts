import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getCoaching } from "@/modules/tutor/anthropic";
import { guardAiRequest } from "@/modules/tutor/guard";
import { coachRequestSchema } from "@/modules/tutor/schema";
import { problem } from "@/shared/http";
import { log } from "@/shared/logger";

export const maxDuration = 60;

/** Adaptive coaching: a targeted hint plus a difficulty recommendation (structured output). */
export async function POST(request: Request) {
  const guard = await guardAiRequest(request, coachRequestSchema, "coach");
  if (!guard.ok) return guard.response;
  try {
    const result = await getCoaching(guard.body);
    if (!result)
      return problem(
        422,
        "No coaching available",
        "Try rephrasing or use the built-in hints.",
      );
    log("info", "coach_reply", {
      userId: guard.userId,
      exerciseId: guard.body.exerciseId,
      difficulty: result.difficulty,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    log("error", "coach_failed", { userId: guard.userId, status, error: err });
    return problem(
      502,
      "Coach unavailable",
      "The AI coach couldn't respond. Built-in hints still work.",
    );
  }
}
