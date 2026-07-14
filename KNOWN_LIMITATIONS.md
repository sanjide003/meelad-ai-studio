# MeeladPulse — Known Limitations & Constraints

**CURRENT FACTUAL STATUS**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED**

This manual documents critical functional and architectural constraints within the MeeladPulse system.

---

## 1. Firestore Query Limits & Pagination

To maintain security and high performance, the search engine does not support general substring match (`LIKE '%term%'`) queries directly on Firestore indexes:
- **Alphanumeric Indexes**: Search queries are optimized for exact matches on Chest Numbers and Competition Codes.
- **Name Prefix Search**: Searching by Student Name uses a Name prefix search (`startsWith` pattern) compiled into a dedicated `publicData/searchIndex` collection. This allows users to query any competitor across the entire published dataset by the beginning of their name. No client-side fallbacks are utilized. For exact results, searching by **Chest Number** or **Competition Code** remains the most reliable method.

---

## 2. Multi-Session Integrity

- **Active Festival Context**: The system maintains the active festival ID in `localStorage` under `activeFestivalId`. If an administrator changes the active festival while another user has an open tab, that user's local dashboard will retain the previous festival context until they refresh the browser page.
- **Account Activation**: The cryptographic invitation token is designed for one-time use. Once an account is activated, the token becomes `used` and cannot be re-activated. If a user loses their password immediately after activation, they must use the `/forgot-password.html` flow instead of trying to click the activation link again.

---

## 3. PWA & Offline Service Worker Constraints

- **Submission Sync**: When offline, judges can input marks and save them locally as drafts (marked with canonical status `draft`). However, the final submission to Firestore requires an active network connection. Submitting a sheet while fully offline is strictly blocked.
- **Offline Write-Blocking**: Sensitive administrative and final operations are blocked when the application is offline (`navigator.onLine` is false). These operations are NOT queued or auto-replayed upon reconnection. The user will receive an offline warning and must manually trigger the action again when connectivity is restored. Blocked operations include:
  1. **Judge Final Submission** (Transitioning marks from `draft` to `final` status)
  2. **Result Approval** (Setting tabulated results status to approved)
  3. **Result Publication** (Publishing approved results)
  4. **Student Approval**
  5. **Student Rejection**
  6. **Registration Mode Change** (Updating festival registration configuration)
  7. **Manual Override** (Applying manual changes to tabulated scores)
  8. **Backup Restore** (Importing backup snapshots)
  9. **Certificate Revocation**
  10. **Invitation Creation** (Generating cryptographic invitations)
- **Offline Data Storage**: The Service Worker caches essential assets and static pages (`login.html`, dashboard templates, CSS, icons). It does not maintain complete offline copies of entire private databases to preserve security and client-side storage constraints.
