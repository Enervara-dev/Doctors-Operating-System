import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/consultation/ConsultationWorkspace";
import { FollowUpStep } from "@/components/consultation/steps/FollowUpStep";

export const metadata: Metadata = { title: "Follow-up" };

export default async function Page({
  params,
}: PageProps<"/consultations/[consultationId]/follow-up">) {
  const { consultationId } = await params;
  return (
    <ConsultationWorkspace consultationId={consultationId} step="FOLLOW_UP">
      <FollowUpStep />
    </ConsultationWorkspace>
  );
}
