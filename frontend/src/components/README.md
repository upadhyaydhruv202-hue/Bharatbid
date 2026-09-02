# Components

Feature-specific UI lives here. The reusable visual system is `frontend/src/ui` — see [docs/ui.md](../../../docs/ui.md).

BharatBid screens live under `frontend/src/pages/bharatbid/` and `frontend/src/components/bharatbid/`.

* `NotificationList` — in-app notification items, unread styling, and mark-read
* `NotificationBell` — unread badge and inbox dropdown
* `NotificationPreferences` — per-category channel toggles

`/bharatbid/notifications` is the SIH notification center. `/notifications` remains available for channel preferences.
`/login` signs in through `AuthProvider` and opens the Command Center.
