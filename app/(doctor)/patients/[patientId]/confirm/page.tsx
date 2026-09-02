import type { Metadata } from "next";
import { PatientConfirmation } from "@/components/patients/PatientConfirmation";

export const metadata: Metadata = { title: "Patient confirmation" };

export default async function PatientConfirmPage({
  params,
}: PageProps<"/patients/[patientId]/confirm">) {
  const { patientId } = await params;
  return <PatientConfirmation patientId={patientId} />;
}
