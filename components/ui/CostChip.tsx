import { cn } from "./cn";

/** Ember "n credits" chip used next to every paid action. */
export function CostChip({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-xs font-semibold text-ember-300", className)}>
      <span className="tabular-nums">{value}</span>
      <span className="font-normal">{label}</span>
    </span>
  );
}
