# Chat Rules and Product Requirements Memory

This document records the product rules and working decisions given during chat so future updates do not lose context.

## Language and UI rules

- English must be the default language.
- Malayalam should appear only when Malayalam is selected through the language switcher, except for user-entered names or content.
- Do not mix English and Malayalam in the same static title, subtitle, label, button, card, or placeholder.
- Admin UI must look professional, clean, easy to understand, and suitable for first-time institution admins.
- Use light semantic colors on cards/boxes so important statuses are easy to identify.
- Keep the sidebar fixed and the header fixed in the admin shell.
- The header must start after the sidebar and must not be hidden under the sidebar.
- The logged-in institution name must be clearly visible in the center of the header without blinking/animated box effects.
- Keep active tabs visibly highlighted and keep parent groups open when a child tab is active.

## Admin lifecycle rules

- Admin workflow should follow the practical festival lifecycle:
  1. Master Setup
  2. Team Management
  3. Participating Settings
  4. Student Intake
  5. Competition Items
  6. Competition Entries
  7. Judging
  8. Results
  9. Reports, Certificates, ID Cards, Public Pages
- Remove unnecessary or duplicate old tabs when a redesigned workflow replaces them.
- Every major completed update must also update `docs/ADMIN_ROADMAP_AND_PROMPTS.md` with what is completed and what remains.

## Master Setup rules

- First login/setup should guide the admin through institution and festival details.
- Institution details include name, place, registration number, logo, and run-by/subtitle text.
- Festival details include name, subtitle, tagline, logo, phone, email, and social links.
- Social links include Instagram, Facebook, YouTube, X/Twitter, Telegram, and WhatsApp.
- Participating mode options must include boys only, girls only, boys and girls, separate, single/common, and mixed separate+single behavior.
- Fest type options must include sports only, arts only, and arts and sports.
- Arts sections should include on-stage, off-stage, and custom sections.
- Sports sections should include track, field, and custom sections.
- Categories should include default presets and custom category creation.
- Setup may be skipped, but admins must be warned that core setup should be corrected before adding students and competitions.
- After students or competitions are created, core setup fields should become locked or add-only where necessary.
- Reset must be destructive only after admin password confirmation and clear warning, and it must delete festival operational data while preserving institution/festival profile records.

## Team Management rules

- Team Management must be a dedicated sidebar tab.
- Teams need name, logo, color, category-wise chest-number starts, leaders, and credentials.
- Chest numbers must be configurable per category, and when gender-separated, per category and gender.
- Team leaders can be multiple and require name, role, order, photo, username, and password.
- Passwords must be hashed; plaintext passwords must not be stored.

## Student Intake rules

- Student intake must support admin add, team-leader add, public registration, or all methods.
- Admin-added students may be auto-approved based on settings.
- Team-leader and public submissions should support approval/rejection workflows.
- Rejecting a student requires a reason.
- Rejection reason must be visible to the submitter.
- Students can be added manually one-by-one or by multiple names line-by-line.
- Bulk upload should provide a downloadable format/template.
- Student names written in English should be normalized to uppercase.
- Save workflows should preview data before database write where practical.
- Duplicate student submissions should be warned/prevented by team/category/gender/name where possible.
- Public registrants should be able to check status with phone number.
- Public registration portal must open only when public registration mode is enabled and the admin open/close schedule allows it.
- Public registration-only mode must be accepted as `publicRegistrationOnly` wherever student registration mode is validated.
- Public submissions may be stored without chest number first, but approval must assign the correct category/gender/team chest number automatically.

## Competition rules

- Competition Items must be created based on Master Setup filters: category, gender, arts/sports, section, and source mode.
- Category dropdown must include General, meaning category restrictions do not apply.
- Item types must include single item and group item.
- Single items need max participants per team.
- Group items need max teams per group/team and min/max participants per entry.
- Multiple competition names can be entered line by line and saved after preview.

## Competition Entry rules

- Competition entry registration must connect approved students to competition items.
- Entry eligibility must respect category, gender, General category, item type, and per-team limits.
- Group items must enforce min/max member counts.
- Non-admin entries should be pending if approval is required.
- Entry rejection requires a reason and the reason must remain visible.
- Duplicate student entry into the same competition must be prevented.
- Competition entry service must validate selected students server-side/client-service-side, not only in the UI.
- Team-leader competition entries must use the same shared service validation as admin entries and show rejection reasons back to leaders.

## Security and SaaS rules

- Every admin, student, team, competition, entry, judge, result, and public workflow must stay institution/festival scoped.
- Firestore rules should enforce scope, not only client-side filters.
- Manual/admin/team-leader/judge passwords must be stored as hashes, not plaintext.
- Public pages must expose only allowed public or status-specific data.
- Dangerous actions such as reset/delete/credential changes should require confirmation and should be auditable.

## Development-process rules

- Run `npm run lint` and `npm run build` after code changes.
- If a visual web-app change is made, attempt a screenshot or note why screenshot capture is unavailable.
- Commit changes on the current branch.
- Create PR metadata after committing.
- Avoid unnecessary Markdown files; update canonical docs instead.
