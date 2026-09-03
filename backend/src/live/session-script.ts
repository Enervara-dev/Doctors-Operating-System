import type {
  ClinicalFact,
  ClinicalIntelligence,
  SpeakerRole,
} from "../domain/types";

/**
 * DETERMINISTIC TEST FIXTURE — NOT CLINICAL OUTPUT.
 *
 * A scripted consultation used by the mock adapter so the Live Consultation
 * workspace can be built and evaluated before a Clinical Intelligence Platform
 * is connected. It is fixed, ordered and repeatable: nothing is generated, and
 * no model produced any of it.
 *
 * Everything published from this script carries `provenance: "FIXTURE"`, and
 * the workspace labels such sessions prominently. It must never be presented
 * as real clinical output.
 *
 * The case matches the seeded pre-consultation brief for Ananya Sharma, so the
 * live session continues the same story the brief sets up.
 */

export interface ScriptedUtterance {
  /** Milliseconds from session start at which the partial appears. */
  atMs: number;
  /** Milliseconds after the partial at which it settles. */
  finalAfterMs: number;
  speaker: SpeakerRole;
  speakerLabel: string;
  /** What the platform reports mid-utterance. */
  partialText: string;
  text: string;
  confidence: number;
}

export interface ScriptedFacts {
  atMs: number;
  /** Index into `UTTERANCES` the facts were extracted from. */
  fromUtterance: number;
  facts: Omit<ClinicalFact, "id" | "sourceUtteranceId" | "recordedAt" | "provenance">[];
}

export type ScriptedIntelligence = Omit<
  ClinicalIntelligence,
  "consultationId" | "generatedAt" | "provenance" | "version"
> & { atMs: number };

export const UTTERANCES: readonly ScriptedUtterance[] = [
  {
    atMs: 600,
    finalAfterMs: 700,
    speaker: "DOCTOR",
    speakerLabel: "Doctor",
    partialText: "Good morning Ananya. What has been",
    text: "Good morning Ananya. What has been troubling you?",
    confidence: 0.97,
  },
  {
    atMs: 2200,
    finalAfterMs: 900,
    speaker: "PATIENT",
    speakerLabel: "Patient",
    partialText: "I have had a fever for about",
    text: "I have had a fever for about six days now. It goes up every evening.",
    confidence: 0.94,
  },
  {
    atMs: 4400,
    finalAfterMs: 600,
    speaker: "DOCTOR",
    speakerLabel: "Doctor",
    partialText: "Have you measured",
    text: "Have you measured the temperature at home?",
    confidence: 0.96,
  },
  {
    atMs: 6000,
    finalAfterMs: 800,
    speaker: "PATIENT",
    speakerLabel: "Patient",
    partialText: "Yes, it was thirty eight point nine",
    text: "Yes, it was 38.9 last night. Paracetamol brings it down for a few hours.",
    confidence: 0.92,
  },
  {
    atMs: 8200,
    finalAfterMs: 700,
    speaker: "DOCTOR",
    speakerLabel: "Doctor",
    partialText: "Any cough, burning when passing urine",
    text: "Any cough, burning when passing urine, or loose stools?",
    confidence: 0.95,
  },
  {
    atMs: 10200,
    finalAfterMs: 800,
    speaker: "PATIENT",
    speakerLabel: "Patient",
    partialText: "No cough. No burning",
    text: "No cough. No burning. No loose motions either.",
    confidence: 0.93,
  },
  {
    atMs: 12400,
    finalAfterMs: 900,
    speaker: "ATTENDER",
    speakerLabel: "Attender (husband)",
    partialText: "She has been very tired, doctor",
    text: "She has been very tired, doctor. She could not go to work for four days.",
    confidence: 0.9,
  },
  {
    atMs: 14800,
    finalAfterMs: 700,
    speaker: "DOCTOR",
    speakerLabel: "Doctor",
    partialText: "Any travel recently, or anyone at home",
    text: "Any travel recently, or anyone at home with similar fever?",
    confidence: 0.96,
  },
  {
    atMs: 16900,
    finalAfterMs: 800,
    speaker: "PATIENT",
    speakerLabel: "Patient",
    partialText: "No travel. My neighbour had",
    text: "No travel. My neighbour had dengue last month.",
    confidence: 0.91,
  },
  {
    atMs: 19200,
    finalAfterMs: 700,
    speaker: "DOCTOR",
    speakerLabel: "Doctor",
    partialText: "Are you still taking the thyroid",
    text: "Are you still taking the thyroid tablet every morning?",
    confidence: 0.95,
  },
  {
    atMs: 21200,
    finalAfterMs: 700,
    speaker: "PATIENT",
    speakerLabel: "Patient",
    partialText: "Yes, seventy five micrograms",
    text: "Yes, 75 micrograms, before breakfast.",
    confidence: 0.94,
  },
  {
    atMs: 23400,
    finalAfterMs: 900,
    speaker: "DOCTOR",
    speakerLabel: "Doctor",
    partialText: "Let me examine you. I will check",
    text: "Let me examine you. I will check your temperature and look for a rash.",
    confidence: 0.96,
  },
];

export const FACTS: readonly ScriptedFacts[] = [
  {
    atMs: 3600,
    fromUtterance: 1,
    facts: [
      { kind: "SYMPTOM", label: "Fever", value: "Present", source: "TRANSCRIPT", confidence: 0.95 },
      { kind: "DURATION", label: "Fever duration", value: "6 days", source: "TRANSCRIPT", confidence: 0.93 },
      { kind: "SYMPTOM", label: "Evening temperature spike", value: "Reported", source: "TRANSCRIPT", confidence: 0.88 },
    ],
  },
  {
    atMs: 7400,
    fromUtterance: 3,
    facts: [
      { kind: "VITAL", label: "Highest recorded temperature", value: "38.9 °C", source: "TRANSCRIPT", confidence: 0.92 },
      { kind: "MEDICATION", label: "Paracetamol", value: "Self-administered, partial relief", source: "TRANSCRIPT", confidence: 0.9 },
    ],
  },
  {
    atMs: 11400,
    fromUtterance: 5,
    facts: [
      { kind: "NEGATIVE_FINDING", label: "Cough", value: "Absent", source: "TRANSCRIPT", confidence: 0.94 },
      { kind: "NEGATIVE_FINDING", label: "Dysuria", value: "Absent", source: "TRANSCRIPT", confidence: 0.93 },
      { kind: "NEGATIVE_FINDING", label: "Diarrhoea", value: "Absent", source: "TRANSCRIPT", confidence: 0.93 },
    ],
  },
  {
    atMs: 13800,
    fromUtterance: 6,
    facts: [
      { kind: "SYMPTOM", label: "Fatigue", value: "Marked; 4 days off work", source: "TRANSCRIPT", confidence: 0.91 },
    ],
  },
  {
    atMs: 18200,
    fromUtterance: 8,
    facts: [
      { kind: "RISK_FACTOR", label: "Local dengue contact", value: "Neighbour, last month", source: "TRANSCRIPT", confidence: 0.86 },
      { kind: "NEGATIVE_FINDING", label: "Recent travel", value: "None", source: "TRANSCRIPT", confidence: 0.94 },
    ],
  },
  {
    atMs: 22300,
    fromUtterance: 10,
    facts: [
      { kind: "MEDICATION", label: "Levothyroxine", value: "75 mcg daily, adherent", source: "TRANSCRIPT", confidence: 0.95 },
    ],
  },
];

/**
 * Three successive publications, so the workspace can demonstrate incremental
 * revision: later versions add and refine, they do not silently replace.
 */
export const INTELLIGENCE: readonly ScriptedIntelligence[] = [
  {
    atMs: 8000,
    clinicalConsiderations: [
      {
        id: "fx-con-febrile",
        condition: "Undifferentiated febrile illness",
        relevance: "Fever of six days without a localising symptom.",
        rationale:
          "Fixture rationale. Duration and the absence of respiratory, urinary or gastrointestinal features keep the source unlocalised at this point.",
        confidence: 0.52,
        supportingFindings: [
          { id: "fx-ev-1", kind: "SYMPTOM", label: "Fever for 6 days", sourceRef: "clinicalContext.facts[0]" },
          { id: "fx-ev-2", kind: "SYMPTOM", label: "Marked fatigue", sourceRef: "clinicalContext.facts[6]" },
        ],
        missingInformation: ["Rash", "Recent platelet count"],
        importantQuestions: ["Has there been any bleeding from the gums or nose?"],
      },
    ],
    missingInformation: [
      {
        id: "fx-mi-1",
        label: "Examination findings not yet recorded",
        whyItMatters: "A rash or hepatosplenomegaly would narrow the differential considerably.",
        suggestedQuestion: "May I examine your abdomen and check for a rash?",
        relatedConsiderationId: "fx-con-febrile",
      },
    ],
  },
  {
    atMs: 19000,
    clinicalConsiderations: [
      {
        id: "fx-con-febrile",
        condition: "Undifferentiated febrile illness",
        relevance: "Fever of six days without a localising symptom.",
        rationale:
          "Fixture rationale. Still unlocalised; the reported community contact raises arboviral illness in the differential.",
        confidence: 0.44,
        supportingFindings: [
          { id: "fx-ev-1", kind: "SYMPTOM", label: "Fever for 6 days", sourceRef: "clinicalContext.facts[0]" },
          { id: "fx-ev-2", kind: "SYMPTOM", label: "Marked fatigue", sourceRef: "clinicalContext.facts[6]" },
        ],
        contradictingFindings: [
          { id: "fx-ev-3", kind: "FINDING", label: "No respiratory or urinary symptoms", sourceRef: "clinicalContext.facts[7]" },
        ],
        missingInformation: ["Rash", "Recent platelet count"],
      },
      {
        id: "fx-con-arbo",
        condition: "Arboviral illness (community contact reported)",
        relevance: "Household-adjacent dengue contact within the last month.",
        rationale:
          "Fixture rationale. Contact history plus an undifferentiated fever of this duration warrants considering an arboviral cause.",
        confidence: 0.38,
        supportingFindings: [
          { id: "fx-ev-4", kind: "RISK_FACTOR", label: "Neighbour with dengue last month", sourceUtteranceId: "utterance-9", sourceRef: "clinicalContext.facts[9]" },
          { id: "fx-ev-5", kind: "SYMPTOM", label: "Evening temperature spikes", sourceRef: "clinicalContext.facts[2]" },
        ],
        missingInformation: ["Platelet count", "Tourniquet test", "Presence of rash"],
        importantQuestions: ["Any bleeding gums, nosebleeds or unusual bruising?"],
        safetyAlertIds: ["fx-safety-1"],
      },
    ],
    investigationRecommendations: [
      {
        id: "fx-inv-cbc",
        name: "Complete blood count with platelet count",
        rationale:
          "Fixture rationale. A falling platelet count would change immediate management and follow-up interval.",
        clinicalQuestion: "Is there thrombocytopenia or leucopenia?",
        priority: "IMPORTANT",
        relatedConsiderationId: "fx-con-arbo",
        relatedConsideration: "Arboviral illness (community contact reported)",
        source: "CLINICAL_INTELLIGENCE",
        supportingFindings: [
          { id: "fx-ev-6", kind: "SYMPTOM", label: "Fever for 6 days", sourceRef: "clinicalContext.facts[0]" },
        ],
      },
      {
        id: "fx-inv-tsh",
        name: "Thyroid function tests",
        rationale:
          "Fixture rationale. Fatigue on established replacement therapy may reflect inadequate dosing rather than the acute illness.",
        clinicalQuestion: "Is the current levothyroxine dose adequate?",
        priority: "ROUTINE",
        relatedConsiderationId: "fx-con-febrile",
        relatedConsideration: "Undifferentiated febrile illness",
        source: "CLINICAL_INTELLIGENCE",
      },
    ],
    missingInformation: [
      {
        id: "fx-mi-1",
        label: "Examination findings not yet recorded",
        whyItMatters: "A rash or hepatosplenomegaly would narrow the differential considerably.",
        suggestedQuestion: "May I examine your abdomen and check for a rash?",
        relatedConsiderationId: "fx-con-febrile",
      },
      {
        id: "fx-mi-2",
        label: "Bleeding symptoms not established",
        whyItMatters: "Mucosal bleeding would raise the urgency of a platelet count.",
        suggestedQuestion: "Have you noticed bleeding gums, nosebleeds or bruising?",
        relatedConsiderationId: "fx-con-arbo",
      },
    ],
    safetyAlerts: [
      {
        id: "fx-safety-1",
        kind: "RED_FLAG",
        severity: "WARNING",
        label: "Fever beyond five days without a localising source",
        finding: "Day 6 of fever; no respiratory, urinary or gastrointestinal focus identified.",
        rationale:
          "Fixture rationale. Prolonged undifferentiated fever warrants a documented examination and a baseline blood count.",
        suggestedAction: "Consider examination for rash and organomegaly, and a baseline platelet count.",
      },
    ],
    suggestedQuestions: [
      {
        id: "fx-sq-1",
        question: "Have you noticed bleeding gums, nosebleeds or unusual bruising?",
        rationale: "Fixture rationale. Establishes whether mucosal bleeding is present.",
        relatedConsiderationId: "fx-con-arbo",
      },
    ],
  },
  {
    atMs: 25000,
    clinicalConsiderations: [
      {
        id: "fx-con-arbo",
        condition: "Arboviral illness (community contact reported)",
        relevance: "Household-adjacent dengue contact within the last month.",
        rationale:
          "Fixture rationale. Remains the leading consideration pending examination and a blood count.",
        confidence: 0.41,
        supportingFindings: [
          { id: "fx-ev-4", kind: "RISK_FACTOR", label: "Neighbour with dengue last month", sourceUtteranceId: "utterance-9", sourceRef: "clinicalContext.facts[9]" },
          { id: "fx-ev-5", kind: "SYMPTOM", label: "Evening temperature spikes", sourceRef: "clinicalContext.facts[2]" },
        ],
        contradictingFindings: [
          { id: "fx-ev-9", kind: "FINDING", label: "No bleeding symptoms reported so far", sourceRef: "clinicalContext.facts[7]" },
          { id: "fx-ev-10", kind: "FINDING", label: "No recent travel", sourceUtteranceId: "utterance-9", sourceRef: "clinicalContext.facts[10]" },
        ],
        missingInformation: ["Platelet count", "Presence of rash"],
        safetyAlertIds: ["fx-safety-1"],
      },
      {
        id: "fx-con-thyroid",
        condition: "Inadequately replaced hypothyroidism contributing to fatigue",
        relevance: "Established hypothyroidism; fatigue disproportionate to the febrile illness.",
        rationale:
          "Fixture rationale. Adherence is reported, so the dose rather than compliance may be the issue.",
        confidence: 0.29,
        supportingFindings: [
          { id: "fx-ev-7", kind: "HISTORY", label: "Hypothyroidism on levothyroxine 75 mcg", sourceRef: "patientContext.medicalHistory[0]" },
          { id: "fx-ev-8", kind: "SYMPTOM", label: "Marked fatigue, 4 days off work", sourceRef: "clinicalContext.facts[6]" },
        ],
      },
    ],
    investigationRecommendations: [
      {
        id: "fx-inv-cbc",
        name: "Complete blood count with platelet count",
        rationale:
          "Fixture rationale. A falling platelet count would change immediate management and follow-up interval.",
        clinicalQuestion: "Is there thrombocytopenia or leucopenia?",
        priority: "URGENT",
        relatedConsiderationId: "fx-con-arbo",
        relatedConsideration: "Arboviral illness (community contact reported)",
        source: "CLINICAL_INTELLIGENCE",
      },
      {
        id: "fx-inv-tsh",
        name: "Thyroid function tests",
        rationale:
          "Fixture rationale. Fatigue on established replacement therapy may reflect inadequate dosing.",
        clinicalQuestion: "Is the current levothyroxine dose adequate?",
        priority: "ROUTINE",
        relatedConsiderationId: "fx-con-thyroid",
        relatedConsideration: "Inadequately replaced hypothyroidism contributing to fatigue",
        source: "CLINICAL_INTELLIGENCE",
      },
      {
        id: "fx-inv-ns1",
        name: "Dengue NS1 antigen and IgM",
        rationale: "Fixture rationale. Confirms or excludes the reported community contact as a cause.",
        clinicalQuestion: "Is this an acute dengue infection?",
        priority: "IMPORTANT",
        relatedConsiderationId: "fx-con-arbo",
        relatedConsideration: "Arboviral illness (community contact reported)",
        source: "CLINICAL_INTELLIGENCE",
      },
    ],
    missingInformation: [
      {
        id: "fx-mi-2",
        label: "Bleeding symptoms not established",
        whyItMatters: "Mucosal bleeding would raise the urgency of a platelet count.",
        suggestedQuestion: "Have you noticed bleeding gums, nosebleeds or bruising?",
        relatedConsiderationId: "fx-con-arbo",
      },
    ],
    safetyAlerts: [
      {
        id: "fx-safety-1",
        kind: "RED_FLAG",
        severity: "WARNING",
        label: "Fever beyond five days without a localising source",
        finding: "Day 6 of fever; no respiratory, urinary or gastrointestinal focus identified.",
        rationale:
          "Fixture rationale. Prolonged undifferentiated fever warrants a documented examination and a baseline blood count.",
        suggestedAction: "Consider examination for rash and organomegaly, and a baseline platelet count.",
      },
      {
        id: "fx-safety-2",
        kind: "CONTRAINDICATION",
        severity: "CRITICAL",
        label: "Recorded allergy to sulfonamides",
        finding: "Severe urticarial reaction documented in the patient record.",
        rationale:
          "Fixture rationale. Sulfonamide-containing agents should be avoided when selecting therapy for this patient.",
        suggestedAction: "Avoid sulfonamide-containing antimicrobials.",
        relatedMedications: ["Sulfonamides"],
      },
      {
        id: "fx-safety-3",
        kind: "DRUG_INTERACTION",
        severity: "ADVISORY",
        label: "NSAID use alongside a suspected arboviral illness",
        finding: "Patient reports self-medicating with over-the-counter analgesia.",
        rationale:
          "Fixture rationale. Confirm which analgesic is being taken before advising on further pain relief.",
        suggestedAction: "Establish exactly which over-the-counter medicines have been taken.",
        relatedMedications: ["Over-the-counter analgesia"],
      },
    ],
    suggestedQuestions: [
      {
        id: "fx-sq-1",
        question: "Have you noticed bleeding gums, nosebleeds or unusual bruising?",
        rationale: "Fixture rationale. Establishes whether mucosal bleeding is present.",
        relatedConsiderationId: "fx-con-arbo",
      },
      {
        id: "fx-sq-2",
        question: "Which over-the-counter medicines have you taken in the last week?",
        rationale: "Fixture rationale. Clarifies exposure before advising further analgesia.",
      },
    ],
    evidence: [
      {
        id: "fx-ce-1",
        title: "Fixture reference — undifferentiated fever assessment",
        source: "Synthetic fixture source",
        citation: "Placeholder citation. No real publication is referenced.",
        relatedConsiderationId: "fx-con-febrile",
      },
    ],
  },
];

/** Total scripted duration, used to decide when a session has run its course. */
export const SCRIPT_DURATION_MS = 27_000;
