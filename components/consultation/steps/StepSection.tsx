import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export interface StepSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Consistent card shell for every block of the clinical workspace. */
export function StepSection({
  title,
  description,
  action,
  children,
  className,
}: StepSectionProps) {
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function StepEmpty({ children }: { children: string }) {
  return (
    <p className="rounded-control border border-dashed border-border-default bg-surface-subtle px-4 py-6 text-center text-sm text-text-tertiary">
      {children}
    </p>
  );
}
