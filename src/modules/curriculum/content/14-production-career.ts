import { py } from "../dedent";
import type { Module } from "../types";

export const productionCareer: Module = {
  id: "production-career",
  order: 14,
  title: "Production, Interviews & Capstone",
  track: "career",
  tagline:
    "Observability, cost control, customer-facing system design — and the portfolio that gets you hired.",
  outcomes: [
    "Instrument an LLM service: structured logs, redaction, token and cost tracking",
    "Run a customer-facing system design discussion like a Forward Deployed Engineer",
    "Ship a capstone that proves senior-level judgement",
  ],
  lessons: [
    {
      id: "observability-cost",
      title: "Observability & cost",
      summary: "Know what your system is doing and what it costs, per request.",
      minutes: 25,
      content: [
        {
          kind: "text",
          body: "For every LLM request, log (as structured JSON): request/trace id, user id (pseudonymous), model, prompt version, input/output/cached tokens, latency, stop reason, tool calls, and outcome. **Redact** secrets and personal data at the logger. Use OpenTelemetry traces so one user action shows retrieval, each model call and each tool call as spans.",
        },
        {
          kind: "text",
          body: "Cost levers, cheapest first: prompt caching for stable prefixes, trimming context, smaller/cheaper models for easy sub-tasks, lower reasoning effort where quality holds (measure with evals!), batch APIs for offline work, and per-user quotas so one runaway loop can't burn the budget.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "prod-redact",
          title: "Redacting logger",
          difficulty: "medium",
          prompt:
            'Write `redact(obj)` returning a deep copy of nested dicts/lists where (a) any dict key that (case-insensitively) contains `password`, `secret`, `api_key` or `authorization`, or **ends with** `token`, has its value replaced by `"[REDACTED]"`, and (b) email addresses inside any string are replaced with `"[EMAIL]"`. Non-container values pass through. Then `log_event(event, **fields) -> str` returns a JSON line `{"event": ..., **redacted fields}` with sorted keys.',
          starter: py`
            import json, re

            SENSITIVE = re.compile(r"password|secret|api_key|authorization|token$", re.IGNORECASE)
            EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

            def redact(obj):
                pass

            def log_event(event, **fields):
                pass
          `,
          solution: py`
            import json, re

            SENSITIVE = re.compile(r"password|secret|api_key|authorization|token$", re.IGNORECASE)
            EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

            def redact(obj):
                if isinstance(obj, dict):
                    return {k: "[REDACTED]" if SENSITIVE.search(str(k)) else redact(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [redact(v) for v in obj]
                if isinstance(obj, str):
                    return EMAIL.sub("[EMAIL]", obj)
                return obj

            def log_event(event, **fields):
                return json.dumps({"event": event, **redact(fields)}, sort_keys=True)
          `,
          tests: [
            {
              name: "redacts nested keys and emails",
              code: py`
                data = {"user": {"email": "ada@example.com", "Access_Token": "abc"},
                        "notes": ["contact bob@corp.io asap", 3], "Authorization": "Bearer x"}
                assert redact(data) == {"user": {"email": "[EMAIL]", "Access_Token": "[REDACTED]"},
                                        "notes": ["contact [EMAIL] asap", 3], "Authorization": "[REDACTED]"}
              `,
            },
            {
              name: "does not mutate input",
              code: py`
                d = {"password": "p"}; redact(d); assert d == {"password": "p"}
              `,
            },
            {
              name: "json line",
              code: py`
                import json
                line = log_event("llm_call", model="m", api_key="sk-123", input_tokens=10)
                assert json.loads(line) == {"event": "llm_call", "model": "m", "api_key": "[REDACTED]", "input_tokens": 10}
                assert line.index('"api_key"') < line.index('"event"')
              `,
              hidden: true,
            },
          ],
          hints: [
            "Recurse on dicts and lists; build new containers instead of modifying the input.",
            "`SENSITIVE.search(key)` matches `access_token` but not `input_tokens` — you still want token *counts* in your logs.",
          ],
          explanation:
            "Redacting centrally in the logger means one forgotten field can't leak a key. Key-based redaction misses secrets in free text, so it's paired with pattern rules and with simply not logging prompts verbatim in production.",
        },
        {
          kind: "code",
          id: "prod-cost",
          title: "LLM cost calculator",
          difficulty: "easy",
          prompt:
            "Write `cost_usd(usage, prices)` where `usage` has `input_tokens`, `output_tokens`, `cache_read_tokens` (default 0) and `prices` has per-million-token USD rates `input`, `output`, `cache_read`. Return the cost rounded to 6 decimals. Then `monthly_cost(requests_per_day, avg_usage, prices, days=30)` rounded to 2 decimals.",
          starter: py`
            def cost_usd(usage, prices):
                pass

            def monthly_cost(requests_per_day, avg_usage, prices, days=30):
                pass
          `,
          solution: py`
            def cost_usd(usage, prices):
                total = (
                    usage["input_tokens"] * prices["input"]
                    + usage["output_tokens"] * prices["output"]
                    + usage.get("cache_read_tokens", 0) * prices["cache_read"]
                ) / 1_000_000
                return round(total, 6)

            def monthly_cost(requests_per_day, avg_usage, prices, days=30):
                return round(cost_usd(avg_usage, prices) * requests_per_day * days, 2)
          `,
          tests: [
            {
              name: "per request",
              code: py`
                prices = {"input": 4.0, "output": 20.0, "cache_read": 0.2}
                assert cost_usd({"input_tokens": 2000, "output_tokens": 500, "cache_read_tokens": 10000}, prices) == 0.02
              `,
            },
            {
              name: "monthly",
              code: py`
                prices = {"input": 4.0, "output": 20.0, "cache_read": 0.2}
                assert monthly_cost(1000, {"input_tokens": 2000, "output_tokens": 500}, prices) == 540.0
              `,
            },
          ],
          hints: [
            "Prices are per **million** tokens — divide by 1_000_000.",
            'Use `.get("cache_read_tokens", 0)` for the optional field.',
          ],
          explanation:
            'Back-of-envelope cost maths is an FDE superpower in customer conversations: "1,000 tickets/day at ~2.5k tokens each is about $540/month on this model; caching the shared prefix cuts input cost ~20×."',
        },
      ],
    },
    {
      id: "fde-interview",
      title: "The FDE / AI Orchestration interview",
      summary: "What the loop looks like, what we score, and how to prepare.",
      minutes: 30,
      content: [
        {
          kind: "text",
          body: '**A typical loop:** (1) recruiter screen; (2) live coding in Python (practical: parse/transform data, call an API, handle errors — LeetCode-medium at most); (3) a take-home or pairing build — e.g. a small RAG or agent service with tests and an eval; (4) customer-scenario system design; (5) behavioural/"customer obsession" interview; (6) sometimes a presentation of your take-home to a mock customer.',
        },
        {
          kind: "callout",
          tone: "interview",
          body: "What a hiring manager scores: **ships working software fast** without cutting safety corners; **scopes ambiguity** (asks the right questions, defines success metrics); **AI judgement** (workflow vs agent, RAG vs fine-tune, how to eval); **production instincts** (timeouts, retries, auth, observability, cost); **communication** with non-engineers.",
        },
        {
          kind: "text",
          body: "**Customer system-design template:** (1) clarify users, volume, latency, data sensitivity and the success metric; (2) sketch the simplest end-to-end flow; (3) data: sources, access control, freshness; (4) model choices + prompts + tools; (5) evals offline and monitoring online; (6) failure modes (hallucination, injection, outages, cost spikes) and mitigations; (7) rollout: pilot, feedback loop, iteration plan.",
        },
        {
          kind: "text",
          body: "**Capstone (do this!):** build and deploy a domain RAG/agent service: FastAPI back end, Next.js front end, Postgres + pgvector, auth, streaming chat with citations, an eval suite with a CI regression gate, structured logs with token/cost tracking, and a README with architecture, trade-offs and eval results. This is your portfolio centrepiece — and the app you're using right now is a second one.",
        },
      ],
      exercises: [
        {
          kind: "quiz",
          id: "fde-first-question",
          title: "Scoping first",
          difficulty: "medium",
          question:
            'A customer says "We want an AI agent for our support team." What should your first move be in a design discussion?',
          options: [
            "Propose a multi-agent architecture with LangGraph",
            "Ask what success looks like (e.g. deflection rate, handle time), the ticket volume, data sources and what actions the agent may take",
            "Start fine-tuning a model on their tickets",
            "Quote a price per token",
          ],
          answerIndex: 1,
          explanation:
            "Scoping before solutioning. The success metric becomes your eval; data sources determine RAG design; allowed actions determine guardrails.",
        },
        {
          kind: "quiz",
          id: "fde-tradeoff",
          title: "Latency vs quality",
          difficulty: "hard",
          question:
            "Your RAG answers are high-quality but p95 latency is 9s and the customer needs < 3s for a chat widget. Which plan is best?",
          options: [
            "Switch to the smallest model everywhere and hope quality holds",
            "Stream tokens to the UI, cache the stable prompt prefix, parallelise retrieval, try lower reasoning effort or a faster model on the eval set, and measure p95 + quality per change",
            "Remove retrieval to save time",
            "Tell the customer latency can't be improved",
          ],
          answerIndex: 1,
          explanation:
            "Streaming fixes perceived latency immediately; the other levers are measured against the eval so quality regressions are caught. Changing one variable at a time is the senior move.",
        },
        {
          kind: "quiz",
          id: "fde-incident",
          title: "Production incident",
          difficulty: "hard",
          question:
            "After a prompt change ships, the customer reports the bot is citing the wrong policy documents. What's the best sequence?",
          options: [
            "Edit the prompt in production until it looks right",
            "Roll back the prompt version, reproduce with logged request/trace ids, add the failing cases to the eval set, fix, and gate the re-release on the eval",
            "Blame the model provider",
            "Disable citations",
          ],
          answerIndex: 1,
          explanation:
            "Mitigate first (rollback), then diagnose with observability, then turn the incident into eval cases so it can't silently regress again.",
        },
      ],
    },
  ],
};
