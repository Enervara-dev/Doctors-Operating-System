import { CalendarCheck, RotateCcw, UsersRound } from "lucide-react";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { pluralize } from "@/lib/utils/format";
import type { AppointmentSummary } from "@/types";

export function DashboardStats({
  summary,
  isLoading,
}: {
  summary: AppointmentSummary | null;
  isLoading: boolean;
}) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Today's appointments"
        value={summary.todayTotal}
        hint={
          summary.readyForConsultation > 0
            ? `${summary.readyForConsultation} ready for consultation`
            : "None ready yet"
        }
        icon={CalendarCheck}
      />
      <StatCard
        label="Patients today"
        value={summary.patientsToday}
        hint="Excludes cancellations and no-shows"
        icon={UsersRound}
      />
      <StatCard
        label="Pending follow-ups"
        value={summary.pendingFollowUps}
        hint={pluralize(summary.pendingFollowUps, "visit") + " scheduled"}
        icon={RotateCcw}
      />
    </div>
  );
}
