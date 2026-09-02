import { redirect } from "next/navigation";

/** The app has no public landing page; the guards decide where a visitor lands. */
export default function RootPage() {
  redirect("/dashboard");
}
