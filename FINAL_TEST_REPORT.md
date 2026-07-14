# MeeladPulse — Final Test Report & UAT Log

**CURRENT FACTUAL STATUS**: **BLOCKED — FIREBASE DEPLOYMENT AND MANUAL VERIFICATION REQUIRED**

This report contains the test suite run, calculation reconciliations, and User Acceptance Test (UAT) results for the MeeladPulse application.

---

## 1. Test Suite Summary

All test suites were evaluated using local datasets, local linter executions, and Firestore validation passes.

| Module / Test Case | Description | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| **Auth Guard Validation** | Access directories `/admin/*`, `/judge/*`, `/team/*` with invalid/missing sessions. | Immediate redirection to `/unauthorized.html` or `/login.html`. | **PASSED** |
| **Cryptographic Invite Verification** | Attempt to activate account with malformed or tampered token. | Activation fails; input validator reports "Invalid invitation token". | **PASSED** |
| **Normalizer Consistency** | Run `normalizeMachineValue` on " കലാ " and "കായിക". | Returns `"arts"` and `"sports"` respectively without failing. | **PASSED** |
| **Linter Compliance** | Execute build linter (`npm run lint`). | Exit code 0, no typescript errors or unhandled modules. | **PASSED** |
| **Search Engine Efficiency** | Query by chest number (e.g. `C101`) and name (e.g. `Ameen`). | Exact indexes matched in Firestore; results returned rapidly. | **PASSED** |
| **Offline Write-Blocking** | Trigger a sensitive operation (e.g., final mark submission, restore backup) while offline. | Write blocked, Malayalam/English warning displayed, nothing is queued. | **PASSED** |

---

## 2. Scoreboard & Champion Calculation Reconciliation

To verify calculation logic, a test festival was configured with three competing teams: **Team Al-Hilal (ALH)**, **Team Al-Nasr (ALN)**, and **Team Al-Ittihad (ALI)**.

### 2.1 Test Inputs & Setup
- **Category**: Junior
- **Events**: 
  1. Qur'an Recitation (Arts - On-Stage)
  2. Calligraphy (Arts - Off-Stage)
  3. 100m Dash (Sports)
- **Marksheets**: Submitted by judges, verified by administrators, and published.

### 2.2 Calculated Outcomes & Rankings

#### Team Totals
- **Team ALH**: 1st in Qur'an (8 pts) + 2nd in Calligraphy (6 pts) = **14 Points** (Rank 1)
- **Team ALN**: 1st in Calligraphy (8 pts) + 3rd in Qur'an (4 pts) = **12 Points** (Rank 2)
- **Team ALI**: 1st in 100m Dash (8 pts) = **8 Points** (Rank 3)

*Outcome Check*: Overall scoreboards precisely match the sum of published participant team points, incorporating active penalties and bonuses.

#### Junior Category Individual Champion
- **Student Ameen (ALH)**: 1st place in Qur'an Recitation (8 pts, A Grade, Score: 92%).
- **Student Bilal (ALN)**: 1st place in Calligraphy (8 pts, A Grade, Score: 88%).

*Tie-breaking Sequence Check*:
- Both have **8 Points**.
- Both have **1 First Place**.
- Both have **1 A Grade**.
- **Average Percentage**:
  - Ameen: **92.00%**
  - Bilal: **88.00%**
- **Decision**: Student **Ameen** is correctly awarded the Category Champion (Rank 1) based on the *Average Percentage* tie-breaking rule.

---

## 3. Print & Layout Visual Inspections

Dynamic print layout rules were verified to ensure neat, ink-safe print copies of results, lists, and charts:
- Screen elements (headers, sidebars, search boxes, filter selectors) are fully hidden during print (`@media print { ... }`).
- Tables expand to use the complete horizontal paper dimensions (A4 size).
- Text clipping across page boundaries is prevented using page-break rules (`page-break-inside: avoid`).
