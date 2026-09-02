import type { Metadata } from "next";
import { ConsultationsIndex } from "@/components/consultation/ConsultationsIndex";

export const metadata: Metadata = { title: "Consultations" };

export default function ConsultationsPage() {
  return <ConsultationsIndex />;
}
