"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { StepEmpty, StepSection } from "./StepSection";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StringListEditor } from "@/components/ui/StringListEditor";
import { Textarea } from "@/components/ui/Textarea";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import { ALLERGY_SEVERITY_TONE } from "@/lib/constants/consultation";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import { usePatientContextStore } from "@/stores/patient-context.store";

const EMPTY_MEDICATION = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  route: "",
  instructions: "",
};

type MedicationFormErrors = Partial<Record<"name" | "dosage" | "frequency" | "duration", string>>;

/**
 * Prescribing and non-pharmacological management. Allergies and existing
 * medications are shown alongside so the decision is made in full context;
 * nothing is prescribed or suggested automatically.
 */
export function TreatmentStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const addMedication = useConsultationStore((state) => state.addMedication);
  const removeMedication = useConsultationStore((state) => state.removeMedication);
  const updateMedication = useConsultationStore((state) => state.updateMedication);
  const saveTreatment = useConsultationStore((state) => state.saveTreatment);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const saveState = useConsultationStore((state) => state.saveState);
  const isEditable = useConsultationStore(selectIsEditable);

  const patientContext = usePatientContextStore((state) => state.context);

  const [form, setForm] = useState(EMPTY_MEDICATION);
  const [errors, setErrors] = useState<MedicationFormErrors>({});
  const [nonPharmacological, setNonPharmacological] = useState<string[]>(
    consultation?.treatmentPlan.nonPharmacological ?? [],
  );
  const [procedures, setProcedures] = useState<string[]>(
    consultation?.treatmentPlan.procedures ?? [],
  );
  const [advice, setAdvice] = useState(consultation?.treatmentPlan.advice ?? "");

  const save = useCallback(
    () => saveTreatment({ nonPharmacological, procedures, advice }),
    [nonPharmacological, procedures, advice, saveTreatment],
  );

  useStepSaver(save);

  if (!consultation) return null;

  const primaryDiagnosis =
    consultation.diagnoses.find((diagnosis) => diagnosis.isPrimary) ?? consultation.diagnoses[0];

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: MedicationFormErrors = {};
    if (!form.name.trim()) nextErrors.name = "A medication name is required.";
    if (!form.dosage.trim()) nextErrors.dosage = "A dosage is required.";
    if (!form.frequency.trim()) nextErrors.frequency = "A frequency is required.";
    if (!form.duration.trim()) nextErrors.duration = "A duration is required.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const added = await addMedication({
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency.trim(),
      duration: form.duration.trim(),
      route: form.route.trim() || null,
      instructions: form.instructions.trim() || null,
    });
    if (added) setForm(EMPTY_MEDICATION);
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="TREATMENT" />

      {!isEditable ? (
        <Alert tone="info" title="Read-only">
          This consultation is finalized, so treatment can no longer be changed.
        </Alert>
      ) : null}

      <StepSection
        title="Prescribing context"
        description="What you should have in view before prescribing."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-eyebrow text-text-tertiary">Primary assessment</p>
            <p className="mt-1.5 text-sm text-text">
              {primaryDiagnosis ? (
                primaryDiagnosis.condition
              ) : (
                <span className="text-text-tertiary">
                  Not recorded yet — set it on the Diagnosis step.
                </span>
              )}
            </p>
          </div>

          <div>
            <p className="text-eyebrow text-text-tertiary">Allergies</p>
            {patientContext && patientContext.allergies.length > 0 ? (
              <ul className="mt-1.5 space-y-1">
                {patientContext.allergies.map((allergy) => (
                  <li key={allergy.id} className="flex items-center gap-1.5 text-sm">
                    <TriangleAlert aria-hidden className="size-3.5 shrink-0 text-error" />
                    <span className="text-text">{allergy.substance}</span>
                    <Badge tone={ALLERGY_SEVERITY_TONE[allergy.severity]}>
                      {allergy.severity.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-sm text-text-tertiary">No known allergies recorded.</p>
            )}
          </div>

          <div>
            <p className="text-eyebrow text-text-tertiary">Current medications</p>
            {patientContext && patientContext.currentMedications.length > 0 ? (
              <ul className="mt-1.5 space-y-1 text-sm text-text">
                {patientContext.currentMedications.map((medication) => (
                  <li key={medication.id}>
                    {medication.name}{" "}
                    <span className="text-text-secondary">{medication.dosage}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-sm text-text-tertiary">None recorded.</p>
            )}
          </div>
        </div>
      </StepSection>

      <StepSection
        title="Medications prescribed this visit"
        description="Every entry is prescribed by you."
      >
        {consultation.medications.length === 0 ? (
          <StepEmpty>No medications prescribed in this consultation.</StepEmpty>
        ) : (
          <ul className="space-y-3">
            {consultation.medications.map((medication) => (
              <li
                key={medication.id}
                className="rounded-control border border-border-default bg-surface-subtle p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">{medication.name}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {medication.dosage} · {medication.frequency} · {medication.duration}
                      {medication.route ? ` · ${medication.route}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!isEditable}
                    aria-label={`Remove ${medication.name}`}
                    onClick={() => void removeMedication(medication.id)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>

                <Input
                  label="Instructions"
                  className="mt-3"
                  value={medication.instructions ?? ""}
                  disabled={!isEditable}
                  placeholder="e.g. After food"
                  onChange={(event) =>
                    void updateMedication(medication.id, {
                      instructions: event.target.value || null,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      {isEditable ? (
        <StepSection title="Add a medication">
          <form onSubmit={handleAdd} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Medication"
                value={form.name}
                error={errors.name}
                required
                placeholder="e.g. Paracetamol"
                onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
              />
              <Input
                label="Dosage"
                value={form.dosage}
                error={errors.dosage}
                required
                placeholder="e.g. 500 mg"
                onChange={(event) => setForm((c) => ({ ...c, dosage: event.target.value }))}
              />
              <Input
                label="Frequency"
                value={form.frequency}
                error={errors.frequency}
                required
                placeholder="e.g. Three times daily"
                onChange={(event) => setForm((c) => ({ ...c, frequency: event.target.value }))}
              />
              <Input
                label="Duration"
                value={form.duration}
                error={errors.duration}
                required
                placeholder="e.g. 5 days"
                onChange={(event) => setForm((c) => ({ ...c, duration: event.target.value }))}
              />
              <Input
                label="Route"
                value={form.route}
                placeholder="e.g. Oral"
                onChange={(event) => setForm((c) => ({ ...c, route: event.target.value }))}
              />
              <Input
                label="Instructions"
                value={form.instructions}
                placeholder="e.g. After food"
                onChange={(event) =>
                  setForm((c) => ({ ...c, instructions: event.target.value }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={saveState === "SAVING"}>
                <Plus aria-hidden className="size-4" />
                Add medication
              </Button>
            </div>
          </form>
        </StepSection>
      ) : null}

      <StepSection
        title="Non-pharmacological treatment"
        description="Advice, lifestyle measures and procedures."
      >
        <div className="space-y-5">
          <StringListEditor
            label="Measures and advice"
            values={nonPharmacological}
            disabled={!isEditable}
            placeholder="e.g. Oral fluids and rest"
            emptyLabel="No measures added."
            onChange={(values) => {
              setNonPharmacological(values);
              markUnsaved();
            }}
          />
          <StringListEditor
            label="Procedures"
            values={procedures}
            disabled={!isEditable}
            placeholder="e.g. Wound dressing"
            emptyLabel="No procedures added."
            onChange={(values) => {
              setProcedures(values);
              markUnsaved();
            }}
          />
          <Textarea
            label="Additional advice for the patient"
            rows={4}
            value={advice}
            disabled={!isEditable}
            placeholder="What the patient should do, and when to seek help…"
            onChange={(event) => {
              setAdvice(event.target.value);
              markUnsaved();
            }}
          />
        </div>
      </StepSection>
    </div>
  );
}
