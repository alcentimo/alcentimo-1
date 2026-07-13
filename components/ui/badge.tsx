import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "secondary" | "outline" | "success";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900",
  secondary:
    "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  outline:
    "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
  success:
    "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
