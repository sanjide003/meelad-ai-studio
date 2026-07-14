# SaaS Institution Scope Completion Notes

## Completed in this codebase

- Runtime festival reads/writes now use the scoped path model: `institutions/{institutionId}/festivals/{festivalId}`.
- `select-fest.html` is now an institution workspace portal for the application owner / Super Admin instead of a top-level festival list.
- Institution workspaces create both the institution document and its default scoped festival document.
- Team/Judge manual username-password users are resolved only from scoped `manualUsers` under the selected institution/festival.
- Shared Admin/Team/Judge/Public links carry `institution` and `festival` query parameters so data does not mix across institutions.
- Existing static pages keep compatibility by using the shared scope helper instead of hard-coded collection paths.

## Remaining production hardening checklist

1. Deploy Firestore rules and verify every role with a real Firebase project: Super Admin, Institution Admin, Judge, Team Leader, Public.
2. Create the first Super Admin profile in `users/{uid}` with `role: "superAdmin"` and `active: true`.
3. Create Institution Admin profiles with `role: "admin"` or `role: "institutionAdmin"`, `institutionId`, and `active: true`.
4. Verify subscription blocking statuses: `inactive`, `expired`, `payment_due`, and `suspended`.
5. Add Cloud Function / server-side Admin SDK support for password hashing and secure recursive institution deletion.
6. Replace plain manual user passwords with hashed passwords before public launch.
7. Add automated Firebase emulator tests for institution isolation and role-based access.
8. Add signed or tokenized public/team/judge share links if links must be revocable.
