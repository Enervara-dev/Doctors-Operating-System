"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {PRIMARY_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary-subtle text-on-primary-subtle"
                : "text-text-secondary hover:bg-surface-muted hover:text-text",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.comingSoon ? (
              <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-text-tertiary uppercase">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
