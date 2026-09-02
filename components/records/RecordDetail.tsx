"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { AuditTimeline } from "./AuditTimeline";
import { PatientCommunicationPreview } from "./PatientCommunicationPreview";
import { RecordDocument } from "./RecordDocument";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { RECORD_STATUS_META } from "@/lib/constants/record";
import { formatDemographics } from "@/lib/utils/format";
import { formatHistoricalDate, formatTimestamp } from "@/lib/utils/date";
import { useAuditStore } from "@/stores/audit.store";
import { usePatientCommunicationStore } from "@/stores/patient-communication.store";
import { useRecordStore } from "@/stores/record.store";

type RecordView = "record" | "audit" | "patient";

const VIEW_OPTIONS = [
  { value: "record", label: "Record" },
  { value: "audit", label: "Audit history" },
  { value: "patient", label: "Patient preview" },
] as const;

/**
 * The immutable record viewer.
 *
 * A finalized record offers no editing controls at all — only viewing, its
 * audit history, and the patient-facing projection. Amendment is modelled in
 * the domain but not implemented, so no misleading Edit action is shown.
 */
export function RecordDetail({
  recordId,
  initialView = "record",
}: {
  recordId: string;
  initialView?: RecordView;
}) {
  const record = useRecordStore((state) => state.record);
  const status = useRecordStore((state) => state.recordStatus);
  const failure = useRecordStore((state) => state.recordFailure);
  const loadRecord = useRecordStore((state) => state.loadRecord);

  const auditEvents = useAuditStore((state) => state.events);
  const auditStatus = useAuditStore((state) => state.status);
  const auditFailure = useAuditStore((state) => state.failure);
  const loadAudit = useAuditStore((state) => state.loadForRecord);

  const payload = usePatientCommunicationStore((state) => state.payload);
  const payloadStatus = usePatientCommunicationStore((state) => state.status);
  const payloadFailure = usePatientCommunicationStore((state) => state.failure);
  const loadPayload = usePatientCommunicationStore((state) => state.load);

  const [view, setView] = useState<RecordView>(initialView);

  useEffect(() => {
    void loadRecord(recordId);
  }, [recordId, loadRecord]);

  useEffect(() => {
    if (view === "audit") void loadAudit(recordId);
    if (view === "patient") void loadPayload(recordId);
  }, [view, recordId, loadAudit, loadPayload]);

  const retryRecord = useCallback(() => {
    void loadRecord(recordId, { force: true });
  }, [recordId, loadRecord]);

  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <ErrorState
          title="Unable to open this record"
          description={failure?.message ?? "Please try again in a moment."}
          onRetry={retryRecord}
        />
      </div>
    );
  }

  if (status !== "ready" || !record || record.id !== recordId) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Card className="p-5">
          <div aria-hidden className="space-y-3">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  const statusMeta = RECORD_STATUS_META[record.status];

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
              {record.patientName}
            </h1>
            <Badge tone={statusMeta.tone} withDot>
              {statusMeta.label}
            </Badge>
            <Badge>Version {record.version}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {formatDemographics(
              record.patientContext.demographics.age,
              record.patientContext.demographics.gender,
            )}{" "}
            · <span className="font-mono">{record.patientId}</span> ·{" "}
            <span className="font-mono">#{record.reference}</span>
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {record.consultationType} ·{" "}
            {formatHistoricalDate(record.consultationDateTime.slice(0, 10))} · {record.doctorName}
          </p>
        </div>

        <p className="flex shrink-0 items-center gap-1.5 rounded-control border border-border-default bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
          <Lock aria-hidden className="size-3.5" />
          Read-only · finalized {formatTimestamp(record.finalizedAt)}
        </p>
      </header>

      <SegmentedControl
        label="Record view"
        value={view}
        onChange={(next) => setView(next)}
        options={VIEW_OPTIONS.map((option) => ({ ...option }))}
      />

      {view === "record" ? <RecordDocument record={record} /> : null}

      {view === "audit" ? (
        <Card className="p-4 sm:p-5">
          <AuditTimeline
            events={auditEvents}
            status={auditStatus}
            failure={auditFailure}
            onRetry={() => void loadAudit(recordId, { force: true })}
          />
        </Card>
      ) : null}

      {view === "patient" ? (
        <Card className="p-4 sm:p-5">
          <PatientCommunicationPreview
            payload={payload}
            status={payloadStatus}
            failure={payloadFailure}
            onRetry={() => void loadPayload(recordId, { force: true })}
          />
        </Card>
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/records"
      className="inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-text-secondary transition-colors hover:text-text"
    >
      <ArrowLeft aria-hidden className="size-4" />
      All records
    </Link>
  );
}
