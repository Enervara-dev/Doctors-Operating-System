import type { Metadata } from "next";
import { CalendarDays, KeyRound, Link2 } from "lucide-react";
import { AccessMethodCard } from "@/components/patients/AccessMethodCard";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { ACCESS_METHOD_ROUTES } from "@/lib/constants/patient-access";

export const metadata: Metadata = { title: "Access patient" };

export default function PatientAccessHubPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access patient"
        description="Choose how you would like to open this patient's record."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AccessMethodCard
          href={ACCESS_METHOD_ROUTES.APPOINTMENT}
          icon={CalendarDays}
          title="Scheduled appointment"
          description="Open a patient you are already booked to see. Access is granted for the duration of the appointment."
          action="Select appointment"
        />
        <AccessMethodCard
          href={ACCESS_METHOD_ROUTES.ACCESS_CODE}
          icon={KeyRound}
          title="Patient access code"
          description="Enter the short code the patient generated in the Enervara app. Use this for walk-ins and referrals."
          action="Enter access code"
        />
        <AccessMethodCard
          href={ACCESS_METHOD_ROUTES.SHARING_LINK}
          icon={Link2}
          title="Patient sharing link"
          description="Open a link a patient shared with you directly. Links can expire or be revoked by the patient at any time."
          action="Open sharing link"
        />
      </div>

      <Alert tone="info" title="Authorization is simulated in this build">
        Access grants are produced from mock data and are not enforced. Consent verification,
        signed tokens and audit logging arrive with the production authorization service.
      </Alert>
    </div>
  );
}
