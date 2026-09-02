import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface SectionHeadingProps {
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ title, count, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border-default pb-2.5", className)}>
      <h2 className="flex items-center gap-2 text-eyebrow text-text-secondary">
        {title}
        {typeof count === "number" ? (
          <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-text-secondary tabular-nums">
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}
