# MeeladPulse — Deployment Status

**CURRENT FACTUAL STATUS**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED**

This document contains the official build status, deployment parameters, and configuration checklists.

---

## 1. Deployment Profile

- **Target Environment**: Google Cloud Run (Hosting container) / Firebase Hosting (Frontend asset server)
- **Database Engine**: Google Cloud Firestore (Native Mode)
- **Authentication**: Firebase Authentication (Email/Password Provider)
- **Deployment Status**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED** (The application linter passes and the production bundles compile cleanly. However, connection to Firestore requires deploying security rules manually or via Firebase CLI from an approved environment with full project credentials).

---

## 2. Configuration Parameters

The database environment is configured under the following ID matching the active `assets/js/firebase-config.js` script:
- **Firestore Database ID**: `ai-studio-e05927b5-3953-4883-969d-1099cafe3237`

---

## 3. Post-Deployment Checklist

When migrating to a live production environment, complete the following:
1. Ensure the Google Cloud Firestore instance matches `ai-studio-e05927b5-3953-4883-969d-1099cafe3237`.
2. Configure `.env.example` variables inside the platform's Settings menu.
3. Deploy the compiled rules file `/firestore.rules` using the Firebase CLI or copy-paste directly into the Firebase Web Console:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Deploy Firestore Indexes from `/firestore.indexes.json` to optimize search:
   ```bash
   firebase deploy --only firestore:indexes
   ```
5. Confirm user activation emails and password resets work correctly by testing under the live production domain.
