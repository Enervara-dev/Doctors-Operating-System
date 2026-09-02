"use client";

import { useState } from "react";
import { CalendarClock, CalendarX2, History, RefreshCw } from "lucide-react";
import { AppointmentSection } from "./AppointmentSection";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAppointmentBoard } from "@/features/appointments/use-appointment-board";

type Segment = "today" | "upcoming" | "past";

const SEGMENT_CONTENT: Record<
  Segment,
  { title: string; emptyIcon: typeof CalendarX2; emptyTitle: string; emptyDescription: string }
> = {
  today: {
    title: "Today",
    emptyIcon: CalendarX2,
    emptyTitle: "No appointments scheduled today",
    emptyDescription: "Your day is clear.",
  },
  upcoming: {
    title: "Upcoming",
    emptyIcon: CalendarClock,
    emptyTitle: "Nothing scheduled ahead",
    emptyDescription: "Appointments booked for later dates will appear here.",
  },
  past: {
    title: "Past",
    emptyIcon: History,
    emptyTitle: "No past appointments",
    emptyDescription: "Completed and missed appointments will be listed here.",
  },
};

export function AppointmentsView() {
  const { board, status, failure, reload } = useAppointmentBoard();
  const [segment, setSegment] = useState<Segment>("today");

  const isLoading = status === "loading" || status === "idle";
  const appointments = board?.[segment] ?? [];
  const content = SEGMENT_CONTENT[segment];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description="Your full schedule across today, upcoming days and past visits."
        actions={
          <Button variant="secondary" size="sm" onClick={reload} isLoading={isLoading}>
            {!isLoading ? <RefreshCw aria-hidden className="size-4" /> : null}
            Refresh
          </Button>
        }
      />

      <SegmentedControl
        label="Filter appointments by period"
        value={segment}
        onChange={setSegment}
        options={[
          { value: "today", label: "Today", count: board?.today.length },
          { value: "upcoming", label: "Upcoming", count: board?.upcoming.length },
          { value: "past", label: "Past", count: board?.past.length },
        ]}
      />

      <AppointmentSection
        title={content.title}
        appointments={appointments}
        status={status}
        failure={failure}
        onRetry={reload}
        emptyIcon={content.emptyIcon}
        emptyTitle={content.emptyTitle}
        emptyDescription={content.emptyDescription}
        showDate={segment !== "today"}
        skeletonCount={4}
      />
    </div>
  );
}
