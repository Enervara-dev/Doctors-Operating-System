import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { DiagnosisStep } from "@/components/consultation/steps/DiagnosisStep";

export const metadata: Metadata = { title: "Diagnosis" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/diagnosis">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="DIAGNOSIS">
      <DiagnosisStep />
    </ConsultationWorkspace>
  );
}
