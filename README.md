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
Patient confirmation → Brief → Consultation → Assessment → Investigations
                     → Diagnosis → Treatment → Follow-up → Summary → Finalize
```

Records/finalisation (Phase 3), real authentication, a database and AI are explicitly
**not** part of these phases. See [Limitations](#limitations).

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

| Field    | Value                 |
| -------- | --------------------- |
| Email    | `doctor@enervara.com` |
| Password | `password123`         |

### Test data for the access flows

| Input                                         | Result                                                              |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `ENV-48291`                                   | Valid code → Ananya Sharma, **Authorized**                          |
| `ENV-73104`                                   | Valid code → Lakshmi Narayanan, **Authorized**                      |
| `ENV-90055`                                   | Valid code → Kabir Sethi, **Pending approval** (Continue is blocked) |
| anything else                                 | `ACCESS_CODE_INVALID` error state                                   |
| `https://enervara.health/share/SHR-VALID-7F3A`| Valid link → Samuel Rodrigues                                       |
| `SHR-EXPIRED-2B9C`                            | **Expired** link state                                              |
| `SHR-REVOKED-5D1E`                            | **Revoked** link state                                              |
| anything else                                 | **Invalid** link state                                              |

Codes and link tokens are case-insensitive, and a sharing link may be pasted in full or
as the bare token.

### Test data for the consultation workflow

Six of today's and this week's appointments carry patient-reported intake, so opening
them starts a consultation with a real complaint, HPI, symptom list and timeline:

| Appointment                                    | Patient            | Seeded case                                     |
| ---------------------------------------------- | ------------------ | ----------------------------------------------- |
| 10:30 — General Consultation (**Ready**)       | Ananya Sharma      | Persistent fever and fatigue, 5-point timeline  |
| 11:00 — Report Review (**Ready**)              | Lakshmi Narayanan  | Renal panel and Holter review                   |
| 10:00 — Follow-up (**In progress**)            | Rajesh Menon       | Glycaemic control, ankle swelling               |
| 14:00 — Pre-operative Assessment               | Samuel Rodrigues   | Fitness before elective cholecystectomy         |
| 11:45 — Teleconsultation                       | Fatima Qureshi     | Increasing migraine frequency                   |
| 16:00 — Follow-up                              | Priya Ravindran    | PCOS management, cycle diary                    |

Six patients also have full clinical context (allergies, medical history, current
medications, previous consultations) in `data/patient-contexts.json`. Any other patient
still opens correctly — the service builds a demographics-only context.

Opening the same patient and appointment again **resumes** the existing consultation
rather than creating a duplicate. Once finalized, opening them starts a fresh record.

### Previewing clinical intelligence states

No intelligence service exists, so the panel is `UNAVAILABLE` by default. The
**Preview intelligence state** selector in the panel header requests explicitly
synthetic fixtures so every UI state can be inspected: waiting, available, partial and
error. Fixture payloads render behind a permanent *"Test fixture — not clinical output"*
banner and contain only placeholder labels (`Sample differential A`), never clinical
content. See [AI readiness](#ai-readiness).

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
│     ├─ brief/ consultation/ assessment/ investigations/
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
└─ consultation/  ConsultationWorkspace (the command centre shell)
   ├─ ConsultationHeader, AllergyBanner, StepNav, StepProgress, StepFooter
   ├─ context/       PatientContextPanel
   ├─ intelligence/  ClinicalIntelligencePanel + the AI card contract
   └─ steps/         The eight step screens and their sub-editors

features/         Per-domain API clients and hooks (the only callers of lib/api)
│                 auth · appointments · patients · patient-access
│                 consultations · clinical-intelligence
stores/           Zustand: auth, appointment, patient, ui,
│                 consultation, patient-context, clinical-intelligence
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
├─ services/      Business rules, state machine, validation, latency simulation
├─ repositories/  The seam a real database will replace
├─ mock/          Fixture loading and date rebasing
├─ middleware/    Auth, error handler, 404, request logging
├─ lib/           ApiError, response/param helpers, step order, id generation
└─ app.ts server.ts
```

### Layering

```
Component → features/*.api.ts → lib/api/client → (Next rewrite) → Express
          → routes → controllers → services → repositories → data/*.json
```

No component imports mock JSON, calls the HTTP client directly, or contains business
rules. Replacing `data/*.json` with PostgreSQL means rewriting only
`backend/src/repositories/*` — services, controllers, the API contract and the entire
frontend are unaffected.

---

## The consultation workspace

The workspace is a persistent command centre rather than a sequence of forms.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Dashboard │ Ananya Sharma ● Active │ #C-1024 │ Saved · Save draft  │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠ Allergy: Sulfonamides (widespread urticarial rash)                 │
├───────────┬────────────────────────────────────┬─────────────────────┤
│ ✓ Brief   │                                    │ Demographics        │
│ ● Consult │        Current step content        │ Allergies           │
│ ○ Assess  │                                    │ Medications         │
│ ○ …       ├────────────────────────────────────┤ History             │
│           │  Clinical intelligence (advisory)  │ Previous visits     │
│           ├────────────────────────────────────┤                     │
│           │  ← Previous      Save & continue → │                     │
└───────────┴────────────────────────────────────┴─────────────────────┘
```

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

```
NOT_STARTED → ACTIVE ⇄ DRAFT ⇄ READY_FOR_REVIEW → FINALIZED
```

Transitions are validated server-side; an invalid one returns
`409 INVALID_STATE_TRANSITION`. `FINALIZED` is terminal: every mutating endpoint runs
through a guard that returns `409 CONSULTATION_FINALIZED`, and the UI switches to
read-only. Finalizing requires at least one doctor-recorded assessment — a consultation
can never be closed on suggestions alone. Record amendment is Phase 3.

---

## AI readiness

AI is **not** implemented. What exists is the contract and every integration point it
will need, so connecting a real service changes one file and nothing above it.

### Where intelligence enters

```
Clinical Intelligence service (does not exist yet)
        ↓
GET /api/consultations/:id/clinical-intelligence   ← backend/src/services/clinical-intelligence.service.ts
        ↓
features/clinical-intelligence/clinical-intelligence.api.ts   ← the single seam
        ↓
stores/clinical-intelligence.store.ts
        ↓
components/consultation/intelligence/*
```

No component knows how intelligence is produced, and no component calls the endpoint.

### The contract it must satisfy

`types/clinical-intelligence.ts`. The envelope always states availability explicitly:

```ts
interface ClinicalIntelligenceEnvelope {
  availability: "UNAVAILABLE" | "WAITING" | "AVAILABLE" | "PARTIAL" | "ERROR";
  intelligence: ClinicalIntelligence | null;
  message: string | null;
}
```

`ClinicalIntelligence` carries `clinicalConsiderations`, `differentialDiagnoses`,
`missingInformation`, `suggestedQuestions`, `redFlags`, `investigationMappings`,
`medicationConsiderations` and `evidence` — **every one optional**. A partial response
renders the sections it has and omits the rest; the workspace never assumes a field is
present. `provenance` marks a payload as `SERVICE` or `FIXTURE`, and fixtures are
labelled as test data wherever they appear.

Evidence items carry a `sourceRef` back into patient or case context, so a doctor can
verify a claim rather than take it on trust.

### Doctor-control boundaries

AI data and doctor decisions are **separate data domains**. Suggestions live in the
clinical-intelligence store; decisions live on the consultation record.

| The intelligence layer may | It may never |
| -------------------------- | ------------ |
| Surface clinical considerations | Confirm a diagnosis |
| Suggest differentials for review | Record an assessment |
| Map investigations to clinical questions | Order an investigation |
| Raise medication considerations | Prescribe |
| Flag missing information and red flags | Set treatment or follow-up |

Concretely:

- A differential is dispositioned by the doctor — **Accept for consideration**,
  **Reject** or **Ignore**. The wording is deliberate: there is no "confirm diagnosis"
  affordance anywhere in the intelligence UI.
- Accepting a differential writes a `DifferentialReview` to the **consultation**, not
  to the intelligence payload, and creates **no** assessment. Recording an assessment
  is a separate, explicit action on the Diagnosis step; when the doctor starts from a
  suggestion, `derivedFromDifferentialId` is kept for traceability only.
- A suggested investigation is *copied* into the doctor's list on an explicit action.
  `SelectedInvestigation.selectedBy` is always `DOCTOR`; `Medication.prescribedBy` is
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
| `/consultations/[id]/consultation`             | Step 2 — active consultation                           |
| `/consultations/[id]/assessment`               | Step 3 — clinical assessment                           |
| `/consultations/[id]/investigations`           | Step 4 — investigation mapping                         |
| `/consultations/[id]/diagnosis`                | Step 5 — diagnosis                                     |
| `/consultations/[id]/treatment`                | Step 6 — medication & treatment                        |
| `/consultations/[id]/follow-up`                | Step 7 — follow-up                                     |
| `/consultations/[id]/summary`                  | Step 8 — summary and finalize                          |
| `/records`                                     | Phase 3 placeholder                                    |

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
| POST   | `/api/consultations/:id/differential-reviews`            | Doctor disposition of a differential |
| POST   | `/api/consultations/:id/diagnosis`                       | Doctor assessment                    |
| POST   | `/api/consultations/:id/investigations`                  | Add investigation                    |
| PATCH  | `/api/consultations/:id/investigations/:investigationId` | Update investigation                 |
| DELETE | `/api/consultations/:id/investigations/:investigationId` | Remove investigation                 |
| POST   | `/api/consultations/:id/medications`                     | Add medication                       |
| PATCH  | `/api/consultations/:id/medications/:medicationId`       | Update medication                    |
| DELETE | `/api/consultations/:id/medications/:medicationId`       | Remove medication                    |
| POST   | `/api/consultations/:id/follow-up`                       | Follow-up plan                       |
| POST   | `/api/consultations/:id/finalize`                        | Close the record                     |
| GET    | `/api/consultations/:id/summary`                         | `ConsultationSummary`                |
| GET    | `/api/consultations/:id/clinical-intelligence`           | `ClinicalIntelligenceEnvelope`       |

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
authorization status, consultation status, allergy severity and differential
disposition to a restrained tone consumed by `<Badge>`.

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
| `stores/clinical-intelligence.store.ts`| Availability, payload and preview source. Structurally separate from the record — it cannot reach a doctor decision.     |
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

Clinical intelligence surfaces additionally implement **unavailable**, **waiting** and
**partial**. No panel is ever left blank and unexplained.

The API applies a configurable artificial delay (`MOCK_LATENCY_MS`, default 220 ms) so
these states are exercised in normal use. Set it to `0` for tests.

---

## Notes on the mock data

`data/appointments.json` is authored against a fixture anchor date and rebased on load
(`backend/src/mock/db.ts`) by `today − anchor` whole days, so the dataset always spans
past / today / upcoming whenever the app is run. Delete that rebasing step once a real
database supplies live rows.

| File                                    | Contents                                                          |
| --------------------------------------- | ----------------------------------------------------------------- |
| `data/doctors.json`                     | The mock doctor account                                           |
| `data/credentials.json`                 | Plaintext demo credentials (Phase 1 only)                         |
| `data/patients.json`                    | 12 patients, ages 8–72                                            |
| `data/appointments.json`                | 20 appointments across every status and six types                 |
| `data/access-codes.json`                | Access codes, including one that grants only `PENDING`            |
| `data/sharing-links.json`               | Valid, expired and revoked share tokens                           |
| `data/patient-contexts.json`            | Allergies, history, medications and previous visits for 6 patients |
| `data/case-intake.json`                 | Patient-reported complaint, HPI, symptoms and timeline for 6 visits |
| `data/consultations.json`               | Consultation seed (empty; session records live in memory)         |
| `data/clinical-intelligence-fixtures.json` | **AI FIXTURE / TEST DATA ONLY** — placeholder labels, no clinical content |

All patients, doctors and clinical details are fictional.

---

## Limitations

Intentionally **not** implemented:

- **No database.** No PostgreSQL, MongoDB, Redis, Prisma or any ORM. Mock JSON behind repository interfaces. Consultations created during a session live in an in-memory map and are **lost on API restart**.
- **No real authentication.** The token is an unsigned, reversible envelope issued by `backend/src/services/auth.service.ts`. It provides no security. Route protection is client-side (`AuthGuard`); it moves to `middleware.ts` when real cookie sessions land.
- **No AI.** No LLM, model, inference server or recommendation engine. `GET /api/consultations/:id/clinical-intelligence` returns an explicit `UNAVAILABLE` envelope. The only payloads that exist are synthetic fixtures with placeholder labels, served solely on an explicit `?source=` opt-in and labelled as test data in the UI.
- **No RAG.** No retrieval layer, embeddings or vector database.
- **No real clinical decision support.** Nothing in this application evaluates a patient, and no clinical content is generated. Every assessment, investigation, prescription and follow-up is authored by the doctor.
- **No production authorization.** Access grants are read from fixtures and are not enforced anywhere. There is no consent verification, token signing, revocation checking or audit logging.
- **No patient-application integration**, WhatsApp, audio recording or transcription.
- **Records and finalisation (Phase 3).** A finalized consultation is terminal; amendment, archival and cross-session history are not implemented, and `/records` remains a placeholder.
- **No automated test suite.** Verified by typecheck, lint, production build, a scripted API contract pass (67 assertions) and a scripted browser pass across four viewports (97 assertions).

## Configuration

| Variable          | Default                 | Used by | Purpose                               |
| ----------------- | ----------------------- | ------- | ------------------------------------- |
| `API_ORIGIN`      | `http://localhost:4000` | Web     | Rewrite target for `/api/*`           |
| `PORT`            | `4000`                  | API     | Listen port                           |
| `CORS_ORIGIN`     | `*`                     | API     | Allowed origins for direct API access |
| `MOCK_LATENCY_MS` | `220`                   | API     | Simulated latency on mock reads       |

See `.env.example` and `backend/.env.example`.
