"use client";

import { useCallback, useState } from "react";
import { ClinicalContextPanel } from "../live/ClinicalContextPanel";
import { ClinicalTimelinePanel } from "../live/ClinicalTimelinePanel";
import { LiveSessionBar } from "../live/LiveSessionBar";
import { TranscriptPanel } from "../live/TranscriptPanel";
import { StepHeading } from "../StepHeading";
import { ClinicalIntelligencePanel } from "../intelligence/ClinicalIntelligencePanel";
import { StepSection } from "./StepSection";
import { Alert } from "@/components/ui/Alert";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Textarea } from "@/components/ui/Textarea";
import { useLiveConsultation } from "@/features/live-consultation/use-live-consultation";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import { useLiveSessionStore } from "@/stores/live-session.store";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";

type MobileView = "transcript" | "intelligence" | "context" | "timeline";

const MOBILE_VIEWS = [
  { value: "transcript", label: "Transcript" },
  { value: "intelligence", label: "Intelligence" },
  { value: "context", label: "Context" },
  { value: "timeline", label: "Timeline" },
] as const;

/**
 * The live consultation workspace — the centre of gravity of the whole product.
 *
 * The doctor conducts the consultation; the platform transcribes and attributes
 * it, extracts clinical context, and publishes Clinical Intelligence as it goes.
 * Everything here is presentation and decision: no clinical reasoning happens in
 * this application, and the consultation stays fully usable when the platform
 * is absent.
 */
export function LiveConsultationStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const saveNotes = useConsultationStore((state) => state.saveNotes);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const isEditable = useConsultationStore(selectIsEditable);
  const sessionFailure = useLiveSessionStore((state) => state.failure);
  const connection = useLiveSessionStore((state) => state.connection);

  const [doctorNotes, setDoctorNotes] = useState(
    consultation?.caseContext.doctorNotes ?? "",
  );
  const [mobileView, setMobileView] = useState<MobileView>("transcript");

  useLiveConsultation(consultation?.id ?? null);

  const save = useCallback(() => saveNotes({ doctorNotes }), [doctorNotes, saveNotes]);
  useStepSaver(save);

  if (!consultation) return null;

  /**
   * Visibility lives on a wrapper, never on the panel itself: the panels set
   * their own `display` to build a flex column, and a `hidden`/`block` utility
   * merged into that class list would silently override it and break their
   * internal scrolling.
   */
  const showOnMobile = (view: MobileView): string =>
    mobileView === view ? "contents lg:contents" : "hidden lg:contents";

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="LIVE_CONSULTATION" />

      <LiveSessionBar consultation={consultation} />

      {sessionFailure ? (
        <Alert tone="error" title="Session control failed">
          {sessionFailure.message}
        </Alert>
      ) : null}

      {connection === "UNAVAILABLE" ? (
        <Alert tone="warning" title="Live updates are not reaching this device">
          The consultation and everything already recorded are unaffected. Updates will resume
          automatically when the connection is restored.
        </Alert>
      ) : null}

      {/* Below lg the four surfaces become tabs rather than a squeezed grid. */}
      <div className="lg:hidden">
        <SegmentedControl
          label="Live consultation view"
          value={mobileView}
          onChange={(value) => setMobileView(value)}
          options={MOBILE_VIEWS.map((option) => ({ ...option }))}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <div className={showOnMobile("transcript")}>
          <TranscriptPanel className="h-[26rem] lg:h-[34rem]" />
        </div>
        <div className={showOnMobile("intelligence")}>
          <ClinicalIntelligencePanel
            consultation={consultation}
            className="h-[26rem] lg:h-[34rem]"
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={showOnMobile("context")}>
          <ClinicalContextPanel />
        </div>
        <div className={showOnMobile("timeline")}>
          {/* A definite height, not max-height: the panel's scroll area is a
              flex child, and without one it grows and stretches the page. */}
          <ClinicalTimelinePanel className="h-[26rem]" />
        </div>
      </div>

      <StepSection
        title="Your consultation notes"
        description="Anything you want recorded in your own words. Independent of the transcript."
      >
        <Textarea
          label="Consultation notes"
          labelHidden
          rows={6}
          value={doctorNotes}
          disabled={!isEditable}
          placeholder="Your notes for this consultation…"
          onChange={(event) => {
            setDoctorNotes(event.target.value);
            markUnsaved();
          }}
        />
      </StepSection>
    </div>
  );
}
