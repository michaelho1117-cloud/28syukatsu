# ARCHITECTURE.md

## Architectural Intent
28syukatsu is not intended to be a generic CRUD admin panel.

Its intended architecture is:
- a consulting job-hunting workflow system,
- with automation entry points,
- personal context reuse,
- readiness / matching / coaching,
- and action-oriented output.

The ideal system should reduce the user’s role as “manual systems integrator”.

## Core Objects
Based on the current real code and database:

### Confirmed backend objects (SQLite)
- `Company`
- `Application`
- `ResearchNote`
- `CompanyResearchAsset`
- `CompanyRuleOutput`
- `Task`
- `CasePractice`
- `WebTestPractice`
- `EmailInbox`
- `Account`

### Current frontend / local objects
- `Event`
  - currently managed primarily via localStorage utility (`eventStore.js`)
  - status model includes:
    - `draft`
    - `confirmed`
    - `needs_attention`
    - `archived`

- `Capture payload`
  - transient intake payload stored in localStorage (`captureIntake.js`)

- `Personal Context`
  - currently represented through front-end utilities and profile-related structures
  - exact full object schema is still evolving

### Intended but not fully modeled yet
- story units
- experience bank
- motivation layer
- reusable ES / interview writing assets
- matching explanation objects

## Module Responsibilities

### Dashboard
Action output layer.

Current responsibility:
- show summaries, priorities, deadlines, events, risk, readiness, and coach-related content

Intended responsibility:
- become the command center for “what should I do now?”

### Emails
External information viewing layer.

Current responsibility:
- show job-hunting emails from local inbox storage
- provide event extraction and task creation entry points

### EventCapture
Input transformation layer.

Current responsibility:
- turn raw text into editable event drafts

Current note:
- likely to become more tightly embedded into Events rather than remain a fully separate conceptual top-level module

### Events
Event object management layer.

Current responsibility:
- manage event drafts / confirmed items / status-based filtering

### Planner
Task action layer.

Current responsibility:
- task list management
- review queue
- focus tasks

### Companies / CompanyDetail
Company object layer.

Current responsibility:
- company browsing
- company detail review
- partial company-specific fit / prep support

### Applications
Selection process layer.

Current responsibility:
- track recruiting process stages and deadlines

### Practice
Preparation / training input layer.

Current responsibility:
- store practice records
- feed readiness-related logic

### Journal
Reflection / daily progress recording layer.

Current responsibility:
- journal-like tracking
- still not fully integrated into coaching loops

### Profile
Personal context entry layer.

Current responsibility:
- store or edit profile-related information

Intended responsibility:
- provide reusable personal context across ES, interviews, matching, and coaching

### ResearchHub
Company research storage layer.

Current responsibility:
- store research-related assets
- support later structured company prep

## Data Flow

## 1. Mail / external text -> Capture -> Event
Current intended flow:
- `EmailInbox` item viewed in `Emails`
- mail content passed into capture intake
- `EventCapture` parses text
- user edits draft
- event stored via `eventStore.js`

Current state:
- partially implemented
- UX and navigation are still being refined
- not yet a fully stable end-to-end productized flow

## 2. Event -> Dashboard / Planner
Current intended flow:
- event saved
- event appears in Upcoming Events
- event may generate follow-up tasks

Current state:
- partially implemented
- object layer exists, but is not yet fully backend-unified

## 3. Practice -> Insights / Coach / Planner
Current intended flow:
- user records practice
- weakness / readiness signal derived
- dashboard / planner / coach receives that signal

Current state:
- partially implemented
- some readiness logic exists
- still not a strong, consistently visible closed loop

## 4. Personal Context -> Company / matching / ES prep
Current intended flow:
- profile and context data become reusable
- company prep / coach / matching use those assets

Current state:
- only partially established
- “profile exists” is more mature than “profile is visibly used everywhere”

## UI / Product Layers

### Input Layer
- Emails
- EventCapture
- Practice
- Journal
- Profile
- Accounts

### Object Layer
- Company
- Application
- Task
- Event
- Research assets

### Intelligence Layer
- AI coach snapshot
- readiness signals
- partial rule outputs in research

### Action Layer
- Dashboard
- Planner
- Upcoming deadlines
- event cards

## Current State vs Intended State

### Current real state
- hybrid system: React frontend + Express APIs + SQLite + localStorage
- many modules exist and are navigable
- some automation entry points exist
- event system exists as MVP object flow
- AI coach exists in a narrow snapshot form
- company / research / task / email infrastructure is present

### Intended state
- stronger end-to-end consulting workflow system
- richer capture-to-action pipelines
- stronger dashboard command center behavior
- personal context visibly reused across company prep, ES, interview, and matching
- less manual coordination by the user

## Architectural Risks

1. Module islands
- multiple pages exist, but not all are strongly linked by stable object flow

2. Event architecture split
- events are not yet treated like first-class backend objects
- current localStorage-based event layer may become a long-term bottleneck

3. Personal Context underused
- profile and story layers risk becoming passive data-entry surfaces

4. Dashboard still transitional
- improving, but still not fully acting as a real command center

5. Automation not yet deeply productized
- automation entry points exist
- “the system clearly saved me work” is still inconsistent

6. Security / configuration debt
- code currently contains credential-like values that should be externalized

## Recommended Architectural Direction
The best near-term architecture direction is:

1. Strengthen Event as an object layer
- unify capture, event management, dashboard, and planner around a more stable event model

2. Strengthen Personal Context reuse
- make Profile / Story / Experience directly visible in company prep and coaching outputs

3. Strengthen Action output
- make Dashboard and Planner the main destination of automation and intelligence flows

In short:
- fewer isolated pages
- stronger object layers
- stronger action feedback
- less manual user orchestration

