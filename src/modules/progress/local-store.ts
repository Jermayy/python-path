import { mergeProgress } from "./merge";
import {
  emptyProgress,
  type ExerciseProgress,
  type ProgressState,
} from "./types";

/**
 * localStorage persistence. Writes are synchronous, so progress survives tab closes without
 * relying on unload events. Every access is guarded: storage can be disabled or full.
 */
const PREFIX = "pp:v1";
export const GUEST_SCOPE = "guest";

const progressKey = (scope: string) => `${PREFIX}:progress:${scope}`;
const outboxKey = (scope: string) => `${PREFIX}:outbox:${scope}`;

function read<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isProgressState(v: unknown): v is ProgressState {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as ProgressState).exercises === "object" &&
    Array.isArray((v as ProgressState).activityDays)
  );
}

export function loadLocal(scope: string): ProgressState {
  const value = read<unknown>(progressKey(scope));
  return isProgressState(value) ? value : emptyProgress();
}

export function saveLocal(scope: string, state: ProgressState): boolean {
  return write(progressKey(scope), state);
}

export function clearLocal(scope: string): void {
  try {
    globalThis.localStorage?.removeItem(progressKey(scope));
    globalThis.localStorage?.removeItem(outboxKey(scope));
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Outbox of changes not yet confirmed by the server. Stored as a ProgressState so it merges. */
export function loadOutbox(scope: string): ProgressState {
  const value = read<unknown>(outboxKey(scope));
  return isProgressState(value) ? value : emptyProgress();
}

export function addToOutbox(
  scope: string,
  records: ExerciseProgress[],
  days: string[],
): ProgressState {
  const delta: ProgressState = {
    exercises: Object.fromEntries(records.map((r) => [r.exerciseId, r])),
    activityDays: days,
  };
  const next = mergeProgress(loadOutbox(scope), delta);
  write(outboxKey(scope), next);
  return next;
}

/** Removes entries that were sent, unless they changed again while the request was in flight. */
export function ackOutbox(scope: string, sent: ProgressState): void {
  const current = loadOutbox(scope);
  const exercises = { ...current.exercises };
  for (const [id, rec] of Object.entries(sent.exercises)) {
    if (exercises[id] && JSON.stringify(exercises[id]) === JSON.stringify(rec))
      delete exercises[id];
  }
  const sentDays = new Set(sent.activityDays);
  write(outboxKey(scope), {
    exercises,
    activityDays: current.activityDays.filter((d) => !sentDays.has(d)),
  });
}

export function outboxSize(o: ProgressState): number {
  return Object.keys(o.exercises).length + o.activityDays.length;
}
