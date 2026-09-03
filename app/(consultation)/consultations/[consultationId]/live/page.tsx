import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { LiveConsultationStep } from "@/components/consultation/steps/LiveConsultationStep";

export const metadata: Metadata = { title: "Live consultation" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/live">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="LIVE_CONSULTATION">
      <LiveConsultationStep />
    </ConsultationWorkspace>
  );
}
