/**
 * Python test harness, shared by the browser worker and the Node content tests.
 * Runs learner code, then each test in the same namespace, capturing stdout and
 * per-test pass/fail. Supports top-level `await` in tests.
 */
export const HARNESS_PY = String.raw`
import ast, io, json, sys, traceback, inspect, linecache

def _pp_register_source(filename, source):
    # Lets inspect.getsource() work on learner-defined functions.
    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)

async def _pp_exec(source, ns, filename):
    _pp_register_source(filename, source)
    code = compile(source, filename, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    result = eval(code, ns)
    if inspect.iscoroutine(result):
        await result

def _pp_format_error(exc):
    tb = traceback.extract_tb(exc.__traceback__)
    frames = [f for f in tb if f.filename in ("<solution>", "<test>")]
    where = f" (line {frames[-1].lineno})" if frames and frames[-1].filename == "<solution>" else ""
    msg = str(exc)
    return f"{type(exc).__name__}{where}: {msg}" if msg else f"{type(exc).__name__}{where}"

async def _pp_run(user_code, tests_json):
    tests = json.loads(tests_json)
    out = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = out
    ns = {"__name__": "__main__"}
    results = []
    compile_error = None
    try:
        try:
            await _pp_exec(user_code, ns, "<solution>")
        except SyntaxError as e:
            compile_error = f"SyntaxError (line {e.lineno}): {e.msg}"
        except BaseException as e:
            compile_error = _pp_format_error(e)
        if compile_error is None:
            for t in tests:
                try:
                    await _pp_exec(t["code"], ns, "<test>")
                    results.append({"name": t["name"], "passed": True})
                except AssertionError as e:
                    results.append({"name": t["name"], "passed": False, "error": str(e) or "assertion failed"})
                except BaseException as e:
                    results.append({"name": t["name"], "passed": False, "error": _pp_format_error(e)})
    finally:
        sys.stdout = old_stdout
    stdout = out.getvalue()
    if len(stdout) > 20000:
        stdout = stdout[:20000] + "\n... output truncated"
    return json.dumps({"stdout": stdout, "error": compile_error, "results": results})
`;

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface RunOutput {
  stdout: string;
  /** Error raised while executing the learner's code itself (before tests ran). */
  error: string | null;
  results: TestResult[];
}

export function parseRunOutput(raw: string): RunOutput {
  const parsed = JSON.parse(raw) as RunOutput;
  return {
    stdout: parsed.stdout ?? "",
    error: parsed.error ?? null,
    results: parsed.results ?? [],
  };
}
