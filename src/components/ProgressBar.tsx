export function ProgressBar({
  value,
  label,
  color = "var(--brand)",
  size = "md",
}: {
  value: number;
  label: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-4" : "h-2.5";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`bg-sunken w-full overflow-hidden rounded-full ${height}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, var(--accent))`,
        }}
      />
    </div>
  );
}
