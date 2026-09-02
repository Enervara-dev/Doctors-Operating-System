import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { TreatmentStep } from "@/components/consultation/steps/TreatmentStep";

export const metadata: Metadata = { title: "Medication & treatment" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/treatment">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="TREATMENT">
      <TreatmentStep />
    </ConsultationWorkspace>
  );
}
