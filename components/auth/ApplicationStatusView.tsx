"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, FileWarning, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  doctorApplicationsApi,
  DoctorApplicationRequestError,
  type DoctorApplicationStatus,
} from "@/features/doctor-applications/doctor-applications.api";

const STATUS_LABEL: Record<DoctorApplicationStatus["status"], string> = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESUBMISSION_REQUIRED: "Resubmission required",
};

const STATUS_ICON: Record<DoctorApplicationStatus["status"], typeof Clock> = {
  PENDING_REVIEW: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  RESUBMISSION_REQUIRED: FileWarning,
};

const STATUS_TONE: Record<DoctorApplicationStatus["status"], "info" | "success" | "error" | "warning"> = {
  PENDING_REVIEW: "info",
  APPROVED: "success",
  REJECTED: "error",
  RESUBMISSION_REQUIRED: "warning",
};

export function ApplicationStatusView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id") ?? "";

  const [applicationId, setApplicationId] = useState(idFromUrl);
  const [lookupId, setLookupId] = useState(idFromUrl);
  const [status, setStatus] = useState<{ application: DoctorApplicationStatus; reason: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(idFromUrl));

  useEffect(() => {
    if (!lookupId) return;
    let cancelled = false;

    async function fetchStatus() {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await doctorApplicationsApi.getStatus(lookupId);
        if (!cancelled) setStatus(result);
      } catch (err) {
        if (cancelled) return;
        setStatus(null);
        setError(err instanceof DoctorApplicationRequestError ? err.message : "Could not find that application.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [lookupId]);

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!applicationId.trim()) return;
    router.replace(`/application-status?id=${encodeURIComponent(applicationId.trim())}`);
    setLookupId(applicationId.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleLookup} className="flex flex-col gap-3">
        <Input
          label="Application ID"
          hint="The ID you were shown after submitting your application."
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
        />
        <Button type="submit" variant="secondary" isLoading={isLoading}>
          Check status
        </Button>
      </form>

      {error ? <Alert tone="error" title={error} /> : null}

      {status ? (
        <ApplicationStatusResult
          status={status}
          onResubmitted={(updated) => setStatus({ application: updated, reason: null })}
        />
      ) : null}
    </div>
  );
}

function ApplicationStatusResult({
  status,
  onResubmitted,
}: {
  status: { application: DoctorApplicationStatus; reason: string | null };
  onResubmitted: (application: DoctorApplicationStatus) => void;
}) {
  const { application, reason } = status;
  const Icon = STATUS_ICON[application.status];

  return (
    <div className="rounded-control border border-border-default bg-surface-subtle p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4" aria-hidden />
        <Badge tone={STATUS_TONE[application.status]}>{STATUS_LABEL[application.status]}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-text-secondary">Applicant</dt>
        <dd className="text-text">{application.fullName}</dd>
        <dt className="text-text-secondary">Submitted</dt>
        <dd className="text-text">{new Date(application.submittedAt).toLocaleString()}</dd>
      </dl>

      {application.status === "REJECTED" && reason ? (
        <Alert tone="error" title="Reason for rejection" className="mt-3">
          {reason}
        </Alert>
      ) : null}

      {application.status === "RESUBMISSION_REQUIRED" ? (
        <div className="mt-3">
          {reason ? (
            <Alert tone="warning" title="Resubmission requested">
              {reason}
            </Alert>
          ) : null}
          <ResubmitForm applicationId={application.id} onResubmitted={onResubmitted} />
        </div>
      ) : null}

      {application.status === "APPROVED" ? (
        <Alert tone="success" title="Approved" className="mt-3">
          Your account has been created. Contact admin@enervara.com if you have not received your
          sign-in details.
        </Alert>
      ) : null}
    </div>
  );
}

function ResubmitForm({
  applicationId,
  onResubmitted,
}: {
  applicationId: string;
  onResubmitted: (application: DoctorApplicationStatus) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please choose your updated certificate.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await doctorApplicationsApi.resubmit(applicationId, file);
      onResubmitted(updated);
    } catch (err) {
      setError(err instanceof DoctorApplicationRequestError ? err.message : "Resubmission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-border-default bg-surface px-3 text-center text-sm text-text hover:border-border-strong">
        {file ? file.name : "Choose an updated NMR certificate"}
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
      </label>
      {error ? <p className="text-xs font-medium text-error">{error}</p> : null}
      <Button type="submit" size="sm" isLoading={isSubmitting}>
        Resubmit application
      </Button>
    </form>
  );
}
