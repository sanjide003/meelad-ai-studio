# MeeladPulse — Changelog

**CURRENT FACTUAL STATUS**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED**

All notable changes implemented in this development cycle are documented below.

---

## [1.3.0] - 2026-07-14

### Added
- **Offline Write-Blocking Utility**: Created `/assets/js/network-status.js` with `isOffline()` and `assertOnline()` to check connections and display bilingual Malayalam/English warnings when sensitive writes are blocked.
- **Offline Protection on Core Services**: Integrated `assertOnline` blocking on 10 sensitive administrative and judge operations to prevent silent offline queuing/auto-replays:
  1. **Judge Final Submission** (in `/assets/js/mark-service.js`)
  2. **Result Approval** (in `/assets/js/result-engine.js`)
  3. **Result Publication** (in `/assets/js/result-action-service.js`)
  4. **Student Approval** (in `/assets/js/student-service.js`)
  5. **Student Rejection** (in `/assets/js/student-service.js`)
  6. **Registration Mode Change** (in `/assets/js/student-service.js`)
  7. **Backup Restore** (in `/assets/js/backup-service.js`)
  8. **Certificate Revocation** (in `/assets/js/certificate-service.js`)
  9. **Invitation Creation** (in `/assets/js/invitation-service.js`)
- **Centralized Backup Service**: Created `/assets/js/backup-service.js` to modularize backup exporting and snapshot restoration under strict online status guards.

### Fixed
- **Invitation Creation Architecture**: Documented that Firebase Authentication user creation and Firestore profile creation are not atomic due to Firebase platform limitations. Changed terminology to refer strictly to "Client-side SHA-256 token hashing".
- **Documentation Contradictions**: Fixed database ID references in `/DEPLOYMENT_STATUS.md` to correctly map to `ai-studio-e05927b5-3953-4883-969d-1099cafe3237`, aligned known limitations and final handovers with client-side hashing, and documented the canonical status model (`draft`, `final`, `verified`, `published`).

---

## [1.2.0] - 2026-07-14

### Added
- **Firestore Search Indexing Helpers**: Added `winnerChestNumbers` and `winnerNamesNormalized` top-level arrays to public results payload in `publishResult`.
- **Parallel Search Queries**: Added parallel index-driven Firestore querying in `queryPublicResultsWithFilters` for exact Chest Numbers and Competition Codes.
- **Dynamic Normalization Integrations**: Enabled default values for `displayNameNormalized`, `chestNumberNormalized`, and `teamId` when saving public-safe winners.

### Optimized
- **Firestore Read Efficiency**: Re-engineered the public search engine to run precise queries using index matching instead of scanning and downloading the entire results collection, reducing reads significantly.
- **Normalizer Robustness**: Cleaned trailing and leading whitespace, lowercased, and matched Malayalam and English character structures in search phrases.

### Fixed
- **Language-Independent Primary Filtering**: Handled stable `divisionCode` and `performanceType` assignments on result publication, avoiding dependency on Malayalam or English visible language strings.
- **Pagination Boundary Checks**: Enabled clean pagination using `startAfter` and `limit` for listing results, falling back cleanly to name scans.
- **Build & Compilation Compliance**: Resolved TypeScript checks to achieve a successful compiled build with zero lint warnings.
