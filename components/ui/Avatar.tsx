import { cn } from "@/lib/utils/cn";

export type AvatarSize = "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, string> = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
};

export interface AvatarProps {
  initials: string;
  /** Read by screen readers in place of the initials glyph. */
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ initials, name, size = "md", className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-primary-subtle font-semibold text-on-primary-subtle",
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden>{initials}</span>
    </span>
  );
}
