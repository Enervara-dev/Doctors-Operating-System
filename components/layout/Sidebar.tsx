import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { DoctorIdentity } from "./DoctorIdentity";
import { SidebarNav } from "./SidebarNav";
import type { Doctor } from "@/types";

/** Desktop-only rail. Below `lg` the same nav is presented via `MobileNav`. */
export function Sidebar({ doctor }: { doctor: Doctor }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border-default bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border-default px-5">
        <Link href="/dashboard" className="rounded-control">
          <BrandMark />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>

      <div className="border-t border-border-default p-4">
        <DoctorIdentity doctor={doctor} />
      </div>
    </aside>
  );
}
