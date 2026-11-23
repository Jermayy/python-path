/** The hiring-manager rubric the curriculum is built around. Shown on /hiring-bar and the landing page. */
export interface Competency {
  id: string;
  title: string;
  expectation: string;
  evidence: string[];
  modules: string[];
}

export const competencies: Competency[] = [
  {
    id: "python",
    title: "Fluent, idiomatic Python",
    expectation:
      "Write clean, typed, tested Python without fighting the language. Solve a LeetCode-medium out loud and explain the complexity.",
    evidence: [
      "Comprehensions, generators, dataclasses, context managers",
      "Type hints + Protocols checked in CI",
      "pytest suites with fakes, not network calls",
    ],
    modules: [
      "python-basics",
      "data-structures",
      "problem-solving",
      "idiomatic-python",
      "typing-testing",
    ],
  },
  {
    id: "backend",
    title: "Production backends",
    expectation:
      "Ship a FastAPI service with validation, auth, SQL, pagination and correct status codes — and debug one you didn't write.",
    evidence: [
      "Pydantic at every boundary",
      "Parameterised SQL, no N+1",
      "Timeouts, retries with backoff, idempotency",
    ],
    modules: ["backend-apis", "async-reliability", "fullstack"],
  },
  {
    id: "llm",
    title: "LLM application engineering",
    expectation:
      "Build reliable features on top of model APIs: prompts, structured outputs, tool calling, streaming, and cost/latency awareness.",
    evidence: [
      "Validated structured output",
      "Tool registry with error results",
      "Streaming responses to a TS front end",
    ],
    modules: ["llm-foundations", "fullstack"],
  },
  {
    id: "rag",
    title: "Retrieval & RAG",
    expectation:
      "Design retrieval that actually finds the right context: chunking, embeddings, hybrid search, access control and grounded citations.",
    evidence: [
      "Vector search with ACL pre-filtering",
      "Hybrid search with RRF",
      "Prompts that cite sources and refuse when unsupported",
    ],
    modules: ["rag-vectors"],
  },
  {
    id: "agents",
    title: "Agents & orchestration",
    expectation:
      "Know when *not* to build an agent. When you do: bounded loops, least-privilege tools, approvals, budgets, and prompt-injection defences.",
    evidence: [
      "Correct agent loop bookkeeping",
      "DAG pipelines",
      "Human-in-the-loop gates for side effects",
    ],
    modules: ["agents-orchestration"],
  },
  {
    id: "evals",
    title: "Evals (the senior differentiator)",
    expectation:
      "Prove a system works: golden datasets, code and LLM graders with known biases, retrieval metrics, and CI regression gates.",
    evidence: [
      "Per-tag accuracy breakdowns",
      "Position-swapped pairwise judges",
      "Release gates with critical cases",
    ],
    modules: ["evals"],
  },
  {
    id: "ml",
    title: "ML fundamentals",
    expectation:
      "Speak the language of training: loss, gradient descent, data splits and leakage — and argue prompt vs RAG vs fine-tune.",
    evidence: [
      "Group-aware data splits",
      "Gradient descent from scratch",
      "Validated fine-tuning datasets",
    ],
    modules: ["training-finetuning"],
  },
  {
    id: "fde",
    title: "Customer-facing judgement",
    expectation:
      "Scope a vague request into metrics, ship a POC in days, explain trade-offs to non-engineers, and run production like an owner.",
    evidence: [
      "Observability with redaction and cost tracking",
      "Structured system-design answers",
      "A deployed capstone with an eval report",
    ],
    modules: ["production-career"],
  },
];
