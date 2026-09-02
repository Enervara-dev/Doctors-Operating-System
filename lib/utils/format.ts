import type { Gender } from "@/types";

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export function formatGender(gender: Gender): string {
  return GENDER_LABELS[gender];
}

export function formatAge(age: number): string {
  return age === 1 ? "1 year" : `${age} years`;
}

/** `"Ananya Sharma"` -> `"34 years · Female"`. */
export function formatDemographics(age: number, gender: Gender): string {
  return `${formatAge(age)} · ${formatGender(gender)}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
