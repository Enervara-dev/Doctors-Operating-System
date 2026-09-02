import type { Metadata } from "next";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";

export const metadata: Metadata = { title: "Appointments" };

export default function AppointmentsPage() {
  return <AppointmentsView />;
}
