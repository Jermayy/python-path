/** Removes common leading indentation and surrounding blank lines. */
export function dedent(input: string): string {
  const lines = input.replace(/\t/g, "    ").split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  const indents = lines
    .filter((l) => l.trim())
    .map((l) => l.match(/^ */)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

/**
 * Tag for Python source in content files: keeps backslashes literal (String.raw)
 * so `"\n"` in Python stays an escape sequence, then dedents.
 */
export function py(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return dedent(String.raw({ raw: strings.raw }, ...values));
}
