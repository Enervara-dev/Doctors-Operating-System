import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

export function AccessPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/patients"
        className="inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-text-secondary transition-colors hover:text-text"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All access methods
      </Link>

      <PageHeader title={title} description={description} />

      {children}
    </div>
  );
}
