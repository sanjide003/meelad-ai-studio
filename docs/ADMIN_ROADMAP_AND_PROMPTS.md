# Admin Application Roadmap & Implementation Prompts

## Purpose

This document captures the current status of the admin application after the recent implementation rounds and lists the remaining work as an actionable roadmap. It is intended to make it clear what has already been completed, what is partially complete, and what prompt should be used next to continue development without losing context.

## Current Status Summary

The application has moved from a generic admin panel toward a lifecycle-driven fest management console. The latest implemented flow now covers the foundational sequence:

1. Master Setup
2. Team Management
3. Participating Settings
4. Student Intake
5. Competition Item Setup

These pieces provide the base data model and admin workflow needed before moving into participant approvals, competition entries, judging, results, certificates, reports, and public publishing.

---

## Completed Work

### 1. Admin Shell and Navigation

**Status:** Completed foundation, needs final cleanup later.

Completed items:

- Added lifecycle-based sidebar navigation for Master Setup, Participating, Team Management, Students, and Competition Items.
- Added clearer admin labels and grouped setup-related work under dedicated navigation entries.
- Retained the admin layout foundation needed for a fixed sidebar, fixed header, active tab highlighting, and embedded admin pages.
- Added runtime language-switching infrastructure and professional admin UI classes in the shared component stylesheet.

Remaining cleanup:

- Remove obsolete tabs once replacement pages are fully implemented.
- Verify active tab behavior across every embedded admin page.
- Complete Malayalam translations for the newer pages.
- Re-test responsive sidebar/header behavior after each major page redesign.

---

### 2. Master Setup / Festival Setup

**Status:** Implemented first full version.

Completed items:

- Created a Master Setup wizard for first-time festival configuration.
- Added institution profile fields such as institution name, place, registration number, logo, and run-by/subtitle information.
- Added festival profile fields such as festival name, subtitle, tagline, logo, phone, email, and social media links.
- Added participating mode options:
  - Boys only
  - Girls only
  - Boys and girls
  - Separate competitions
  - Single/common competitions
  - Separate and single mixed model
- Added fest type options:
  - Sports only
  - Arts only
  - Arts and sports
- Added arts/sports section selection such as on-stage, off-stage, track, field, and custom sections.
- Added category presets and custom category creation.
- Added skip/previous/done flow with setup completion state.
- Added lock-state concept for preventing core setup changes after students or competitions are created.
- Added reset concept for returning setup to incomplete state.

Remaining work:

- Enforce all lock rules strongly at service and Firestore-rule level.
- Require admin password confirmation before destructive reset.
- Connect reset to safe deletion of dependent data when required.
- Add audit logging for reset and setup-lock changes.
- Improve visual review screen before final setup completion.
- Add full Malayalam translation coverage.

---

### 3. Team Management

**Status:** Implemented first full version.

Completed items:

- Added Team Management as a dedicated admin tab.
- Added team creation/editing structure.
- Added team name, logo, color, and team leader fields.
- Added multiple team leaders support.
- Added leader name, role, display order, photo, username, and password fields.
- Added password hashing support for leader/manual credentials.
- Added category-wise chest number starts instead of a single team-level chest number.
- Added support for Master Setup-dependent chest-number behavior.

Remaining work:

- Add full team list redesign with filters, empty states, and edit/delete/archive actions.
- Add team leader portal login landing page.
- Add leader password reset and credential management.
- Add conflict validation for chest number ranges.
- Add public team profile output if needed.
- Add audit trail for team credential changes.

---

### 4. Participating Settings

**Status:** Basic settings implemented.

Completed items:

- Added Participating page under setup-related navigation.
- Added participant intake modes:
  - Admin add
  - Team leaders add
  - Public registration
  - All methods
- Added setting for whether team leader submissions require admin approval.
- Added public registration/status link generation foundation.
- Added registration open/closed setting foundation.

Remaining work:

- Build full public registration form.
- Build full registration status page with phone lookup and clear status messages.
- Add approval and rejection reason workflow.
- Show rejected reason to team leaders and public registrants.
- Add admin share panel for public registration links.
- Add duplicate phone/student validation.

---

### 5. Student Intake / Add Students

**Status:** Core add flow implemented; review and approval workflows still remain.

Completed items:

- Added Add Students page redesign foundation.
- Added selection flow for team, category, and gender based on Master Setup.
- Added manual student entry.
- Added support for adding multiple student names line by line.
- Added CSV/template upload concept.
- Added preview-before-save concept.
- Added uppercase normalization for English student names.
- Added automatic chest number generation based on category/gender/team configuration.
- Added student registration mode checks in the service layer.

Remaining work:

- Redesign All Students page to match the new admin design system.
- Add pending/approved/rejected status filters.
- Add student approval queue for team leader and public submissions.
- Add reject-with-reason dialog.
- Add duplicate checks during manual and bulk save.
- Add complete Excel `.xlsx` import support if CSV is not enough.
- Add downloadable sample template with real team/category examples.
- Add student edit/delete/transfer rules.
- Add lock behavior after competition entries are created.

---

### 6. Competition Item Setup

**Status:** Core competition-item creation flow implemented.

Completed items:

- Redesigned Competition Items page to respect Master Setup.
- Loaded categories from setup and added a General option.
- Loaded gender options based on participating mode.
- Loaded arts/sports programme options based on fest type.
- Loaded section options such as on-stage, off-stage, track, field, and custom sections.
- Added source mode selection:
  - Admin add
  - Team leader add
  - Registration/public flow
- Added single item and group item selection.
- Added single-item participant limit per team.
- Added group-item team limit per group/team.
- Added group-item minimum and maximum participant count.
- Added multiline event-name entry.
- Added preview-before-save behavior.
- Stored programme type and source mode in competition records.

Remaining work:

- Add competition edit/delete/archive workflow.
- Add duplicate event validation.
- Add event code/item number generation.
- Add competition registration/entry flow.
- Add participant selection for single items.
- Add group member selection for group items.
- Enforce min/max group constraints.
- Connect competitions to judging, schedules, result calculation, certificates, and reports.

---

### 7. Security, Tenant Scope, and Credentials

**Status:** Foundation implemented; new workflows need continued hardening.

Completed items:

- Added institution/festival scoping foundation in admin services.
- Added manual account service foundation.
- Added password hashing for manual/admin-related credentials.
- Added migration scripts for password hashes and institution scope backfill.
- Added safer invitation/token hashing direction.

Remaining work:

- Extend Firestore rules for every new workflow: public registration, team leader submissions, approvals, competition entries, judge marks, and results.
- Add audit logs for destructive and sensitive actions.
- Add admin re-authentication for reset/delete/credential changes.
- Add Firestore indexes required by new scoped filters.
- Run full tenant-isolation testing before production use.

---

## Recommended Roadmap

### Phase 1: Finish Student Management and Approval Workflows

Goal: Make student intake production-ready before competition entries begin.

Required outcomes:

- Professional All Students page.
- Pending/approved/rejected student workflow.
- Admin approval queue.
- Reject reason capture and display.
- Team leader student submission flow.
- Public registration form and status lookup.
- Duplicate and validation handling.

#### Prompt for Phase 1

```text
Implement the complete Student Management and Approval workflow.

Context:
The app already has Master Setup, Team Management, Participating Settings, Add Students, and Competition Item Setup foundations. Student intake must now become production-ready.

Requirements:
1. Redesign admin/students.html as a professional All Students page using the existing admin design classes.
2. Add filters for team, category, gender, status, and source.
3. Support statuses: approved, pending, rejected.
4. Add an admin approval queue for students submitted by team leaders and public registration.
5. Add approve and reject actions. Reject must require a reason.
6. Store rejection reason and make it visible to the submitter.
7. Ensure admin-created students can be auto-approved based on participating settings.
8. Ensure team-leader-created students respect studentRegistrationMode and approval settings.
9. Build a public registration page where students/parents can register using phone number, name, team, category, gender, and optional details.
10. Build registration status lookup by phone number.
11. Prevent duplicate student submissions by name/team/category/gender where possible and warn before save.
12. Keep chest number generation based on team category/gender chest-start rules.
13. Update Firestore service and rules as needed for scoped reads/writes.
14. Update sidebar labels only if needed and remove obsolete student tabs if replaced.
15. Run npm run lint and npm run build.

Deliverables:
- Updated admin/students.html
- Updated admin/student-create.html if needed
- Updated public registration/status pages
- Updated student-service/firestore-service logic
- Updated Firestore rules if required
- Clear final summary of completed and remaining items
```

---

### Phase 2: Build Competition Entry / Participant Registration

Goal: Connect students to competition items.

Required outcomes:

- Event-wise registration page.
- Single-item participant selection.
- Group-item team/member selection.
- Per-team limits.
- Category/gender/general eligibility enforcement.
- Approval flow for non-admin submissions.

#### Prompt for Phase 2

```text
Implement Competition Entry and Participant Registration.

Context:
Competition Items are already created from Master Setup filters. Students and teams already exist with category, gender, team, and chest numbers. Now the admin, team leaders, and public registration flow must be able to register participants into competition items according to the item rules.

Requirements:
1. Create or redesign an admin page for Competition Entries.
2. List competition items with filters for programme type, section, category, gender, item type, and source mode.
3. For single items, allow selecting eligible students and enforce max participants per team.
4. For group items, allow creating one or more group teams per team and selecting members.
5. Enforce group item min/max participant counts.
6. Support General category items where all categories in the group can participate if rules allow.
7. Respect gender and participating-mode rules from Master Setup.
8. Respect source mode: admin add, team leader add, registration/public flow.
9. Non-admin submissions should enter pending state when approval is required.
10. Add approve/reject flow for competition entries with rejection reason.
11. Prevent duplicate entry of the same student into the same item.
12. Add printable/exportable event participant list.
13. Store entries with institutionId, festivalId, competitionId, teamId, studentIds, status, source, and audit metadata.
14. Update Firestore rules and indexes as needed.
15. Run npm run lint and npm run build.

Deliverables:
- Competition Entries admin page
- Entry service functions
- Team leader/public entry support foundation if applicable
- Rules/index updates
- Final summary with completed and remaining items
```

---

### Phase 3: Build Judging Setup and Mark Entry

Goal: Allow judges to enter marks only for assigned events.

Required outcomes:

- Judge creation.
- Judge assignment to competition items.
- Judge login/portal.
- Mark entry page.
- Submit/lock/review flow.

#### Prompt for Phase 3

```text
Implement Judging Setup and Mark Entry workflow.

Context:
The app has Master Setup, Teams, Students, Competition Items, and Competition Entries. Now judging must be implemented so assigned judges can enter marks for eligible competition entries.

Requirements:
1. Create a Judge Management page for adding judges.
2. Support judge name, phone/email, role, assigned events, username/password or invitation flow.
3. Hash manual judge passwords and never store plaintext passwords.
4. Add a Judge Assignment page or section where admins assign competition items to judges.
5. Build a judge portal page showing only assigned events.
6. For each event, show participant list based on approved competition entries.
7. Provide mark entry fields according to item type.
8. Support draft save and final submit.
9. Lock judge marks after final submit unless admin reopens.
10. Add admin review page for submitted marks.
11. Track audit metadata: judgeId, submittedAt, reopenedAt, reviewedBy.
12. Enforce tenant scope and judge-only access in Firestore rules.
13. Run npm run lint and npm run build.

Deliverables:
- Admin judge management and assignment UI
- Judge portal/mark entry UI
- Mark service logic
- Firestore rule updates
- Final summary with completed and remaining items
```

---

### Phase 4: Build Results, Ranking, and Publishing

Goal: Convert approved marks into official results.

Required outcomes:

- Rank calculation.
- Tie-break handling.
- Points calculation.
- Review and publish flow.
- Public results pages.

#### Prompt for Phase 4

```text
Implement Results Calculation, Review, and Publishing.

Context:
Judges can submit marks for competition entries. Now the admin must calculate rankings, review results, handle tie-breaks, award points, and publish official results to public pages.

Requirements:
1. Build a result calculation service using approved judge marks.
2. Calculate ranks per competition item.
3. Apply tie-break rules from existing tie-break/point rule settings.
4. Calculate team points and category points.
5. Add admin result review page with item-wise results.
6. Allow admin to approve, publish, unpublish, and recalculate results.
7. Add warning when recalculation affects already-published results.
8. Add audit logs for publish/unpublish/recalculate actions.
9. Update public pages for stage results, non-stage results, sports results, arts results, category results, team results, and overall ranking.
10. Ensure public pages show only published results.
11. Enforce institution/festival scoping everywhere.
12. Run npm run lint and npm run build.

Deliverables:
- Result calculation service
- Admin result review/publish UI
- Public result page updates
- Rules/index updates
- Final summary with completed and remaining items
```

---

### Phase 5: Certificates, ID Cards, Reports, and Downloads

Goal: Generate official outputs after data is verified and results are published.

Required outcomes:

- ID cards.
- Certificates.
- Reports.
- Downloads.
- Print/export workflows.

#### Prompt for Phase 5

```text
Implement Certificates, ID Cards, Reports, and Downloads using the finalized data model.

Context:
The app has teams, students, competitions, entries, judging, and published results. Official outputs must now be generated from scoped verified data.

Requirements:
1. Update ID card generation to use student, team, category, gender, chest number, institution, and festival details.
2. Update certificate generation for participants, winners, judges, and teams where applicable.
3. Build report pages for students, teams, competitions, entries, marks, results, and overall rankings.
4. Add filters for category, team, programme type, section, gender, and status.
5. Add print-friendly layouts.
6. Add CSV/PDF export where possible.
7. Ensure outputs use institution/festival branding from Master Setup.
8. Ensure public downloads only expose approved/published data.
9. Run npm run lint and npm run build.

Deliverables:
- Updated ID card pages/services
- Updated certificate pages/services
- Updated report pages
- Export/print support
- Final summary with completed and remaining items
```

---

### Phase 6: Final QA, Security Hardening, and Production Deployment

Goal: Prepare the application for real usage.

Required outcomes:

- End-to-end testing.
- Rules hardening.
- Index verification.
- Migration dry-runs.
- Responsive and language QA.
- Deployment checklist.

#### Prompt for Phase 6

```text
Perform final QA, security hardening, and production deployment preparation.

Context:
All major application workflows are implemented. The app must now be verified end-to-end for production readiness.

Requirements:
1. Create an end-to-end manual QA checklist covering setup, teams, students, competitions, entries, judging, results, reports, public pages, and account settings.
2. Run npm run lint and fix all issues.
3. Run npm run build and fix all issues.
4. Run tenant audit and review every top-level Firestore collection access.
5. Review Firestore rules for every collection used by the app.
6. Add missing composite index notes or firebase index definitions if needed.
7. Test Malayalam/English language switching across admin and public pages.
8. Test responsive layouts for desktop, tablet, and mobile.
9. Validate that plaintext passwords are never stored.
10. Validate public pages expose only published/allowed data.
11. Run migration scripts in dry-run mode and document expected writes.
12. Prepare production deployment checklist.

Deliverables:
- QA checklist document
- Security review notes
- Fixed lint/build issues
- Deployment checklist
- Final summary with remaining risks if any
```

---

## Suggested Next Immediate Task

The next recommended implementation task is **Phase 1: Finish Student Management and Approval Workflows**.

Reason:

- Teams are already created.
- Students are already partially supported.
- Competition items are already created.
- Before competition entry, judging, and results can work correctly, the student data must be complete, approved, duplicate-safe, and properly scoped.

