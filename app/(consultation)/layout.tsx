import type { ReactNode } from "react";
import { AuthGuard } from "@/components/layout/AuthGuard";

/**
 * The consultation workspace takes the full viewport rather than sitting inside
 * the dashboard shell: during a visit the patient is the context, not the app
 * navigation.
 */
export default function ConsultationGroupLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
