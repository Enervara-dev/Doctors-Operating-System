import { TriangleAlert } from "lucide-react";
import { BulletCard } from "./BulletCard";
import type { RedFlag } from "@/types";

export function RedFlagCard({ item }: { item: RedFlag }) {
  return (
    <BulletCard
      icon={TriangleAlert}
      tone={item.severity === "CRITICAL" ? "error" : "warning"}
      title={item.label}
      description={item.rationale}
      meta={item.action ? `Suggested action: ${item.action}` : undefined}
    />
  );
}
