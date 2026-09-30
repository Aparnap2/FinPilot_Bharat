export default function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.85
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : value >= 0.6
        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  const label = value >= 0.85 ? "High" : value >= 0.6 ? "Medium" : "Low";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}
      title={`AI confidence ${pct}%`}
    >
      <span aria-hidden>{value >= 0.85 ? "●" : value >= 0.6 ? "◐" : "○"}</span>
      {label} {pct}%
    </span>
  );
}
