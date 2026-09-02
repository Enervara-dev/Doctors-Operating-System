"use client";

import Link from "next/link";
import { Menu, UserPlus } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { UserMenu } from "./UserMenu";
import { buttonVariants } from "@/components/ui/Button";
import type { Doctor } from "@/types";

export function Topbar({
  doctor,
  onOpenNav,
  onSignOut,
}: {
  doctor: Doctor;
  onOpenNav: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border-default bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 flex size-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-muted hover:text-text lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      <Link href="/dashboard" className="rounded-control lg:hidden">
        <BrandMark />
      </Link>

      <div className="flex-1" />

      <Link
        href="/patients"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <UserPlus aria-hidden className="size-4" />
        <span className="hidden sm:inline">Access patient</span>
        <span className="sr-only sm:hidden">Access patient</span>
      </Link>

      <UserMenu doctor={doctor} onSignOut={onSignOut} />
    </header>
  );
}
