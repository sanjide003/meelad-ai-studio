# Admin Professionalization Implementation Prompt

Copy and use this prompt when you are ready to implement the admin professionalization changes in the application.

---

## Prompt

You are working in the MeeladPulse application repository. Your task is to fully professionalize the admin experience based on the admin professionalization report in `docs/ADMIN_PROFESSIONALIZATION_REPORT.md`.

The application is a festival/institution management platform. The admin area must become simple enough for any institution administrator to understand immediately after login, and powerful enough to manage the full lifecycle of a festival: setup, participants, users, judges, marks, results, publishing, reports, certificates, backup, and audit.

### Primary goals

1. Make the admin panel professional, clean, institution-ready, and easy for first-time administrators.
2. Keep English as the default application language.
3. When English is active, remove all Malayalam UI text from titles, subtitles, cards, buttons, placeholders, badges, helper messages, and static labels.
4. Malayalam should appear only when the user switches the interface language to Malayalam, except for user-entered data such as names.
5. Avoid dual titles. Each page, tab, card, modal, and section should have one clear primary title in the active language only.
6. Reorganize admin navigation around a clear festival lifecycle.
7. Add step-by-step guidance so administrators know exactly what to do on each major page.
8. Apply a consistent semantic color system to admin groups, cards, tabs, badges, and primary actions.
9. Keep the existing Firebase-based functionality intact while improving labels, structure, visual hierarchy, and guidance.
10. Do not remove existing features unless they are duplicates or purely confusing decorative wording.

### Files and areas to inspect first

Start by reviewing these files and related imports/services:

- `admin/app.html`
- `components/admin-sidebar.html`
- `components/admin-header.html`
- `assets/js/navigation.js`
- `assets/js/translations-en.js`
- Any existing Malayalam translation files or language-switching code.
- All `admin/*.html` pages.
- Public pages that include hardcoded Malayalam inside English-mode text.

Use ripgrep to find language mixing and dual-title issues:

```bash
rg -n "Malayalam:|[\x{0D00}-\x{0D7F}]|\([A-Za-z][^)]+\)" admin components public assets/js *.html
```

Do not blindly remove user-entered Malayalam data rendering. Only clean static UI labels and static page text.

### Required navigation structure

Refactor the admin sidebar into these lifecycle groups. Preserve links to existing pages, but improve names and grouping.

#### 1. Dashboard

- Dashboard

Purpose: Give administrators an instant overview of readiness, active competitions, pending work, mark status, result status, and alerts.

#### 2. Setup

- Festival Profile or Festival Settings
- Teams
- Divisions
- Subdivisions
- Categories
- Competition Rules
- Point Rules
- Tie-Break Rules

Purpose: Prepare the festival before registration, judging, and publishing.

#### 3. Participants

- Students or Participants
- Add Student or Add Participant
- Student Review or Participant Review
- ID Cards

Purpose: Register, verify, review, and identify participants.

Use one terminology consistently. If the product domain prefers `Students`, use `Students`; otherwise use `Participants`. Do not mix both unnecessarily inside the same workflow.

#### 4. People & Access

- Accounts
- Invitations
- Judges
- Judge Assignments

Purpose: Manage users, roles, invitations, judges, and access.

#### 5. Judging

- Mark Sheets Monitor
- Submitted Marks
- Mark Review
- Provisional Results

Purpose: Monitor judging progress, review submissions, reopen or return sheets, and prepare provisional results.

#### 6. Results

- Result Review
- Publish Results
- Published Results
- Result Corrections if an existing page exists

Purpose: Approve, publish, correct, and review official results.

#### 7. Reports & Certificates

- Reports
- Certificates
- Public Data Diagnostics

Purpose: Generate official outputs, downloads, certificates, and diagnostics.

#### 8. System

- Recalculation
- Logical Controls
- Backup & Restore

Purpose: Handle maintenance, recalculation, backup, restore, and high-impact controls.

### Sidebar label cleanup

Replace decorative or technical labels with simple task labels.

Examples:

- `Management Node` → `Admin Portal` or remove the subtitle.
- `Dashboard Overview` → `Dashboard`.
- `Manage Accounts` → `Accounts`.
- `Security Invitations` → `Invitations`.
- `ID Cards Terminal` → `ID Cards`.
- `Certificates Terminal` → `Certificates`.
- `Announcements Hub` → `Announcements`.
- `Reports Terminal` → `Reports`.
- `Scoreboard Recalculation` → `Recalculation`.
- `Panel Judges` → `Judges`.
- `Mark Sheets Monitor` can remain if it is clear in context.
- `Sign Out Portal` → `Sign Out`.

### Language implementation requirements

1. Centralize user-facing strings in translation files or shared translation objects.
2. Ensure English strings contain English only.
3. Add or update Malayalam translations separately.
4. Update pages that currently display English text plus Malayalam examples inside the same title/subtitle.
5. In Malayalam mode, use Malayalam title only. Do not append English in parentheses unless it is a proper noun, code, or user-entered data.
6. Update `document.documentElement.lang` when switching language.
7. Persist selected language in local storage.
8. Keep English as default if no language preference exists.

### Title standardization requirements

Audit all admin and public pages for headings, subtitles, tabs, cards, and modal titles.

Rules:

- One primary title per screen.
- One concise subtitle per screen.
- No slash-separated duplicate titles.
- No language pair titles such as `Malayalam Title (English Title)`.
- No overly decorative titles when a simple task title works better.

Good examples:

- `Dashboard`
- `Festival Settings`
- `Teams`
- `Students`
- `Accounts`
- `Invitations`
- `Judge Assignments`
- `Submitted Marks`
- `Result Review`
- `Publish Results`
- `Reports`
- `Backup & Restore`

### Semantic color system

Apply a consistent color identity across admin navigation, cards, badges, and primary actions.

Use this map:

- Dashboard: slate + emerald
- Setup: indigo
- Participants or Students: emerald
- People & Access: violet
- Judging: amber
- Results: green for approved/published, orange for pending/review
- Reports & Certificates: cyan
- System: slate
- Destructive or irreversible actions: rose/red

Implementation guidance:

- Sidebar group headings can use neutral text, but active group accents should follow the semantic color.
- Cards inside a workflow should use the workflow accent for icons, highlights, and primary calls to action.
- Status badges should be consistent across the app:
  - Draft: slate
  - Pending: amber/orange
  - Active: emerald/green
  - Approved: green
  - Published: green
  - Returned: orange
  - Reopened: amber
  - Held: rose
  - Failed/Error: red
  - Disabled/Archived: slate

### Page guidance requirements

Add a reusable guidance pattern to major admin pages. Keep it compact and professional, not noisy.

Each major admin page should include:

1. Clear page title.
2. One-line page purpose.
3. Primary action button.
4. Status summary or count cards.
5. Step checklist or next-step helper when useful.
6. Helpful empty state when there is no data.
7. Confirmation message after critical success actions.

Apply this especially to:

- Dashboard
- Festival Settings
- Teams
- Divisions
- Subdivisions
- Categories
- Students
- Student Review
- Accounts
- Invitations
- Judges
- Judge Assignments
- Mark Sheets Monitor
- Submitted Marks
- Mark Review
- Result Review
- Publish Results
- Published Results
- Reports
- Certificates
- Recalculation
- Backup & Restore

### Dashboard requirements

Improve the admin dashboard so it acts as a command center.

Add or improve cards for:

- Festival readiness
- Setup checklist
- Teams configured
- Students registered
- Judges assigned
- Competitions configured
- Marks pending
- Results awaiting review
- Published results
- Backup status
- System alerts

Add a setup checklist with these items:

- Festival profile completed
- Teams created
- Divisions and categories configured
- Competitions configured
- Point rules configured
- Judges invited
- Participants registered
- Public pages enabled

Each checklist item should either show completed, pending, or needs attention. Where possible, link the item to the relevant admin page.

### Empty state requirements

Every major empty table or list must answer:

1. What is this section for?
2. Why is it empty?
3. What should the admin do next?

Example:

Title: `No judges assigned yet`
Description: `Assign verified judges to competitions before opening mark entry.`
Button: `Assign Judges`

### Risk and confirmation requirements

Critical actions should have clear confirmations and warnings.

Add or improve warnings for:

- Publishing results while marks are incomplete.
- Recalculating after results are published.
- Restoring a backup.
- Unpublishing results.
- Reopening a submitted mark sheet.
- Returning a sheet for correction.
- Changing point rules after marks exist.
- Deleting or disabling an account.

Use rose/red only for destructive actions. Use amber for warnings and reversible caution actions.

### Accessibility and responsiveness requirements

- Preserve keyboard navigation.
- Keep `aria-current`, `aria-expanded`, and button labels accurate.
- Ensure sidebar accordion state remains clear.
- Ensure pages remain usable on mobile and desktop.
- Maintain readable contrast for all color changes.
- Do not hide essential actions behind hover-only interactions.

### Technical constraints

- Do not break Firebase imports or authentication flow.
- Do not wrap imports in try/catch blocks.
- Keep existing routes working.
- Keep `admin/app.html?page=...` embedded navigation working.
- Avoid large rewrites when a smaller component or helper can standardize behavior.
- Prefer shared helper functions/components for repeated page headers, empty states, status badges, and guidance panels.
- If adding CSS, place reusable styles in the existing shared stylesheet if appropriate.
- Do not introduce a build dependency unless absolutely necessary.

### Suggested implementation sequence

#### Step 1: Audit and string cleanup

- Search for hardcoded Malayalam inside English UI.
- Search for dual titles.
- Search for decorative labels.
- List the affected files.
- Clean the easiest static strings first.

#### Step 2: Translation foundation

- Ensure English strings live in `assets/js/translations-en.js` or an appropriate shared dictionary.
- Add or update Malayalam strings in a separate Malayalam translation file if one exists or create one if needed.
- Add a small language helper if the current implementation is duplicated across pages.

#### Step 3: Sidebar and admin shell

- Update `components/admin-sidebar.html` labels and grouping.
- Preserve all existing links.
- Add semantic group metadata/classes if useful.
- Ensure active link highlighting and accordion expansion still works through `assets/js/navigation.js`.

#### Step 4: Admin dashboard

- Add setup checklist and status cards.
- Use concise English-only labels.
- Link checklist items to relevant admin pages.
- Use semantic colors.

#### Step 5: Major admin pages

Update pages in this order:

1. Festival Settings and setup pages.
2. Students and review pages.
3. Accounts, invitations, judges, and assignments.
4. Mark monitoring and review pages.
5. Result review and publishing pages.
6. Reports, certificates, recalculation, backup, and system pages.

For each page:

- Standardize title.
- Add purpose text.
- Improve primary action placement.
- Add guidance or empty state.
- Apply semantic color accents.
- Remove mixed-language static UI.

#### Step 6: Public pages language cleanup

Clean public pages that currently show English subtitles with Malayalam references. English mode should be English only, and Malayalam should be shown only after switching language.

#### Step 7: Validation and tests

Run appropriate checks after implementation:

```bash
npm run build
```

If no build script exists or dependencies are missing, document the limitation clearly.

Also run targeted searches:

```bash
rg -n "Malayalam:" admin components public assets/js *.html
rg -n "[\x{0D00}-\x{0D7F}]" admin components public assets/js *.html
```

Review every match and confirm whether it is valid Malayalam-mode text, user-entered content rendering, or a remaining issue.

### Acceptance criteria

The implementation is complete only when:

1. English mode has no Malayalam static UI text.
2. Malayalam mode does not show unnecessary English duplicate titles.
3. Admin sidebar is lifecycle-based and uses simple labels.
4. Major admin pages have clear purpose text and next-step guidance.
5. Dashboard includes a setup checklist and operational status cards.
6. Semantic colors are applied consistently.
7. Critical actions show appropriate warnings or confirmations.
8. Existing admin links and embedded navigation still work.
9. Public-facing pages no longer show `Malayalam: ...` inside English subtitles.
10. The application builds successfully, or any build limitation is clearly documented.

### Final response format after implementation

When finished, provide:

- A concise summary of changed files.
- A list of language-mixing issues fixed.
- A list of admin UX improvements implemented.
- A list of tests/checks run, with pass/fail/warning status.
- Any remaining limitations or recommended follow-up work.

---
