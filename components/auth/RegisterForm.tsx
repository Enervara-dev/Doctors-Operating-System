"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, User, FileBadge2, GraduationCap, Paperclip } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  doctorApplicationsApi,
  DoctorApplicationRequestError,
  type DoctorApplicationSubmission,
} from "@/features/doctor-applications/doctor-applications.api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CERTIFICATE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_CERTIFICATE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface FieldErrors {
  email?: string;
  fullName?: string;
  nmrNumber?: string;
  certificate?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nmrNumber, setNmrNumber] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCertificateChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFieldErrors((prev) => ({ ...prev, certificate: undefined }));
    if (!file) {
      setCertificate(null);
      return;
    }
    if (!ACCEPTED_CERTIFICATE_TYPES.includes(file.type)) {
      setFieldErrors((prev) => ({ ...prev, certificate: "Accepted formats: PDF, JPEG, PNG, WEBP." }));
      setCertificate(null);
      return;
    }
    if (file.size > MAX_CERTIFICATE_BYTES) {
      setFieldErrors((prev) => ({ ...prev, certificate: "File exceeds the 15 MB limit." }));
      setCertificate(null);
      return;
    }
    setCertificate(file);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.trim() || !EMAIL_PATTERN.test(email.trim())) errors.email = "A valid email address is required.";
    if (!fullName.trim()) errors.fullName = "Your full registered name is required.";
    if (!nmrNumber.trim()) errors.nmrNumber = "Your NMR registration number is required.";
    if (!certificate) errors.certificate = "Your NMR certificate is required.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !certificate) return;

    setIsSubmitting(true);
    try {
      const input: DoctorApplicationSubmission = {
        email: email.trim(),
        phone: phone.trim() || undefined,
        fullName: fullName.trim(),
        displayName: displayName.trim() || undefined,
        nmrNumber: nmrNumber.trim(),
        qualifications: qualifications.trim() || undefined,
        yearsOfExperience: yearsOfExperience.trim() || undefined,
        certificate,
      };
      const application = await doctorApplicationsApi.submit(input);
      router.push(`/application-status?id=${encodeURIComponent(application.id)}`);
    } catch (error) {
      if (error instanceof DoctorApplicationRequestError) {
        if (error.details) setFieldErrors(error.details);
        else setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error" title={formError} /> : null}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        leadingIcon={<Mail className="size-4" />}
        error={fieldErrors.email}
        disabled={isSubmitting}
        required
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        placeholder="+91 98765 43210"
        value={phone}
        leadingIcon={<Phone className="size-4" />}
        disabled={isSubmitting}
        onChange={(e) => setPhone(e.target.value)}
      />

      <Input
        label="Full registered name"
        placeholder="Dr Asha Kapoor"
        value={fullName}
        leadingIcon={<User className="size-4" />}
        error={fieldErrors.fullName}
        disabled={isSubmitting}
        required
        onChange={(e) => setFullName(e.target.value)}
      />

      <Input
        label="Display name (optional)"
        hint="Shown to patients, e.g. “Dr Kapoor”. Defaults to your full name."
        placeholder="Dr Kapoor"
        value={displayName}
        leadingIcon={<User className="size-4" />}
        disabled={isSubmitting}
        onChange={(e) => setDisplayName(e.target.value)}
      />

      <Input
        label="NMR registration number"
        placeholder="e.g. NMR-2024-12345"
        value={nmrNumber}
        leadingIcon={<FileBadge2 className="size-4" />}
        error={fieldErrors.nmrNumber}
        disabled={isSubmitting}
        required
        onChange={(e) => setNmrNumber(e.target.value)}
      />

      <Input
        label="Qualifications (optional)"
        hint="Comma-separated, e.g. MBBS, MD (General Medicine)"
        placeholder="MBBS, MD (General Medicine)"
        value={qualifications}
        leadingIcon={<GraduationCap className="size-4" />}
        disabled={isSubmitting}
        onChange={(e) => setQualifications(e.target.value)}
      />

      <Input
        label="Years of experience (optional)"
        type="number"
        min={0}
        max={80}
        value={yearsOfExperience}
        disabled={isSubmitting}
        onChange={(e) => setYearsOfExperience(e.target.value)}
      />

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-text">
          NMR certificate
          <span aria-hidden className="ml-0.5 text-error">*</span>
        </label>
        <label
          className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-border-default bg-surface-subtle px-3 text-center transition-colors hover:border-border-strong"
        >
          <Paperclip className="size-4 text-text-tertiary" aria-hidden />
          <span className="text-sm text-text">
            {certificate ? certificate.name : "Click to upload — PDF, JPEG, PNG or WEBP, up to 15 MB"}
          </span>
          <input
            type="file"
            accept={ACCEPTED_CERTIFICATE_TYPES.join(",")}
            className="sr-only"
            disabled={isSubmitting}
            onChange={handleCertificateChange}
          />
        </label>
        {fieldErrors.certificate ? (
          <p className="mt-1.5 text-xs font-medium text-error">{fieldErrors.certificate}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} className="mt-1">
        {isSubmitting ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
