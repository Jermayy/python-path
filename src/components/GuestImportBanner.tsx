"use client";

import { useProgress } from "@/modules/progress/ProgressProvider";

export function GuestImportBanner() {
  const { guestImportCount, importGuestProgress, dismissGuestImport, user } =
    useProgress();
  if (!user || guestImportCount === 0) return null;
  return (
    <div
      role="region"
      aria-label="Import guest progress"
      className="border-line bg-brand/15 border-b"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <p>
          You have <strong>{guestImportCount}</strong> exercise
          {guestImportCount === 1 ? "" : "s"} saved from guest mode on this
          device. Add them to your account?
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={importGuestProgress}
            className="bg-brand-solid hover:bg-brand-solid-hover rounded-md px-3 py-1 font-medium text-white"
          >
            Import progress
          </button>
          <button
            type="button"
            onClick={dismissGuestImport}
            className="text-muted hover:text-fg rounded-md px-3 py-1"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
