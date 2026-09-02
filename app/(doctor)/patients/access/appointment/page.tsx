import type { Metadata } from "next";
import { AccessPageShell } from "@/components/patients/AccessPageShell";
import { AppointmentAccessList } from "@/components/patients/AppointmentAccessList";

export const metadata: Metadata = { title: "Select appointment" };

export default function AppointmentAccessPage() {
  return (
    <AccessPageShell
      title="Select appointment"
      description="Open a patient from your schedule. Access is granted for the appointment window."
    >
      <AppointmentAccessList />
    </AccessPageShell>
  );
}
