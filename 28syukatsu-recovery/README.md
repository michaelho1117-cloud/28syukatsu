# 28syukatsu

## Project Overview
28syukatsu is a consulting career operating system for a 2028 graduate targeting Japanese consulting firms.

It is aimed at a user who is not looking for “just another note-taking app”, but a system that can:
- capture scattered recruiting information,
- turn it into structured objects,
- surface priorities,
- and gradually support matching, coaching, and preparation workflows.

Target user profile:
- Chinese student / job seeker
- 2028 graduate target
- Business-level Japanese and English
- JLPT N1 (2022, score 136)
- TOEIC L&R 945
- Background spanning Shanghai Maritime University, Recruit-related internship, Evalueserve ESG internship, OC&C Shanghai internship, Japanese language school, Don Quijote part-time work, and Tohoku University graduate school (economics / management direction)

Why this is not a normal note tool:
- The product intent is not passive storage.
- The intended value is: less manual transfer, more structured workflow, more visible “what should I do now”.
- The system is trying to connect mail, event capture, tasks, preparation, company research, and personal story assets into one workflow layer.

Current overall goal:
- evolve the existing project into a usable Consulting Career OS without rewriting it from scratch.

## Product Vision
28syukatsu should become a consulting job-hunting operating system for Japan-focused recruiting.

The core value is not only recording information, but:
- automation-first capture,
- workflow intelligence,
- readiness / matching support,
- AI coaching,
- and reusable personal context for ES / interview / company prep.

## Top-level Product Structure

### Capture
Input layer for bringing external information into the system.

Current examples:
- email inbox reading
- text-to-event capture
- manual quick inputs

### Organize
Turns raw inputs into structured assets.

Current objects include:
- Company
- Application
- Task
- Event (currently local object layer)
- Research assets
- Practice records
- Journal entries
- Account / MyPage credentials

### Intelligence
Reasoning and recommendation layer.

Current status:
- partially implemented
- AI Coach exists in a limited form
- readiness / matching is still incomplete

### Action
The operational layer where the user sees next steps.

Current examples:
- Dashboard
- Planner
- Upcoming deadlines
- Event cards
- task follow-up

### Personal Context Layer
The “who is this user?” layer.

It is intended to hold:
- profile basics,
- motivations,
- experiences,
- story bank,
- writing / speaking assets.

Current status:
- partial implementation exists in Profile and related local utilities
- downstream usage is still incomplete

## Current Main Modules
Based on the current codebase in `src/pages`:

- `Dashboard`
  Main command-center style page. Shows summary stats, priorities, events, risks, training readiness, and AI coach outputs.

- `Accounts` (`MyPage`)
  Stores MyPage login information such as company, login URL, ID, and password.

- `Companies`
  Company list and company database entry point.

- `CompanyDetail`
  Detail page for a specific company. Used for company overview and some research / fit display.

- `Applications`
  Selection / application tracking page.

- `Emails`
  Local inbox / job-hunting email view with actions such as event extraction and task creation.

- `EventCapture`
  Standalone capture page for turning pasted text into event drafts. Current role may be merged more tightly into `Events`.

- `Events`
  Event manager page. Manages captured event objects and status-based filtering.

- `Planner`
  Task-oriented action page.

- `ResearchHub`
  Research storage / research workflow page.

- `Journal`
  Job-hunting journal / career journal page.

- `Practice`
  Practice / training records, including case and web-test related flows.

- `Profile`
  Personal context entry page.

- `Login`
  Lightweight front-end auth page with local auth guard.

## Tech Stack
Confirmed from current project files:

- Frontend framework:
  React 19

- Routing:
  react-router-dom

- Build tool:
  Vite 7

- Styling:
  custom CSS files per page / module + shared UI components

- i18n:
  i18next + react-i18next

- Backend API:
  Express

- Local database:
  SQLite via better-sqlite3

- Email integration:
  ImapFlow + Nodemailer

- Icons:
  lucide-react

- Data persistence:
  mixed model
  - SQLite for companies, applications, tasks, email inbox, accounts, research assets, practice records
  - localStorage for some front-end layer objects such as events, capture intake, week plan, and coach cache

Needs confirmation:
- exact Node.js version policy
- whether pnpm / yarn is officially supported (current project appears npm-first)

## Local Development Setup

### Install dependencies
```bash
npm install
```

### Start frontend only
```bash
npm run dev
```

### Start email API
```bash
npm run api
```

### Start core API
```bash
npm run api:core
```

### Build frontend
```bash
npm run build
```

### Useful local launcher scripts
Confirmed in project root:
- `start_shukatsu.cmd`
- `start-all.bat`
- `start-silent.vbs`
- `launch_shukatsu_hidden.vbs`
- `run-trycloudflare.cmd`
- `run-trycloudflare.ps1`

### Run-time assumptions
- Node.js installed locally
- npm available
- local SQLite file writable
- ports typically used:
  - frontend: `5173`
  - email API: `8787`
  - core API: `8789`

Needs confirmation:
- minimum supported Node version

## Environment Variables
Confirmed from current server code:

### Core API
- `SHUKATSU_API_PORT`
  - purpose: override core API port
  - example: `8789`
  - required: no

### Email API
- `EMAIL_API_PORT`
  - purpose: override email API port
  - example: `8787`
  - required: no

### Gemini / AI
- `GEMINI_API_KEY`
  - purpose: API key for Gemini JSON generation
  - example: `AIza...`
  - required: effectively yes for live AI coach, though code currently has insecure fallback behavior

- `GEMINI_MODEL`
  - purpose: preferred Gemini model name
  - example: `gemini-3.1-flash-lite-preview`
  - required: no

Important security note:
- The current codebase still contains hardcoded credential-like values in server files.
- These should be externalized.
- Do not treat the repository contents as safe for public distribution until that is cleaned up.

## Current Workflow Highlights
These are the real current workflows or partially working flows, not idealized targets.

### Mail -> Capture / Task
- Emails can be viewed locally in the `Emails` page.
- There is an action to extract mail content into event capture flow.
- There is an action to convert a mail into a task.
- This workflow exists, but UX consistency is still under active refinement.

### Capture -> Event
- Text can be pasted into the capture page and parsed into event drafts.
- Event objects can be edited and stored with lightweight status management.

### Event -> Dashboard / Planner
- Stored events can appear in Upcoming Events.
- Event-related task generation exists in partial form.
- This chain exists, but is not yet a fully stable OS-level object flow.

### Practice -> Insights / Coach
- Practice records exist.
- Dashboard includes training readiness and coach-related blocks.
- Weakness / readiness loop exists only partially.

### Profile / Personal Context -> Company / Coach
- Personal context utilities exist.
- Profile is intended to act as reusable context.
- Some coach / company detail usage has been attempted, but the full “used everywhere” feel is not yet established.

## Current Gaps / Known Limitations
- Event system is still partially localStorage-based instead of fully unified backend object management.
- Capture quality is inconsistent; parsing can still be low precision for ambiguous mails.
- Personal Context Layer exists but is not yet strongly and consistently used across ES / interview / matching flows.
- Dashboard is improving, but still not a true command center.
- Some UI text remains inconsistent or contains encoding issues in parts of the project.
- Event / mail / planner interactions are still being reshaped and should not be overstated as fully finished.
- Documentation and recovery standards were previously weak; this file is part of fixing that.
- Security hygiene is currently insufficient because some sensitive-looking values are present directly in code.

## Collaboration Model
Current working model for this project:

- Codex:
  coding executor / implementer

- OpenClaw:
  non-coding supervisory agent

- User:
  product owner / evaluator

Expected rule:
- OpenClaw or other supervisory agents may issue product or review guidance
- code changes should still be implemented in the actual project by a coding-capable agent
- acceptance should be based on real UI-visible behavior, not “build passed” alone

## Recommended Next Priorities
Based on the current real project state, the 3 best next priorities are:

1. Unify the Event workflow
   - make `Capture -> Event -> Dashboard / Planner / Event Manager` more stable and less fragmented

2. Strengthen Personal Context usage
   - make Profile / Story / Experience visibly used in company prep, ES support, and coaching

3. Turn Dashboard into a true action layer
   - reduce passive display blocks
   - improve priority output and cross-module action handoff

