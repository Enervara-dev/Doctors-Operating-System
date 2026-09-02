"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAppointmentStore } from "@/stores/appointment.store";
import { useAuthStore } from "@/stores/auth.store";
import { usePatientStore } from "@/stores/patient.store";
import { useUiStore } from "@/stores/ui.store";

/**
 * Authenticated chrome. Rendered only behind `AuthGuard`, so a missing doctor
 * here means the guard is still resolving.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const doctor = useAuthStore((state) => state.doctor);
  const logout = useAuthStore((state) => state.logout);
  const resetAppointments = useAppointmentStore((state) => state.reset);
  const clearPatientAccess = usePatientStore((state) => state.clearAccess);

  const isMobileNavOpen = useUiStore((state) => state.isMobileNavOpen);
  const openMobileNav = useUiStore((state) => state.openMobileNav);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);

  if (!doctor) return <AppShellSkeleton />;

  function handleSignOut() {
    // Clearing feature stores prevents one doctor's data leaking into the next
    // session on a shared workstation.
    closeMobileNav();
    resetAppointments();
    clearPatientAccess();
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar doctor={doctor} />
      <MobileNav
        doctor={doctor}
        isOpen={isMobileNavOpen}
        onClose={closeMobileNav}
        onSignOut={handleSignOut}
      />

      <div className="lg:pl-64">
        <Topbar doctor={doctor} onOpenNav={openMobileNav} onSignOut={handleSignOut} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
