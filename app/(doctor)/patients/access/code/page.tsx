import type { Metadata } from "next";
import { AccessCodeForm } from "@/components/patients/AccessCodeForm";
import { AccessPageShell } from "@/components/patients/AccessPageShell";

export const metadata: Metadata = { title: "Patient access code" };

export default function AccessCodePage() {
  return (
    <AccessPageShell
      title="Patient access code"
      description="Enter the code the patient generated to authorise you to view their record."
    >
      <AccessCodeForm />
    </AccessPageShell>
  );
}
