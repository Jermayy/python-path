"use client";

import { Compass, Flame, Target, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { trackColor } from "@/components/trackStyle";
import { modules, trackLabels, type Track } from "@/modules/curriculum";
import { recommend } from "@/modules/progress/coach";
import {
  badges,
  currentStreak,
  levelInfo,
  longestStreak,
  moduleCompletion,
  overallCompletion,
  totalXp,
} from "@/modules/progress/gamification";
import { useToday } from "@/modules/progress/useToday";
import { useProgress } from "@/modules/progress/ProgressProvider";

const tracks = Object.keys(trackLabels) as Track[];

export function DashboardView() {
  const progress = useProgress();
  const { state, user, authAvailable } = progress;
  const today = useToday();
  const xp = totalXp(state);
  const level = levelInfo(xp);
  const streak = today ? currentStreak(state.activityDays, today) : 0;
  const best = longestStreak(state.activityDays);
  const overall = overallCompletion(state);
  const allBadges = badges(state);
  const earned = allBadges.filter((b) => b.earned).length;
  const rec = recommend(state);
  const records = Object.values(state.exercises).filter(
    (e) => e.status === "completed",
  );
  const firstTry = records.filter(
    (e) => e.attempts <= 1 && e.hintsUsed === 0,
  ).length;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <section
        aria-labelledby="level"
        className="border-line bg-elevated rounded-xl border p-6 lg:col-span-2"
      >
        <p className="text-muted text-sm">Level {level.level}</p>
        <h2 id="level" className="text-accent text-2xl font-bold">
          {level.title}
        </h2>
        <div className="mt-4">
          <ProgressBar
            value={level.progress}
            label="Progress to next level"
            size="lg"
          />
          <p className="text-muted mt-2 text-sm">
            {level.isMax
              ? `${xp} XP — max level reached!`
              : `${level.xpIntoLevel} / ${level.xpForNext} XP to level ${level.level + 1}`}
          </p>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Zap, label: "Total XP", value: xp },
            {
              icon: Flame,
              label: "Streak",
              value: `${streak}d (best ${best})`,
            },
            { icon: Target, label: "First-try solves", value: firstTry },
            {
              icon: Compass,
              label: "Completed",
              value: `${overall.done}/${overall.total}`,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-sunken rounded-lg p-3">
              <dt className="text-muted flex items-center gap-1.5 text-xs">
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {label}
              </dt>
              <dd className="mt-1 text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="coach"
        className="border-line bg-elevated rounded-xl border p-6"
      >
        <p className="text-muted text-sm">Coach</p>
        <h2 id="coach" className="text-xl font-bold">
          {rec.headline}
        </h2>
        <p className="text-muted mt-2 text-sm">{rec.detail}</p>
        {rec.action && (
          <Link
            href={rec.action.href}
            className="bg-brand-solid hover:bg-brand-solid-hover mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            {rec.action.label}
          </Link>
        )}
      </section>

      <section
        aria-labelledby="tracks-progress"
        className="border-line bg-elevated rounded-xl border p-6 lg:col-span-2"
      >
        <h2 id="tracks-progress" className="text-lg font-bold">
          Track progress
        </h2>
        <ul className="mt-4 space-y-4">
          {tracks.map((t) => {
            const parts = modules
              .filter((m) => m.track === t)
              .map((m) => moduleCompletion(state, m.id));
            const done = parts.reduce((s, p) => s + p.done, 0);
            const total = parts.reduce((s, p) => s + p.total, 0);
            return (
              <li key={t}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{trackLabels[t]}</span>
                  <span className="text-muted">
                    {done}/{total}
                  </span>
                </div>
                <ProgressBar
                  value={total ? done / total : 0}
                  label={`${trackLabels[t]} progress`}
                  color={trackColor[t]}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="badges"
        className="border-line bg-elevated rounded-xl border p-6"
      >
        <h2 id="badges" className="text-lg font-bold">
          Badges{" "}
          <span className="text-muted text-sm font-normal">
            ({earned}/{allBadges.length})
          </span>
        </h2>
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {allBadges.map((b) => (
            <li
              key={b.id}
              title={`${b.name}: ${b.description}`}
              className={`flex flex-col items-center rounded-lg p-2 text-center ${b.earned ? "bg-sunken" : "text-muted"}`}
            >
              <span
                aria-hidden="true"
                className={`text-2xl ${b.earned ? "" : "opacity-40 grayscale"}`}
              >
                {b.icon}
              </span>
              <span className="mt-1 text-xs font-medium">{b.name}</span>
              <span className="sr-only">
                {b.description}. {b.earned ? "Earned" : "Not yet earned"}.
              </span>
            </li>
          ))}
        </ul>
      </section>

      <AccountSection
        authAvailable={authAvailable}
        email={user?.email ?? null}
      />
    </div>
  );
}

function AccountSection({
  authAvailable,
  email,
}: {
  authAvailable: boolean;
  email: string | null;
}) {
  const { resetProgress, signOut, sync } = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="account"
      aria-labelledby="account-h"
      className="border-line bg-elevated rounded-xl border p-6 lg:col-span-3"
    >
      <h2 id="account-h" className="text-lg font-bold">
        Account
      </h2>
      {email ? (
        <p className="text-muted mt-2 text-sm">
          Signed in as <strong className="text-fg">{email}</strong>. Progress
          syncs live across your browsers ({sync}).
        </p>
      ) : (
        <p className="text-muted mt-2 text-sm">
          You&apos;re in guest mode: progress is saved in this browser only.{" "}
          {authAvailable ? (
            <Link
              href="/login"
              className="text-brand hover:text-brand-strong underline"
            >
              Create a free account
            </Link>
          ) : (
            "Accounts aren't enabled on this deployment."
          )}{" "}
          {authAvailable && "to sync across devices and unlock the AI tutor."}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {email && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(signOut)}
            className="border-line hover:bg-sunken rounded-md border px-3 py-1.5 text-sm"
          >
            Sign out
          </button>
        )}
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="border-danger/50 text-danger hover:bg-danger/10 rounded-md border px-3 py-1.5 text-sm"
          >
            Reset progress…
          </button>
        ) : (
          <div
            role="group"
            aria-label="Confirm reset"
            className="flex items-center gap-2 text-sm"
          >
            <span>
              Delete all progress
              {email ? " from your account" : " on this device"}? This
              can&apos;t be undone.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(resetProgress)}
              className="bg-danger rounded-md px-3 py-1.5 font-medium text-white disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-muted hover:text-fg rounded-md px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
