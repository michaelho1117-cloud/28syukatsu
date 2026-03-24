# RECOVERY.md

## Purpose
This document is for disaster recovery, migration, rebuild, and continuity.

It should help with:
- recovering after partial file loss,
- moving the project to another machine,
- rebuilding the environment from backup,
- restoring the project after accidental corruption,
- and reducing dependence on chat history or personal memory.

## What must be backed up
The following items are important and should be preserved:

### Source and configuration
- entire project source tree
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `eslint.config.js`

### Root operational scripts
- `start_shukatsu.cmd`
- `start-all.bat`
- `start-silent.vbs`
- `launch_*` scripts
- `run-trycloudflare.*`
- `get-public-url.*`

### Documentation
- `README.md`
- `RECOVERY.md`
- `ARCHITECTURE.md`
- any future product / handoff documentation

### Data and database
- `data/shukatsu.db`
- possibly root-level `shukatsu.db` if still in use or needed for historical recovery
- `public/companies.csv` if it is still used as a seed source

### Server files
- `server/shukatsu-api.js`
- `server/email-server.js`
- `server/shukatsu-db.js`
- `server/gemini.js`

### Frontend source
- `src/`

### Optional but useful
- `docs/` if it contains project-specific materials
- `scripts/` if they are used during maintenance

## What should NOT be backed up
These can usually be rebuilt and do not need to be preserved:

- `node_modules/`
- `dist/`
- temporary logs:
  - `startup.log`
  - `cloudflared.log`
  - `cloudflared-live.log`
- machine-specific caches
- Vite build output

Sensitive caution:
- if secrets remain embedded in source files, do not treat that as acceptable backup policy
- long-term goal should be moving secrets to environment variables or local-only config

## Recovery from Git / file backup
Recommended recovery order:

1. Restore the project folder from Git or file backup.
2. Confirm that root files exist:
   - `package.json`
   - `package-lock.json`
   - `src/`
   - `server/`
   - `data/`
3. Restore the database file(s), especially `data/shukatsu.db`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Recreate environment variables if externalized.
6. Start services:
   - core API
   - email API
   - frontend
7. Validate main flows.

## Recovery checklist
- [ ] project root restored
- [ ] `src/` exists
- [ ] `server/` exists
- [ ] `package.json` exists
- [ ] `package-lock.json` exists
- [ ] `data/shukatsu.db` exists
- [ ] `npm install` completes
- [ ] `npm run api:core` starts
- [ ] `npm run api` starts
- [ ] `npm run dev` starts
- [ ] login page works
- [ ] dashboard opens
- [ ] companies page opens
- [ ] emails page opens
- [ ] planner opens
- [ ] events page opens
- [ ] profile opens

## Migration to another machine / directory
When moving to another machine or folder, confirm:

### Runtime prerequisites
- Node.js installed
- npm available
- local firewall does not block ports 5173 / 8787 / 8789

### Path-sensitive areas
- launcher scripts may assume Windows paths
- VBS / BAT files are Windows-specific
- local browser auto-open behavior may differ on another machine

### Database / storage risks
- `server/shukatsu-db.js` uses `data/shukatsu.db`
- if a root-level `shukatsu.db` also exists, confirm which one is current
- localStorage-based front-end data will NOT move automatically with the project folder
  - examples include event objects and some UI state caches

### External integrations
- Gmail sync credentials may not survive migration safely if removed from code
- Gemini configuration may need to be re-provided
- Cloudflare tunnel scripts may still exist, but generated public URLs are temporary

## Verification after recovery
After recovery, the most important checks are:

1. Can the frontend open at `localhost:5173`?
2. Can the core API respond at `localhost:8789`?
3. Can the email API respond at `localhost:8787`?
4. Does the login screen behave correctly?
5. Does Dashboard load?
6. Do Companies / Applications / Planner / Emails / Events / Profile open without crashing?
7. Does the SQLite-backed data still appear?
8. Are documentation files present in root?

## Known fragile points
Current known weak points in this project:

1. Mixed persistence model
- some objects are in SQLite
- some objects are in localStorage
- this complicates migration and full recovery

2. Sensitive values currently embedded in code
- this is unsafe and also makes environment recreation messy

3. Multiple startup scripts
- there are several launch patterns in root
- future maintainers may not know which is canonical

4. Database path ambiguity
- `data/shukatsu.db` is confirmed in code
- root-level `shukatsu.db` also exists in the project folder
- needs confirmation which one should be treated as authoritative

5. UI / workflow state under active change
- event / capture / mail flows are being actively revised
- recovery should validate behavior, not only file presence

