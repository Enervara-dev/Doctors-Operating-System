import type { Metadata } from "next";
import { RecordsIndex } from "@/components/records/RecordsIndex";

export const metadata: Metadata = { title: "Records" };

export default function RecordsPage() {
  return <RecordsIndex />;
}
