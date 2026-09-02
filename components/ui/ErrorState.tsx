import { AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils/cn";

export interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-error-border",
        "bg-error-subtle px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface">
        <AlertCircle aria-hidden className="size-5 text-error" />
      </span>
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
