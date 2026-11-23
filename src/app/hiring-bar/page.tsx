import type { Metadata } from "next";
import { HiringBarView } from "./HiringBarView";

export const metadata: Metadata = { title: "The hiring bar" };

export default function HiringBarPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">The hiring bar</h1>
      <p className="text-muted mt-2">
        Forward Deployed Engineer &amp; AI Orchestration Engineer — mid to
        senior.
      </p>

      <article className="border-line bg-elevated mt-8 space-y-4 rounded-xl border p-6 leading-relaxed">
        <p className="text-accent text-sm tracking-wide uppercase">
          A note from the hiring manager
        </p>
        <p>
          When I interview for these roles I&apos;m not checking whether
          you&apos;ve memorised Python syntax. I&apos;m asking one question:{" "}
          <strong>
            can I put you in front of a customer with a vague problem and trust
            you to ship something that works, safely, in a couple of weeks?
          </strong>
        </p>
        <p>
          That means fluent Python — typed, tested, idiomatic — and production
          instincts: validation at boundaries, timeouts, retries, auth, logs. It
          means you can build LLM features that are <em>reliable</em>, not just
          impressive in a demo: structured outputs, tool calling, retrieval that
          finds the right context, and agents that are bounded and safe.
        </p>
        <p>
          The thing that separates senior candidates is <strong>evals</strong>.
          Anyone can make a RAG demo answer three questions well. I want to hear
          how you know it answers the next three hundred well, how you&apos;d
          catch a regression before the customer does, and what you&apos;d
          measure when latency and quality pull in opposite directions.
        </p>
        <p>
          Finally: communication. You&apos;ll scope with non-engineers, explain
          trade-offs in plain language, and own outcomes. Bring a deployed
          project with a README that shows your decisions and an eval report.
          That one artefact answers most of my questions before the interview
          starts.
        </p>
      </article>

      <h2 className="mt-10 text-2xl font-bold">
        Competencies &amp; your readiness
      </h2>
      <HiringBarView />
    </div>
  );
}
