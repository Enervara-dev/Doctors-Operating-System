import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface AccessMethodCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
}

export function AccessMethodCard({
  href,
  icon: Icon,
  title,
  description,
  action,
}: AccessMethodCardProps) {
  return (
    <Card className="group h-full transition-shadow hover:shadow-raised">
      <Link href={href} className="flex h-full flex-col rounded-card p-5">
        <span className="flex size-10 items-center justify-center rounded-control bg-primary-subtle">
          <Icon aria-hidden className="size-5 text-primary" />
        </span>

        <h2 className="mt-4 text-sm font-semibold text-text">{title}</h2>
        <p className="mt-1.5 flex-1 text-sm text-text-secondary">{description}</p>

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          {action}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </Card>
  );
}
