# Shukatsu OS Iteration Log (2026-03-09)

## Cycle 1 - User (28卒就活选手)
### Observed Pain
- Major text mojibake in key forms (Applications / Accounts / Emails).
- No clear feedback after saving account info.
- Core workflows were usable but low confidence due unclear labels.

### Changes Shipped
- Rewrote `Applications.jsx` with clean Japanese labels and placeholders.
- Rewrote `Accounts.jsx` with clean labels and consistent actions.
- Added save feedback banner (`追加しました / 更新しました / 削除しました`).
- Rewrote `Emails.jsx` to remove mojibake and keep bilingual-friendly behavior.

### Outcome
- Form operations are readable and predictable.
- User knows if edit is actually saved.

---

## Cycle 2 - PM (产品管理视角)
### Product Goal
- Make `企業データベース` a decision cockpit instead of a static list.

### Changes Shipped
- Rebuilt `Companies.jsx` with:
  - employee-size filter (`100+ / 300+ / 1000+`)
  - target-only toggle
  - source-tag filter (`Top50/OpenWork/外資就活`)
  - one-click seed import (`/companies/import-universe`)
  - summary KPI cards (company count / target count / avg score)
- Extended `useCoreData.fetchCompanies` to accept query params.

### Outcome
- Company universe can be expanded and narrowed quickly.
- Better control for “100+ employees then shortlist” workflow.

---

## Cycle 3 - Coder (工程与稳定性视角)
### Engineering Risk
- White-screen risk when runtime error happens in UI tree.
- Hard to tell whether issue is frontend or backend API state.

### Changes Shipped
- Added global `AppErrorBoundary` to prevent full blank screen.
- Wrapped app routes with error boundary in `App.jsx`.
- Added Core API live status indicator in sidebar (`Online/Offline`).

### Outcome
- Frontend is more crash-tolerant.
- Debug path is faster for local operation.

---

## Next Automated Loop Suggestions
1. Add CRUD in Companies page (edit `webtest_type`, `case_style`, `recruit_status` inline).
2. Add Application drag-and-drop stage movement.
3. Add Weekly planning page:
   - ES timeline
   - interview prep slots
   - web test training target.
4. Add AI Assistant v1:
   - fetch only latest summaries from SQLite
   - build short prompt
   - save returned coaching notes.
