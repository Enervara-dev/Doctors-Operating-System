import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function AppointmentCardSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        <Skeleton className="hidden h-9 w-[4.5rem] shrink-0 sm:block" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
        <Skeleton className="h-8 w-full shrink-0 sm:w-36 sm:self-center" />
      </div>
    </Card>
  );
}

export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <AppointmentCardSkeleton key={index} />
      ))}
    </div>
  );
}
