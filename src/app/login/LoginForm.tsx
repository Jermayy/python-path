"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNextPath } from "@/shared/safe-redirect";
import { getBrowserSupabase } from "@/shared/supabase/browser";

type Mode = "signin" | "signup" | "magic";

const MIN_PASSWORD = 10;

export function LoginForm() {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error")
      ? "That sign-in link is invalid or has expired. Please try again."
      : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  if (!supabase) {
    return (
      <p className="border-line bg-elevated mt-8 rounded-lg border p-4 text-sm">
        Accounts aren&apos;t enabled on this deployment — you can still learn in{" "}
        <Link
          className="text-brand hover:text-brand-strong underline"
          href="/roadmap"
        >
          guest mode
        </Link>
        .
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        // Generic message: don't reveal whether the account exists.
        if (error)
          throw new Error(
            "Email or password is incorrect, or the email isn't confirmed yet.",
          );
        router.push(next);
        router.refresh();
      } else if (mode === "signup") {
        if (password.length < MIN_PASSWORD)
          throw new Error(
            `Use at least ${MIN_PASSWORD} characters for your password.`,
          );
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error)
          throw new Error(
            "Couldn't create the account. Check the email address and try again.",
          );
        setNotice("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
        });
        if (error)
          throw new Error(
            "Couldn't send the link. Please wait a minute and try again.",
          );
        setNotice("If that address can sign in, a magic link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "signin", label: "Sign in" },
    { id: "signup", label: "Create account" },
    { id: "magic", label: "Magic link" },
  ];

  return (
    <div className="border-line bg-elevated mt-8 rounded-xl border p-6">
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="bg-sunken mb-6 flex gap-1 rounded-lg p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={mode === t.id}
            onClick={() => {
              setMode(t.id);
              setError(null);
              setNotice(null);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${mode === t.id ? "bg-elevated font-semibold" : "text-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-line bg-bg mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
        {mode !== "magic" && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? MIN_PASSWORD : undefined}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === "signup" ? "password-help" : undefined}
              className="border-line bg-bg mt-1 w-full rounded-md border px-3 py-2"
            />
            {mode === "signup" && (
              <p id="password-help" className="text-muted mt-1 text-xs">
                At least {MIN_PASSWORD} characters.
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="bg-brand-solid hover:bg-brand-solid-hover w-full rounded-md py-2 font-semibold text-white disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Email me a link"}
        </button>
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-success text-sm">
            {notice}
          </p>
        )}
      </form>
    </div>
  );
}
