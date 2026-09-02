import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface InfoRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** A single label/value pair; compose several inside a `<dl>`. */
export function InfoRow({ label, children, className }: InfoRowProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="text-eyebrow text-text-tertiary">{label}</dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}
