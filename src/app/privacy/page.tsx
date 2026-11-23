import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p>
        Python Path collects the minimum needed to save your learning progress.
      </p>
      <h2 className="text-xl font-semibold">Guest mode</h2>
      <p>
        Nothing leaves your device. Progress and code drafts are stored in your
        browser&apos;s local storage; clearing site data deletes them. Some
        browsers (e.g. Safari) may clear this storage after a period of
        inactivity.
      </p>
      <h2 className="text-xl font-semibold">Accounts</h2>
      <p>
        If you sign in we store your email address (for login) and your
        progress: which exercises you attempted or completed, attempt and hint
        counts, your latest code for each exercise, and the days you were
        active. Data is stored in Supabase (Postgres) and is only readable by
        your account. You can delete your progress any time from the dashboard;
        contact the maintainer to delete your account entirely.
      </p>
      <h2 className="text-xl font-semibold">AI tutor</h2>
      <p>
        When you use the AI tutor, your question, the current exercise and your
        current code are sent to Anthropic&apos;s API to generate a reply. We
        don&apos;t send your email. Usage is limited per day. Anthropic&apos;s
        commercial terms govern how that data is handled.
      </p>
      <h2 className="text-xl font-semibold">Code execution</h2>
      <p>
        Your Python code runs entirely in your browser via Pyodide
        (WebAssembly). It is never executed on our servers.
      </p>
      <h2 className="text-xl font-semibold">No tracking</h2>
      <p>
        No advertising, analytics or tracking cookies. Only the authentication
        cookies needed to keep you signed in.
      </p>
    </div>
  );
}
