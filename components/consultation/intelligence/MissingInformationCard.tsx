import { CircleHelp } from "lucide-react";
import { BulletCard } from "./BulletCard";
import type { MissingInformation } from "@/types";

export function MissingInformationCard({ item }: { item: MissingInformation }) {
  return (
    <BulletCard icon={CircleHelp} title={item.label} description={item.whyItMatters} />
  );
}
