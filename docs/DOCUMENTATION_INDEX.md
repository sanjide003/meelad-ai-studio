# Documentation Index

This file explains why each project Markdown document exists and which documents should be treated as canonical going forward.

## Canonical documents to keep

### `README.md`

Primary repository introduction. Keep this as the first file for new developers or deployers.

### `CHANGELOG.md`

Release-history notes. Keep this for tracking release-level changes.

### `docs/SAAS_IMPLEMENTATION_PROMPT.md`

Canonical SaaS product brief. It explains the Super Admin, institution workspace, subscription, scoped login, and public link model. Keep this because it defines the product's SaaS direction.

### `docs/ADMIN_ROADMAP_AND_PROMPTS.md`

Canonical admin workflow status and next-development roadmap. This file must be updated after every completed admin workflow update so it always shows:

- Completed admin workflows.
- Partially completed workflows.
- Remaining workflows.
- The next recommended implementation prompt.

### `docs/CHAT_RULES_AND_REQUIREMENTS.md`

Persistent rule memory from the chat. Use this file to remember product rules, workflow decisions, UI expectations, language rules, security expectations, and development-process rules that were agreed during conversation.

### `docs/AUTH_AND_PRODUCTION_FLOW_EXPLAINER.md`

Production/auth explanation for why build, lint, Firestore rules deploy, and migration/backfill commands are needed. Keep this as an operational explainer.

### `docs/PRODUCTION_MOBILE_DEPLOY_GUIDE.md`

Mobile-friendly production deployment guide. Keep this because the project owner may need to operate deployment from GitHub Codespaces or another mobile-accessible terminal.

## Removed superseded documents

### `docs/ADMIN_PROFESSIONALIZATION_REPORT.md`

Removed because its recommendations have been merged into the current admin roadmap and the implemented admin design system. Keeping it separately would create duplicate or outdated guidance.

### `docs/ADMIN_PROFESSIONALIZATION_IMPLEMENTATION_PROMPT.md`

Removed because the implementation prompt has already served its purpose. Future implementation prompts now live in `docs/ADMIN_ROADMAP_AND_PROMPTS.md`.

## Rule for future documentation cleanup

Do not add a new Markdown file unless it has a distinct long-term purpose. If a new document only repeats roadmap, chat rules, SaaS scope, or deployment instructions, update the existing canonical file instead.
