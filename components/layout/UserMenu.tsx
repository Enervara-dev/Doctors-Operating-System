"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Doctor } from "@/types";

export function UserMenu({ doctor, onSignOut }: { doctor: Doctor; onSignOut: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        className="flex items-center gap-2 rounded-control px-1.5 py-1 transition-colors hover:bg-surface-muted"
      >
        <Avatar initials={doctor.avatarInitials} name={doctor.fullName} size="sm" />
        <span className="hidden text-sm font-medium text-text sm:inline">
          Dr. {doctor.displayName}
        </span>
        <ChevronDown aria-hidden className="size-4 text-text-tertiary" />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-card border border-border-default bg-surface shadow-overlay"
        >
          <div className="border-b border-border-default px-4 py-3">
            <p className="truncate text-sm font-medium text-text">{doctor.fullName}</p>
            <p className="truncate text-xs text-text-secondary">{doctor.email}</p>
            <p className="mt-1.5 truncate text-xs text-text-tertiary">
              {doctor.qualifications} · {doctor.registrationNumber}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface-muted"
          >
            <LogOut aria-hidden className="size-4 text-text-tertiary" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
