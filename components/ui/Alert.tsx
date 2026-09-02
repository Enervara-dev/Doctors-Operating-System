import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Tone } from "@/lib/constants/appointment";
import { cn } from "@/lib/utils/cn";

type AlertTone = Extract<Tone, "info" | "success" | "warning" | "error">;

const TONE_STYLES: Record<AlertTone, string> = {
  info: "bg-info-subtle border-info-border text-info",
  success: "bg-success-subtle border-success-border text-success",
  warning: "bg-warning-subtle border-warning-border text-warning",
  error: "bg-error-subtle border-error-border text-error",
};

const TONE_ICONS: Record<AlertTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const Icon = TONE_ICONS[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-control border p-3.5", TONE_STYLES[tone], className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-sm">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "text-text-secondary")}>{children}</div> : null}
      </div>
    </div>
  );
}
