import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { BriefStep } from "@/components/consultation/steps/BriefStep";

export const metadata: Metadata = { title: "Pre-consultation brief" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/brief">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="BRIEF">
      <BriefStep />
    </ConsultationWorkspace>
  );
}
