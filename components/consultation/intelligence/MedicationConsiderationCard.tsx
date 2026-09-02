import { Pill } from "lucide-react";
import { BulletCard } from "./BulletCard";
import type { MedicationConsideration } from "@/types";

export function MedicationConsiderationCard({ item }: { item: MedicationConsideration }) {
  return (
    <BulletCard
      icon={Pill}
      tone={item.severity === "CRITICAL" ? "error" : item.severity === "WARNING" ? "warning" : "neutral"}
      title={item.topic}
      description={item.detail}
      meta={item.relatedMedication ? `Relates to: ${item.relatedMedication}` : undefined}
    />
  );
}
