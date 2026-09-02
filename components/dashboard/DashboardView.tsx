"use client";

import { CalendarClock, CalendarX2 } from "lucide-react";
import { DashboardStats } from "./DashboardStats";
import { GreetingHeader } from "./GreetingHeader";
import { AppointmentSection } from "@/components/appointments/AppointmentSection";
import { useAppointmentBoard } from "@/features/appointments/use-appointment-board";

export function DashboardView() {
  const { board, status, failure, reload } = useAppointmentBoard();
  const isLoading = status === "loading" || status === "idle";

  return (
    <div className="flex flex-col gap-8">
      <GreetingHeader />

      <DashboardStats summary={board?.summary ?? null} isLoading={isLoading} />

      <AppointmentSection
        title="Today's appointments"
        appointments={board?.today ?? []}
        status={status}
        failure={failure}
        onRetry={reload}
        emptyIcon={CalendarX2}
        emptyTitle="No appointments scheduled today"
        emptyDescription="Your day is clear. Patients can still reach you through an access code or a sharing link."
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
        emptyDescription="Appointments booked for later dates will appear here."
        showDate
        skeletonCount={2}
      />
    </div>
  );
}
