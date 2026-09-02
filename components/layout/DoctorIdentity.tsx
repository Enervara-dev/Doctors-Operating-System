import { Avatar } from "@/components/ui/Avatar";
import type { Doctor } from "@/types";
import { cn } from "@/lib/utils/cn";

export function DoctorIdentity({
  doctor,
  className,
}: {
  doctor: Doctor;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar initials={doctor.avatarInitials} name={doctor.fullName} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">{doctor.fullName}</p>
        <p className="truncate text-xs text-text-secondary">{doctor.specialty}</p>
      </div>
    </div>
  );
}
