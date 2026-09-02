"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { SaveStateIndicator } from "./SaveStateIndicator";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CONSULTATION_STATUS_META } from "@/lib/constants/consultation";
import { formatDemographics } from "@/lib/utils/format";
import { useConsultationStore } from "@/stores/consultation.store";
import type { Consultation, PatientDemographics } from "@/types";

/**
 * Persistent identity bar. Whatever step the doctor is on, this answers "which
 * patient, which consultation, what state, and is my work saved".
 */
export function ConsultationHeader({
  consultation,
  demographics,
}: {
  consultation: Consultation;
  demographics: PatientDemographics | null;
}) {
  const saveState = useConsultationStore((state) => state.saveState);
  const lastSavedAt = useConsultationStore((state) => state.lastSavedAt);
  const saveDraft = useConsultationStore((state) => state.saveDraft);

  const statusMeta = CONSULTATION_STATUS_META[consultation.status];
  const isFinalized = consultation.status === "FINALIZED";

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface">
      <div className="mx-auto flex w-full max-w-[100rem] items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1.5 rounded-control px-1.5 py-1 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text"
        >
          <ArrowLeft aria-hidden className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
          <span className="sr-only sm:hidden">Back to dashboard</span>
        </Link>

        <span aria-hidden className="h-6 w-px shrink-0 bg-border-default" />

        {demographics ? (
          <Avatar
            initials={demographics.avatarInitials}
            name={demographics.fullName}
            size="sm"
            className="hidden shrink-0 sm:inline-flex"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-text">
              {demographics?.fullName ?? "Loading patient…"}
            </p>
            <Badge tone={statusMeta.tone} withDot className="shrink-0">
              {statusMeta.label}
            </Badge>
          </div>
          <p className="truncate text-xs text-text-secondary">
            {demographics ? `${formatDemographics(demographics.age, demographics.gender)} · ` : ""}
            <span className="font-mono">{demographics?.patientId ?? consultation.patientId}</span>
            {" · "}
            <span className="font-mono">#{consultation.reference}</span>
            {" · "}
            {consultation.consultationType}
          </p>
        </div>

        <SaveStateIndicator
          state={saveState}
          lastSavedAt={lastSavedAt}
          className="hidden md:inline-flex"
        />

        {isFinalized ? null : (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            isLoading={saveState === "SAVING"}
            onClick={() => void saveDraft()}
          >
            {saveState === "SAVING" ? null : <Save aria-hidden className="size-4" />}
            <span className="hidden sm:inline">Save draft</span>
            <span className="sr-only sm:hidden">Save draft</span>
          </Button>
        )}
      </div>

      <div className="border-t border-border-default px-4 py-1.5 md:hidden">
        <SaveStateIndicator state={saveState} lastSavedAt={lastSavedAt} />
      </div>
    </header>
  );
}
