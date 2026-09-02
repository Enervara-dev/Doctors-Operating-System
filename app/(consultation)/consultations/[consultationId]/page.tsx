import { redirect } from "next/navigation";

/** Bare consultation URLs land on the first step. */
export default async function ConsultationIndexPage({
  params,
}: PageProps<"/consultations/[consultationId]">) {
  const { consultationId } = await params;
  redirect(`/consultations/${consultationId}/brief`);
}
