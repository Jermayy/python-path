"use client";

import {
  Cloud,
  CloudOff,
  Flame,
  HardDrive,
  Loader2,
  LogIn,
  Map,
  Trophy,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToday } from "@/modules/progress/useToday";
import {
  currentStreak,
  levelInfo,
  totalXp,
} from "@/modules/progress/gamification";
import {
  useProgress,
  type SyncStatus,
} from "@/modules/progress/ProgressProvider";

const NAV = [
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/dashboard", label: "Dashboard", icon: Trophy },
  { href: "/hiring-bar", label: "Hiring bar", icon: Briefcase },
];

const SYNC_COPY: Record<
  SyncStatus,
  { label: string; Icon: typeof Cloud; className: string }
> = {
  guest: {
    label: "Guest — saved on this device",
    Icon: HardDrive,
    className: "text-muted",
  },
  loading: {
    label: "Loading your progress…",
    Icon: Loader2,
    className: "text-muted animate-spin",
  },
  syncing: {
    label: "Syncing…",
    Icon: Loader2,
    className: "text-brand animate-spin",
  },
  synced: {
    label: "All progress synced",
    Icon: Cloud,
    className: "text-success",
  },
  offline: {
    label: "Offline — changes saved locally, will sync",
    Icon: CloudOff,
    className: "text-warning",
  },
};

export function AppHeader() {
  const pathname = usePathname();
  const { state, sync, user, authAvailable, pendingChanges } = useProgress();
  const today = useToday();
  const xp = totalXp(state);
  const level = levelInfo(xp);
  const streak = today ? currentStreak(state.activityDays, today) : 0;
  const syncInfo = SYNC_COPY[sync];

  return (
    <header className="border-line bg-bg/85 sticky top-0 z-30 border-b backdrop-blur">
      <a
        href="#main"
        className="focus:bg-accent sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded focus:px-3 focus:py-1 focus:text-black"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="from-brand to-accent grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-sm text-black"
          >
            Py
          </span>
          <span className="hidden sm:inline">Python Path</span>
        </Link>
        <nav aria-label="Main" className="ml-2 flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span
            className="border-line flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm"
            title={`${streak}-day streak`}
          >
            <Flame
              aria-hidden="true"
              className={`h-4 w-4 ${streak > 0 ? "text-warning" : "text-muted"}`}
            />
            <span className="sr-only">Streak:</span>
            {streak}
          </span>
          <Link
            href="/dashboard"
            className="border-line hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm sm:flex"
            title={`${level.title}: ${xp} XP`}
            aria-label={`Level ${level.level}, ${level.title}: ${xp} XP`}
          >
            <span className="text-accent font-semibold">Lv {level.level}</span>
            <span className="text-muted">{xp} XP</span>
          </Link>
          <span
            title={
              pendingChanges
                ? `${syncInfo.label} (${pendingChanges} pending)`
                : syncInfo.label
            }
            className="flex items-center"
          >
            <syncInfo.Icon
              aria-hidden="true"
              className={`h-4 w-4 ${syncInfo.className}`}
            />
            <span className="sr-only" role="status">
              {syncInfo.label}
            </span>
          </span>
          {authAvailable && !user && (
            <Link
              href="/login"
              className="bg-brand-solid hover:bg-brand-solid-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white"
            >
              <LogIn aria-hidden="true" className="h-4 w-4" />
              Sign in
            </Link>
          )}
          {user && (
            <Link
              href="/dashboard#account"
              className="text-muted hover:text-fg max-w-32 truncate text-sm"
              title={user.email ?? ""}
            >
              {user.email}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
