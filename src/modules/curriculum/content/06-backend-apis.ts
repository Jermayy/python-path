import { py } from "../dedent";
import type { Module } from "../types";

export const backendApis: Module = {
  id: "backend-apis",
  order: 6,
  title: "Backend: Data, SQL & APIs",
  track: "backend",
  tagline:
    "Pydantic validation, SQL with parameterised queries, and FastAPI-style REST design.",
  outcomes: [
    "Validate untrusted input at the boundary with Pydantic models",
    "Write safe, parameterised SQL and avoid N+1 queries",
    "Design REST endpoints with correct status codes, pagination and error shapes",
  ],
  lessons: [
    {
      id: "pydantic",
      title: "Validation with Pydantic",
      summary:
        "Runtime-validated models — the backbone of FastAPI and LLM structured outputs.",
      minutes: 25,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            const User = z.object({
              email: z.string().email(),
              age: z.number().int().min(13),
              tags: z.array(z.string()).default([]),
            });
            const user = User.parse(json);
          `,
          python: py`
            from pydantic import BaseModel, Field, EmailStr

            class User(BaseModel):
                email: str
                age: int = Field(ge=13)
                tags: list[str] = []

            user = User.model_validate(data)       # raises ValidationError
            user.model_dump()                      # -> dict
            User.model_json_schema()               # -> JSON Schema (for LLM tools!)
          `,
          note: "Pydantic is Zod for Python. `model_json_schema()` is how you turn a model into a tool definition or structured-output schema for an LLM.",
        },
        {
          kind: "code",
          caption: "Custom validators",
          code: py`
            from pydantic import BaseModel, field_validator

            class Signup(BaseModel):
                username: str

                @field_validator("username")
                @classmethod
                def no_spaces(cls, v: str) -> str:
                    if " " in v:
                        raise ValueError("username cannot contain spaces")
                    return v.lower()
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "api-pydantic-order",
          title: "Validate an order payload",
          difficulty: "medium",
          packages: ["pydantic"],
          prompt:
            'Create Pydantic models `LineItem(sku: str, qty: int >= 1, unit_cents: int >= 0)` and `Order(customer_id: str, items: list[LineItem])` where `items` must be non-empty and `sku` is upper-cased by a validator. Add a `total_cents` property on Order. Write `parse_order(data: dict) -> Order | list[str]` returning the model, or a list of error field paths like `"items.0.qty"` on failure.',
          starter: py`
            from pydantic import BaseModel, Field, ValidationError, field_validator

            class LineItem(BaseModel):
                pass

            class Order(BaseModel):
                pass

            def parse_order(data):
                pass
          `,
          solution: py`
            from pydantic import BaseModel, Field, ValidationError, field_validator

            class LineItem(BaseModel):
                sku: str
                qty: int = Field(ge=1)
                unit_cents: int = Field(ge=0)

                @field_validator("sku")
                @classmethod
                def upper(cls, v: str) -> str:
                    return v.upper()

            class Order(BaseModel):
                customer_id: str
                items: list[LineItem] = Field(min_length=1)

                @property
                def total_cents(self) -> int:
                    return sum(i.qty * i.unit_cents for i in self.items)

            def parse_order(data):
                try:
                    return Order.model_validate(data)
                except ValidationError as e:
                    return [".".join(str(p) for p in err["loc"]) for err in e.errors()]
          `,
          tests: [
            {
              name: "valid order",
              code: py`
                o = parse_order({"customer_id": "c1", "items": [{"sku": "ab-1", "qty": 2, "unit_cents": 500}]})
                assert o.total_cents == 1000 and o.items[0].sku == "AB-1"
              `,
            },
            {
              name: "reports field paths",
              code: py`
                errs = parse_order({"customer_id": "c1", "items": [{"sku": "x", "qty": 0, "unit_cents": 1}]})
                assert errs == ["items.0.qty"], errs
              `,
            },
            {
              name: "empty items rejected",
              code: `assert parse_order({"customer_id": "c", "items": []}) == ["items"]`,
            },
            {
              name: "coerces numeric strings (lax mode)",
              code: `assert parse_order({"customer_id": "c", "items": [{"sku": "a", "qty": "3", "unit_cents": 1}]}).items[0].qty == 3`,
              hidden: true,
            },
          ],
          hints: [
            "`Field(ge=1)` = greater-or-equal; `Field(min_length=1)` on a list requires at least one item.",
            "`ValidationError.errors()` returns dicts with a `loc` tuple like `('items', 0, 'qty')`.",
          ],
          explanation:
            'Pydantic\'s lax mode coerces `"3"` → `3`. Use `model_config = ConfigDict(strict=True)` when you need exact types. Returning field paths is how APIs build RFC 9457 problem-details error lists.',
        },
      ],
    },
    {
      id: "sql",
      title: "SQL from Python",
      summary:
        "sqlite3/psycopg, parameterised queries, joins and transactions.",
      minutes: 30,
      content: [
        {
          kind: "code",
          caption:
            "DB-API: the same shape for sqlite3, psycopg (Postgres), etc.",
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL)")
            with conn:   # transaction: commits on success, rolls back on exception
                conn.execute("INSERT INTO users (email) VALUES (?)", ("ada@example.com",))
            rows = conn.execute("SELECT id, email FROM users WHERE email = ?", (email,)).fetchall()
          `,
        },
        {
          kind: "callout",
          tone: "warning",
          body: "Never build SQL with f-strings: `f\"... WHERE email = '{email}'\"` is SQL injection. Always pass parameters separately (`?` for sqlite, `%s` for psycopg).",
        },
        {
          kind: "text",
          body: "**N+1 queries:** fetching a list, then querying once per row for related data. Fix with a `JOIN` or a single `WHERE id IN (...)` query. ORMs (SQLAlchemy, SQLModel) make N+1 easy to write by accident — interviewers ask about it.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "api-sql-report",
          title: "Safe queries & a join",
          difficulty: "medium",
          prompt:
            "Using the provided schema, implement `add_user(conn, email)` (returns new id; parameterised), `add_order(conn, user_id, cents)`, and `spend_by_user(conn)` returning `[(email, total_cents)]` for **all** users (0 if no orders), sorted by total desc then email — in a **single** query.",
          starter: py`
            import sqlite3

            def setup():
                conn = sqlite3.connect(":memory:")
                conn.executescript("""
                    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL);
                    CREATE TABLE orders (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        cents INTEGER NOT NULL CHECK (cents >= 0)
                    );
                """)
                return conn

            def add_user(conn, email):
                pass

            def add_order(conn, user_id, cents):
                pass

            def spend_by_user(conn):
                pass
          `,
          solution: py`
            import sqlite3

            def setup():
                conn = sqlite3.connect(":memory:")
                conn.executescript("""
                    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL);
                    CREATE TABLE orders (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        cents INTEGER NOT NULL CHECK (cents >= 0)
                    );
                """)
                return conn

            def add_user(conn, email):
                with conn:
                    cur = conn.execute("INSERT INTO users (email) VALUES (?)", (email,))
                return cur.lastrowid

            def add_order(conn, user_id, cents):
                with conn:
                    conn.execute("INSERT INTO orders (user_id, cents) VALUES (?, ?)", (user_id, cents))

            def spend_by_user(conn):
                return conn.execute("""
                    SELECT u.email, COALESCE(SUM(o.cents), 0) AS total
                    FROM users u
                    LEFT JOIN orders o ON o.user_id = u.id
                    GROUP BY u.id
                    ORDER BY total DESC, u.email ASC
                """).fetchall()
          `,
          tests: [
            {
              name: "report includes users without orders",
              code: py`
                c = setup()
                a = add_user(c, "a@x.io"); b = add_user(c, "b@x.io"); add_user(c, "z@x.io")
                add_order(c, a, 500); add_order(c, a, 250); add_order(c, b, 900)
                assert spend_by_user(c) == [("b@x.io", 900), ("a@x.io", 750), ("z@x.io", 0)]
              `,
            },
            {
              name: "injection-safe",
              code: py`
                c = setup()
                add_user(c, "x'); DROP TABLE users; --")
                assert c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
              `,
            },
            {
              name: "single query",
              code: py`
                c = setup(); add_user(c, "q@x.io")
                statements = []
                c.set_trace_callback(statements.append)
                spend_by_user(c)
                selects = [s for s in statements if s.strip().upper().startswith("SELECT")]
                assert len(selects) == 1, f"expected 1 SELECT, saw {len(selects)}"
              `,
              hidden: true,
            },
          ],
          hints: [
            "`cursor.lastrowid` gives the id of the inserted row.",
            "A `LEFT JOIN` keeps users with no orders; `COALESCE(SUM(...), 0)` turns NULL into 0.",
          ],
          explanation:
            "`with conn:` wraps writes in a transaction. The hidden test uses sqlite's trace callback to count statements — the same idea as asserting query counts in Django/SQLAlchemy tests to catch N+1 regressions.",
        },
      ],
    },
    {
      id: "rest-fastapi",
      title: "REST design & FastAPI",
      summary:
        "Routes, status codes, pagination and error shapes — then how FastAPI does it for you.",
      minutes: 30,
      content: [
        {
          kind: "code",
          caption:
            "FastAPI in 15 lines (run locally with `uv run fastapi dev main.py`)",
          code: py`
            from fastapi import FastAPI, HTTPException, Query
            from pydantic import BaseModel

            app = FastAPI()

            class TodoIn(BaseModel):
                title: str

            @app.get("/v1/todos")
            def list_todos(limit: int = Query(20, le=100), cursor: str | None = None):
                ...

            @app.post("/v1/todos", status_code=201)
            def create_todo(body: TodoIn):
                ...

            @app.get("/v1/todos/{todo_id}")
            def get_todo(todo_id: int):
                raise HTTPException(status_code=404, detail="todo not found")
          `,
        },
        {
          kind: "text",
          body: "FastAPI reads your type hints: path params, query params with limits, and request bodies are validated by Pydantic automatically, invalid input returns 422, and you get OpenAPI docs at `/docs` for free. Dependencies (`Depends(get_current_user)`) inject auth, DB sessions and config — testable via `app.dependency_overrides`.",
        },
        {
          kind: "callout",
          tone: "interview",
          body: 'FDE interviews often include "build a small API for this customer use case". Show: input validation, correct status codes (201/400/404/409/422), pagination on lists, auth on every route, and a consistent error shape.',
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "api-mini-router",
          title: "Build a tiny router",
          difficulty: "hard",
          prompt:
            'Implement `class App` with decorator methods `get(path)` and `post(path)` that register handlers, and `handle(method, path, body=None) -> (status, dict)`. Paths may contain `{name}` params passed to the handler as keyword strings. POST handlers receive `body` too. Unknown path → `(404, {"error": "not found"})`; known path, wrong method → `(405, {"error": "method not allowed"})`. A handler raising `KeyError` → `(404, …)`; `ValueError` → `(400, {"error": str(e)})`. Handlers return `(status, dict)`.',
          starter: py`
            import re

            class App:
                def __init__(self):
                    self.routes = []   # (method, compiled_regex, handler)

                def get(self, path):
                    pass

                def post(self, path):
                    pass

                def handle(self, method, path, body=None):
                    pass
          `,
          solution: py`
            import re

            class App:
                def __init__(self):
                    self.routes = []

                def _register(self, method, path):
                    pattern = re.compile("^" + re.sub(r"\{(\w+)\}", r"(?P<\1>[^/]+)", path) + "$")
                    def decorator(fn):
                        self.routes.append((method, pattern, fn))
                        return fn
                    return decorator

                def get(self, path):
                    return self._register("GET", path)

                def post(self, path):
                    return self._register("POST", path)

                def handle(self, method, path, body=None):
                    path_matched = False
                    for route_method, pattern, fn in self.routes:
                        m = pattern.match(path)
                        if not m:
                            continue
                        path_matched = True
                        if route_method != method:
                            continue
                        kwargs = m.groupdict()
                        if method == "POST":
                            kwargs["body"] = body
                        try:
                            return fn(**kwargs)
                        except KeyError:
                            return 404, {"error": "not found"}
                        except ValueError as e:
                            return 400, {"error": str(e)}
                    if path_matched:
                        return 405, {"error": "method not allowed"}
                    return 404, {"error": "not found"}
          `,
          tests: [
            {
              name: "routes with params",
              code: py`
                app = App(); db = {"1": {"id": "1", "title": "learn"}}
                @app.get("/todos/{todo_id}")
                def get_todo(todo_id):
                    return 200, db[todo_id]
                assert app.handle("GET", "/todos/1") == (200, {"id": "1", "title": "learn"})
                assert app.handle("GET", "/todos/9") == (404, {"error": "not found"})
              `,
            },
            {
              name: "POST with validation",
              code: py`
                app = App()
                @app.post("/todos")
                def create(body):
                    if not body or not body.get("title"):
                        raise ValueError("title is required")
                    return 201, {"title": body["title"]}
                assert app.handle("POST", "/todos", {"title": "x"}) == (201, {"title": "x"})
                assert app.handle("POST", "/todos", {}) == (400, {"error": "title is required"})
              `,
            },
            {
              name: "404 vs 405",
              code: py`
                app = App()
                @app.get("/health")
                def health():
                    return 200, {"ok": True}
                assert app.handle("POST", "/health") == (405, {"error": "method not allowed"})
                assert app.handle("GET", "/nope") == (404, {"error": "not found"})
              `,
            },
            {
              name: "params don't match across slashes",
              code: py`
                app = App()
                @app.get("/u/{uid}")
                def u(uid):
                    return 200, {"uid": uid}
                assert app.handle("GET", "/u/a/b")[0] == 404
              `,
              hidden: true,
            },
          ],
          hints: [
            "Convert `/todos/{todo_id}` into the regex `^/todos/(?P<todo_id>[^/]+)$` with `re.sub`.",
            "`match.groupdict()` returns the named groups as a dict you can pass as `**kwargs`.",
            "Track whether *any* route matched the path to decide between 404 and 405.",
          ],
          explanation:
            "This is the core of every web framework: a route table, a matcher, and error mapping in one central place. FastAPI/Starlette do the same with compiled path regexes and exception handlers.",
        },
      ],
    },
  ],
};
