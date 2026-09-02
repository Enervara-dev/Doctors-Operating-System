import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export interface PhaseNoticeProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phaseLabel: string;
  className?: string;
}

/**
 * A reserved slot for functionality landing in a later phase. It states plainly
 * that nothing is here yet — it never renders fabricated content.
 */
export function PhaseNotice({
  icon: Icon,
  title,
  description,
  phaseLabel,
  className,
}: PhaseNoticeProps) {
  return (
    <Card className={cn("border-dashed bg-surface-subtle", className)}>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-muted">
          <Icon aria-hidden className="size-4 text-text-tertiary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-text">{title}</h2>
            <span className="rounded-full border border-border-default bg-surface px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-text-tertiary uppercase">
              {phaseLabel}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
        </div>
      </div>
    </Card>
  );
}
