# Production Deployment Guide for Mobile-Only Admins

ഈ guide mobile phone മാത്രം ഉള്ള admin-ന് production-ൽ ബാക്കി operations സുരക്ഷിതമായി ചെയ്യാൻ വേണ്ടതാണ്.

## ഇപ്പോൾ agent-ന് നേരിട്ട് ചെയ്യാൻ കഴിയാത്ത കാര്യങ്ങൾ

താഴെ പറയുന്ന കാര്യങ്ങൾ നിങ്ങളുടെ Firebase project credentials ഇല്ലാതെ agent-ന് നേരിട്ട് ചെയ്യാൻ സാധിക്കില്ല:

- Firebase project-ലേക്ക് `firestore.rules` deploy ചെയ്യുക.
- Production Firestore database-ലെ പഴയ `users` / `userInvitations` documents backfill ചെയ്യുക.
- Service account key അല്ലെങ്കിൽ Firebase login access ഇല്ലാതെ production data modify ചെയ്യുക.

Agent codebase-ൽ scripts തയ്യാറാക്കിയിട്ടുണ്ട്. Production credentials ഉള്ള environment-ൽ run ചെയ്യണം.

## Mobile phone മാത്രം ഉള്ളപ്പോൾ ഏറ്റവും എളുപ്പമുള്ള മാർഗം

Mobile phone-ൽ നേരിട്ട് terminal commands run ചെയ്യുന്നത് ബുദ്ധിമുട്ടാണ്. അതിനാൽ GitHub Codespaces, Gitpod, Replit, അല്ലെങ്കിൽ ഒരു trusted computer/server terminal ഉപയോഗിക്കുന്നതാണ് നല്ലത്.

Recommended option: GitHub Codespaces.

### Step 1: GitHub Codespaces open ചെയ്യുക

1. GitHub app അല്ലെങ്കിൽ mobile browser തുറക്കുക.
2. നിങ്ങളുടെ repository open ചെയ്യുക.
3. `Code` button അമർത്തുക.
4. `Codespaces` tab തിരഞ്ഞെടുക്കുക.
5. `Create codespace on current branch` തിരഞ്ഞെടുക്കുക.
6. Codespace terminal open ആകുന്നത് വരെ കാത്തിരിക്കുക.

### Step 2: Latest code pull ചെയ്യുക

```bash
git status
git pull
npm install
```

### Step 3: Build check ചെയ്യുക

```bash
npm run build
npm run lint
```

ഇവ pass ആകണം.

## Firestore rules deploy ചെയ്യുക

### Step 1: Firebase CLI login

Codespaces terminal-ൽ:

```bash
npx firebase-tools login --no-localhost
```

Terminal ഒരു URL കാണിക്കും.

1. ആ URL mobile browser-ൽ open ചെയ്യുക.
2. Firebase project owner/admin Google account ഉപയോഗിച്ച് login ചെയ്യുക.
3. Browser-ൽ ലഭിക്കുന്ന code terminal-ൽ paste ചെയ്യുക.

### Step 2: Correct Firebase project select ചെയ്യുക

```bash
npx firebase-tools projects:list
npx firebase-tools use fest-dsd-003
```

### Step 3: Firestore rules deploy ചെയ്യുക

```bash
npx firebase-tools deploy --only firestore:rules
```

Deploy success message ലഭിച്ചാൽ rules production-ൽ active ആയിരിക്കും.

## Data backfill / migration ചെയ്യുക

Migration script production Firestore-ൽ പഴയ `users` / `userInvitations` documents-ൽ missing `institutionId` / `festivalId` add ചെയ്യാനാണ്.

### Important safety rule

ആദ്യം dry-run മാത്രം നടത്തുക. Dry-run output ശരിയാണെന്ന് ഉറപ്പാക്കിയ ശേഷം മാത്രം `--write` ഉപയോഗിക്കുക.

### Option A: Service account JSON ഉപയോഗിച്ച്

Firebase Console → Project Settings → Service Accounts → Generate new private key.

Mobile phone-ൽ key file കൈകാര്യം ചെയ്യുന്നത് risky ആണ്. കഴിയുമെങ്കിൽ trusted computer/server അല്ലെങ്കിൽ Codespaces secret ഉപയോഗിക്കുക.

Codespaces-ൽ secret ആയി add ചെയ്യേണ്ട variable:

- `FIREBASE_SERVICE_ACCOUNT_JSON`

അതിൽ service account JSON മുഴുവൻ paste ചെയ്യുക.

### Dry-run command

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='$FIREBASE_SERVICE_ACCOUNT_JSON' \
BACKFILL_INSTITUTION_ID='YOUR_INSTITUTION_ID' \
BACKFILL_FESTIVAL_ID='YOUR_FESTIVAL_ID' \
npm run migrate:scope
```

Dry-run output ഓരോ document-നും എന്ത് scope set ചെയ്യുമെന്ന് കാണിക്കും. Database update ചെയ്യില്ല.

### Write command

Dry-run ശരിയാണെങ്കിൽ മാത്രം:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='$FIREBASE_SERVICE_ACCOUNT_JSON' \
BACKFILL_INSTITUTION_ID='YOUR_INSTITUTION_ID' \
BACKFILL_FESTIVAL_ID='YOUR_FESTIVAL_ID' \
npm run migrate:scope -- --write
```

## Tenant isolation audit ചെയ്യുക

```bash
npm run audit:tenant
```

ഈ command `my old project/**` folder ഒഴിവാക്കി current application files മാത്രം scan ചെയ്യും.

Output വരുന്നത് എല്ലാം problem എന്ന് അർത്ഥമല്ല. ഓരോ match-ഉം scoped query ആണോ self-profile access ആണോ എന്ന് പരിശോധിക്കണം.

## Deploy കഴിഞ്ഞ് browser test checklist

Mobile browser-ൽ താഴെ പറയുന്നവ test ചെയ്യുക:

1. Login ചെയ്യുക.
2. Correct institution workspace select ചെയ്യുക.
3. Admin Dashboard തുറക്കുക.
4. Accounts തുറന്ന് സ്വന്തം institution accounts മാത്രം കാണുന്നുണ്ടോ പരിശോധിക്കുക.
5. Invitations തുറന്ന് സ്വന്തം institution invitations മാത്രം കാണുന്നുണ്ടോ പരിശോധിക്കുക.
6. Judges page തുറന്ന് സ്വന്തം institution judges മാത്രം കാണുന്നുണ്ടോ പരിശോധിക്കുക.
7. Mobile portrait/landscape mode-ൽ tables scroll ചെയ്യാൻ കഴിയുന്നുണ്ടോ പരിശോധിക്കുക.
8. Public pages English mode-ൽ Malayalam mixed text ഇല്ലെന്ന് പരിശോധിക്കുക.
9. Malayalam switch ചെയ്താൽ Malayalam text മാത്രം ശരിയായി വരുന്നതാണോ പരിശോധിക്കുക.

## Agent-ന് ചെയ്യാൻ കഴിയുന്ന ഭാഗം

Agent ഇതിനകം ചെയ്തു:

- Migration script തയ്യാറാക്കി.
- Rules deploy script command ചേർത്തു.
- Tenant audit script command ചേർത്തു.
- Admin mobile/tablet table usability മെച്ചപ്പെടുത്തി.
- Institution-scoped account/invitation/judge queries ചേർത്തു.
- Firestore rules code update ചെയ്തു.

Agent-ന് production deploy/migration നേരിട്ട് ചെയ്യാൻ വേണ്ടത്:

- Firebase project access.
- Firebase CLI authenticated session അല്ലെങ്കിൽ service account credentials.
- ഏത് institution/festival backfill ചെയ്യണം എന്ന exact IDs.

ഇവ ലഭ്യമല്ലാത്തതിനാൽ agent ഈ environment-ൽ production deploy ചെയ്യാൻ കഴിയില്ല.

## Values കണ്ടെത്താൻ സഹായം

Institution ID / Festival ID സാധാരണ localStorage അല്ലെങ്കിൽ URL scope-ൽ ഉണ്ടാകും:

- URL query example: `?institution=abc&festival=main-festival`
- `institution` value ആണ് institution ID.
- `festival` value ആണ് festival ID.

Admin dashboard-ലെ shared portal links-ലും ഈ values കാണാൻ സാധിക്കും.
