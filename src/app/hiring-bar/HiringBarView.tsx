"use client";

import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { getModule, lessonHref } from "@/modules/curriculum";
import { competencies } from "@/modules/curriculum/hiring-bar";
import { moduleCompletion } from "@/modules/progress/gamification";
import { useProgress } from "@/modules/progress/ProgressProvider";

export function HiringBarView() {
  const { state } = useProgress();
  return (
    <ul className="mt-4 space-y-4">
      {competencies.map((c) => {
        const parts = c.modules.map((id) => moduleCompletion(state, id));
        const done = parts.reduce((s, p) => s + p.done, 0);
        const total = parts.reduce((s, p) => s + p.total, 0);
        return (
          <li
            key={c.id}
            className="border-line bg-elevated rounded-xl border p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <span className="text-muted text-sm">
                {done}/{total} exercises
              </span>
            </div>
            <p className="text-muted mt-1">{c.expectation}</p>
            <div className="mt-3">
              <ProgressBar
                value={total ? done / total : 0}
                label={`${c.title} readiness`}
              />
            </div>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {c.evidence.map((e) => (
                <li
                  key={e}
                  className="border-line text-muted rounded-full border px-2 py-0.5"
                >
                  {e}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              Practise in:{" "}
              {c.modules.map((id, i) => {
                const m = getModule(id);
                if (!m) return null;
                return (
                  <span key={id}>
                    {i > 0 && ", "}
                    <Link
                      className="text-brand hover:text-brand-strong underline"
                      href={lessonHref(m.id, m.lessons[0].id)}
                    >
                      {m.title}
                    </Link>
                  </span>
                );
              })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
