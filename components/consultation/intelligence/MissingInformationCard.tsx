"use client";

import { CircleHelp, MessageCircleQuestionMark } from "lucide-react";
import type { MissingInformation } from "@/types";

/**
 * Information the platform has not been able to establish from the
 * consultation.
 *
 * A suggested question is offered for the doctor to use if they choose. The
 * system never records it as asked — only the transcript can establish that.
 */
export function MissingInformationCard({ item }: { item: MissingInformation }) {
  return (
    <div className="flex gap-2.5 rounded-control border border-border-default bg-surface p-3">
      <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{item.label}</p>
        {item.whyItMatters ? (
          <p className="mt-0.5 text-xs text-text-secondary">{item.whyItMatters}</p>
        ) : null}
        {item.suggestedQuestion ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-control bg-surface-subtle px-2.5 py-1.5 text-xs text-text">
            <MessageCircleQuestionMark
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-text-tertiary"
            />
            <span>{item.suggestedQuestion}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
