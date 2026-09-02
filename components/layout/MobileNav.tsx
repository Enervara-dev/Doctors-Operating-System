"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { DoctorIdentity } from "./DoctorIdentity";
import { SidebarNav } from "./SidebarNav";
import { Button } from "@/components/ui/Button";
import type { Doctor } from "@/types";

export function MobileNav({
  doctor,
  isOpen,
  onClose,
  onSignOut,
}: {
  doctor: Doctor;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    // Prevent the page behind the drawer from scrolling on touch devices.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col bg-surface shadow-overlay"
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3.5">
          <BrandMark />
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close navigation">
            <X aria-hidden className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav onNavigate={onClose} />
        </div>

        <div className="border-t border-border-default p-3">
          <DoctorIdentity doctor={doctor} className="px-1 pb-3" />
          <Button variant="secondary" size="sm" fullWidth onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
