"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderSearch, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { RECORD_STATUS_META, recordHref } from "@/lib/constants/record";
import { formatHistoricalDate, formatTimestamp } from "@/lib/utils/date";
import { useRecordStore } from "@/stores/record.store";
import type { RecordListFilters, RecordStatus } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "AMENDED", label: "Amended" },
  { value: "DRAFT", label: "Draft" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "General Consultation", label: "General Consultation" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Report Review", label: "Report Review" },
  { value: "Medication Review", label: "Medication Review" },
  { value: "Preventive Health Check", label: "Preventive Health Check" },
  { value: "Urgent Consultation", label: "Urgent Consultation" },
];

const EMPTY_FILTERS: RecordListFilters = {};

/** The doctor's archive of finalized consultation records. */
export function RecordsIndex() {
  const records = useRecordStore((state) => state.records);
  const status = useRecordStore((state) => state.listStatus);
  const failure = useRecordStore((state) => state.listFailure);
  const loadRecords = useRecordStore((state) => state.loadRecords);

  const [query, setQuery] = useState("");
  const [recordStatus, setRecordStatus] = useState("");
  const [consultationType, setConsultationType] = useState("");
  const [from, setFrom] = useState("");

  useEffect(() => {
    void loadRecords(EMPTY_FILTERS);
  }, [loadRecords]);

  const applyFilters = useCallback(() => {
    void loadRecords({
      ...(query.trim() ? { query: query.trim() } : {}),
      ...(recordStatus ? { status: recordStatus as RecordStatus } : {}),
      ...(consultationType ? { consultationType } : {}),
      ...(from ? { from } : {}),
    });
  }, [query, recordStatus, consultationType, from, loadRecords]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setRecordStatus("");
    setConsultationType("");
    setFrom("");
    void loadRecords(EMPTY_FILTERS);
  }, [loadRecords]);

  const hasFilters = Boolean(query || recordStatus || consultationType || from);
  const isLoading = status === "idle" || status === "loading";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Records"
        description="Finalized consultation records. Each is an immutable snapshot with its own audit history."
      />

      <Card className="p-4 sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Search"
              value={query}
              placeholder="Patient, reference or assessment"
              leadingIcon={<Search className="size-4" />}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={recordStatus}
              onChange={(event) => setRecordStatus(event.target.value)}
            />
            <Select
              label="Consultation type"
              options={TYPE_OPTIONS}
              value={consultationType}
              onChange={(event) => setConsultationType(event.target.value)}
            />
            <Input
              label="From date"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw aria-hidden className="size-4" />
                Clear
              </Button>
            ) : null}
            <Button type="submit" size="sm" isLoading={isLoading}>
              Apply filters
            </Button>
          </div>
        </form>
      </Card>

      {status === "error" ? (
        <ErrorState
          title="Records failed to load"
          description={failure?.message ?? "Please try again in a moment."}
          onRetry={() => void loadRecords()}
        />
      ) : null}

      {isLoading ? (
        <div aria-hidden className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="p-4 sm:p-5">
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-40" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {status === "ready" && records.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title={hasFilters ? "No records match these filters" : "No records yet"}
          description={
            hasFilters
              ? "Try widening the search or clearing the filters."
              : "Records appear here once you finalize a consultation."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {status === "ready" && records.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {records.map((record) => {
            const statusMeta = RECORD_STATUS_META[record.status];
            return (
              <li key={record.id}>
                <Card className="transition-shadow hover:shadow-raised">
                  <Link
                    href={recordHref(record.id)}
                    className="flex flex-col gap-3 rounded-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text">{record.patientName}</p>
                        <Badge tone={statusMeta.tone} withDot>
                          {statusMeta.label}
                        </Badge>
                        {record.version > 1 ? <Badge>Version {record.version}</Badge> : null}
                      </div>

                      <p className="mt-1 text-sm text-text">
                        {record.primaryAssessment ?? (
                          <span className="text-text-tertiary">No assessment recorded</span>
                        )}
                      </p>

                      <p className="mt-1 text-xs text-text-secondary">
                        <span className="font-mono">#{record.reference}</span> ·{" "}
                        {record.consultationType} · {record.doctorName}
                      </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-sm text-text">
                        {formatHistoricalDate(record.consultationDateTime.slice(0, 10))}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        Finalized {formatTimestamp(record.finalizedAt)}
                      </p>
                    </div>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
