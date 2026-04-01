import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] md:p-6",
        className,
      )}
      {...props}
    />
  );
}
