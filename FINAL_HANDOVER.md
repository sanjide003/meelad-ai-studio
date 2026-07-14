# MeeladPulse — Final Handover Documentation

**CURRENT FACTUAL STATUS**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED**

This document serves as the complete Handover Manual for the MeeladPulse Management Node and Public Portal application.

---

## 1. System Architecture & Core Philosophy

MeeladPulse is a responsive multi-page web application (MPA) built without client-side frameworks or routers. It leverages vanilla HTML5, Tailwind CSS, and ES Modules connecting directly to Firebase Services.

### 1.1 Core Foundations
- **Static Multi-Page Structure**: Each dashboard view is a standalone, physical HTML page. This guarantees browser loading states and native browser history.
- **Serverless Firebase Backbone**: All application states are managed in Google Cloud Firestore and secured through Firestore Security Rules.
- **Local Language Swapping (Malayalam / English)**: Dynamic translation files (`translations-ml.js` and `translations-en.js`) drive real-time localization of dashboards and forms.

---

## 2. Cryptographic Invitation & Account Creation Engine

MeeladPulse manages institutional access using secure cryptographic invitation tokens.

```
[Admin Creates Invite] 
       │
       ▼
Generate 32-Byte Key ──► Client-Side Hash SHA-256 ──► Save in `/userInvitations/{sha256Hash}`
       │
       ▼
Format Invitation URL (e.g., `/activate-account.html?token=base64UrlKey`)
       │
       ▼
[User Clicks Link] ────► Client-Side Hash URL token ──► Match in Firestore ──► Activate Account
```

### 2.1 Technical Walkthrough
1. **Token Generation**: The system uses `crypto.getRandomValues()` to generate a 32-byte secure random string, formatted as a hex string.
2. **Client-Side Token Hashing**: The raw token is immediately hashed client-side using `SHA-256`. The resulting hex-encoded string is saved in Firestore at `/userInvitations/{tokenHash}`. The raw token is **never** saved in the database, protecting invitations from exposure in logs or database backups.
3. **One-Time Activation Flow**:
   - The user receives an activation link containing the raw token.
   - Upon loading `/activate-account.html`, the system hashes the URL token client-side and queries `/userInvitations/{tokenHash}`.
   - If the token matches and its status is `pending`, the user is allowed to choose their password and register.
4. **Non-Atomic Security Design**:
   - **Crucial Architectural Detail**: Firebase Authentication user creation and Firestore writes are **not atomic**. They cannot be bundled into a single transaction or WriteBatch.
   - **Sequence**: First, the authentication user credentials are created via `createUserWithEmailAndPassword`. Next, the user profile is written to `/users/{uid}`, and the invitation status is updated to `used`. If the Firestore write is interrupted, the Authentication record will exist without a matching Firestore document. The login system handles this edge case by verifying both authentication and profile existence on login.

---

## 3. Strict Permission & Role-Based Access Framework

The application supports three administrative roles and a public portal scope:

### 3.1 Role Hierarchy & Scopes
1. **Head Administrator (`admin`)**:
   - Access to all datasets, festival configurations, audit logs, and settings.
2. **Team Leader (`teamLeader`)**:
   - Bound strictly to a specific `teamId`. Permitted to register students and manage competition entries for their team.
3. **Judge Panelist (`judge`)**:
   - Permitted to see only their assigned competitions and submit marks sheets. No visibility of other judges' marks, student registries, or team lists.
4. **Anonymous Public**:
   - Read-only access to published schedules, announcements, team rankings, live scoreboard, and published results under `/publicData` subcollections.

### 3.2 Secure Multi-Stage Route Guard
The system utilizes a client-side route guard (`/assets/js/role-guard.js`) that runs sequentially on page-load:
1. Obtains the authenticated user state via `onAuthStateChanged`.
2. Fetches the associated profile from `/users/{uid}`.
3. Verifies that the user role matches the required dashboard directory (e.g., `/admin/*` requires `role == 'admin'`).
4. Ensures the user account status is `active`.
5. Redirects to `/login.html` if unauthenticated, or `/unauthorized.html` if permission checks fail.

---

## 4. Judge Station & Digital Mark Sheet Workflow

The judging workflow is engineered to enforce data integrity and prevent post-submission tampering.

### 4.1 Canonical Status Life Cycle
The application standardizes on the following canonical status values across services and documentation:
1. **`draft`**: The judge has saved marks locally or pre-committed them to Firestore as a draft. The judge can continue editing.
2. **`final`**: The judge has performed the final marksheet submission. The sheet is locked and read-only for the judge.
3. **`verified`**: The administrator has reviewed and approved the marksheet, allowing the results to be prepared for publication.
4. **`published`**: Official standings and results are published to the public portal and made available for public lookup.

### 4.2 State Flow Lifecycle
- **Assigned**: Admin creates a `judgeAssignment` linking a judge's user ID to a competition.
- **Draft**: The judge inputs scores and can save their work. The marksheet document has status `draft`.
- **Submitted**: Once the judge performs the final submit, status transitions to `final`. The sheet becomes strictly read-only for the judge.
- **Correction Required / Reopened**: If the Admin reviews the submitted scores and finds issues, they can return the sheet with an audit note, reverting the status to `draft` (or `correction_required`) so the judge can update and resubmit.
- **Verified / Approved**: The Admin approves the marksheet, transitioning the competition result status to `Approved`.

---

## 5. Public Portal & Normalized Search Engine

The Public Portal is decoupled from the core private transaction database to ensure security and read performance.

### 5.1 Public Path Mapping
All public data is published to dedicated subcollections under the active festival:
- **Schedules**: `festivals/{festId}/publicData/schedules`
- **Announcements**: `festivals/{festId}/publicData/announcements`
- **Results**: `festivals/{festId}/publicData/results/{compId}`
- **Rankings**: `festivals/{festId}/publicData/rankings/teams`

### 5.2 Dynamic Normalization
To prevent data-matching failures arising from language switches or manual typos, MeeladPulse utilizes a normalization service (`/assets/js/public-data-normalizer.js`):
- All names, codes, and chest numbers are lowercased and stripped of whitespace, punctuation, and non-alphanumeric characters.
- Visible labels are mapped to stable machine codes:
  - **Arts/Sports**: Unified via `divisionCode` matching (`arts` or `sports`).
  - **On-Stage/Off-Stage**: Normalized to `stage` and `nonStage`.

### 5.3 Index-Driven Search Architecture
The search engine is completely index-driven to protect core data and secure PII:
- **Exact Matches**: Directly queries Firestore indexes using `where("competitionCodeNormalized", "==", ...)` or `where("winnerChestNumbers", "array-contains", ...)`.
- **Name Prefix Search**: Executes direct Firestore query matching on prefix lists (`where("namePrefixes", "array-contains", ...)`) over the public search-index collection `publicData/searchIndex`, ensuring database-backed accuracy across the complete published dataset.

---

## 6. Offline Write-Blocking Policy

To protect database consistency, all final and administrative write operations are blocked while the client is offline (`navigator.onLine === false`). These operations are **never** automatically queued, cached, or replayed upon reconnection:
1. **Judge Final Submission** (Transitioning marks from `draft` to `final` status)
2. **Result Approval** (Approving Tabulated Results)
3. **Result Publication** (Publishing official standings)
4. **Student Approval**
5. **Student Rejection**
6. **Registration Mode Change** (Updating festival settings)
7. **Manual Override** (Modifying scores manually)
8. **Backup Restore** (Restoring database backups)
9. **Certificate Revocation**
10. **Invitation Creation** (Generating user invitations)

When a user attempts any of these actions while offline, the system intercepts the write, aborts the operation, displays a Malayalam and English warning, and requires the user to manually trigger the operation again (and confirm) once connectivity is restored.

---

## 7. Championship Totals & Configurable Tie-Breaking Algorithms

The scoreboard calculations are mathematically consistent and highly configurable.

### 7.1 Point Tabulations
- **Arts vs. Sports**: Totals are aggregated separately based on normalized division codes.
- **Individual Champions**: Tabulated per Category (e.g., Sub-Junior, Junior) using a dynamic tie-breaking sequence loaded directly from the Festival settings.
- **Configurable Sequence Options**: Admins can select and prioritize 12 distinct criteria:
  - `totalPoints` (Sum of individual competition points)
  - `firstPlaceCount` (Count of 1st places)
  - `secondPlaceCount` (Count of 2nd places)
  - `thirdPlaceCount` (Count of 3rd places)
  - `aGradeCount` (Count of A grade achievements)
  - `averagePercentage` (Sum of score percentages divided by participation count)
  - `rawScoreSum` (Total raw marks earned)
  - `stagePoints` (Stage vs. Off-stage priority points)
  - `youngerAge` (Age priority: younger student wins)
  - `olderAge` (Age priority: older student wins)
  - `jointChampion` / `joint` (Acknowledge joint champions)
  - `adminDecision` / `unresolved` (Fallback for admin manual override)
- **DOB Protection**: If age priority is enabled, the student's Date of Birth is read strictly in memory from authorized secure collections and is **never** copied or saved to any public document.
- **Tie Resolution & Status**: When configured tie-break rules cannot resolve a tie, competitors are assigned the same rank and marked as `tieStatus: 'joint'` or `tieStatus: 'unresolved'`.
- **Admin Manual Override**: Allows administrators to break extreme ties manually via the admin dashboard, saving `tieBrokenByAdmin = true` and updating ranks and statuses securely.
