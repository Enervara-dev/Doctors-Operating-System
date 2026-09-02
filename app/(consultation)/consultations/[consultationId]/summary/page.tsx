import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { SummaryStep } from "@/components/consultation/steps/SummaryStep";

export const metadata: Metadata = { title: "Consultation summary" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/summary">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="SUMMARY">
      <SummaryStep />
    </ConsultationWorkspace>
  );
}
