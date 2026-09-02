import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-eyebrow text-text-tertiary">Error 404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-text">Page not found</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/dashboard" className={buttonVariants({ variant: "primary" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
