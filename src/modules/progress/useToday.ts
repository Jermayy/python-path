"use client";

import { useSyncExternalStore } from "react";
import { localDay } from "./gamification";

let cached: { day: string; date: Date } | null = null;

function getToday(): Date {
  const now = new Date();
  const day = localDay(now);
  if (!cached || cached.day !== day) cached = { day, date: now };
  return cached.date;
}

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

/** Today's date on the client (stable per calendar day); null during server prerender. */
export function useToday(): Date | null {
  return useSyncExternalStore(subscribe, getToday, () => null);
}
