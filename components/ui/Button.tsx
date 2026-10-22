import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-ember-500 text-ink-950 hover:bg-ember-400 shadow-[0_0_24px_-6px_var(--color-ember-500)]",
  secondary: "border border-ink-700 bg-ink-850 text-ink-100 hover:border-ember-500",
  ghost: "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
};

export const buttonClass = (variant: Variant = "primary", className?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    styles[variant],
    className,
  );

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
