import { Badge } from "@/components/ui/Badge";
import { ALERT_SEVERITY_TONE } from "@/lib/constants/appointment";
import type { AppointmentAlert } from "@/types";

export function AppointmentAlerts({ alerts }: { alerts: AppointmentAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {alerts.map((alert) => (
        <li key={`${alert.severity}-${alert.label}`}>
          <Badge tone={ALERT_SEVERITY_TONE[alert.severity]} withDot>
            {alert.label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
