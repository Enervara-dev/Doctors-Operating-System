import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { ActiveConsultationStep } from "@/components/consultation/steps/ActiveConsultationStep";

export const metadata: Metadata = { title: "Active consultation" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/consultation">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="ACTIVE_CONSULTATION">
      <ActiveConsultationStep />
    </ConsultationWorkspace>
  );
}
