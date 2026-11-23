"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getExercise } from "@/modules/curriculum";
import { getBrowserSupabase } from "@/shared/supabase/browser";
import { recordAttempt, recordHint, saveDraft } from "./actions";
import { exerciseXp, levelInfo, totalXp } from "./gamification";
import {
  ackOutbox,
  addToOutbox,
  clearLocal,
  GUEST_SCOPE,
  loadLocal,
  loadOutbox,
  outboxSize,
  saveLocal,
} from "./local-store";
import { mergeExercise, mergeProgress } from "./merge";
import { RemoteProgressStore } from "./remote-store";
import {
  emptyProgress,
  type ExerciseProgress,
  type ProgressState,
} from "./types";

export type SyncStatus = "guest" | "loading" | "syncing" | "synced" | "offline";

export interface CompletionEvent {
  id: number;
  exerciseId: string;
  xp: number;
  levelUp: { level: number; title: string } | null;
}

interface ProgressContextValue {
  user: Pick<User, "id" | "email"> | null;
  authReady: boolean;
  authAvailable: boolean;
  state: ProgressState;
  sync: SyncStatus;
  pendingChanges: number;
  guestImportCount: number;
  lastCompletion: CompletionEvent | null;
  attempt: (exerciseId: string, passed: boolean, code: string | null) => void;
  takeHint: (exerciseId: string) => void;
  saveCode: (exerciseId: string, code: string) => void;
  importGuestProgress: () => void;
  dismissGuestImport: () => void;
  resetProgress: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const DRAFT_SYNC_DELAY_MS = 3000;
const MAX_RETRY_MS = 60_000;

export function ProgressProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase();
  const [user, setUser] = useState<Pick<User, "id" | "email"> | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [sync, setSync] = useState<SyncStatus>(supabase ? "loading" : "guest");
  const [pendingChanges, setPendingChanges] = useState(0);
  const [guestImportCount, setGuestImportCount] = useState(0);
  const [lastCompletion, setLastCompletion] = useState<CompletionEvent | null>(
    null,
  );

  const stateRef = useRef(state);
  const scopeRef = useRef<string>(GUEST_SCOPE);
  const remoteRef = useRef<RemoteProgressStore | null>(null);
  const flushingRef = useRef(false);
  const retryRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    delay: number;
  }>({ timer: null, delay: 5000 });
  const draftTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const eventId = useRef(0);

  const commit = useCallback((next: ProgressState) => {
    stateRef.current = next;
    setState(next);
    saveLocal(scopeRef.current, next);
  }, []);

  // Held in a ref so retries and follow-up flushes can call the latest version.
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const flush = useCallback(async () => {
    const remote = remoteRef.current;
    const scope = scopeRef.current;
    if (!remote || flushingRef.current) return;
    const outbox = loadOutbox(scope);
    setPendingChanges(outboxSize(outbox));
    if (outboxSize(outbox) === 0) {
      setSync("synced");
      return;
    }
    flushingRef.current = true;
    setSync("syncing");
    let retryNow = false;
    try {
      await remote.push(outbox);
      ackOutbox(scope, outbox);
      const left = outboxSize(loadOutbox(scope));
      setPendingChanges(left);
      setSync(left ? "syncing" : "synced");
      retryRef.current.delay = 5000;
      retryNow = left > 0;
    } catch (err) {
      console.warn("[progress] sync failed; will retry", err);
      setSync("offline");
      const r = retryRef.current;
      if (r.timer) clearTimeout(r.timer);
      r.timer = setTimeout(() => void flushRef.current(), r.delay);
      r.delay = Math.min(r.delay * 2, MAX_RETRY_MS);
    } finally {
      flushingRef.current = false;
    }
    // Changes made while the request was in flight.
    if (retryNow) void flushRef.current();
  }, []);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const enqueue = useCallback(
    (records: ExerciseProgress[], days: string[]) => {
      if (scopeRef.current === GUEST_SCOPE) return;
      const outbox = addToOutbox(scopeRef.current, records, days);
      setPendingChanges(outboxSize(outbox));
      void flush();
    },
    [flush],
  );

  // ---- auth lifecycle (no-op in guest-only deployments: authReady starts true)
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user
        ? { id: session.user.id, email: session.user.email }
        : null;
      setUser((prev) => (prev?.id === next?.id ? prev : next));
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // ---- load + live sync for the active scope
  useEffect(() => {
    if (!authReady) return;
    const scope = user?.id ?? GUEST_SCOPE;
    const retry = retryRef.current;
    let cancelled = false;
    let unsubscribe = () => {};

    // localStorage is an external store: read it after mount so SSR markup matches hydration.
    const start = async () => {
      await Promise.resolve();
      if (cancelled) return;
      scopeRef.current = scope;
      commit(loadLocal(scope));

      if (!user || !supabase) {
        remoteRef.current = null;
        setSync("guest");
        setGuestImportCount(0);
        return;
      }

      const remote = new RemoteProgressStore(supabase, user.id);
      remoteRef.current = remote;
      setSync("loading");
      setGuestImportCount(Object.keys(loadLocal(GUEST_SCOPE).exercises).length);

      unsubscribe = remote.subscribe(
        (record) => {
          const current = stateRef.current;
          const existing = current.exercises[record.exerciseId];
          const merged = existing ? mergeExercise(existing, record) : record;
          commit({
            ...current,
            exercises: { ...current.exercises, [record.exerciseId]: merged },
          });
        },
        (day) => {
          const current = stateRef.current;
          if (!current.activityDays.includes(day))
            commit({
              ...current,
              activityDays: [...current.activityDays, day].sort(),
            });
        },
      );

      try {
        const serverState = await remote.fetchAll();
        if (cancelled) return;
        commit(
          mergeProgress(
            mergeProgress(serverState, stateRef.current),
            loadOutbox(scope),
          ),
        );
        void flush();
      } catch (err) {
        console.warn("[progress] initial load failed; using local cache", err);
        if (!cancelled) setSync("offline");
      }
    };
    void start();

    const onOnline = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      if (retry.timer) clearTimeout(retry.timer);
    };
  }, [authReady, user, supabase, commit, flush]);

  // ---- learner actions
  const attempt = useCallback(
    (exerciseId: string, passed: boolean, code: string | null) => {
      const before = stateRef.current;
      // Ask the browser not to evict guest progress (called from a user action, as Firefox prompts).
      if (
        scopeRef.current === GUEST_SCOPE &&
        Object.keys(before.exercises).length === 0
      ) {
        void navigator.storage?.persist?.().catch(() => false);
      }
      const levelBefore = levelInfo(totalXp(before)).level;
      const result = recordAttempt(
        before,
        exerciseId,
        passed,
        code,
        new Date(),
      );
      commit(result.state);
      const newDays = result.state.activityDays.filter(
        (d) => !before.activityDays.includes(d),
      );
      enqueue([result.record], newDays);
      if (result.newlyCompleted) {
        const ref = getExercise(exerciseId);
        const xp = ref
          ? exerciseXp(
              ref.exercise,
              result.record.attempts,
              result.record.hintsUsed,
            )
          : 0;
        const after = levelInfo(totalXp(result.state));
        eventId.current += 1;
        setLastCompletion({
          id: eventId.current,
          exerciseId,
          xp,
          levelUp:
            after.level > levelBefore
              ? { level: after.level, title: after.title }
              : null,
        });
      }
    },
    [commit, enqueue],
  );

  const takeHint = useCallback(
    (exerciseId: string) => {
      const result = recordHint(stateRef.current, exerciseId, new Date());
      commit(result.state);
      enqueue([result.record], []);
    },
    [commit, enqueue],
  );

  const saveCode = useCallback(
    (exerciseId: string, code: string) => {
      const result = saveDraft(stateRef.current, exerciseId, code, new Date());
      commit(result.state);
      const timers = draftTimers.current;
      const existing = timers.get(exerciseId);
      if (existing) clearTimeout(existing);
      timers.set(
        exerciseId,
        setTimeout(() => {
          timers.delete(exerciseId);
          const latest = stateRef.current.exercises[exerciseId];
          if (latest) enqueue([latest], []);
        }, DRAFT_SYNC_DELAY_MS),
      );
    },
    [commit, enqueue],
  );

  const importGuestProgress = useCallback(() => {
    const guest = loadLocal(GUEST_SCOPE);
    commit(mergeProgress(stateRef.current, guest));
    enqueue(Object.values(guest.exercises), guest.activityDays);
    clearLocal(GUEST_SCOPE);
    setGuestImportCount(0);
  }, [commit, enqueue]);

  const dismissGuestImport = useCallback(() => setGuestImportCount(0), []);

  const resetProgress = useCallback(async () => {
    if (remoteRef.current) await remoteRef.current.reset();
    clearLocal(scopeRef.current);
    commit(emptyProgress());
    setPendingChanges(0);
  }, [commit]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, [supabase]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      user,
      authReady,
      authAvailable: Boolean(supabase),
      state,
      sync,
      pendingChanges,
      guestImportCount,
      lastCompletion,
      attempt,
      takeHint,
      saveCode,
      importGuestProgress,
      dismissGuestImport,
      resetProgress,
      signOut,
    }),
    [
      user,
      authReady,
      supabase,
      state,
      sync,
      pendingChanges,
      guestImportCount,
      lastCompletion,
      attempt,
      takeHint,
      saveCode,
      importGuestProgress,
      dismissGuestImport,
      resetProgress,
      signOut,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx)
    throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
