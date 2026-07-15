# MeeladPulse SaaS Competition Platform

MeeladPulse is a Firebase-backed, static multi-page competition management platform for institution customers. The current direction is a SaaS owner model: one Super Admin manages institutions, subscriptions, activation status, scoped festival workspaces, and shareable portal links while each institution works only inside its own workspace.

## Current Application Status

- **Frontend architecture:** Static HTML pages, Tailwind-based styling, and ES module JavaScript compiled by Vite.
- **Backend services:** Firebase Authentication and Cloud Firestore, secured by `firestore.rules`.
- **Tenant model:** Institution data is scoped under `institutions/{institutionId}/festivals/{festivalId}` so one institution cannot mix data with another.
- **Super Admin portal:** `select-fest.html` is the SaaS owner control center for institution onboarding, subscription/payment control, activation/suspension, profile viewing, and formatted link sharing.
- **Institution admin login:** Institution admins can sign in from `login.html` using the username/password created by the Super Admin. Successful manual institution-admin login stores the selected institution/festival context and opens `admin/app.html`.
- **Deployment note:** Local build and lint can be verified in this repository, but live login/subscription behavior also requires deploying the latest hosting files and Firestore rules to Firebase.

## Roles and Portals

| Role | Main entry | Current behavior |
| --- | --- | --- |
| Super Admin | `select-fest.html` | Manages all institutions, tabs, profile, subscriptions, credentials, and share links. |
| Institution Admin | `login.html?institution=<institutionId>&festival=<festivalId>` | Logs in with Super Admin-created manual credentials and enters `admin/app.html` for the scoped festival. |
| Team Leader | `login.html?institution=<institutionId>&festival=<festivalId>` | Uses scoped manual/team credentials for the institution workspace. |
| Judge | `login.html?institution=<institutionId>&festival=<festivalId>` | Uses scoped judge credentials and assigned competition access. |
| Public visitor | `public/index.html?institution=<institutionId>&festival=<festivalId>` | Reads public schedules, announcements, rankings, and results for the selected workspace. |

## Super Admin Control Center

The Super Admin portal is intentionally organized as visible header tabs instead of a hidden hamburger-only menu. The current tabs are:

1. **All Institutions** — shows every institution workspace.
2. **Purchased** — filters active/paid institutions.
3. **Trial** — filters trial institutions and their expiry warnings.
4. **Deactivated** — filters suspended/deactivated institutions.
5. **Profile** — opens Super Admin details. Firebase Auth passwords cannot be displayed back to the browser; reset/update must happen through secure auth flows.
6. **Logout** — ends the current Super Admin session on that browser.

Each institution row provides professional action buttons for editing, copying links, deactivating/reactivating, and deleting. The copy-link action opens a popup containing a complete share message with admin login, admin portal, public portal, team login, judge login, username/password, and a short MeeladPulse description. Super Admin can edit the share format before copying.

## Subscription and Access Model

The payment/subscription editor follows only three subscription statuses:

| Status | Required fields | Access result |
| --- | --- | --- |
| `trial` | Trial start date, trial day count, trial end date | Access is allowed only until the trial end date. |
| `active` | Purchase duration, start/end date or unlimited, amount, reference number | Access is allowed while the paid period is valid, or forever when unlimited is selected. |
| `suspended` | Suspension status/reason | Access is blocked immediately. |

The previous premium-plan concept is removed from the current workflow. The guard blocks expired trials, expired paid periods, and suspended institutions before private pages load.

## Authentication and Login Flow

Institution-admin manual login now uses a two-level Firestore record strategy:

1. **Public lookup index:** `institutionLogins/{usernameLower}` is readable by the login page and stores the institution/festival pointer, role, subscription state, and manual credential metadata needed for login validation.
2. **Scoped user record:** `institutions/{institutionId}/festivals/{festivalId}/manualUsers/{usernameLower}` stores the workspace-bound manual user profile.

On login failure, the login script distinguishes common causes where possible:

- Username not found.
- Password does not match the selected username.
- Institution is suspended.
- Trial or paid subscription has expired.
- Firebase/Firestore permissions are not deployed correctly.

If login succeeds, `role-guard.js` accepts `institutionAdmin` for admin pages, reads the saved institution/festival context, verifies subscription status from the login index, and opens the admin control center without falling back to an unscoped festival.

## Multi-Device Super Admin Sessions

The current implementation does **not** enforce a single-device lock for the Super Admin. Firebase Authentication allows the same account to stay signed in on more than one browser/device unless the project adds custom session-revocation logic. This means the Super Admin can use multiple devices at the same time, and each device will read the latest Firestore data after refresh or realtime reload.

## Data Model Summary

```text
institutions/{institutionId}
  ├── name, slug, ownerEmail, active
  ├── subscriptionStatus: trial | active | suspended
  ├── trialStartDate, trialEndDate, trialDays
  ├── purchaseDuration, subscriptionStartDate, subscriptionEndDate
  ├── paymentAmount, paymentReference
  └── festivals/{festivalId}
      ├── default scoped festival settings
      ├── manualUsers/{usernameLower}
      ├── students/*
      ├── teams/*
      ├── judges/*
      ├── competitions/*
      └── publicData/*

institutionLogins/{usernameLower}
  └── public login lookup for manual institution credentials and subscription checks
```

Legacy top-level `festivals/{festivalId}` access should remain disabled for new SaaS flows to prevent cross-institution data mixing.

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server runs on port `3000` by default.

## Verification Commands

Run these before deployment or handover:

```bash
npm run lint
npm run build
git diff --check
```

## Deployment Checklist

1. Build the latest static app with `npm run build`.
2. Deploy the latest hosting bundle so browsers receive the current `login.html`, `select-fest.html`, `assets/js/auth.js`, and `assets/js/role-guard.js`.
3. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Deploy Firestore indexes when changed:
   ```bash
   firebase deploy --only firestore:indexes
   ```
5. Confirm there is a Super Admin Firebase Auth user with `users/{uid}.role = "superAdmin"` and `active = true`.
6. In the Super Admin portal, create or update an institution and confirm `institutionLogins/{usernameLower}` and the scoped `manualUsers/{usernameLower}` record are both written.
7. Test copied admin, public, team, and judge links in a fresh browser profile or incognito window.

## Production Hardening Roadmap

The static-only implementation is suitable for current validation, but production with real customers should add server-side hardening:

- Move manual password creation/verification to Cloud Functions or Firebase Auth custom accounts.
- Store only password hashes, never plaintext passwords, in Firestore.
- Add Firebase Emulator tests for subscription blocking, manual login, and institution isolation.
- Add audited recursive deletion for institutions through Admin SDK.
- Add revocable signed share links if customer links must expire independently of subscription status.
