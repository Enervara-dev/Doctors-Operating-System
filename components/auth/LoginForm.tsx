"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth.store";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else if (password.length < 6) errors.password = "Password must be at least 6 characters.";

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const clearFailure = useAuthStore((state) => state.clearFailure);
  const status = useAuthStore((state) => state.status);
  const failure = useAuthStore((state) => state.failure);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});

  const isSubmitting = status === "authenticating";
  // Server-side field messages win, so the API stays the source of truth.
  const fieldErrors: FieldErrors = { ...localErrors, ...failure?.fieldErrors };
  const showFormError = Boolean(failure && !failure.fieldErrors);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate(email, password);
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0) {
      clearFailure();
      return;
    }

    const didSignIn = await login({ email: email.trim(), password });
    if (didSignIn) router.replace("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {showFormError && failure ? <Alert tone="error" title={failure.message} /> : null}

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="username"
        placeholder="you@enervara.com"
        value={email}
        leadingIcon={<Mail className="size-4" />}
        error={fieldErrors.email}
        disabled={isSubmitting}
        required
        onChange={(event) => {
          setEmail(event.target.value);
          if (localErrors.email) setLocalErrors((prev) => ({ ...prev, email: undefined }));
          if (failure) clearFailure();
        }}
      />

      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        leadingIcon={<Lock className="size-4" />}
        error={fieldErrors.password}
        disabled={isSubmitting}
        required
        onChange={(event) => {
          setPassword(event.target.value);
          if (localErrors.password) setLocalErrors((prev) => ({ ...prev, password: undefined }));
          if (failure) clearFailure();
        }}
      />

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} className="mt-1">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
