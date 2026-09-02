import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { InvestigationsStep } from "@/components/consultation/steps/InvestigationsStep";

export const metadata: Metadata = { title: "Investigations" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/investigations">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="INVESTIGATIONS">
      <InvestigationsStep />
    </ConsultationWorkspace>
  );
}
