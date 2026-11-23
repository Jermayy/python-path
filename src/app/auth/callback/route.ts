import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/shared/logger";
import { safeNextPath } from "@/shared/safe-redirect";
import { getServerSupabase } from "@/shared/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "magiclink",
  "recovery",
  "email",
  "invite",
  "email_change",
];

/** Completes PKCE (OAuth / magic link) and email-confirmation flows, then redirects. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/", origin));

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let error: { message: string } | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    }));
  } else {
    error = { message: "missing auth parameters" };
  }

  if (error) {
    log("warn", "auth_callback_failed", { reason: error.message });
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
