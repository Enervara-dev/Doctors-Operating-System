import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { AssessmentStep } from "@/components/consultation/steps/AssessmentStep";

export const metadata: Metadata = { title: "Clinical assessment" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/assessment">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="ASSESSMENT">
      <AssessmentStep />
    </ConsultationWorkspace>
  );
}
