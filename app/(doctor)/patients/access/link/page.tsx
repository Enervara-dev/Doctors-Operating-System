import type { Metadata } from "next";
import { AccessPageShell } from "@/components/patients/AccessPageShell";
import { SharingLinkForm } from "@/components/patients/SharingLinkForm";

export const metadata: Metadata = { title: "Patient sharing link" };

export default function SharingLinkPage() {
  return (
    <AccessPageShell
      title="Patient sharing link"
      description="Open a record a patient shared with you directly. Links are time-limited and can be revoked."
    >
      <SharingLinkForm />
    </AccessPageShell>
  );
}
