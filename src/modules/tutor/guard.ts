import "server-only";
import type { z } from "zod";
import { getServerConfig } from "@/shared/config";
import { problem, readJson, rejectCrossSite } from "@/shared/http";
import { log } from "@/shared/logger";
import { getServerSupabase, getVerifiedUserId } from "@/shared/supabase/server";
import { isAiConfigured } from "./anthropic";

type Guarded<T> =
  { ok: true; userId: string; body: T } | { ok: false; response: Response };

/**
 * Shared checks for AI endpoints, cheapest first: CSRF → configured → authenticated →
 * valid input → daily quota (atomic, in Postgres). Only then do we spend tokens.
 */
export async function guardAiRequest<S extends z.ZodType>(
  request: Request,
  schema: S,
  route: string,
): Promise<Guarded<z.infer<S>>> {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return { ok: false, response: crossSite };

  if (!isAiConfigured()) {
    return {
      ok: false,
      response: problem(
        503,
        "AI tutor unavailable",
        "The AI tutor isn't enabled on this deployment.",
      ),
    };
  }

  const supabase = await getServerSupabase();
  const userId = supabase ? await getVerifiedUserId(supabase) : null;
  if (!supabase || !userId) {
    return {
      ok: false,
      response: problem(
        401,
        "Sign in required",
        "Create a free account to use the AI tutor.",
      ),
    };
  }

  const raw = await readJson(request);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .slice(0, 10)
      .map((i) => ({ field: i.path.join("."), code: i.code }));
    return {
      ok: false,
      response: problem(
        400,
        "Invalid request",
        "The request body failed validation.",
        { errors },
      ),
    };
  }

  const { aiDailyLimit } = getServerConfig();
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_limit: aiDailyLimit,
  });
  if (error) {
    log("error", "ai_quota_check_failed", {
      route,
      userId,
      error: error.message,
    });
    return {
      ok: false,
      response: problem(
        503,
        "Temporarily unavailable",
        "Please try again shortly.",
      ),
    };
  }
  const quota = data?.[0];
  if (!quota?.allowed) {
    log("info", "ai_quota_exceeded", { route, userId, used: quota?.used });
    return {
      ok: false,
      response: problem(
        429,
        "Daily AI limit reached",
        `You've used all ${aiDailyLimit} AI requests for today. Hints and lessons still work!`,
        {
          headers: { "Retry-After": String(secondsUntilUtcMidnight()) },
        },
      ),
    };
  }
  return { ok: true, userId, body: parsed.data };
}

function secondsUntilUtcMidnight(now = new Date()): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.ceil((midnight - now.getTime()) / 1000);
}
