# Enervara Doctor

Doctor-facing clinical dashboard and consultation workspace for Enervara. This
repository contains **both** the Next.js frontend and the Express API that serves it.

**Phase 1** delivers the doctor entry workflow:

```
Login → Dashboard → Appointments → Patient access → Patient confirmation
```

**Phase 2** delivers the Doctor Operating System — a persistent clinical command centre
that the doctor works inside for the whole visit:

```
Patient confirmation → Brief → Live consultation → Assessment → Investigations
                     → Diagnosis → Treatment → Follow-up → Review
```

**Phase 3** turns the middle of that workflow into a **live clinical consultation
platform**, and closes the loop with finalization, immutable records and audit:

```
Brief → Live session ─┬─ speaker-labelled transcript
                      ├─ extracted clinical context
                      ├─ continuously-updating clinical intelligence
                      ├─ clinical safety alerts
                      └─ clinical timeline
      → Doctor decisions → Review → Finalization guard → Immutable record
                                                       → Audit trail
                                                       → Patient communication payload
```

The pre-consultation brief is unchanged. Everything after it is driven by a live
session that the doctor starts, pauses and ends.

**Phase 4** puts the flow up to the pre-consultation brief on the real database. Doctors,
patients, appointments, access codes, health profiles, labs, prescriptions and
consultations are read from the patient platform's PostgreSQL schema
(`prod_app/app/backend`) through its `/api/doctor` API. This service holds no clinical
database of its own:

```
Doctor UI → Doctor API → (bearer token forwarded) → Patient platform API → PostgreSQL
```

Transcription and AI are still explicitly **not** part of any phase — the live session is
served by a deterministic, clearly-labelled fixture adapter behind a provider boundary.
Everything after the brief (live session, assessment, diagnosis, treatment, follow-up,
finalization) is still process-local. See [Limitations](#limitations).

---

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` starts both processes together:

| Process | URL                     | Command                           |
| ------- | ----------------------- | --------------------------------- |
| Web     | <http://localhost:3000> | `npm run dev:web` (Next.js)       |
| API     | <http://localhost:4000> | `npm run dev:api` (Express + tsx) |

The browser only ever calls a same-origin `/api/*`; Next.js proxies it to the Express
service via a rewrite in `next.config.ts`. There is no CORS configuration to manage in
development, and the API can move behind a gateway later without touching client code.

### Demo credentials

Created by the seed script below, not by a fixture file:

| Field    | Value                      |
| -------- | -------------------------- |
| Email    | `doctor@demo.enervara.dev` |
| Password | `password123`              |

The account is a `users` row with `role = 'doctor'` in the patient platform's database,
plus a `doctors` profile. Authentication is delegated there; no password reaches this
service beyond the single call that forwards it.

### Seeding the demo dataset

Run from the **patient backend** (`prod_app/app/backend`), against a database you are
willing to write demo patients into:

```bash
npm run migrate                        # applies 0011_doctor_consultations.sql
npm run seed:doctor-demo -- --yes      # 1 doctor, 11 patients, 15 appointments
npm run seed:doctor-demo -- --yes --clean   # remove it again
```

Every seeded account uses the `@demo.enervara.dev` domain, which exists only for this
purpose: the script deletes those accounts before re-seeding, `on delete cascade` removes
everything hanging off them, and nothing outside that domain is ever touched. The script
prints its target host and refuses to run without `--yes`.

### Test data for the access flows

Access codes are issued by the patient and valid for **24 hours**. Expiry is evaluated in
SQL against the database clock, so no container's clock can lengthen or shorten it.

| Input       | Result                                                          |
| ----------- | --------------------------------------------------------------- |
| `ENV-48291` | Ananya Sharma, **Authorized**                                   |
| `ENV-73104` | Rajesh Menon, **Authorized**                                    |
| `ENV-90055` | Lakshmi Narayanan, **Authorized**                               |
| `ENV-11902` | Kabir Sethi, **Pending approval** (Continue is blocked)         |
| anything else | `ACCESS_CODE_INVALID`                                         |

Codes are case-insensitive. An unknown, revoked or expired code returns the same "not
recognised" — telling them apart would confirm which codes had once been real.

**Sharing links are not implemented.** The platform issues access codes; `/patients/access/link`
returns a clear refusal rather than accepting a token nothing can mint.

### Test data for the consultation workflow

Six of today's appointments carry patient-reported intake, so opening them starts a
consultation with a real complaint, HPI, symptom list and timeline:

| Appointment                                | Patient           | Seeded case                                    |
| ------------------------------------------ | ----------------- | ---------------------------------------------- |
| 10:30 — General Consultation (**Ready**)   | Ananya Sharma     | Persistent fever and fatigue, 5-point timeline |
| 11:15 — Follow-up (**In progress**)        | Rajesh Menon      | Glycaemic control, ankle swelling              |
| 12:00 — Report Review (**Ready**)          | Lakshmi Narayanan | Renal panel and Holter review                  |
| 14:00 — Preventive Health Check            | Samuel Rodrigues  | Annual check, snoring and raised transaminases |
| 15:30 — Urgent Consultation                | Fatima Qureshi    | Increasing migraine frequency                  |
| 16:15 — Medication Review                  | Priya Ravindran   | PCOS management, cycle diary                   |

Times are wall-clock and the day is rebased on every seed run, so the board always reads
like a real clinic.

Six patients carry a full record — allergies, conditions, medications, surgeries,
hospitalisations, lifestyle, labs and prescriptions. Four are deliberately thin: a brief
has to be honest when a patient has recorded almost nothing, and that path is only
exercised if such a patient exists. `ENV-20418` (Arjun Pillai) has positively confirmed
**no known allergies and no known conditions**, which the brief states as an answer
rather than rendering as a gap.

Opening the same patient and appointment again **resumes** the existing consultation
rather than creating a duplicate. Once finalized, opening them starts a fresh record.

### Test data for records and audit

Two finalized records are seeded so the archive is not empty before you finalize
anything:

| Record | Patient | Consultation | Assessment |
| ------ | ------- | ------------ | ---------- |
| `C-1018` | Devika Anand | Chronic Care Review | Chronic obstructive pulmonary disease, stable |
| `C-1021` | Rajesh Menon | Follow-up | Fluid retention on a background of diabetic nephropathy |

Each carries its own audit history (10 and 11 events). Their patient-facing payloads are
projected on demand, so the boundary can be inspected without finalizing anything.

### Running a live consultation

Open the 10:30 appointment for **Ananya Sharma**, continue past the brief, and press
**Start consultation** on the live step. No transcription or intelligence service
exists, so the session is served by the deterministic mock adapter in
`backend/src/live/mock-adapter.ts`, which replays a scripted febrile-illness
consultation:

| Emission | What arrives |
| -------- | ------------ |
| 12 utterances | Doctor, patient and attender turns; partials settle into finals |
| 6 fact batches | Symptoms, duration, severity, vitals, negatives, allergies — each linked to the utterance it came from |
| 3 publications | Clinical intelligence v1 → v2 → v3, each superseding the last |

The whole script runs in about 27 seconds of wall clock. `LIVE_TICK_SCALE` compresses
or stretches it (`LIVE_TICK_SCALE=0.25` runs it in ~7 s; tests use this).

Everything the adapter produces is marked `provenance: "FIXTURE"` and renders behind a
permanent *"Test fixture — not clinical output"* banner. Nothing synthetic is ever
presented as real clinical output. See
[Clinical Intelligence Platform readiness](#clinical-intelligence-platform-readiness).

### Other commands

```bash
npm run typecheck     # tsc --noEmit for web (with route typegen) and API
npm run lint          # eslint
npm run build         # API build + Next production build
npm start             # run both from their production builds
```

---

## Project structure

```
app/                        Next.js App Router
├─ (auth)/login/            Public route, wrapped in GuestGuard
├─ (doctor)/                Dashboard shell: AuthGuard + AppShell (sidebar + topbar)
│  ├─ dashboard/  appointments/  patients/  consultations/  records/
├─ (consultation)/          Full-viewport workspace: AuthGuard, no dashboard chrome
│  └─ consultations/[consultationId]/
│     ├─ brief/ live/ assessment/ investigations/
│     └─ diagnosis/ treatment/ follow-up/ summary/
├─ layout.tsx  providers.tsx  globals.css (design tokens)

components/
├─ ui/            Primitives: Button, Input, Textarea, Select, Card, Badge, Alert,
│                 Disclosure, StringListEditor, EmptyState, ErrorState…
├─ layout/        AppShell, Sidebar, Topbar, MobileNav, AuthGuard, GuestGuard
├─ auth/          LoginForm
├─ dashboard/     GreetingHeader, StatCard, DashboardStats, DashboardView
├─ appointments/  AppointmentCard, AppointmentSection, AppointmentsView
├─ patients/      Access method cards, code/link forms, PatientConfirmation
├─ consultation/  ConsultationWorkspace (the command centre shell)
│  ├─ ConsultationHeader, AllergyBanner, StepNav, StepProgress, StepFooter
│  ├─ context/       PatientContextPanel
│  ├─ live/          LiveSessionBar, TranscriptPanel, ClinicalContextPanel,
│  │                 ClinicalTimelinePanel
│  ├─ intelligence/  ClinicalIntelligencePanel, ClinicalConsiderationCard,
│  │                 SafetyAlertCard, InvestigationRecommendationCard,
│  │                 MissingInformationCard, DecisionControls, EvidenceList
│  └─ steps/         The eight step screens, editors and the review checklist
└─ records/       RecordsIndex, RecordDetail, RecordDocument,
                  AuditTimeline, PatientCommunicationPreview

features/         Per-domain API clients and hooks (the only callers of lib/api)
│                 auth · appointments · patients · patient-access
│                 consultations · clinical-intelligence · records
│                 live-consultation (transport, session API, update fan-out)
stores/           Zustand: auth, appointment, patient, ui, consultation,
│                 patient-context, clinical-intelligence, record, audit,
│                 patient-communication, live-session, transcript,
│                 clinical-context, consultation-event, doctor-decision
lib/
├─ api/           fetch client, endpoint map, failure normalisation
├─ constants/     Navigation, consultation steps, status → label/tone maps
├─ hooks/         useAsyncResource, useIsHydrated
└─ utils/         cn, date, formatting and id helpers
types/            Domain contract shared verbatim by frontend and backend
data/             Mock JSON fixtures (the future database)

backend/src/
├─ routes/        Express routers
├─ controllers/   Request/response translation only
├─ services/      Business rules, state machine, finalization transaction,
│                 validation, audit writes, latency simulation
├─ repositories/  The seam a real database will replace
├─ live/          The Clinical Intelligence Platform boundary:
│                 provider.ts (contract), mock-adapter.ts (fixture provider),
│                 session-script.ts (the deterministic script),
│                 session-engine.ts (session ownership, persistence, fan-out)
├─ mock/          The two remaining fixtures (finalized records, audit events)
├─ middleware/    Auth, error handler, 404, request logging
├─ lib/           ApiError, response/param helpers, step order, id generation
└─ app.ts server.ts

scripts/
└─ start-production.mjs   Single-container launcher (see Deploying)
```

### Layering

```
Component → features/*.api.ts → lib/api/client → (Next rewrite) → Express
          → routes → controllers → services → repositories → data/*.json
```

No component imports mock JSON, calls the HTTP client directly, or contains business
rules.

### Repository isolation

Every repository is an `async` module exposing intent-shaped methods —
`findById`, `create`, `save`, `append`, `listByDoctorId` — and nothing above it knows
where the data lives. No JSON-specific assumption escapes the repository layer: services
never read a file, never index an array by position, and never rely on load order.

| Repository | Backed by | Notes |
| ---------- | --------- | ----- |
| `doctor.repository` | **Patient platform API** | Login and session; no credential handling here |
| `appointment.repository` | **Patient platform API** | Board arrives bucketed, from the server's clock |
| `patient.repository`, `patient-context.repository` | **Patient platform API** | One brief read per request, memoised |
| `patient-access.repository` | **Patient platform API** | 24-hour codes and grants, in PostgreSQL |
| `consultation.repository` | **Patient platform API** + in-memory overlay | Identity, authorization and intake are durable; later-step doctor edits are still process-local |
| `consultation-record.repository` | In-memory map, JSON seed | Write-once; no update path exists |
| `audit.repository` | In-memory array, JSON seed | Append-only; no update or delete |
| `patient-communication.repository` | In-memory map | Payload generated at finalization |
| `access-grant.repository` | In-memory map | Keeps authorization server-authoritative |
| `live-session.repository` | In-memory map | One session per consultation |
| `transcript.repository` | In-memory map, keyed by utterance id | Partials settle in place; ordering is by `sequence`, never by insertion |
| `clinical-context.repository` | In-memory map | Extracted facts and a monotonic version |
| `clinical-intelligence.repository` | In-memory map | Retains **every** published version, so nothing is overwritten |
| `consultation-event.repository` | In-memory array | Append-only clinical timeline |
| `doctor-decision.repository` | In-memory array | Append-only; a decision is never edited |
| `patient`, `patient-context`, `appointment`, `doctor`, `case-intake` | JSON fixtures | Read-only |

Swapping in PostgreSQL means rewriting `backend/src/repositories/*` and nothing else:

```
Service → JSON repository        Service → PostgreSQL repository
```

Services, controllers, the API contract and the entire frontend are unaffected.

---

## The consultation workspace

The workspace is a persistent command centre rather than a sequence of forms.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Dashboard │ Ananya Sharma ● Live │ #C-1024 │ Saved · Save draft    │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠ Allergy: Sulfonamides (widespread urticarial rash)                 │
├───────────┬────────────────────────────────────┬─────────────────────┤
│ ✓ Brief   │                                    │ Demographics        │
│ ● Live    │        Current step content        │ Allergies           │
│ ○ Assess  │                                    │ Medications         │
│ ○ …       ├────────────────────────────────────┤ History             │
│           │  Clinical intelligence (advisory)  │ Previous visits     │
│           ├────────────────────────────────────┤                     │
│           │  ← Previous      Save & continue → │                     │
└───────────┴────────────────────────────────────┴─────────────────────┘
```

The **live step** replaces that middle column with the session workspace:

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⏺ Live · 02:14 · streaming     [ Pause ]  [ End consultation ]       │
├─────────────────────────────┬────────────────────────────────────────┤
│ Transcript                  │ Clinical intelligence          v3      │
│  Dr Mehta  How long…        │  ⚠ Safety — Sulfonamide allergy        │
│  Ananya    Six days now…    │  Clinical considerations               │
│  Attender  She also…        │    ▸ supporting / contradicting        │
│  ▍(partial)                 │    [ Accept for consideration ]        │
│                             │    [ Reject ]  [ Acknowledge ]         │
├─────────────────────────────┼────────────────────────────────────────┤
│ Clinical context            │ Clinical timeline                      │
│  Symptom · Fever 38.9 °C    │  10:31 Session started      SYSTEM     │
│  Duration · 6 days          │  10:33 Intelligence v2      PLATFORM   │
│  Allergy · Sulfonamides     │  10:34 Decision recorded    DOCTOR     │
└─────────────────────────────┴────────────────────────────────────────┘
```

- **Session bar** — state (`IDLE`/`LIVE`/`PAUSED`/`ENDED`), connection state, elapsed
  time, transport in use, and the start/pause/end controls. Starting, pausing and
  ending a session moves the consultation lifecycle server-side; the header status is
  refreshed from the server rather than guessed at.
- **Transcript** — speaker-labelled turns in `sequence` order. Partial utterances are
  visibly provisional and settle into finals in place; ids are stable, so a partial is
  never appended twice.
- **Clinical context** — the extracted clinical picture, grouped clinically rather than
  by arrival order. Every fact keeps `sourceUtteranceId`, so a claim traces back to what
  was actually said.
- **Clinical intelligence** — safety alerts, clinical considerations, investigation
  recommendations and missing information, republished as the conversation develops.
  Superseded versions are retained, never overwritten.
- **Clinical timeline** — an append-only record of what happened and who caused it:
  `SYSTEM`, `CLINICAL_INTELLIGENCE` or `DOCTOR`.

- **Header** — patient identity, patient id, consultation reference, type, status,
  save state and an exit action. Present on every step.
- **Allergy banner** — critical and severe allergies, pinned under the header at
  every breakpoint. Never collapsed behind a drawer.
- **Step rail** — completed / current / available / locked. Everything already
  reached stays open for review and editing; nothing beyond the furthest point can be
  skipped to.
- **Clinical intelligence** — advisory context only, scoped to the sections relevant
  to the current step.
- **Patient context** — everything known before the visit.

### Save model

Each step publishes how to persist its own pending edits (`useStepSaver`), so
**Save draft** in the header and **Save & continue** in the footer both flush the
active step without the shell knowing anything about its form. The header reports
`No changes` · `Unsaved changes` · `Saving…` · `Saved just now` · `Save failed`.

### Consultation state machine

The lifecycle now describes a live clinical encounter rather than a form's save state.
It lives in `backend/src/lib/consultation-status.ts`, which owns the whole table.

```
NOT_STARTED ──▶ READY ──▶ LIVE ◀──▶ PAUSED ──▶ REVIEW ──▶ FINALIZING ──▶ FINALIZED
                            ▲                     │
                            └─────────────────────┘  (resumed from review)
```

| From | May move to |
| ---- | ----------- |
| `NOT_STARTED` | `NOT_STARTED`, `READY` |
| `READY` | `READY`, `LIVE`, `REVIEW` |
| `LIVE` | `LIVE`, `PAUSED`, `REVIEW` |
| `PAUSED` | `PAUSED`, `LIVE`, `REVIEW` |
| `REVIEW` | `REVIEW`, `LIVE`, `PAUSED`, `FINALIZING` |
| `FINALIZING` | `FINALIZING`, `REVIEW`, `FINALIZED` |
| `FINALIZED` | nothing — terminal |

Transitions are validated server-side; an invalid one returns
`409 INVALID_STATE_TRANSITION`. Three behaviours matter:

- **The session drives the lifecycle.** `live/start`, `live/pause` and `live/stop` move
  the consultation, so the recorded status always matches what actually happened in the
  room. `FINALIZING` exists so a failed finalization cannot strand a record.
- **Correcting a section during review does not undo the review.** Content stays
  editable until finalization, and a correction is simply saved. Review covers the
  record as it stands, which is re-read at finalization anyway.
- **`FINALIZED` is terminal.** Every mutating endpoint runs through a guard that returns
  `409 CONSULTATION_FINALIZED`, and the UI removes its editing controls entirely rather
  than disabling them. Amendment is modelled (see [Record model](#record-model)) but the
  workflow is not built, so no misleading Edit action is offered.

### Finalization

Finalization is a controlled service operation, not a controller-level update:

```
POST /api/consultations/:id/finalize
  → authenticate doctor
  → validate consultation state
  → validate required data (the finalization guard)
  → snapshot an immutable ConsultationRecord
  → generate the patient communication payload
  → mark the consultation FINALIZED and link its record
  → write RECORD_CREATED and CONSULTATION_FINALIZED audit events
```

The guard is server-authoritative — the review screen renders its issues but never
decides them. It checks that the patient and doctor exist, that the consultation carries
a valid authorization snapshot, that the live consultation has ended and been moved to
review, and that at least one doctor-recorded assessment exists. **Move to review** is
gated on every issue *except* the one it exists to clear, so the doctor is never asked
to satisfy a precondition that only the action itself can satisfy. A consultation can
never be closed on clinical intelligence output alone. Failures return
`422 CONSULTATION_NOT_READY` with a structured `issues` array.

The operation is **idempotent**: a repeat call returns the existing record with
`alreadyFinalized: true`, and creates neither a second record nor duplicate audit events.

### Record model

```ts
interface ConsultationRecord {
  id, consultationId, reference
  patientId, patientName, doctorId, doctorName
  authorization: AuthorizationSnapshot | null   // how access was granted
  consultationType, consultationDateTime, finalizedAt

  patientContext: PatientContextSnapshot        // copied, not referenced
  consultationContext: ConsultationContextSnapshot
  clinicalFindings: ClinicalFinding[]

  transcript: TranscriptUtterance[]                       // what was said
  clinicalIntelligence: ClinicalIntelligenceSnapshot|null // what was shown, and its status
  doctorDecisions: DoctorDecision[]                       // what the doctor did with it

  finalAssessment: DoctorAssessment             // what the doctor decided
  investigations, medications, treatmentPlan, followUpPlan, additionalNotes

  status: "DRAFT" | "FINALIZED" | "AMENDED"
  version: number
  amendedFromRecordId: string | null
  supersededByRecordId: string | null
}
```

**Snapshot semantics.** The record copies the patient context, case narrative,
transcript, the clinical intelligence payload *as it stood* and every doctor decision at
finalization, rather than pointing at mutable state. It stays historically meaningful
after the patient's live context changes, and it answers "what did the doctor actually
see when they decided this?" — including whether the intelligence was `STALE` or absent
altogether. Records are written once and never mutated.

**Amendment architecture.** Version fields and repository contracts exist so a correction
can create version *n+1* pointing back at the record it supersedes, leaving the original
untouched. The amendment workflow itself is not implemented, and the UI does not pretend
otherwise.

### Audit model

```ts
interface AuditEvent {
  id, entityType, entityId, consultationId, action
  actorType: "DOCTOR" | "SYSTEM" | "CLINICAL_INTELLIGENCE"
  actorId, actorName, timestamp
  summary: string          // plain-language line, composed where the change happens
  previousValue?, newValue?, metadata?
}
```

Events are appended by the service layer at the moment a change is applied — never by a
controller and never from a client claim. The log is append-only: there is no update or
delete path. Tracked actions cover the whole workflow, from `CONSULTATION_CREATED`
through `LIVE_SESSION_STARTED`, `DOCTOR_DECISION_RECORDED`, `DIAGNOSIS_SELECTED`, the
investigation and medication lifecycles, `LIVE_SESSION_ENDED`,
`CONSULTATION_READY_FOR_REVIEW`, `RECORD_CREATED` and `CONSULTATION_FINALIZED`.

Audit writes never fail a clinical operation: a failure is logged and swallowed rather
than losing the doctor's work.

#### Two trails, deliberately

| | `ConsultationEvent` | `AuditEvent` |
| --- | --- | --- |
| Question | What happened during this consultation? | Who changed this record, and from what? |
| Audience | The doctor, live, in the timeline panel | Governance and review, after the fact |
| Actors | `SYSTEM`, `CLINICAL_INTELLIGENCE`, `DOCTOR` | `SYSTEM`, `CLINICAL_INTELLIGENCE`, `DOCTOR` |
| Carries | A readable line and its subject | `previousValue` / `newValue` |

A doctor decision writes to **both**: the timeline records that the doctor dispositioned
something, and the audit trail records the disposition it replaced.

### Patient communication boundary

```
ConsultationRecord                    PatientCommunicationPayload
(internal clinical/legal record)  ──▶ (doctor-approved projection)
```

The payload is built by **whitelisting fields one by one** in
`patient-communication.service.ts` — the record is never serialised and filtered
afterwards, because that approach leaks whatever is added later.

| Crosses into the patient app | Never crosses |
| ---------------------------- | ------------- |
| Doctor-approved assessment (condition, certainty, additional conditions) | Clinical intelligence output of any kind: considerations, safety alerts, reasoning |
| Investigations: name, purpose, patient instructions, urgency | The clinical question behind a test |
| Medications: name, dosage, frequency, duration, route, instructions | Doctor decisions and their dispositions |
| Treatment advice and non-pharmacological measures | Consultation notes and assessment reasoning |
| Follow-up: date, interval, reason, what to bring, what to monitor, when to seek help | Clinical findings, examination detail and the raw transcript |
| Reminders derived from the doctor's own dates | Patient context snapshot, allergies, history |
|  | Authorization snapshots and audit metadata |
|  | The medication-review note (written for the next clinician) |

The API contract suite asserts each exclusion against the serialised payload, so a field
added to the record cannot silently reach the patient.

Opening the preview transmits nothing. There is no patient-application integration in
any phase of this build.

---

## Clinical Intelligence Platform readiness

The Clinical Intelligence Platform is **not** implemented, and the Doctor app contains
no model, provider SDK, credential or audio protocol. What exists is the boundary it
will plug into, and a deterministic fixture provider behind that boundary so every
surface can be built and verified today.

### The provider boundary

```
Clinical Intelligence Platform (does not exist yet)
        │   transcription · diarisation · extraction · reasoning
        ▼
backend/src/live/provider.ts          ← the contract: open(session) → emissions
        │
        ├─ mock-adapter.ts            ← the only implementation today (FIXTURE)
        │
        ▼
backend/src/live/session-engine.ts    ← persists, publishes, records the timeline
        ▼
GET/POST /api/consultations/:id/live/*     and     /live/stream
        ▼
features/live-consultation/*          ← transport + the single API seam
        ▼
stores/{live-session,transcript,clinical-context,
        clinical-intelligence,consultation-event}
        ▼
components/consultation/{live,intelligence}/*
```

A real platform is connected by writing one more `ClinicalIntelligenceProvider` and
selecting it when `CLINICAL_INTELLIGENCE_URL` is set. Nothing above `session-engine.ts`
changes — not the routes, not the stores, not a single component.

**The frontend never learns how any of this is produced.** It has no dependency on a
provider, a model name, a credential, an internal service URL or a raw audio protocol.
It knows a session state, a transport, and typed domain payloads.

### Transport

The live stream is Server-Sent Events over `fetch` + `ReadableStream` rather than
`EventSource`, because `EventSource` cannot send an `Authorization` header and this API
is token-authenticated.

```
createResilientTransport()
   ├─ createStreamTransport()   SSE: snapshot event, then incremental updates,
   │                            with a server heartbeat (STREAM_HEARTBEAT_MS)
   └─ createPollingTransport()  automatic fallback: cursored GETs, same update shape
```

Both transports emit the same `LiveUpdate` union, so nothing downstream knows which one
is in use. The session bar reports the active transport, and a fallback is visible
rather than silent.

### The contract it must satisfy

`types/clinical-intelligence.ts`. The envelope always states availability explicitly —
there is no "empty means nothing found" ambiguity:

```ts
type ClinicalIntelligenceStatus =
  | "UNAVAILABLE" | "CONNECTING" | "WAITING"
  | "PARTIAL" | "AVAILABLE" | "STALE" | "ERROR";

interface ClinicalIntelligenceEnvelope {
  status: ClinicalIntelligenceStatus;
  intelligence: ClinicalIntelligence | null;
  message: string | null;      // plain language for UNAVAILABLE, ERROR and STALE
  staleSince: string | null;   // set when the payload is older than the transcript
}
```

`ClinicalIntelligence` carries `safetyAlerts`, `clinicalConsiderations`,
`investigationRecommendations`, `missingInformation` and `evidence` — **every one
optional**, so a partial response renders what it has. Each payload is versioned and
timestamped; a new publication supersedes the last without deleting it.

- `ClinicalConsideration` carries `supportingFindings`, `contradictingFindings` and a
  `confidence` — a consideration that argues against itself is shown doing so.
- `ClinicalSafetyAlert` is graded (`RED_FLAG`, `CONTRAINDICATION`, `DRUG_INTERACTION`,
  `RISK_FACTOR`) with an explicit severity.
- `InvestigationRecommendation` states the `clinicalQuestion` it would answer, not just
  a test name.
- Evidence items carry a `sourceRef` — an utterance, a fact or patient context — so a
  doctor can verify a claim rather than take it on trust.
- Once four new final utterances arrive after a publication, the envelope reports
  `STALE` with `staleSince`. The panel says the picture has moved on rather than
  quietly showing an old answer.
- `provenance` marks a payload as `SERVICE` or `FIXTURE`, and fixtures are labelled as
  test data everywhere they appear.

### Terminology

The vocabulary is part of the contract, in code and in the UI. A doctor must never be
able to read a screen as though software made a clinical judgement.

| Used | Never used |
| ---- | ---------- |
| Clinical Intelligence | AI Recommendation, AI Suggestion |
| Clinical Consideration | AI Diagnosis |
| Clinical Safety Alert | AI Doctor, AI Assistant |
| Doctor Decision | *(anything implying the software decided)* |

The browser suite asserts that none of the banned terms appear anywhere in the rendered
workspace.

### Doctor-control boundaries

Platform output and doctor decisions are **separate data domains**. Intelligence lives
in the clinical-intelligence store; decisions live on the consultation.

| The platform may | It may never |
| ---------------- | ------------ |
| Surface clinical considerations | Confirm or record a diagnosis |
| Raise safety alerts | Suppress or resolve a safety concern |
| Recommend investigations against a clinical question | Order an investigation |
| Note missing information | Prescribe |
| Publish a new version as the conversation develops | Set treatment or follow-up, or finalize |

Concretely:

- A doctor dispositions platform output — **Accept for consideration**, **Reject**,
  **Acknowledge**, **Defer** or **Actioned**. There is no "confirm diagnosis"
  affordance anywhere in the workspace.
- A `DoctorDecision` is written to the **consultation**, never into the platform
  payload, and creates **no** assessment. Recording an assessment is a separate,
  explicit action on the Diagnosis step.
- Every decision writes both a `ConsultationEvent` (the clinical timeline, actor
  `DOCTOR`) and an `AuditEvent` (`DOCTOR_DECISION_RECORDED`, carrying the previous
  decision for that subject). Changing your mind is recorded, not overwritten.
- `SelectedInvestigation.selectedBy` is always `DOCTOR`; `Medication.prescribedBy` is
  always `DOCTOR`; `Diagnosis.decidedBy` is always `DOCTOR`.
- The workspace is fully usable with no intelligence at all. Every clinical field is
  manual, and the default state of the panel says so.


---

## Routes

### Frontend

| Route                                          | Purpose                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| `/`                                            | Redirects to `/dashboard`                              |
| `/login`                                       | Sign in; redirects to `/dashboard` when signed in      |
| `/dashboard`                                   | Greeting, day summary, today's + upcoming appointments |
| `/appointments`                                | Full schedule, segmented into today/upcoming/past      |
| `/patients`                                    | Access-method hub                                      |
| `/patients/access/appointment`                 | Pick a patient from the schedule                       |
| `/patients/access/code`                        | Enter a patient access code                            |
| `/patients/access/link`                        | Enter a patient sharing link                           |
| `/patients/[patientId]/confirm`                | Patient confirmation; **Continue** opens a consultation |
| `/consultations`                               | The consultation open in this session                  |
| `/consultations/[id]`                          | Redirects to the first step                            |
| `/consultations/[id]/brief`                    | Step 1 — pre-consultation brief                        |
| `/consultations/[id]/live`                     | Step 2 — live consultation (transcript, context, intelligence, timeline) |
| `/consultations/[id]/assessment`               | Step 3 — clinical assessment                           |
| `/consultations/[id]/investigations`           | Step 4 — investigation mapping                         |
| `/consultations/[id]/diagnosis`                | Step 5 — diagnosis                                     |
| `/consultations/[id]/treatment`                | Step 6 — medication & treatment                        |
| `/consultations/[id]/follow-up`                | Step 7 — follow-up                                     |
| `/consultations/[id]/summary`                  | Step 8 — review, readiness checklist and finalize      |
| `/records`                                     | Archive of finalized records, with search and filters  |
| `/records/[recordId]`                          | Immutable record viewer: record, audit history, patient preview |

### API

All consultation and patient routes require `Authorization: Bearer <token>`.

| Method | Path                                                     | Returns                              |
| ------ | -------------------------------------------------------- | ------------------------------------ |
| GET    | `/api/health`                                            | Service status (public)              |
| POST   | `/api/auth/login`                                        | `AuthSession` (public)               |
| GET    | `/api/auth/me`                                           | `Doctor`                             |
| GET    | `/api/appointments`                                      | `AppointmentBoard`                   |
| GET    | `/api/appointments/:id`                                  | `AppointmentWithPatient`             |
| GET    | `/api/patients/:id`                                      | `Patient`                            |
| GET    | `/api/patients/:id/context`                              | `PatientContext`                     |
| POST   | `/api/patient-access/code/validate`                      | `PatientAccessGrant`                 |
| POST   | `/api/patient-access/link/validate`                      | `PatientAccessGrant`                 |
| POST   | `/api/patient-access/appointment/grant`                  | `PatientAccessGrant`                 |
| POST   | `/api/consultations`                                     | `Consultation` (creates or resumes)  |
| GET    | `/api/consultations/:id`                                 | `Consultation`                       |
| PATCH  | `/api/consultations/:id`                                 | Status, step, treatment plan, notes  |
| PATCH  | `/api/consultations/:id/context`                         | Structured `CurrentCaseContext`      |
| POST   | `/api/consultations/:id/notes`                           | Narrative notes and observations     |
| POST   | `/api/consultations/:id/decisions`                       | Record a `DoctorDecision`            |
| GET    | `/api/consultations/:id/decisions`                       | `DoctorDecision[]`                   |
| POST   | `/api/consultations/:id/diagnosis`                       | Doctor assessment                    |
| POST   | `/api/consultations/:id/investigations`                  | Add investigation                    |
| PATCH  | `/api/consultations/:id/investigations/:investigationId` | Update investigation                 |
| DELETE | `/api/consultations/:id/investigations/:investigationId` | Remove investigation                 |
| POST   | `/api/consultations/:id/medications`                     | Add medication                       |
| PATCH  | `/api/consultations/:id/medications/:medicationId`       | Update medication                    |
| DELETE | `/api/consultations/:id/medications/:medicationId`       | Remove medication                    |
| POST   | `/api/consultations/:id/follow-up`                       | Follow-up plan                       |
| POST   | `/api/consultations/:id/finalize`                        | Close the record                     |
| GET    | `/api/consultations/:id/summary`                         | `ConsultationSummary` + readiness    |
| GET    | `/api/consultations/:id/record`                          | `ConsultationRecord`                 |
| GET    | `/api/consultations/:id/audit`                           | `AuditEvent[]`                       |
| GET    | `/api/consultations/:id/live`                            | `LiveSession`                        |
| POST   | `/api/consultations/:id/live/start`                      | Start the session; consultation → `LIVE` |
| POST   | `/api/consultations/:id/live/pause`                      | Pause; consultation → `PAUSED`       |
| POST   | `/api/consultations/:id/live/resume`                     | Resume; consultation → `LIVE`        |
| POST   | `/api/consultations/:id/live/stop`                       | End the session; consultation → `REVIEW` |
| GET    | `/api/consultations/:id/live/updates`                    | `LiveUpdatesPage` (cursored polling fallback) |
| GET    | `/api/consultations/:id/live/stream`                     | **SSE** — `snapshot`, then `transcript` / `context` / `intelligence` / `events` / `session` |
| GET    | `/api/consultations/:id/transcript`                      | `TranscriptSnapshot` (accepts `?since=`) |
| GET    | `/api/consultations/:id/clinical-context`                | `ClinicalContext`                    |
| GET    | `/api/consultations/:id/events`                          | `ConsultationEventPage`              |
| GET    | `/api/consultations/:id/clinical-intelligence`           | `ClinicalIntelligenceEnvelope`       |
| GET    | `/api/consultations/:id/clinical-intelligence/considerations`  | `ClinicalConsiderationsResponse` |
| GET    | `/api/consultations/:id/clinical-intelligence/investigations`  | `InvestigationRecommendationsResponse` |
| GET    | `/api/consultations/:id/clinical-intelligence/missing-information` | `MissingInformationResponse` |
| GET    | `/api/consultations/:id/clinical-intelligence/safety`          | `ClinicalSafetyResponse`         |
| GET    | `/api/consultations/:id/clinical-intelligence/evidence`        | `EvidenceResponse`               |
| GET    | `/api/records`                                           | `ConsultationRecordSummary[]` (filterable) |
| GET    | `/api/records/:id`                                       | `ConsultationRecord`                 |
| GET    | `/api/records/:id/audit`                                 | `AuditEvent[]`                       |
| GET    | `/api/records/:id/patient-communication`                 | `PatientCommunicationPayload`        |

`POST /api/consultations/:id/finalize` returns `FinalizationResult`
(`{ record, alreadyFinalized }`) — `201` on first finalization, `200` on a repeat.
`GET /api/records` accepts `patientId`, `status`, `consultationType`, `query`, `from`
and `to`.

Every response uses one of two shapes:

```jsonc
{ "success": true, "data": { /* … */ } }

{
  "success": false,
  "error": {
    "code": "CONSULTATION_FINALIZED",
    "message": "This consultation has been finalized and can no longer be edited.",
    "details": { "name": "A medication name is required." } // validation errors only
  }
}
```

---

## Design system

All colour, radius, shadow and type tokens live in one place: the `:root` and `@theme`
blocks at the top of `app/globals.css`. Components reference semantic utilities
(`bg-primary`, `text-text-secondary`, `border-border-default`, `shadow-card`,
`rounded-card`) and never raw hex values.

> **The brand ramp is a placeholder.** When the official Enervara palette arrives,
> replace the ten `--brand-*` values in `:root`. Nothing else needs to change.

Status colour is decided once, in `lib/constants/appointment.ts` and
`lib/constants/consultation.ts`, which map every appointment status, alert severity,
authorization status, consultation status, allergy severity, clinical fact kind,
safety severity and decision outcome to a restrained tone consumed by `<Badge>`.

The app is light-mode only by design — a clinical tool used under consistent lighting.
`color-scheme: light` is set explicitly rather than left to the browser.

### Responsive behaviour

Breakpoints are intentional, not a shrunken desktop.

Dashboard shell:

- **≥ 1024px** — fixed sidebar rail and offset content.
- **< 1024px** — sidebar becomes an off-canvas drawer that traps Escape and locks body scroll.
- **< 640px** — appointment card headers stack so names never truncate; actions go full-width.

Consultation workspace:

- **≥ 1280px** — three columns: step rail, workspace, patient context.
- **1024–1279px** — two columns; patient context moves into a collapsible section
  below the workspace, after the clinical task.
- **< 1024px** — the rail is replaced by a compact "Step *n* of 8" stepper with a
  progress bar that expands into a step selector. Order follows clinical priority:
  identity → allergies → current task → intelligence → context → navigation.

Live consultation step:

- **≥ 1024px** — transcript and clinical intelligence side by side, with clinical
  context and the clinical timeline beneath them. The pre-visit context column is
  dropped here: during a live encounter the conversation outranks the file.
- **< 1024px** — the four panels become tabs, so one full-height panel is readable at a
  time instead of four cramped ones. The session bar and allergy banner stay pinned.

> Panel visibility is applied to a **wrapper**, never to the panel itself. The panels
> set their own `display` to build a flex column, and a `hidden`/`block` utility merged
> into that class list silently wins — which breaks their internal scrolling without
> any visible error. For the same reason, scrolling panels are given a definite height
> (`h-[26rem]`) rather than `max-h`, and are `relative` so absolutely-positioned
> descendants are actually clipped by their `overflow` container.

Verified with no horizontal overflow at 390 px, 820 px, 1024 px and 1440 px.

---

## State management

Feature-scoped Zustand stores, not one global blob:

| Store                                  | Owns                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `stores/auth.store.ts`                 | `doctor`, `token`, `login()`, `logout()`. Persisted to `localStorage`; only the session, never transient UI state.       |
| `stores/appointment.store.ts`          | The appointment board, load status, `selectAppointment()`. De-duplicates concurrent and repeat loads.                    |
| `stores/patient.store.ts`              | The active `PatientAccessGrant` — patient, access method, authorization status — and the three access actions.           |
| `stores/consultation.store.ts`         | The consultation aggregate, load status, save state, and every doctor decision. All writes funnel through one `mutate`.  |
| `stores/patient-context.store.ts`      | Everything known before the visit. The single source consumed by the header, brief, context panel and treatment step.    |
| `stores/live-session.store.ts`         | Session and connection state, transport in use, elapsed time, and the start/pause/resume/stop controls.                   |
| `stores/transcript.store.ts`           | Utterances keyed by id, ordered by `sequence`. A partial settles in place rather than appending a duplicate.              |
| `stores/clinical-context.store.ts`     | Extracted clinical facts and the context version.                                                                        |
| `stores/clinical-intelligence.store.ts`| Status, payload and staleness. Structurally separate from the record — it cannot reach a doctor decision.                 |
| `stores/consultation-event.store.ts`   | The clinical timeline: what happened, when, and which actor caused it.                                                    |
| `stores/doctor-decision.store.ts`      | Decisions the doctor has recorded against platform output. Append-only, mirrored onto the consultation.                   |
| `stores/record.store.ts`               | The records archive, its filters, and the record open in the viewer.                                                     |
| `stores/audit.store.ts`                | Audit events for one consultation or record; tracks which entity is loaded so repeat opens are cheap.                     |
| `stores/patient-communication.store.ts`| The doctor-side preview of the patient payload. Reading it transmits nothing.                                             |
| `stores/ui.store.ts`                   | Mobile navigation drawer state.                                                                                          |

**Access grants and consultations are not persisted to the browser.** Reloading
`/patients/…/confirm` shows a "no active patient access" state rather than restoring
the record: an authorization to view a patient is a session act, not a bookmarkable
URL. A consultation *is* re-fetched by id on reload, because the id is the record.
Signing out resets every feature store so nothing leaks into the next session on a
shared workstation.

> Store selectors must never allocate. Zustand compares by reference, so a selector
> that returns a fresh array or object on every call is an infinite render loop.
> Derived collections are computed in the component with `useMemo` (see
> `selectAllergies` / `filterCriticalAllergies`).

---

## Data states

Every data-driven surface implements loading, empty, error and success:

- **Loading** — shape-matched skeletons, not spinners over blank space.
- **Empty** — `EmptyState`/`StepEmpty` with an explanation and, where useful, a next action.
- **Error** — `ErrorState` with the server's message and a Retry control.
- **Success** — the rendered content.

Clinical intelligence surfaces additionally implement **unavailable**, **connecting**,
**waiting**, **partial**, **stale** and **error**, each with its own explanation. No
panel is ever left blank and unexplained, and a stale payload says so rather than
passing itself off as current.

The API applies a configurable artificial delay (`MOCK_LATENCY_MS`, default 220 ms) so
these states are exercised in normal use. Set it to `0` for tests.

---

## Notes on the mock data

Two fixture files remain. The per-read date rebasing that kept the appointment fixture
spanning past / today / upcoming is **gone**: appointments are rows with a real
`scheduled_at`, and the today / upcoming / past split is computed upstream against the
database clock.

| File                             | Contents                                                     |
| -------------------------------- | ------------------------------------------------------------ |
| `data/consultation-records.json` | Two finalized records with full snapshots                    |
| `data/audit-events.json`         | 21 seeded audit events across those two records              |

Everything else that used to live here — doctors, credentials, patients, appointments,
access codes, sharing links, health profiles and pre-consultation intake — has been
deleted. It is read from the patient platform's PostgreSQL schema, and keeping a second
copy of a patient's record in this process, even as demo data, is exactly the parallel
source of truth this change removed. Demo rows now come from
`prod_app/app/backend` → `npm run seed:doctor-demo`.

These two remain because the finalization workflow itself has not been built against the
database yet; they exist so the archive screens are not empty.

The live session has no JSON fixture. Its script is code —
`backend/src/live/session-script.ts` — because it is a *timeline* of emissions, not a
table of rows: utterances, fact batches and intelligence publications each fire at a
scripted offset. It is marked **TEST FIXTURE — NOT CLINICAL OUTPUT** at the top of the
file, and everything it emits carries `provenance: "FIXTURE"` all the way to the UI.

All patients, doctors and clinical details are fictional.

---

## Limitations

Intentionally **not** implemented:

- **No database *in this service*.** Everything up to the brief is read from the patient platform's PostgreSQL schema over its `/api/doctor` API; this process opens no connection and holds no clinical rows. What is still process-local is the doctor's work on the steps **after** the brief — assessment, diagnoses, investigations, medications, treatment, follow-up and decisions — which lives in an overlay in `consultation.repository` and is **lost on API restart**. The consultation's identity, authorization and patient-reported intake are durable.
- **Authentication is delegated, not absent.** Login forwards to the patient platform, which verifies a bcrypt hash and issues the same signed JWT the patient app uses; this service holds no signing key and stores no credential. Route protection in the browser is still client-side (`AuthGuard`) — it moves to `middleware.ts` when cookie sessions land — but every API call is authorised server-side upstream.
- **No AI and no Clinical Intelligence Platform.** No LLM, model, inference server or reasoning engine. The only provider implementation is `backend/src/live/mock-adapter.ts`, which replays a fixed script. Everything it emits is marked `FIXTURE` and labelled as test data in the UI. Connecting a real platform means writing one more `ClinicalIntelligenceProvider`; nothing above `session-engine.ts` changes.
- **No transcription or diarisation.** No audio is captured, uploaded or processed, and no microphone permission is requested. Speaker labels come from the script.
- **No RAG.** No retrieval layer, embeddings or vector database.
- **No real clinical decision support.** Nothing in this application evaluates a patient, and no clinical content is generated. Every assessment, investigation, prescription and follow-up is authored by the doctor.
- **Authorization is enforced, with gaps.** A doctor may only read a patient behind a live `doctor_access_grants` row, created from a 24-hour patient-issued access code or from the doctor's own appointment, re-resolved from the database on every request and audited on every read. What is **not** built: patient-initiated revocation from the patient app, sharing links, and any consent UI — the `patient_consents` table carries a single `device_location` consent type and does not yet model clinician access.
- **No patient-application integration**, WhatsApp, audio recording or transcription.
- **No amendment workflow.** Versioning, `amendedFromRecordId` and `supersededByRecordId` are modelled and the repository is write-once, but creating an amended version is not implemented. Nothing in the UI suggests otherwise.
- **No cross-session history beyond the brief.** Live sessions, transcripts, extracted context, intelligence versions, timeline events, decisions and finalized records still live in memory and are lost on API restart. Appointments, patients, access grants, consultations and intake survive, because they are rows.
- **No multi-doctor or multi-device session sharing.** A live session is owned by one backend process. There is no broker, no reconnect-and-replay beyond the cursor, and no presence.
- **No automated test suite.** Verified by typecheck, lint, production build, scripted API contract passes (64 + 106 + 92 assertions) and scripted browser passes across four viewports (47 + 81 + 101 + 82 assertions).

## Deploying (Railway)

The repository deploys as **one Railway service**. The platform hands out a single
public port; Next.js takes it and proxies `/api/*` to the Express service over
loopback, so the API is never exposed directly and the live event stream never leaves
the container until it reaches the browser.

```
$PORT ─▶ next start ──(rewrite)──▶ http://127.0.0.1:$API_PORT ─▶ Express
         (0.0.0.0, public)                   (loopback only)
```

`railway.json` already declares the build, start command and health check. Point a
Railway project at the repo and it will:

```
npm ci  →  npm run build  →  npm start  →  health check GET /api/health
```

`npm start` runs `scripts/start-production.mjs`, which spawns both processes, binds
Express to `127.0.0.1:$API_PORT`, refuses to start if `API_PORT` collides with `$PORT`,
forwards `SIGTERM`, and exits if either half dies so Railway restarts a whole container
rather than serving half an app.

> **Express is bound to loopback, not merely to a different port.** A platform proxy
> discovers a service by looking for a listener on a public interface, so a second
> public listener in the same container can win the domain and answer `/` with an API
> 404. Loopback makes that impossible instead of unlikely — and it is why a successful
> `GET /api/health` on the public port proves Next.js owns `$PORT` and the rewrite
> works. If a deployment ever serves `NOT_FOUND` at `/`, check the service's **domain
> target port** and any **custom start command** in the Railway dashboard: a dashboard
> start command overrides `railway.json`, and a target port pinned to `4000` by an
> earlier deploy will keep routing there.

**Variables to set on the service** (all optional — these are the defaults):

| Variable | Set it to | Why |
| -------- | --------- | --- |
| `API_PORT` | leave unset | Internal, loopback only. If you change it, rebuild with a matching `API_ORIGIN` |
| `API_ORIGIN` | leave unset | **Build-time.** Must match `API_PORT`; the default pair already agrees |
| `MOCK_LATENCY_MS` | `0` on a demo | Removes the artificial delay that keeps loading states visible locally |
| `LIVE_TICK_SCALE` | `1`, or `0.5` for a faster demo | Speed of the scripted live session |
| `CORS_ORIGIN` | leave unset | Nothing reaches Express cross-origin in this topology |

`PORT` is supplied by Railway — do not set it yourself.

### Before you point anyone at the URL

This build is a demonstration, not a clinical system. A deployment is only appropriate
behind a private URL or an access-controlled environment:

- **The demo account is public knowledge.** `doctor@demo.enervara.dev` / `password123`
  is in this README and in the seed script. Delete it (`npm run seed:doctor-demo -- --yes
  --clean`) before pointing anyone at an environment that also holds real accounts.
- **All state is in memory.** Every consultation, live session, transcript, decision and
  finalized record is lost on redeploy, restart or Railway sleeping the container. Only
  the two seeded records survive. Nothing is persisted, so nothing is recoverable.
- **Never enter real patient information.** There is no database, no encryption at rest,
  no access control and no retention policy. Everything in the app is fictional test
  data and must stay that way.

### Deploying as two services instead

If you split the API onto its own Railway service, it must listen on Railway's `$PORT`
(the launcher is not used in that topology — start it with `npm run start:api`, which
binds `0.0.0.0` because `API_HOST` is unset), and the
web service must be **built** with `API_ORIGIN` pointing at the API's private URL. That
value is baked into the route manifest at build time, so changing it later requires a
rebuild, not a restart.

---

## Configuration

| Variable                   | Default                 | Used by | Purpose                                                        |
| -------------------------- | ----------------------- | ------- | -------------------------------------------------------------- |
| `API_ORIGIN`               | `http://localhost:4000` | Web     | Rewrite target for `/api/*`                                    |
| `PORT`                     | `3000` web / `4000` API | Both    | Web listen port. In a single-container deploy the launcher gives this to Next and forces the API onto `API_PORT` |
| `API_PORT`                 | `4000`                  | API     | Internal API port in a single-container deploy                 |
| `API_HOST`                 | `0.0.0.0`               | API     | Interface Express binds. The launcher sets `127.0.0.1` so the API is never publicly routable |
| `CORS_ORIGIN`              | `*`                     | API     | Allowed origins for direct API access                          |
| `MOCK_LATENCY_MS`          | `220`                   | API     | Simulated latency on the remaining fixture reads                |
| `PATIENT_API_URL`          | `http://localhost:5000` | API     | Patient platform base URL — the system of record. `DATABASE_URL` belongs there, not here |
| `PATIENT_API_TIMEOUT_MS`   | `10000`                 | API     | Upstream request timeout                                        |
| `CLINICAL_INTELLIGENCE_URL`| *(unset)*               | API     | Base URL of the Clinical Intelligence Platform. Unset → the fixture adapter, reported as fixture-backed |
| `LIVE_TICK_SCALE`          | `1`                     | API     | Speeds up or slows the scripted session. `0.25` runs it in ~7 s |
| `STREAM_HEARTBEAT_MS`      | `15000`                 | API     | SSE heartbeat interval                                         |

> **`API_ORIGIN` is read at build time**, not at runtime — Next.js bakes the rewrite
> into `.next/routes-manifest.json`. Changing it means rebuilding the web app, not just
> restarting it.

See `.env.example` and `backend/.env.example`.
