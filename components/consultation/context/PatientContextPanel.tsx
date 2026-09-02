"use client";

import { CircleAlert, FileClock, HeartPulse, Pill, ScrollText, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Disclosure } from "@/components/ui/Disclosure";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  ALLERGY_SEVERITY_TONE,
  MEDICAL_HISTORY_CATEGORY_LABELS,
} from "@/lib/constants/consultation";
import { formatDemographics } from "@/lib/utils/format";
import { formatHistoricalDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { PatientContext } from "@/types";
import type { RequestFailure } from "@/lib/api/failure";

function SectionTitle({ icon: Icon, children }: { icon: typeof User; children: string }) {
  return (
    <h3 className="flex items-center gap-2 text-eyebrow text-text-tertiary">
      <Icon aria-hidden className="size-3.5" />
      {children}
    </h3>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border-default px-4 py-4 last:border-b-0">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-sm text-text-tertiary">{children}</p>;
}

export interface PatientContextPanelProps {
  context: PatientContext | null;
  status: "idle" | "loading" | "ready" | "error";
  failure: RequestFailure | null;
  onRetry: () => void;
  className?: string;
}

/**
 * The single rendering of everything already known about the patient. Both the
 * desktop right column and the collapsible section below it use this component,
 * so patient facts are described in exactly one place.
 */
export function PatientContextPanel({
  context,
  status,
  failure,
  onRetry,
  className,
}: PatientContextPanelProps) {
  if (status === "error") {
    return (
      <div className={className}>
        <ErrorState
          title="Unable to load patient context"
          description={failure?.message ?? "Please try again in a moment."}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (status !== "ready" || !context) {
    return (
      <div
        className={cn(
          "space-y-3 rounded-card border border-border-default bg-surface p-4",
          className,
        )}
      >
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const {
    demographics,
    allergies,
    currentMedications,
    medicalHistory,
    previousConsultations,
    relevantHealthInformation,
  } = context;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-border-default bg-surface",
        className,
      )}
    >
      <Section icon={User} title="Demographics">
        <p className="text-sm font-medium text-text">{demographics.fullName}</p>
        <p className="mt-0.5 text-sm text-text-secondary">
          {formatDemographics(demographics.age, demographics.gender)}
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          {demographics.city}
          {demographics.bloodGroup ? ` · Blood group ${demographics.bloodGroup}` : ""}
        </p>
        <p className="mt-0.5 font-mono text-xs text-text-tertiary">{demographics.patientId}</p>
      </Section>

      <Section icon={CircleAlert} title="Allergies">
        {allergies.length === 0 ? (
          <EmptyLine>No known allergies recorded.</EmptyLine>
        ) : (
          <ul className="space-y-2">
            {allergies.map((allergy) => (
              <li key={allergy.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium text-text">{allergy.substance}</p>
                  <Badge tone={ALLERGY_SEVERITY_TONE[allergy.severity]} className="shrink-0">
                    {allergy.severity.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">{allergy.reaction}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Pill} title="Current medications">
        {currentMedications.length === 0 ? (
          <EmptyLine>No active medications recorded.</EmptyLine>
        ) : (
          <ul className="space-y-2.5">
            {currentMedications.map((medication) => (
              <li key={medication.id}>
                <p className="text-sm font-medium text-text">
                  {medication.name}{" "}
                  <span className="font-normal text-text-secondary">{medication.dosage}</span>
                </p>
                <p className="text-xs text-text-secondary">{medication.frequency}</p>
                <p className="mt-0.5 text-xs text-text-tertiary">{medication.indication}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={HeartPulse} title="Medical history">
        {medicalHistory.length === 0 ? (
          <EmptyLine>No history recorded.</EmptyLine>
        ) : (
          <ul className="space-y-2.5">
            {medicalHistory.map((item) => (
              <li key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium text-text">{item.label}</p>
                  {item.status === "RESOLVED" ? (
                    <Badge className="shrink-0">Resolved</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-text-tertiary">
                  {MEDICAL_HISTORY_CATEGORY_LABELS[item.category]}
                  {item.since ? ` · since ${item.since}` : ""}
                </p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-text-secondary">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={FileClock} title="Previous consultations">
        {previousConsultations.length === 0 ? (
          <EmptyLine>No previous consultations on record.</EmptyLine>
        ) : (
          <ul className="space-y-2">
            {previousConsultations.map((visit) => (
              <li
                key={visit.id}
                className="rounded-control border border-border-default bg-surface-subtle p-3"
              >
                <Disclosure
                  summary={
                    <span className="block min-w-0">
                      <span className="block text-xs font-medium text-text-secondary">
                        {formatHistoricalDate(visit.date)}
                        {visit.specialty ? ` · ${visit.specialty}` : ""}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-medium text-text">
                        {visit.complaint}
                      </span>
                    </span>
                  }
                >
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="font-medium text-text-secondary">Assessment</dt>
                      <dd className="text-text">{visit.assessment}</dd>
                    </div>
                    {visit.investigations.length > 0 ? (
                      <div>
                        <dt className="font-medium text-text-secondary">Investigations</dt>
                        <dd className="text-text">{visit.investigations.join(", ")}</dd>
                      </div>
                    ) : null}
                    {visit.treatment.length > 0 ? (
                      <div>
                        <dt className="font-medium text-text-secondary">Treatment</dt>
                        <dd className="text-text">{visit.treatment.join("; ")}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-medium text-text-secondary">Outcome</dt>
                      <dd className="text-text">{visit.outcome}</dd>
                    </div>
                    {visit.doctorName ? (
                      <div>
                        <dt className="font-medium text-text-secondary">Seen by</dt>
                        <dd className="text-text">{visit.doctorName}</dd>
                      </div>
                    ) : null}
                  </dl>
                </Disclosure>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {relevantHealthInformation.length > 0 ? (
        <Section icon={ScrollText} title="Other relevant information">
          <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
            {relevantHealthInformation.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
