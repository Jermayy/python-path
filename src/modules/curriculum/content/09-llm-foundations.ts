import { py } from "../dedent";
import type { Module } from "../types";

export const llmFoundations: Module = {
  id: "llm-foundations",
  order: 9,
  title: "LLM Application Foundations",
  track: "ai",
  tagline:
    "Tokens, messages, prompts, structured outputs and tool calling — with the Python SDKs.",
  outcomes: [
    "Call an LLM API from Python with streaming, timeouts and error handling",
    "Get reliable structured output and validate it before use",
    "Implement tool calling: schemas in, tool results out",
  ],
  lessons: [
    {
      id: "llm-api-basics",
      title: "Calling a model",
      summary: "Messages, system prompts, tokens and context windows.",
      minutes: 25,
      content: [
        {
          kind: "code",
          caption: "The Anthropic Python SDK (pip/uv: anthropic)",
          code: py`
            import anthropic

            client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from the environment

            response = client.messages.create(
                model="claude-opus-5-5",
                max_tokens=2048,
                system="You are a concise assistant for a logistics company.",
                messages=[{"role": "user", "content": "Summarise this shipment note: ..."}],
            )
            for block in response.content:
                if block.type == "text":
                    print(block.text)
            print(response.usage.input_tokens, response.usage.output_tokens)
          `,
        },
        {
          kind: "text",
          body: "**Mental model:** an LLM predicts the next **token** (~¾ of an English word). You pay per input and output token. The **context window** is the max tokens per request (prompt + output). Conversations are stateless: you resend the history every call. The `system` prompt sets behaviour; `messages` alternate `user`/`assistant`.",
        },
        {
          kind: "callout",
          tone: "tip",
          body: "Production checklist for every LLM call: timeout, retry on 429/5xx (SDKs do this), streaming for long outputs, log token usage + latency per request, cap `max_tokens`, and never put secrets or other users' data in prompts.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "llm-trim-history",
          title: "Fit history into a budget",
          difficulty: "medium",
          prompt:
            "Write `fit_history(messages, budget_tokens)` that keeps the **most recent** messages whose estimated tokens fit in the budget. Estimate tokens as `ceil(len(content) / 4)`. The result must start with a `user` message (drop leading assistant messages after trimming) and keep chronological order. Always keep the final message even if it alone exceeds the budget.",
          starter: py`
            import math

            def estimate_tokens(text):
                return math.ceil(len(text) / 4)

            def fit_history(messages, budget_tokens):
                pass
          `,
          solution: py`
            import math

            def estimate_tokens(text):
                return math.ceil(len(text) / 4)

            def fit_history(messages, budget_tokens):
                if not messages:
                    return []
                kept = [messages[-1]]
                used = estimate_tokens(messages[-1]["content"])
                for msg in reversed(messages[:-1]):
                    cost = estimate_tokens(msg["content"])
                    if used + cost > budget_tokens:
                        break
                    kept.append(msg)
                    used += cost
                kept.reverse()
                while len(kept) > 1 and kept[0]["role"] != "user":
                    kept.pop(0)
                return kept
          `,
          tests: [
            {
              name: "keeps most recent within budget",
              code: py`
                msgs = [{"role": "user", "content": "a" * 40}, {"role": "assistant", "content": "b" * 40},
                        {"role": "user", "content": "c" * 40}, {"role": "assistant", "content": "d" * 40},
                        {"role": "user", "content": "e" * 40}]
                out = fit_history(msgs, 30)  # each is 10 tokens -> last 3 fit
                assert [m["content"][0] for m in out] == ["c", "d", "e"]
              `,
            },
            {
              name: "starts with a user message",
              code: py`
                msgs = [{"role": "user", "content": "a" * 40}, {"role": "assistant", "content": "b" * 40},
                        {"role": "user", "content": "c" * 40}]
                assert [m["role"] for m in fit_history(msgs, 20)] == ["user"]
              `,
            },
            {
              name: "always keeps last message",
              code: `assert len(fit_history([{"role": "user", "content": "x" * 1000}], 5)) == 1`,
              hidden: true,
            },
          ],
          hints: [
            "Walk backwards from the end, accumulating cost until the next message wouldn't fit.",
            "After reversing back to chronological order, pop from the front while the first role isn't 'user'.",
          ],
          explanation:
            "Real systems use the provider's token counter (e.g. `client.messages.count_tokens`), summarise older turns, or use server-side context management rather than silently dropping content. Know the trade-offs: dropping history loses facts the user stated earlier.",
        },
      ],
    },
    {
      id: "structured-output",
      title: "Structured output",
      summary: "Turn free text into validated data you can safely act on.",
      minutes: 25,
      content: [
        {
          kind: "text",
          body: "Treat model output as **untrusted input**. Modern APIs support constrained structured outputs (`output_config.format` with a JSON schema, or `client.messages.parse()` with a Pydantic model). Either way: validate with Pydantic, and on failure either retry with the validation error in the prompt or fail safely.",
        },
        {
          kind: "code",
          caption: "Pydantic model → schema → validated result",
          code: py`
            from pydantic import BaseModel

            class Ticket(BaseModel):
                category: Literal["billing", "bug", "other"]
                urgency: int  # 1-5
                summary: str

            response = client.messages.parse(
                model="claude-opus-5-5", max_tokens=1024,
                messages=[{"role": "user", "content": f"Triage this email:\n{email}"}],
                output_format=Ticket,
            )
            ticket: Ticket = response.parsed_output
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "llm-parse-json",
          title: "Robust JSON extraction",
          difficulty: "medium",
          packages: ["pydantic"],
          prompt:
            "Models sometimes wrap JSON in prose or ```json fences. Write `extract_ticket(text) -> Ticket | None`: find the first `{...}` JSON object in `text` (fenced or not), validate it against the given `Ticket` model, return None if nothing valid is found. Never raise.",
          starter: py`
            import json
            from typing import Literal
            from pydantic import BaseModel, Field, ValidationError

            class Ticket(BaseModel):
                category: Literal["billing", "bug", "other"]
                urgency: int = Field(ge=1, le=5)
                summary: str

            def extract_ticket(text):
                pass
          `,
          solution: py`
            import json
            from typing import Literal
            from pydantic import BaseModel, Field, ValidationError

            class Ticket(BaseModel):
                category: Literal["billing", "bug", "other"]
                urgency: int = Field(ge=1, le=5)
                summary: str

            def extract_ticket(text):
                if not isinstance(text, str):
                    return None
                decoder = json.JSONDecoder()
                for i, ch in enumerate(text):
                    if ch != "{":
                        continue
                    try:
                        obj, _ = decoder.raw_decode(text, i)
                    except json.JSONDecodeError:
                        continue
                    try:
                        return Ticket.model_validate(obj)
                    except ValidationError:
                        continue
                return None
          `,
          tests: [
            {
              name: "plain JSON",
              code: `assert extract_ticket('{"category": "bug", "urgency": 4, "summary": "crash"}').urgency == 4`,
            },
            {
              name: "fenced with prose",
              code: py`
                fence = chr(96) * 3
                t = extract_ticket(f'Sure! Here you go:\n{fence}json\n{{"category": "billing", "urgency": 2, "summary": "refund"}}\n{fence}\nAnything else?')
                assert t is not None and t.category == "billing"
              `,
            },
            {
              name: "invalid values rejected",
              code: `assert extract_ticket('{"category": "sales", "urgency": 9, "summary": "x"}') is None`,
            },
            {
              name: "garbage never raises",
              code: py`
                for bad in ["", "{", "{not json}", "}{", None]:
                    assert extract_ticket(bad) is None
              `,
              hidden: true,
            },
          ],
          hints: [
            "`json.JSONDecoder().raw_decode(text, index)` parses one JSON value starting at `index` and ignores what follows.",
            "Try each `{` position until one decodes *and* validates.",
          ],
          explanation:
            "`raw_decode` handles nested braces correctly, which a regex like `\\{.*?\\}` doesn't. With native structured outputs you rarely need this — but you'll meet it with older models, open-weight models, and customer codebases.",
        },
      ],
    },
    {
      id: "tool-calling",
      title: "Tool calling",
      summary:
        "Let the model request actions; your code executes them and returns results.",
      minutes: 30,
      content: [
        {
          kind: "text",
          body: "Tool calling loop: (1) send tools (name, description, JSON schema) with the request; (2) the model replies with `tool_use` blocks (`id`, `name`, `input`); (3) **your code** runs each tool and replies with `tool_result` blocks referencing the same `id`; (4) repeat until the model stops asking for tools. The model never executes anything itself.",
        },
        {
          kind: "code",
          caption: "A tool definition",
          code: py`
            tools = [{
                "name": "get_order_status",
                "description": "Look up the shipping status of an order by its ID.",
                "input_schema": {
                    "type": "object",
                    "properties": {"order_id": {"type": "string"}},
                    "required": ["order_id"],
                    "additionalProperties": False,
                },
            }]
          `,
        },
        {
          kind: "callout",
          tone: "warning",
          body: "Tool inputs come from the model, which may have read attacker-controlled text (emails, web pages). Validate every input, authorise every action against the *end user's* permissions, and require human confirmation for destructive actions.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "llm-tool-dispatch",
          title: "Dispatch tool calls",
          difficulty: "hard",
          packages: ["pydantic"],
          prompt:
            'Implement `class ToolRegistry` with `register(name, model, fn)` (model = Pydantic input model) and `run(tool_uses) -> list[dict]`. For each `{"type": "tool_use", "id", "name", "input"}` return `{"type": "tool_result", "tool_use_id": id, "content": str(result)}`. Unknown tool, validation failure, or an exception in `fn` → same shape with `"is_error": True` and a short error message as content. Results keep input order. Also implement `schemas()` returning `[{"name", "input_schema"}]` from `model.model_json_schema()`.',
          starter: py`
            from pydantic import BaseModel, ValidationError

            class ToolRegistry:
                def __init__(self):
                    self._tools = {}

                def register(self, name, model, fn):
                    pass

                def schemas(self):
                    pass

                def run(self, tool_uses):
                    pass
          `,
          solution: py`
            from pydantic import BaseModel, ValidationError

            class ToolRegistry:
                def __init__(self):
                    self._tools = {}

                def register(self, name, model, fn):
                    self._tools[name] = (model, fn)

                def schemas(self):
                    return [{"name": n, "input_schema": m.model_json_schema()} for n, (m, _) in self._tools.items()]

                def _error(self, tool_id, message):
                    return {"type": "tool_result", "tool_use_id": tool_id, "content": message, "is_error": True}

                def run(self, tool_uses):
                    results = []
                    for use in tool_uses:
                        tool_id = use.get("id")
                        entry = self._tools.get(use.get("name"))
                        if entry is None:
                            results.append(self._error(tool_id, f"unknown tool: {use.get('name')}"))
                            continue
                        model, fn = entry
                        try:
                            args = model.model_validate(use.get("input", {}))
                        except ValidationError as e:
                            results.append(self._error(tool_id, f"invalid input: {e.error_count()} error(s)"))
                            continue
                        try:
                            result = fn(args)
                        except Exception as e:
                            results.append(self._error(tool_id, f"tool failed: {type(e).__name__}"))
                            continue
                        results.append({"type": "tool_result", "tool_use_id": tool_id, "content": str(result)})
                    return results
          `,
          tests: [
            {
              name: "runs tools in order",
              code: py`
                class Add(BaseModel):
                    a: int
                    b: int
                reg = ToolRegistry(); reg.register("add", Add, lambda x: x.a + x.b)
                out = reg.run([{"type": "tool_use", "id": "t1", "name": "add", "input": {"a": 1, "b": 2}},
                               {"type": "tool_use", "id": "t2", "name": "add", "input": {"a": 5, "b": 5}}])
                assert out == [{"type": "tool_result", "tool_use_id": "t1", "content": "3"},
                               {"type": "tool_result", "tool_use_id": "t2", "content": "10"}]
              `,
            },
            {
              name: "errors are results, not exceptions",
              code: py`
                class Q(BaseModel):
                    q: str
                def boom(_): raise RuntimeError("db down")
                reg = ToolRegistry(); reg.register("search", Q, boom)
                out = reg.run([{"type": "tool_use", "id": "a", "name": "nope", "input": {}},
                               {"type": "tool_use", "id": "b", "name": "search", "input": {"q": 1.5}},
                               {"type": "tool_use", "id": "c", "name": "search", "input": {"q": "x"}}])
                assert [r["tool_use_id"] for r in out] == ["a", "b", "c"]
                assert all(r.get("is_error") is True for r in out)
              `,
            },
            {
              name: "schemas from pydantic",
              code: py`
                class Q(BaseModel):
                    q: str
                reg = ToolRegistry(); reg.register("search", Q, lambda x: x.q)
                s = reg.schemas()[0]
                assert s["name"] == "search" and s["input_schema"]["required"] == ["q"]
              `,
              hidden: true,
            },
          ],
          hints: [
            "Look the tool up first; then validate with `model.model_validate(input)`; then call `fn`. Each step has its own failure result.",
            "Returning `is_error: True` lets the model see what went wrong and recover — don't crash the loop.",
          ],
          explanation:
            "Error messages returned to the model are deliberately short and don't include stack traces or internal details — the model's context can leak to the user. The SDK tool runners (`@beta_tool`) implement this same loop for you.",
        },
        {
          kind: "quiz",
          id: "llm-who-executes",
          title: "Who runs the tool?",
          difficulty: "easy",
          question:
            "With client-side tool calling, who executes `get_order_status`?",
          options: [
            "The model provider's servers",
            "Your application code, after the model returns a tool_use block",
            "The user's browser automatically",
            "Nobody — the model simulates the result",
          ],
          answerIndex: 1,
          explanation:
            "The model only emits a structured request. Your code decides whether and how to run it — which is where authorisation and validation live.",
        },
      ],
    },
  ],
};
