# MeeladPulse SaaS Implementation Status and Roadmap

This document is the canonical implementation brief for the current SaaS version of MeeladPulse. It replaces older point-in-time handover, limitation, test-report, and deployment-status notes.

## Product Goal

MeeladPulse must operate as a SaaS competition platform where the application owner signs in as Super Admin, creates institution workspaces, assigns institution-admin credentials, controls trial/paid/suspended access, and shares ready-to-use portal links. Institution admins, team leaders, judges, and public users must remain scoped to the selected institution and festival.

## Current Completed Scope

- `select-fest.html` is the Super Admin Institution Portal rather than a simple festival selector.
- Super Admin navigation is visible as header tabs: All Institutions, Purchased, Trial, Deactivated, Profile, and Logout.
- Institutions are listed in a table with clear action controls for edit, copy link, deactivate/reactivate, and delete.
- Institution edit separates identity/login details from payment and subscription controls.
- Subscription status is limited to `trial`, `active`, and `suspended`.
- Trial access supports start date, day count, and end date.
- Active/paid access supports monthly, yearly, custom date, and unlimited durations, plus amount and payment reference.
- Suspended institutions are blocked immediately.
- Copy Link opens a modal with a complete readonly share message and an edit-format mode for Super Admin customization.
- Shared links include institution and festival query parameters for admin, team, judge, and public pages.
- Institution-admin manual login writes/reads a public `institutionLogins/{usernameLower}` lookup and a scoped `manualUsers/{usernameLower}` record.
- Manual login creates an anonymous Firebase session profile in `users/{uid}` so Firestore rules can enforce scoped institution access after the password is verified.
- `role-guard.js` accepts `institutionAdmin` for admin routes and validates subscription state from the login lookup.
- Firestore rules support public reads of `institutionLogins` while limiting writes to Super Admin.
- Legacy top-level festival access is no longer the preferred SaaS path.

## Required Firestore Shape

```text
users/{uid}
  role: superAdmin | admin | institutionAdmin | judge | teamLeader
  active: true | false
  institutionId?: string

institutionLogins/{usernameLower}
  username: string
  password: string
  role: institutionAdmin
  institutionId: string
  festivalId: string
  active: boolean
  subscriptionStatus: trial | active | suspended
  trialStartDate?: YYYY-MM-DD
  trialEndDate?: YYYY-MM-DD
  subscriptionStartDate?: YYYY-MM-DD
  subscriptionEndDate?: YYYY-MM-DD | unlimited
  purchaseDuration?: monthly | yearly | custom | unlimited
  paymentAmount?: number
  paymentReference?: string

institutions/{institutionId}/festivals/{festivalId}/manualUsers/{usernameLower}
  username: string
  password: string
  role: institutionAdmin | judge | teamLeader
  active: boolean
  institutionId: string
  festivalId: string
```

## Login and Access Acceptance Rules

1. A Super Admin can log in on multiple devices because no single-device lock is currently enforced.
2. An institution admin created by Super Admin must be able to log in from the copied admin-login link.
3. Incorrect username and incorrect password errors should be shown separately when the app can identify the cause.
4. A valid trial logs in only within the configured trial date range.
5. A valid paid account logs in within the configured paid date range or when duration is unlimited.
6. A suspended account is blocked immediately.
7. After successful login, the app must keep `institutionId` and `festivalId` in local storage/session context and must not fall back to an old top-level festival ID.
8. Admin, team, judge, and public links must include both `institution` and `festival` query parameters.

## Deployment Acceptance Checklist

Run these checks locally first:

```bash
npm run lint
npm run build
git diff --check
```

Then verify against Firebase:

1. Deploy hosting files and Firestore rules together.
2. Enable Firebase Authentication Email/Password and Anonymous providers.
3. Hard-refresh or open a private browser window to avoid stale cached JavaScript.
4. Confirm the Super Admin profile exists in `users/{uid}` with `role: "superAdmin"` and `active: true`.
5. Create a test institution with `subscriptionStatus: active` and unlimited duration.
6. Verify both `institutionLogins/{usernameLower}` and scoped `manualUsers/{usernameLower}` are created.
7. Copy the generated admin link and sign in from a clean browser profile.
8. Repeat with trial, expired trial, active paid, expired paid, and suspended states.
9. Confirm public/team/judge copied links open the correct scoped workspace.

## Security Hardening Before Real Production

The current static client flow can validate the SaaS workflow, but production should add server-side controls:

- Replace plaintext manual passwords with hashed passwords.
- Create/update institution admin users through Cloud Functions or Firebase Admin SDK.
- Use Firebase Auth custom claims or server-issued custom tokens for stronger role enforcement.
- Add emulator tests for institution isolation and subscription blocking.
- Implement audited, server-side recursive deletion for institutions.
- Add revocable signed share links if links must be invalidated without changing credentials.
