import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="text-muted mt-2">
        Sync your progress across browsers and unlock the AI tutor. Guest
        progress on this device can be imported.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
