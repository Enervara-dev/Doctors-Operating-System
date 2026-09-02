"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { usePatientStore } from "@/stores/patient.store";

export function AccessCodeForm() {
  const router = useRouter();
  const accessByCode = usePatientStore((state) => state.accessByCode);
  const clearFailure = usePatientStore((state) => state.clearFailure);
  const status = usePatientStore((state) => state.status);
  const failure = usePatientStore((state) => state.failure);

  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();

  // A failure carried over from a previous attempt should not greet the doctor.
  useEffect(() => clearFailure, [clearFailure]);

  const isValidating = status === "validating";
  const fieldError = localError ?? failure?.fieldErrors?.code;
  const formError = failure && !failure.fieldErrors ? failure.message : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim()) {
      setLocalError("Enter the access code shared by the patient.");
      clearFailure();
      return;
    }

    const grant = await accessByCode(code.trim());
    if (grant) router.push(`/patients/${grant.patient.id}/confirm`);
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-5 sm:pt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError ? <Alert tone="error" title="Access code not accepted">{formError}</Alert> : null}

          <Input
            label="Patient access code"
            name="code"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="ENV-00000"
            hint="Codes are shown in the patient's Enervara app and are case-insensitive."
            value={code}
            leadingIcon={<KeyRound className="size-4" />}
            error={fieldError}
            disabled={isValidating}
            className="font-mono tracking-wide uppercase"
            onChange={(event) => {
              setCode(event.target.value);
              if (localError) setLocalError(undefined);
              if (failure) clearFailure();
            }}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={isValidating}>
              {isValidating ? "Verifying…" : "Verify code"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
