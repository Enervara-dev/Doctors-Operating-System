import type { Metadata } from "next";
import { RecordDetail } from "@/components/records/RecordDetail";

export const metadata: Metadata = { title: "Consultation record" };

export default async function RecordDetailPage({
  params,
  searchParams,
}: PageProps<"/records/[recordId]">) {
  const { recordId } = await params;
  const { view } = await searchParams;
  const initialView = view === "audit" || view === "patient" ? view : "record";

  return <RecordDetail recordId={recordId} initialView={initialView} />;
}
