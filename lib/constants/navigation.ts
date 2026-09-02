import {
  CalendarDays,
  FolderClosed,
  LayoutDashboard,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rendered but inert until the phase that implements it lands. */
  comingSoon?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/appointments", icon: CalendarDays },
  { label: "Patients", href: "/patients", icon: UsersRound },
  { label: "Consultations", href: "/consultations", icon: Stethoscope },
  { label: "Records", href: "/records", icon: FolderClosed },
];
