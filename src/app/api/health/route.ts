import { NextResponse } from "next/server";
import { isAiConfigured } from "@/modules/tutor/anthropic";
import { isAuthConfigured } from "@/shared/config";

/** Liveness + feature flags (no secrets). */
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
      features: { auth: isAuthConfigured, ai: isAiConfigured() },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
