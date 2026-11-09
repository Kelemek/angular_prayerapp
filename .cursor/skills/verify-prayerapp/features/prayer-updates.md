# Prayer updates

Subscribers and members add updates on an existing prayer. Admins may need to approve updates before they appear to the list.

## Sub-features

- **compose-update** — author adds text from prayer detail.
- **pending-update** — when moderation applies, update waits in admin queue.
- **published-update** — approved update appears in the card thread.

## How to get to it (user POV)

- Home → open a prayer → add an update.
- Admin → Approvals → Updates queue (when pending).

## Driving it with Playwright (npx)

Preconditions:

- Signed-in member or admin on **test** Supabase only.
- At least one prayer visible to the test account.

Steps:

- **Not automated** — JWT-gated reads/writes and optional admin approval. Report **inconclusive** unless operator captures prayer detail + update list screenshot.
- Related admin surface: [Admin approvals](./admin-approvals.md).

## Gotchas

- Update visibility follows the same RLS as the parent prayer; wrong account shows empty thread.
- Deletion and moderation requests share the admin approvals UX — do not verify updates only via email queue screens.
