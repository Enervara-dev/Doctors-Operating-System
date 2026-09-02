"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  panelClassName?: string;
}

/** Accessible expand/collapse region — button controls a labelled panel. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  panelClassName,
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = `${panelId}-button`;

  return (
    <div className={className}>
      <button
        type="button"
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-control text-left"
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-text-tertiary transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className={cn("pt-3", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}
