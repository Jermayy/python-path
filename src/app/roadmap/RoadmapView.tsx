"use client";

import { Check, Lock, Play, Star } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressRing } from "@/components/ProgressRing";
import { trackColor } from "@/components/trackStyle";
import {
  lessonHref,
  modules,
  trackLabels,
  type Track,
} from "@/modules/curriculum";
import {
  lessonCompletion,
  moduleCompletion,
  nextLesson,
  overallCompletion,
} from "@/modules/progress/gamification";
import { useProgress } from "@/modules/progress/ProgressProvider";

const tracks = Object.keys(trackLabels) as Track[];

export function RoadmapView() {
  const { state } = useProgress();
  const next = nextLesson(state);
  const overall = overallCompletion(state);

  return (
    <div className="mt-8">
      <div className="border-line bg-elevated rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">
            Overall: {overall.done}/{overall.total} exercises (
            {Math.round(overall.ratio * 100)}%)
          </p>
          {next && (
            <Link
              href={lessonHref(next.module.id, next.lesson.id)}
              className="bg-brand-solid hover:bg-brand-solid-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            >
              <Play aria-hidden="true" className="h-4 w-4" /> Continue:{" "}
              {next.lesson.title}
            </Link>
          )}
        </div>
        <div className="mt-3">
          <ProgressBar
            value={overall.ratio}
            label="Overall progress"
            size="lg"
          />
        </div>
      </div>

      {tracks.map((track) => {
        const trackModules = modules.filter((m) => m.track === track);
        return (
          <section
            key={track}
            aria-labelledby={`track-${track}`}
            className="relative mt-10"
          >
            <h2
              id={`track-${track}`}
              className="flex items-center gap-2 text-xl font-bold"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: trackColor[track] }}
                aria-hidden="true"
              />
              {trackLabels[track]}
            </h2>
            <ol
              className="relative mt-4 space-y-4 border-l-2 pl-8"
              style={{ borderColor: trackColor[track] }}
            >
              {trackModules.map((m) => {
                const mc = moduleCompletion(state, m.id);
                const isCurrent = next?.module.id === m.id;
                return (
                  <li key={m.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={`bg-bg absolute top-4 -left-[45px] grid h-7 w-7 place-items-center rounded-full border-2 ${isCurrent ? "animate-pulse-ring" : ""}`}
                      style={{ borderColor: trackColor[track] }}
                    >
                      {mc.ratio === 1 ? (
                        <Check className="text-success h-4 w-4" />
                      ) : isCurrent ? (
                        <Star className="text-accent h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{m.order}</span>
                      )}
                    </span>
                    <div
                      className={`bg-elevated rounded-xl border p-5 ${isCurrent ? "border-accent" : "border-line"}`}
                    >
                      <div className="flex items-start gap-4">
                        <ProgressRing
                          value={mc.ratio}
                          color={trackColor[track]}
                        >
                          <span className="text-xs font-semibold">
                            {Math.round(mc.ratio * 100)}%
                          </span>
                        </ProgressRing>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold">{m.title}</h3>
                          <p className="text-muted text-sm">{m.tagline}</p>
                        </div>
                      </div>
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {m.lessons.map((l) => {
                          const lc = lessonCompletion(
                            state,
                            l.exercises.map((e) => e.id),
                          );
                          const Icon = lc.complete
                            ? Check
                            : lc.done > 0
                              ? Play
                              : Lock;
                          return (
                            <li key={l.id}>
                              <Link
                                href={lessonHref(m.id, l.id)}
                                className="border-line hover:border-brand hover:bg-sunken flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                              >
                                <Icon
                                  aria-hidden="true"
                                  className={`h-4 w-4 shrink-0 ${lc.complete ? "text-success" : lc.done ? "text-accent" : "text-muted"}`}
                                />
                                <span className="truncate">{l.title}</span>
                                <span className="text-muted ml-auto shrink-0 text-xs">
                                  {lc.done}/{lc.total}
                                  <span className="sr-only">
                                    {" "}
                                    exercises complete
                                  </span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <details className="mt-3 text-sm">
                        <summary className="text-muted hover:text-fg cursor-pointer">
                          What you&apos;ll be able to do
                        </summary>
                        <ul className="text-muted mt-2 list-disc space-y-1 pl-5">
                          {m.outcomes.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <p className="text-muted mt-8 text-sm">
        <Lock aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
        Lock icons mean &ldquo;not started&rdquo; — nothing is gated, so jump
        ahead if you already know a topic.
      </p>
    </div>
  );
}
