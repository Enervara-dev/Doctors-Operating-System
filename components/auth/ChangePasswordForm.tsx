"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth.store";

const MIN_PASSWORD_LENGTH = 12;

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function validate(currentPassword: string, newPassword: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!currentPassword) errors.currentPassword = "Your current password is required.";
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (newPassword === currentPassword) {
    errors.newPassword = "Choose a password different from your current one.";
  }
  if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export function ChangePasswordForm() {
  const router = useRouter();
  const mandatory = useAuthStore((state) => state.mustChangePassword);
  const changePassword = useAuthStore((state) => state.changePassword);
  const clearChangePasswordFailure = useAuthStore((state) => state.clearChangePasswordFailure);
  const status = useAuthStore((state) => state.changePasswordStatus);
  const failure = useAuthStore((state) => state.changePasswordFailure);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const [succeeded, setSucceeded] = useState(false);

  const isSubmitting = status === "submitting";
  const fieldErrors: FieldErrors = { ...localErrors, ...failure?.fieldErrors };
  const showFormError = Boolean(failure && !failure.fieldErrors);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate(currentPassword, newPassword, confirmPassword);
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0) {
      clearChangePasswordFailure();
      return;
    }

    const didChange = await changePassword({ currentPassword, newPassword });
    if (didChange) {
      setSucceeded(true);
      setTimeout(() => router.replace("/dashboard"), 900);
    }
  }

  if (succeeded) {
    return <Alert tone="success" title="Password changed. Taking you to your dashboard…" />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {mandatory ? (
        <Alert tone="info" title="Set a new password to continue">
          Your account was just approved. Choose a password only you know before you continue to your
          dashboard.
        </Alert>
      ) : null}
      {showFormError && failure ? <Alert tone="error" title={failure.message} /> : null}

      <Input
        label="Current password"
        type="password"
        name="currentPassword"
        autoComplete="current-password"
        placeholder="The temporary password you were given"
        value={currentPassword}
        leadingIcon={<Lock className="size-4" />}
        error={fieldErrors.currentPassword}
        disabled={isSubmitting}
        required
        onChange={(event) => {
          setCurrentPassword(event.target.value);
          if (localErrors.currentPassword) setLocalErrors((prev) => ({ ...prev, currentPassword: undefined }));
          if (failure) clearChangePasswordFailure();
        }}
      />

      <Input
        label="New password"
        type="password"
        name="newPassword"
        autoComplete="new-password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={newPassword}
        leadingIcon={<Lock className="size-4" />}
        error={fieldErrors.newPassword}
        disabled={isSubmitting}
        required
        onChange={(event) => {
          setNewPassword(event.target.value);
          if (localErrors.newPassword) setLocalErrors((prev) => ({ ...prev, newPassword: undefined }));
          if (failure) clearChangePasswordFailure();
        }}
      />

      <Input
        label="Confirm new password"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Re-enter your new password"
        value={confirmPassword}
        leadingIcon={<Lock className="size-4" />}
        error={fieldErrors.confirmPassword}
        disabled={isSubmitting}
        required
        onChange={(event) => {
          setConfirmPassword(event.target.value);
          if (localErrors.confirmPassword) setLocalErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          if (failure) clearChangePasswordFailure();
        }}
      />

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} className="mt-1">
        {isSubmitting ? "Setting password…" : "Set new password"}
      </Button>
    </form>
  );
}
