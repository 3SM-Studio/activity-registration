# Production schema resync, 2026-09-13

After the live Sheets hardening merge, the production deployment gate correctly rejected a stale `ASSIGNED_GROUP_ID` native Table dropdown because it still contained the inactive `bukowno-folk-flow-tanczmy-2026-2027` group.

The production `Rejestracje` Table metadata was synchronized to the 33 active current-season group IDs without clearing, deleting, rewriting, or moving any `ZAPISY` or `POWIADOMIENIA` rows. Registration IDs were verified immediately after the metadata update and all pre-existing registrations remained present; new registrations continued arriving during the maintenance window.

This documentation-only commit intentionally triggers a fresh protected production deployment so `vercel:production-gate` validates the corrected live Sheet state before the new application build can become active.
