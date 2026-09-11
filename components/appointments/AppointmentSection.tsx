"use client";

import { useCallback, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentListSkeleton } from "./AppointmentCardSkeleton";
import { useAppointmentAccess } from "@/features/patient-access/use-patient-access";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAppointmentStore } from "@/stores/appointment.store";
import { usePatientStore } from "@/stores/patient.store";
import type { AppointmentWithPatient } from "@/types";
import type { RequestFailure } from "@/lib/api/failure";

export interface AppointmentSectionProps {
  title: string;
  appointments: AppointmentWithPatient[];
  status: "idle" | "loading" | "ready" | "error";
  failure: RequestFailure | null;
  onRetry: () => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  showDate?: boolean;
  skeletonCount?: number;
}

/**
 * One appointment section with all four data states. Both the dashboard and the
 * appointments page compose this, so state handling exists in exactly one place.
 */
export function AppointmentSection({
  title,
  appointments,
  status,
  failure,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  showDate = false,
  skeletonCount = 3,
}: AppointmentSectionProps) {
  const { openAppointment, pendingAppointmentId } = useAppointmentAccess();
  const accessFailure = usePatientStore((state) => state.failure);
  const confirmAppointment = useAppointmentStore((state) => state.confirmAppointment);
  const boardFailure = useAppointmentStore((state) => state.failure);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const confirm = useCallback(
    async (appointmentId: string) => {
      setConfirmingId(appointmentId);
      await confirmAppointment(appointmentId);
      setConfirmingId(null);
    },
    [confirmAppointment],
  );

  const isLoading = status === "loading" || status === "idle";

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title={title} count={isLoading ? undefined : appointments.length} />

      {accessFailure ? <Alert tone="error" title={accessFailure.message} /> : null}
      {status === "ready" && boardFailure ? (
        <Alert tone="error" title={boardFailure.message} />
      ) : null}

      {isLoading ? <AppointmentListSkeleton count={skeletonCount} /> : null}

      {status === "error" ? (
        <ErrorState
          title="Unable to load appointments"
          description={failure?.message ?? "Please try again in a moment."}
          onRetry={onRetry}
        />
      ) : null}

      {status === "ready" && appointments.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : null}

      {status === "ready" && appointments.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentCard
                appointment={appointment}
                onOpen={openAppointment}
                onConfirm={confirm}
                isPending={pendingAppointmentId === appointment.id}
                isConfirming={confirmingId === appointment.id}
                showDate={showDate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
