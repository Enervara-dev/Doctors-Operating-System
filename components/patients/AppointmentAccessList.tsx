"use client";

import { CalendarClock, CalendarX2 } from "lucide-react";
import { AppointmentSection } from "@/components/appointments/AppointmentSection";
import { useAppointmentBoard } from "@/features/appointments/use-appointment-board";

/** Reuses the dashboard's appointment presentation as the access picker. */
export function AppointmentAccessList() {
  const { board, status, failure, reload } = useAppointmentBoard();

  return (
    <div className="flex flex-col gap-8">
      <AppointmentSection
        title="Today"
        appointments={board?.today ?? []}
        status={status}
        failure={failure}
        onRetry={reload}
        emptyIcon={CalendarX2}
        emptyTitle="No appointments today"
        emptyDescription="Try an access code or a sharing link instead."
        skeletonCount={3}
      />

      <AppointmentSection
        title="Upcoming"
        appointments={board?.upcoming ?? []}
        status={status}
        failure={failure}
        onRetry={reload}
        emptyIcon={CalendarClock}
        emptyTitle="Nothing scheduled ahead"
        showDate
        skeletonCount={2}
      />
    </div>
  );
}
