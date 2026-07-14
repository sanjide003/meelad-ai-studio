# MeeladPulse Management Node

**CURRENT FACTUAL STATUS**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED**

MeeladPulse is a high-precision, multi-page web application built with vanilla HTML, modern Tailwind CSS, and standard ES Module Javascript connecting directly to Firebase Firestore and Authentication.

## Core Architectural Design

- **Static Multi-Page Architecture**: Strictly built as real HTML entry pages (`login.html`, `forgot-password.html`, `activate-account.html`, etc.) mapped as compilation outputs in Vite, completely bypassing client-side virtual routing or hash navigation.
- **Pristine Responsive Navigation**:
  - **Mobile Screens (< 1024px)**: Uses a sticky top header with a dropdown vertical menu that pushes page content down smoothly, without cover overlays or drawer sliding.
  - **Desktop Screens (>= 1024px)**: Employs a 260px wide left sidebar kept side-by-side with the main workspace content. Includes automatic highlighting of active page links and auto-expansion of active accordion parent groups.
- **Cryptographic Account Invitations**: Admin generated tokens leverage a secure 32-byte randomized key (`crypto.getRandomValues`). Stored in Firestore as native Web Crypto SHA-256 hashes inside `userInvitations/{tokenHash}`. Raw keys are visible only once to administrators.
- **Strict Role-Based Security**: Users are authenticated and verified strictly through Firestore `users/{uid}` matching. Judges are restricted to their assigned evaluation competitions, and Team Leaders are restricted to their team codes.
- **Offline Write-Blocking**: Sensitive final operations (such as judge final submissions, result publications, approvals, settings modifications, and database backup restorations) are blocked while offline and are never automatically queued, cached, or replayed.

## Project Structure Map

```text
/
├── login.html                   # English & Malayalam translation-aware login screen
├── forgot-password.html          # Standard Firebase email recover card
├── activate-account.html         # Form featuring real-time password security checklists
├── select-fest.html              # Dynamic active festival selection scope router
├── unauthorized.html             # Access denied reason display page
├── service-worker.js             # Offline portal cached shell controller
│
├── components/
│   ├── admin-header.html         # Dynamic header segment for administrators
│   ├── admin-sidebar.html        # Fixed side navigation for administrators
│   ├── judge-header.html         # Custom header segment for panel judges
│   ├── judge-sidebar.html        # Custom side navigation for panel judges
│   ├── team-header.html          # Custom header segment for team leaders
│   └── team-sidebar.html         # Custom side navigation for team leaders
│
├── assets/
│   ├── css/
│   │   ├── variables.css         # Visual theme variables
│   │   ├── main.css              # Main central entry style
│   │   ├── components.css        # Interactive transition rules
│   │   ├── login.css             # Login-specific styling rules
│   │   └── responsive.css        # Scroll helper styles
│   └── js/
│       ├── firebase-config.js    # Firebase cluster keys
│       ├── firebase-init.js      # App, Auth and Firestore SDK boots
│       ├── auth.js               # Secure 9-step login procedures
│       ├── role-guard.js         # Sequential route and active status validator
│       ├── permissions.js        # Active wildcard permission checker
│       ├── component-loader.js   # Dynamic fetch and load utility
│       ├── navigation.js         # Mobile dropdown and active menu highlights
│       ├── invitation-service.js # 32-byte SHA-256 token hashing engine
│       ├── network-status.js     # Offline status utility and write blocker
│       └── backup-service.js     # Database backup and restore operations
│
├── admin/
│   ├── dashboard.html            # Main Head Administrator dashboard terminal
│   ├── users.html                # Roster lists featuring toggle activation keys
│   └── user-invitations.html     # Cryptographic invitation generator
│   └── backup-restore.html       # Database backup and restore panel
│
├── judge/
│   └── dashboard.html            # Roster list showing strictly assigned judge items
│
├── team/
│   └── dashboard.html            # Student registers and correction request queues
│
├── firestore.rules               # Advanced role security access control configuration
└── firestore.indexes.json        # Index lists
```

## Running the Development Server

1. Install local dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to preview.

3. To build and compile for container production:
   ```bash
   npm run build
   ```
