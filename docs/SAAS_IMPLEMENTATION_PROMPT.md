# MeeladPulse SaaS Multi-Institution Implementation Prompt

## Already started in this codebase

- `superAdmin` is routed to the selector portal.
- The selector portal has a first super-admin workspace manager.
- Newly created workspaces save basic SaaS metadata: `plan`, `subscriptionStatus`, `active`, and `institutionId`.
- The dashboard has a setup roadmap and scoped share-link generator.
- Firestore rules now include a first `/institutions/{institutionId}/festivals/{festivalId}` scoped rules block.
- Client helpers now expose `getActiveScope()` and `getScopedFestivalPath()` while keeping legacy `getActiveFestivalId()` during migration.
- Team leader credentials are now written to both legacy `manualUsers` and scoped `institutions/{institutionId}/festivals/{festivalId}/manualUsers`.
- Username/password login checks scoped manual users first when a scoped login link provides institution/festival context.
- A conservative migration script exists at `scripts/migrate-festivals-to-institutions.mjs`.

## Remaining production migration prompt

Implement the remaining premium SaaS architecture in phases:

1. Convert every data service from legacy `festivals/{festivalId}` reads/writes to `institutions/{institutionId}/festivals/{festivalId}` using `getScopedFestivalPath()`.
2. Add `institutionId` and `allowedFestivalIds` to every Firebase admin profile and backfill old admin documents.
3. Move manual judge/team leader credentials from global `manualUsers` to `institutions/{institutionId}/festivals/{festivalId}/manualUsers`.
4. Update team and judge login so username/password lookups read only from the selected institution/festival scoped `manualUsers` collection.
5. Run and verify `scripts/migrate-festivals-to-institutions.mjs` against production data after configuring Firebase Admin credentials.
6. Replace plaintext manual passwords with salted password hashes or a Firebase Function-based credential check before production.
7. Update Firestore Security Rules to remove broad legacy `/festivals/{festId}` writes after migration is complete.
8. Add subscription dates and payment states: `trialEndsAt`, `subscriptionEndsAt`, `paymentStatus`, `suspendedReason`.
9. Block inactive/expired institutions from admin, judge, team, and private result pages.
10. Add dedicated super-admin pages:
    - `super-admin/dashboard.html`
    - `super-admin/institutions.html`
    - `super-admin/subscriptions.html`
    - `super-admin/usage.html`
11. Add institution admin creation from the super-admin portal.
12. Add usage limits per plan: max students, max competitions, max judges, max team leaders, max public result views.
13. Generate signed/shareable links for admin, judge, team, public result, live scoreboard, certificate verification, and result search.
14. Add Firestore indexes for institution/festival scoped dashboards.
15. Add audit logs for super-admin actions: create, activate, deactivate, delete, subscription update, admin creation.

## Acceptance criteria

- A super admin can create, activate, deactivate, delete, and open institution workspaces.
- Institution admins can only access their own institution/festival.
- Team leaders can only access their own team.
- Judges can only access assigned competitions.
- Public users can only read published public data.
- Expired or inactive subscriptions block private portals.
- No Firestore collection mixes data between institutions after migration.
