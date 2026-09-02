import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow text-text-tertiary">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-text tabular-nums">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-text-secondary">{hint}</p> : null}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-subtle">
          <Icon aria-hidden className="size-4 text-primary" />
        </span>
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="size-9 rounded-control" />
      </div>
    </Card>
  );
}
