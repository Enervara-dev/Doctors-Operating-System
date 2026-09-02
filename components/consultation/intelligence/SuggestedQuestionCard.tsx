import { MessageCircleQuestionMark } from "lucide-react";
import { BulletCard } from "./BulletCard";
import type { SuggestedQuestion } from "@/types";

export function SuggestedQuestionCard({ item }: { item: SuggestedQuestion }) {
  return (
    <BulletCard
      icon={MessageCircleQuestionMark}
      title={item.question}
      description={item.rationale}
    />
  );
}
