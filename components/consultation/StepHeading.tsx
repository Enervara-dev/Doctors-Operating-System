import { CONSULTATION_STEP_META } from "@/lib/constants/consultation";
import type { ConsultationStep } from "@/types";

export function StepHeading({ step }: { step: ConsultationStep }) {
  const meta = CONSULTATION_STEP_META[step];
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-subtle">
        <Icon aria-hidden className="size-4 text-primary" />
      </span>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-text sm:text-xl">{meta.label}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{meta.description}</p>
      </div>
    </div>
  );
}
