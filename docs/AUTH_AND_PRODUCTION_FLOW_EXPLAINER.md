# Authentication, Portal Flow, and Production Operations Explained

## എന്തിനാണ് production commands ചെയ്യുന്നത്?

നമ്മൾ codebase-ൽ tenant isolation, Firestore rules, migration script എന്നിവ ചേർത്തിട്ടുണ്ട്. പക്ഷേ code repository-ൽ മാറ്റം വരുത്തിയാൽ മാത്രം production Firebase project-ൽ അത് active ആവില്ല.

### 1. `npm run build` / `npm run lint`

ഇത് production deploy ചെയ്യുന്നതിന് മുമ്പുള്ള safety check ആണ്.

- `npm run build`: application production bundle build ചെയ്യാൻ കഴിയുന്നുണ്ടോ പരിശോധിക്കുന്നു.
- `npm run lint`: TypeScript check വഴി import / syntax / type-level errors ഉണ്ടോ പരിശോധിക്കുന്നു.

ഇത് ചെയ്യാതെ deploy ചെയ്താൽ broken page production-ൽ പോകാനുള്ള chance ഉണ്ട്.

### 2. Firestore rules deploy

`firestore.rules` file repository-ൽ update ചെയ്തിട്ടുണ്ടെങ്കിലും Firebase Console/project-ൽ deploy ചെയ്താൽ മാത്രമേ rules active ആകൂ.

Rules deploy ചെയ്യേണ്ടത് എന്തിനാണ്:

- ഒരു institution admin മറ്റൊരു institution-ന്റെ `/users` കാണാതിരിക്കാൻ.
- Invitations list institution scoped ആക്കാൻ.
- Legacy top-level `students` / `users` access നിയന്ത്രിക്കാൻ.
- Client-side filter bypass ചെയ്താലും Firestore server തന്നെ access block ചെയ്യാൻ.

Command:

```bash
npx firebase-tools deploy --only firestore:rules
```

### 3. Data backfill / migration

പഴയ documents-ൽ `institutionId` / `festivalId` ഇല്ലെങ്കിൽ പുതിയ scoped query അവ കാണിക്കില്ല. അതിനാൽ പഴയ users/invitations documents-ൽ missing scope add ചെയ്യണം.

Migration എന്തിനാണ്:

- പഴയ users പുതിയ Accounts page-ൽ കാണാൻ.
- പഴയ invitations പുതിയ Invitations page-ൽ കാണാൻ.
- Firestore rules institution scope enforce ചെയ്യുമ്പോൾ പഴയ data inaccessible ആകാതിരിക്കാൻ.

Dry-run ആദ്യം ചെയ്യണം, കാരണം അത് database update ചെയ്യാതെ എന്ത് update ചെയ്യുമെന്ന് കാണിക്കും.

Write command dry-run ശരിയായാൽ മാത്രം ഉപയോഗിക്കണം.

## ഇപ്പോഴത്തെ login സംവിധാനങ്ങൾ

### Login page

`login.html` ആണ് common login entry. ഇവിടെ user email/username and password നൽകുന്നു. Scope URL-ൽ വന്നാൽ `institution` / `festival` values localStorage-ൽ save ചെയ്യും.

Login page രണ്ട് രീതിയിൽ login try ചെയ്യുന്നു:

1. Institution scope ഉണ്ടെങ്കിൽ manual institution login ആദ്യം try ചെയ്യും.
2. Scope ഇല്ലെങ്കിൽ email address ആണെങ്കിൽ Firebase Auth login try ചെയ്യും.
3. Firebase login fail ചെയ്താൽ manual username login fallback ആയി try ചെയ്യും.

### Firebase email/password login

`assets/js/auth.js`-ലെ `loginWithEmailAndPassword()` Firebase Auth ഉപയോഗിക്കുന്നു.

Flow:

1. Remember-me അനുസരിച്ച് persistence set ചെയ്യുന്നു.
2. Firebase email/password sign-in നടത്തുന്നു.
3. `/users/{uid}` Firestore profile fetch ചെയ്യുന്നു.
4. Profile ഇല്ലെങ്കിൽ sign out.
5. `active !== true` ആണെങ്കിൽ sign out.
6. Role അനുസരിച്ച് portal-ലേക്ക് redirect ചെയ്യുന്നു.

Redirect roles:

- `admin` → `admin/app.html`
- `judge` → `judge/dashboard.html`
- `teamLeader` → `team/dashboard.html`
- `superAdmin` → normal institution flow-ൽ block ചെയ്ത് unauthorized route-ലേക്ക് വിടുന്നു.

### Manual username/password login

`loginWithUsernamePassword()` institution/team/judge scoped login ആണ്.

Flow:

1. localStorage-ൽ selected `institutionId` / `festivalId` ഉണ്ടോ പരിശോധിക്കുന്നു.
2. ഉണ്ടെങ്കിൽ `institutions/{institutionId}/festivals/{festivalId}/manualUsers` collection-ൽ username search ചെയ്യുന്നു.
3. കിട്ടിയില്ലെങ്കിൽ `institutionLogins/{username}` top-level index fallback ആയി പരിശോധിക്കുന്നു.
4. Password match ചെയ്താൽ anonymous Firebase session establish ചെയ്യുന്നു.
5. Anonymous session profile `/users/{anonymousUid}`-ൽ save ചെയ്യുന്നു.
6. Role അനുസരിച്ച് portal-ലേക്ക് redirect ചെയ്യുന്നു.

Manual roles:

- `institutionAdmin` അല്ലെങ്കിൽ `admin` → `admin/app.html`
- `judge` → `judge/dashboard.html`
- `teamLeader` → `team/dashboard.html`

## Super admin / owner flow

Current application institution-facing flow-ൽ super admin entry expose ചെയ്യരുത് എന്ന requirement അനുസരിച്ച് normal login redirect-ൽ `superAdmin` role block ചെയ്യുന്നു.

ഇത് എന്തിനാണ്:

- Institution admin, judge, team leader pages-ൽ owner-level area-യിലേക്ക് accidental entry ഒഴിവാക്കാൻ.
- Other pages-ൽ owner/admin wording കാണിക്കാതിരിക്കാൻ.
- Institution app flow customer-safe ആക്കാൻ.

Important: Firestore rules-ൽ `superAdmin` checks ഇപ്പോഴും ഉണ്ടാകാം. അത് internal security/admin maintenance compatibility-ക്കാണ്. UI flow-ൽ അത് institution users-ന് expose ചെയ്യരുത്.

## Institution admin flow

Institution admin login ചെയ്താൽ:

1. Auth verifies role as `admin` or `institutionAdmin`.
2. Scope check selected institution/festival profile-നോട് match ചെയ്യുന്നു.
3. `admin/app.html` shell തുറക്കും.
4. Sidebar lifecycle groups കാണിക്കും.
5. Admin pages iframe workspace-ൽ open ചെയ്യും.
6. Users, invitations, judges തുടങ്ങിയ lists institution-scoped queries ഉപയോഗിക്കും.

Institution admin ചെയ്യാൻ കഴിയുന്നത്:

- Festival setup.
- Teams/divisions/categories/rules management.
- Students/participants management.
- Accounts/invitations management within same institution.
- Judges and assignments.
- Marks/review/results/publishing.
- Reports/certificates/backup.

## Judge flow

Judge login ചെയ്താൽ:

1. Role `judge` verify ചെയ്യും.
2. Selected institution/festival scope validate ചെയ്യും.
3. `judge/dashboard.html` തുറക്കും.
4. Judge assignments current festival scope-ൽ നിന്ന് മാത്രം load ചെയ്യും.
5. Judge assigned competitions മാത്രം evaluate ചെയ്യാം.

Judge-ന് ചെയ്യാൻ കഴിയുന്നത്:

- Assigned competitions കാണുക.
- Participant entries evaluate ചെയ്യുക.
- Draft/final marks submit ചെയ്യുക.
- Admin announcements കാണുക.

Judge-ന് ചെയ്യാൻ പാടില്ലാത്തത്:

- Admin accounts കാണുക.
- Other institution data കാണുക.
- Unassigned competitions score ചെയ്യുക.

## Team leader flow

Team leader login ചെയ്താൽ:

1. Role `teamLeader` verify ചെയ്യും.
2. Selected institution/festival scope validate ചെയ്യും.
3. `team/dashboard.html` തുറക്കും.
4. Team ID അനുസരിച്ച് own team students/entries/results manage ചെയ്യാം.

Team leader ചെയ്യാൻ കഴിയുന്നത്:

- Team students register/manage ചെയ്യുക.
- Team competitions/entries കാണുക.
- Team-specific results കാണുക.
- Announcements കാണുക.

Team leader ചെയ്യാൻ പാടില്ലാത്തത്:

- Other teams manage ചെയ്യുക.
- Admin accounts/judges/rules edit ചെയ്യുക.
- Other institution data കാണുക.

## Public pages flow

Public pages login ആവശ്യമില്ലാത്ത read-only pages ആണ്.

Public pages സാധാരണ scoped public data വായിക്കും:

- Results.
- Schedule.
- Leaderboard.
- Announcements.
- Downloads.
- Verification.

Public pages-ൽ sensitive admin data കാണിക്കരുത്. Public data publish ചെയ്ത ശേഷം മാത്രം public pages-ൽ കാണിക്കണം.

## Scope validation എന്താണ്?

Scope means current institution/festival context.

ഉദാഹരണം:

```text
institution = abc-school
festival = meelad-2026
```

User profile-ലുള്ള `institutionId` / `festivalId` selected scope-നോട് mismatch ആണെങ്കിൽ portal block ചെയ്യും.

ഇത് എന്തിനാണ്:

- Browser localStorage edit ചെയ്ത് മറ്റൊരു institution open ചെയ്യുന്നത് തടയാൻ.
- Shared URL misuse കുറയ്ക്കാൻ.
- Firestore rules + client-side guard രണ്ടിടത്തും tenant isolation ഉറപ്പാക്കാൻ.

## എന്തുകൊണ്ട് deploy/migration mobile-ൽ Codespaces വഴി ചെയ്യാൻ പറയുന്നു?

Mobile browser മാത്രം ഉപയോഗിച്ച് Firebase CLI commands direct ആയി run ചെയ്യാൻ സാധാരണ കഴിയില്ല. Codespaces terminal cloud machine പോലെ പ്രവർത്തിക്കും. Mobile browser-ൽ terminal ഉപയോഗിച്ച് deploy commands run ചെയ്യാൻ കഴിയുന്നത് കൊണ്ടാണ് Codespaces recommend ചെയ്യുന്നത്.

## Agent-ന് നേരിട്ട് ചെയ്യാൻ കഴിയാത്തത്

Agent-ന് credentials ഇല്ലാതെ production Firebase project modify ചെയ്യാൻ പാടില്ല.

അതിനാൽ:

- Firestore rules deploy ചെയ്യാൻ Firebase login/session വേണം.
- Migration write ചെയ്യാൻ service account വേണം.
- Exact institution/festival IDs വേണം.

ഇവ നിങ്ങൾ നൽകുകയോ Codespaces/Firebase Console വഴി നിങ്ങൾ run ചെയ്യുകയോ ചെയ്യണം.
