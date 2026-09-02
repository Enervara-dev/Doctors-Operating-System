"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { useStartConsultation } from "@/features/consultations/use-start-consultation";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { InfoRow } from "@/components/ui/InfoRow";
import { NoActiveAccess } from "./NoActiveAccess";
import {
  AUTHORIZATION_STATUS_META,
  HEALTH_CONTEXT_META,
} from "@/lib/constants/appointment";
import { ACCESS_METHOD_LABELS } from "@/lib/constants/patient-access";
import { formatDayAndTime } from "@/lib/utils/date";
import { formatDemographics, pluralize } from "@/lib/utils/format";
import { usePatientStore } from "@/stores/patient.store";

export function PatientConfirmation({ patientId }: { patientId: string }) {
  const router = useRouter();
  const grant = usePatientStore((state) => state.grant);
  const clearAccess = usePatientStore((state) => state.clearAccess);
  const { startConsultation, isStarting, failure } = useStartConsultation();

  // A grant is a session act, not a bookmarkable URL: arriving here directly
  // (or after a reload) must send the doctor back through an access method.
  if (!grant || grant.patient.id !== patientId) {
    return <NoActiveAccess />;
  }

  const { patient, appointment, authorizationStatus, method } = grant;
  const authorizationMeta = AUTHORIZATION_STATUS_META[authorizationStatus];
  const healthMeta = HEALTH_CONTEXT_META[patient.healthContext.availability];
  const isAuthorized = authorizationStatus === "AUTHORIZED";

  function handleCancel() {
    clearAccess();
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
          Patient confirmation
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Confirm you are opening the right record before starting the consultation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
            <Avatar initials={patient.avatarInitials} name={patient.fullName} size="lg" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-text">{patient.fullName}</p>
              <p className="mt-0.5 text-sm text-text-secondary">
                {formatDemographics(patient.age, patient.gender)}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {patient.city}
                {patient.bloodGroup ? ` · Blood group ${patient.bloodGroup}` : ""} ·{" "}
                {patient.phoneMasked}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-border-default pt-5 sm:grid-cols-2">
            <InfoRow label="Authorization">
              <Badge tone={authorizationMeta.tone} withDot>
                {authorizationMeta.label}
              </Badge>
            </InfoRow>

            <InfoRow label="Access method">{ACCESS_METHOD_LABELS[method]}</InfoRow>

            <InfoRow label="Appointment">
              {appointment ? (
                <span className="flex flex-col gap-0.5">
                  <span>{formatDayAndTime(appointment.date, appointment.time)}</span>
                  <span className="text-xs text-text-secondary">
                    {appointment.appointmentType} · {appointment.reason}
                  </span>
                </span>
              ) : (
                <span className="text-text-secondary">No linked appointment</span>
              )}
            </InfoRow>

            <InfoRow label="Health context">
              <span className="flex flex-col items-start gap-1.5">
                <Badge tone={healthMeta.tone} withDot>
                  {healthMeta.label}
                </Badge>
                <span className="text-xs text-text-secondary">
                  {pluralize(patient.healthContext.previousConsultations, "previous consultation")}{" "}
                  · {pluralize(patient.healthContext.activeMedications, "active medication")}
                </span>
              </span>
            </InfoRow>
          </dl>

          {patient.healthContext.knownConditions.length > 0 ? (
            <div className="mt-5 border-t border-border-default pt-5">
              <p className="text-eyebrow text-text-tertiary">Known conditions</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {patient.healthContext.knownConditions.map((condition) => (
                  <li key={condition}>
                    <Badge>{condition}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {patient.healthContext.knownAllergies.length > 0 ? (
            <Alert tone="warning" title="Recorded allergies" className="mt-5">
              {patient.healthContext.knownAllergies.join(", ")}
            </Alert>
          ) : null}

          {failure ? (
            <Alert tone="error" title="Unable to open the consultation" className="mt-5">
              {failure.message}
            </Alert>
          ) : null}

          {!isAuthorized ? (
            <Alert tone="warning" title="Consultation cannot start yet" className="mt-5">
              {authorizationStatus === "PENDING"
                ? "The patient has not yet approved this access request. Ask them to confirm in their Enervara app."
                : "You are not authorized to open this record."}
            </Alert>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          {isAuthorized ? (
            <Button isLoading={isStarting} onClick={() => void startConsultation(grant)}>
              {isStarting ? "Opening consultation…" : "Continue"}
              {isStarting ? null : <ArrowRight aria-hidden className="size-4" />}
            </Button>
          ) : (
            <Button disabled>
              <ShieldAlert aria-hidden className="size-4" />
              Continue
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
