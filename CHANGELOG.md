# MeeladPulse Changelog

All notable changes for the SaaS institution-management version are documented here.

## Unreleased — 2026-07-15

### Added

- Added the Super Admin Institution Portal as the SaaS owner control center for creating institutions, admin credentials, subscription status, payment details, and scoped festival workspaces.
- Added visible Super Admin header tabs for All Institutions, Purchased, Trial, Deactivated, Profile, and Logout.
- Added institution table actions for editing, copying share links, deactivating/reactivating, and deleting institutions.
- Added a professional Copy Link modal that generates a complete share message with admin login, admin portal, public portal, team login, judge login, and credentials.
- Added editable share-message formatting so Super Admin can customize the copied message before sharing.
- Added Super Admin profile viewing from the portal header.
- Added public `institutionLogins/{usernameLower}` lookup support for manual institution-admin login.
- Added scoped `manualUsers/{usernameLower}` records under each institution festival.

### Changed

- Reworked subscription/payment control to use only three statuses: `trial`, `active`, and `suspended`.
- Removed the previous premium-plan workflow from the active subscription UI.
- Changed active/paid subscriptions to support monthly, yearly, custom date, and unlimited durations with amount and reference number.
- Changed trial subscriptions to store trial start, trial day count, and trial end date.
- Updated login and route-guard behavior so `institutionAdmin` can enter `admin/app.html` after successful manual login.
- Updated subscription blocking so suspended, expired trial, and expired paid accounts are denied before private pages load.
- Updated documentation to describe the current SaaS architecture, login flow, subscription model, deployment checklist, and production hardening roadmap.

### Fixed

- Fixed the previous institution-admin login failure caused by relying only on protected/scoped documents before authentication context was fully established.
- Fixed admin route fallback issues by preserving `institutionId` and `festivalId` from copied links and successful manual login.
- Fixed unclear login failures by documenting username, password, subscription, and rules-deployment failure categories.
- Fixed stale documentation that still described the app as blocked or as a legacy top-level festival system.

### Removed

- Removed stale point-in-time documentation files: `FINAL_TEST_REPORT.md`, `FINAL_HANDOVER.md`, `DEPLOYMENT_STATUS.md`, and `KNOWN_LIMITATIONS.md`.
- Consolidated relevant operational notes from those files into `README.md` and `docs/SAAS_IMPLEMENTATION_PROMPT.md`.

## 1.3.0 — 2026-07-14

### Added

- Added offline write-blocking helpers for sensitive final submissions, publication, approval, backup restore, certificate revocation, and invitation creation.
- Added centralized backup service support.

### Fixed

- Clarified client-side invitation hashing behavior and Firebase Auth/Firestore non-atomic account creation constraints.

## 1.2.0 — 2026-07-14

### Added

- Added Firestore search-index helpers for public results.
- Added normalized result fields for chest numbers, competition codes, names, divisions, and performance types.

### Optimized

- Improved public result querying by using index-driven matching rather than broad client-side scans.
