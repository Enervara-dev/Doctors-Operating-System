"use client";

import { ArrowRight, Check, Clock } from "lucide-react";
import { AppointmentAlerts } from "./AppointmentAlerts";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ACTIONABLE_STATUSES, APPOINTMENT_STATUS_META } from "@/lib/constants/appointment";
import { formatDemographics } from "@/lib/utils/format";
import { formatRelativeDay, formatTime } from "@/lib/utils/date";
import type { AppointmentStatus, AppointmentWithPatient } from "@/types";

const ACTION_LABELS: Partial<Record<AppointmentStatus, string>> = {
  CHECKED_IN: "Start consultation",
  IN_CONSULTATION: "Resume",
  CONFIRMED: "Open patient",
};

export interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onOpen: (appointmentId: string) => void;
  /** Accepts a patient's booking request. */
  onConfirm: (appointmentId: string) => void;
  isPending?: boolean;
  isConfirming?: boolean;
  /** Adds the day to the time meta — used outside the "Today" section. */
  showDate?: boolean;
}

export function AppointmentCard({
  appointment,
  onOpen,
  onConfirm,
  isPending = false,
  isConfirming = false,
  showDate = false,
}: AppointmentCardProps) {
  const { patient, status } = appointment;
  const statusMeta = APPOINTMENT_STATUS_META[status];

  /**
   * A requested appointment cannot be attended — the platform refuses to open
   * a consultation against one. Offering "Open patient" here sent the doctor
   * into a dead end that reported the appointment "cannot be attended" with
   * nothing on screen able to change that. Accepting the request is the action
   * that actually exists at this point.
   */
  const needsConfirmation = status === "REQUESTED";
  const actionLabel =
    !needsConfirmation && ACTIONABLE_STATUSES.has(status) ? ACTION_LABELS[status] : undefined;

  return (
    <Card className="transition-shadow hover:shadow-raised">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        <div className="hidden w-[4.5rem] shrink-0 flex-col sm:flex">
          <span className="text-sm font-semibold text-text tabular-nums">
            {formatTime(appointment.time)}
          </span>
          <span className="mt-0.5 text-xs text-text-tertiary">
            {appointment.durationMinutes} min
          </span>
          {showDate ? (
            <span className="mt-1.5 text-xs font-medium text-text-secondary">
              {formatRelativeDay(appointment.date)}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar initials={patient.avatarInitials} name={patient.fullName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{patient.fullName}</p>
                <p className="truncate text-xs text-text-secondary">
                  {formatDemographics(patient.age, patient.gender)}
                </p>
              </div>
            </div>
            <Badge tone={statusMeta.tone} withDot className="self-start sm:shrink-0">
              {statusMeta.label}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1 sm:hidden">
              <Clock aria-hidden className="size-3.5" />
              <span className="tabular-nums">{formatTime(appointment.time)}</span>
              {showDate ? <span>· {formatRelativeDay(appointment.date)}</span> : null}
            </span>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-text-secondary">
              {appointment.appointmentType}
            </span>
          </div>

          <p className="mt-2.5 text-sm text-text">{appointment.reason}</p>

          <AppointmentAlerts alerts={appointment.alerts} />
        </div>

        {needsConfirmation ? (
          <div className="shrink-0 sm:self-center">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              isLoading={isConfirming}
              onClick={() => onConfirm(appointment.id)}
            >
              Confirm
              {!isConfirming ? <Check aria-hidden className="size-4" /> : null}
            </Button>
          </div>
        ) : actionLabel ? (
          <div className="shrink-0 sm:self-center">
            <Button
              variant={status === "CHECKED_IN" ? "primary" : "secondary"}
              size="sm"
              fullWidth
              isLoading={isPending}
              onClick={() => onOpen(appointment.id)}
            >
              {actionLabel}
              {!isPending ? <ArrowRight aria-hidden className="size-4" /> : null}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
