# MeeladPulse SaaS Multi-Institution Implementation Prompt

Implement the remaining premium SaaS architecture in phases:

1. Add `superAdmin` as the application-owner role.
2. Add `institutionId` to every Firebase admin profile.
3. Replace global festival paths from `festivals/{festivalId}` to `institutions/{institutionId}/festivals/{festivalId}`.
4. Move manual judge/team leader credentials from global `manualUsers` to `institutions/{institutionId}/festivals/{festivalId}/manualUsers`.
5. Update `getActiveFestivalId()` into `getActiveScope()` returning `{ institutionId, festivalId }`.
6. Update every Firestore service to use scoped paths and reject missing scope.
7. Convert `select-fest.html` into a dual-mode portal:
   - `superAdmin`: institution/festival subscription manager.
   - `institutionAdmin`: own institution/festival selector only.
8. Add Firestore security rules that enforce institution-level access server-side.
9. Add super admin pages:
   - `super-admin/dashboard.html`
   - `super-admin/institutions.html`
   - `super-admin/subscriptions.html`
   - `super-admin/usage.html`
10. Add subscription fields to each institution/festival:
    - `plan`
    - `subscriptionStatus`
    - `subscriptionEndsAt`
    - `active`
    - `ownerUid`
    - `adminUids`
11. Block inactive/expired institutions before admin, judge, or team access.
12. Add share-link generation for admin, judge, team, public result, live scoreboard, and verification portals.
13. Add migration script for existing `festivals/*` data into `institutions/{institutionId}/festivals/*`.
14. Replace plaintext manual passwords with password hashes before production.

Acceptance criteria:
- A super admin can create, activate, deactivate, and delete institutions/festivals.
- Institution admins can only access their own institution/festival.
- Team leaders can only access their own team.
- Judges can only access assigned competitions.
- Public users can only read published public data.
- No Firestore collection mixes data between institutions.
