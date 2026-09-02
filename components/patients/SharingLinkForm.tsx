"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { usePatientStore } from "@/stores/patient.store";
import type { ApiErrorCode } from "@/types";

interface LinkFailurePresentation {
  title: string;
  tone: "warning" | "error";
  guidance: string;
}

/** The four link outcomes the doctor needs to tell apart. */
const LINK_FAILURES: Partial<Record<ApiErrorCode, LinkFailurePresentation>> = {
  ACCESS_LINK_EXPIRED: {
    title: "This sharing link has expired",
    tone: "warning",
    guidance: "Ask the patient to generate a fresh link from their Enervara app.",
  },
  ACCESS_LINK_REVOKED: {
    title: "Access through this link was revoked",
    tone: "error",
    guidance:
      "The patient has withdrawn access. Use a scheduled appointment or an access code instead.",
  },
  ACCESS_LINK_INVALID: {
    title: "This sharing link is not recognised",
    tone: "error",
    guidance: "Check that the entire link was copied, then try again.",
  },
};

export function SharingLinkForm() {
  const router = useRouter();
  const accessByLink = usePatientStore((state) => state.accessByLink);
  const clearFailure = usePatientStore((state) => state.clearFailure);
  const status = usePatientStore((state) => state.status);
  const failure = usePatientStore((state) => state.failure);

  const [link, setLink] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => clearFailure, [clearFailure]);

  const isValidating = status === "validating";
  const fieldError = localError ?? failure?.fieldErrors?.link;
  const presentation = failure && !failure.fieldErrors ? LINK_FAILURES[failure.code] : undefined;
  const genericError = failure && !failure.fieldErrors && !presentation ? failure.message : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!link.trim()) {
      setLocalError("Paste the sharing link the patient sent you.");
      clearFailure();
      return;
    }

    const grant = await accessByLink(link.trim());
    if (grant) router.push(`/patients/${grant.patient.id}/confirm`);
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-5 sm:pt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {presentation ? (
            <Alert tone={presentation.tone} title={presentation.title}>
              {presentation.guidance}
            </Alert>
          ) : null}
          {genericError ? <Alert tone="error" title={genericError} /> : null}

          <Input
            label="Sharing link"
            name="link"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://enervara.health/share/…"
            hint="Paste the full link, or just the token at the end of it."
            value={link}
            leadingIcon={<Link2 className="size-4" />}
            error={fieldError}
            disabled={isValidating}
            onChange={(event) => {
              setLink(event.target.value);
              if (localError) setLocalError(undefined);
              if (failure) clearFailure();
            }}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={isValidating}>
              {isValidating ? "Checking link…" : "Open link"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
