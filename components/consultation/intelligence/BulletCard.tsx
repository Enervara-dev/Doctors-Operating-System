import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BulletCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: string;
  tone?: "neutral" | "warning" | "error";
  className?: string;
}

const TONE_STYLES = {
  neutral: "border-border-default bg-surface",
  warning: "border-warning-border bg-warning-subtle",
  error: "border-error-border bg-error-subtle",
} as const;

const ICON_STYLES = {
  neutral: "text-text-tertiary",
  warning: "text-warning",
  error: "text-error",
} as const;

/** Shared shape for the short, single-idea intelligence cards. */
export function BulletCard({
  icon: Icon,
  title,
  description,
  meta,
  tone = "neutral",
  className,
}: BulletCardProps) {
  return (
    <div className={cn("flex gap-2.5 rounded-control border p-3", TONE_STYLES[tone], className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", ICON_STYLES[tone])} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
        ) : null}
        {meta ? <p className="mt-1 text-xs text-text-tertiary">{meta}</p> : null}
      </div>
    </div>
  );
}
