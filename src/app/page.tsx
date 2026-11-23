import {
  ArrowRight,
  Bot,
  Code2,
  Gauge,
  Map,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { trackColor } from "@/components/trackStyle";
import {
  allExercises,
  modules,
  trackLabels,
  type Track,
} from "@/modules/curriculum";
import { competencies } from "@/modules/curriculum/hiring-bar";

const tracks = Object.keys(trackLabels) as Track[];

export default function Home() {
  const codeCount = allExercises.filter(
    (e) => e.exercise.kind === "code",
  ).length;
  return (
    <div className="bg-grid">
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:pt-24">
        <p className="border-line bg-elevated text-muted mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <span className="bg-success h-1.5 w-1.5 rounded-full" />{" "}
          {modules.length} modules · {allExercises.length} exercises · runs in
          your browser
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          From <span className="text-brand">zero Python</span> to{" "}
          <span className="from-accent bg-gradient-to-r to-[var(--track-ai)] bg-clip-text text-transparent">
            hired AI engineer
          </span>
          .
        </h1>
        <p className="text-muted mt-6 max-w-2xl text-lg">
          A gamified path built around what hiring managers at AI-first
          companies actually test for Forward Deployed and AI Orchestration
          roles — fundamentals, production backends, RAG, agents and evals.
          Explained for people coming from Dart, Flutter and TypeScript.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/learn/python-basics/variables-and-types"
            className="bg-brand-solid shadow-brand/30 hover:bg-brand-solid-hover inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white shadow-lg"
          >
            Start now — no account needed{" "}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/roadmap"
            className="border-line hover:bg-elevated inline-flex items-center gap-2 rounded-lg border px-5 py-3 font-semibold"
          >
            <Map aria-hidden="true" className="h-4 w-4" /> See the roadmap
          </Link>
        </div>
        <p className="text-muted mt-3 text-sm">
          Guest mode saves progress on this device. Sign in any time to sync
          across browsers.
        </p>
      </section>

      <section
        aria-labelledby="features"
        className="mx-auto max-w-6xl px-4 pb-16"
      >
        <h2 id="features" className="sr-only">
          Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Code2,
              title: "Real Python, in the browser",
              body: `${codeCount} coding exercises run on Python 3.14 via WebAssembly — with hidden tests, hints and explanations.`,
            },
            {
              icon: Trophy,
              title: "Gamified progress",
              body: "XP, levels, streaks and badges — with first-try bonuses so you actually think before you peek.",
            },
            {
              icon: Bot,
              title: "AI tutor & adaptive coach",
              body: "Ask questions about any exercise and get Socratic hints tuned to how you're doing (signed-in users).",
            },
            {
              icon: Gauge,
              title: "Built for the interview",
              body: "Every module maps to a hiring-bar competency, from LeetCode patterns to eval design and system design.",
            },
            {
              icon: Map,
              title: "Visual roadmap",
              body: "See exactly where you are across 5 tracks and what's next, at a glance.",
            },
            {
              icon: ShieldCheck,
              title: "Synced and private",
              body: "Sign in to sync live across devices. Your code never leaves your browser to run.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="border-line bg-elevated rounded-xl border p-5"
            >
              <Icon aria-hidden="true" className="text-accent h-6 w-6" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="text-muted mt-1 text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="tracks"
        className="mx-auto max-w-6xl px-4 pb-16"
      >
        <h2 id="tracks" className="text-2xl font-bold">
          Five tracks, one path
        </h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {tracks.map((t, i) => (
            <li
              key={t}
              className="border-line bg-elevated rounded-xl border p-4"
              style={{ borderTopColor: trackColor[t], borderTopWidth: 4 }}
            >
              <p className="text-muted text-xs">Track {i + 1}</p>
              <p className="font-semibold">{trackLabels[t]}</p>
              <ul className="text-muted mt-2 space-y-1 text-sm">
                {modules
                  .filter((m) => m.track === t)
                  .map((m) => (
                    <li key={m.id}>{m.title}</li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="bar" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 id="bar" className="text-2xl font-bold">
          What we&apos;d expect from a senior hire
        </h2>
        <p className="text-muted mt-2 max-w-2xl">
          The curriculum is reverse-engineered from this hiring bar.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {competencies.map((c) => (
            <div
              key={c.id}
              className="border-line bg-elevated rounded-xl border p-4"
            >
              <p className="font-semibold">{c.title}</p>
              <p className="text-muted mt-1 text-sm">{c.expectation}</p>
            </div>
          ))}
        </div>
        <Link
          href="/hiring-bar"
          className="text-brand mt-6 inline-flex items-center gap-1 hover:underline"
        >
          Read the full hiring bar{" "}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
