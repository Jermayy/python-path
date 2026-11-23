"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/modules/progress/ProgressProvider";

const VISIBLE_MS = 6000;

/** Celebrates completions. Polite live region; pauses while hovered or focused. */
export function CompletionToast() {
  const { lastCompletion } = useProgress();
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = lastCompletion !== null && lastCompletion.id !== dismissedId;

  useEffect(() => {
    if (!visible || paused || !lastCompletion) return;
    timer.current = setTimeout(
      () => setDismissedId(lastCompletion.id),
      VISIBLE_MS,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, paused, lastCompletion]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50"
    >
      {visible && lastCompletion && (
        <div
          className="animate-pop-in border-line bg-elevated pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Sparkles
            aria-hidden="true"
            className="text-accent mt-0.5 h-5 w-5 shrink-0"
          />
          <div className="text-sm">
            <p className="font-semibold">+{lastCompletion.xp} XP — solved!</p>
            {lastCompletion.levelUp && (
              <p className="text-accent mt-1">
                Level up! You&apos;re now level {lastCompletion.levelUp.level}:{" "}
                {lastCompletion.levelUp.title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissedId(lastCompletion.id)}
            className="text-muted hover:text-fg ml-auto rounded p-1"
            aria-label="Dismiss"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
