"use client";

import { TriangleAlert } from "lucide-react";
import type { Allergy } from "@/types";

/**
 * Critical allergy information stays pinned beneath the header for the whole
 * consultation — on every breakpoint. It is never collapsed behind a drawer.
 */
export function AllergyBanner({ allergies }: { allergies: Allergy[] }) {
  if (allergies.length === 0) return null;

  return (
    <div
      role="alert"
      className="border-b border-error-border bg-error-subtle px-4 py-2 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-[100rem] items-start gap-2 text-error">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p className="min-w-0 text-xs font-medium sm:text-sm">
          <span className="font-semibold">
            {allergies.length === 1 ? "Allergy" : "Allergies"}:
          </span>{" "}
          {allergies.map((allergy) => allergy.substance).join(" · ")}
          <span className="ml-1 font-normal text-text-secondary">
            ({allergies.map((allergy) => allergy.reaction).join("; ")})
          </span>
        </p>
      </div>
    </div>
  );
}
