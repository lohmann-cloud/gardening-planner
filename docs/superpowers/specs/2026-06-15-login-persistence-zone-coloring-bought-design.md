# Design: persistent login, planted-area coloring, mark-as-bought

Date: 2026-06-15

Three optimizations to the gardening planner, each independent.

## 1. Persist login across backend restarts

### Problem

The frontend already stores the session token in `localStorage`
(`auth.service.ts`), so the *client* remembers the login. The forced re-login
comes from the *server*: `SessionStore` keeps sessions in an in-memory
`ConcurrentHashMap` (`SessionStore.java:27`). Any backend restart — Quarkus dev
reload, container redeploy — discards every session. The stored token then
fails `/auth/me` (401), the client clears it, and the user must log in again.

### Fix

Make sessions database-backed while preserving the existing
`issue` / `resolve` / `revoke` interface, so `AuthFilter` and `AuthResource`
need no changes.

- **New entity** `Session` (`entity/Session.java`), a `PanacheEntityBase`:
  - `token` — `String`, `@Id` (the opaque 256-bit URL-safe token, unchanged generation).
  - `userId` — `UUID` (FK to `app_user.id`).
  - `expiresAt` — `Instant`.
- **New migration** `V9__add_sessions.sql`, registered in `changelog.xml`:
  ```sql
  CREATE TABLE app_session (
      token       VARCHAR(64) PRIMARY KEY,
      user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      expires_at  TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX idx_app_session_user ON app_session(user_id);
  ```
- **`SessionStore` rewrite** — same public methods, now persisting:
  - `issue(User)` — insert a row, return the token. `@Transactional`.
  - `resolve(String token)` — look up the row; if missing return `null`; if
    `expiresAt` is in the past, delete it and return `null`; else return
    `userId`. `@Transactional` (it may delete expired rows).
  - `revoke(String token)` — delete the row. `@Transactional`.
  - TTL constant stays `Duration.ofDays(30)`; token generation
    (`SecureRandom`, Base64 url-encoder, 32 bytes) is unchanged.

`AuthFilter` calls `sessions.resolve(token)` from a JAX-RS filter; invoking a
`@Transactional` bean method from there is supported.

### Effect

The token already in `localStorage` now survives restarts and redeploys. No
frontend change.

## 2. Color only the planted area, not the whole bed

### Problem

In `garden-layout.html` the bed `<rect>` is always filled with `bedFill(b.id)`
(`garden-layout.ts:850`), which returns the *first* plant's light color whenever
the bed has any planting. So planting one small zone tints the entire bed.

### Fix

- **Bed rect becomes neutral.** Fill the bed `<rect>` with a constant soil/empty
  tone (reuse the current empty-bed value `#a5d6a7`, or a neutral soil tone) and
  a constant stroke, independent of plantings. Remove the plant-driven branches
  from `bedFill` / `bedStroke` (or replace both call sites with constants).
- **Draw each zone as its own rectangle.** For every zone (already available as
  `bedZoneInputs` / the per-bed zone geometry), render an SVG `<rect>` at grid
  coordinates — `x = b.xM + minCol * 0.05`, `y = b.yM + minRow * 0.05`,
  `width = (maxCol - minCol + 1) * 0.05`, `height = (maxRow - minRow + 1) * 0.05`
  (the same 0.05 m cell size and coordinate math the pending-selection preview
  uses at `garden-layout.html:341-344`). Fill with the plant's **light** color
  (`plantColorLight`) and stroke with the plant's color (`plantColor`).
  - These zone rects render in **both** `beds` and `plant` modes, inside the
    bed's rotated `<g>`, beneath the plant-spot icons.
  - Expose the geometry+colors to the template via a helper, e.g.
    `bedZoneRects(bedId): { x, y, w, h, fill, stroke }[]`, derived from the
    existing zone inputs so no extra API calls are needed.
- **Plant-spot icons** (`bedSpotsFor`) and the bed-name label are unchanged and
  draw on top. The `bedIconText` summary stays.

### Effect

Each planted zone shows as a colored patch matching its plant; unplanted parts
of the bed stay neutral soil. The garden overview reflects actual coverage.

## 3. Mark shopping-list items as bought

### Model recap

`InventoryItem.quantity` = on-hand stock not yet planted. `InventoryItem.toBuy`
= plants placed in the garden beyond available stock (the Einkaufsliste). Buying
those plants satisfies the need — they are already in the ground — so "bought"
simply clears `toBuy`. Nothing is added to `quantity` (that would double-count).

### Backend

- New endpoint on `InventoryResource`:
  `POST /inventory/{plantId}/bought`, `@Transactional`.
  - `requireAuth()`, load the user's `InventoryItem` for `plantId`
    (`findByUserAndPlant`); 404 if absent.
  - Set `item.toBuy = 0`, persist, return `InventoryItemDto.from(item)`.
  - The row is kept (even if `quantity` is also 0); existing UI interactions
    already prune empty rows. No change to `consume` / `restore` accounting.

### Frontend

- `ApiService.markBought(plantId)` → `POST .../inventory/{plantId}/bought`,
  returning `InventoryItem`.
- In `inventory.html` Einkaufsliste, each row gains a **"Gekauft ✓"** button
  calling a new `markBought(item)` in `inventory.ts`, which updates the local
  `inventory` signal with the returned item.
- When `toBuy` reaches 0 the item drops out of the `shoppingItems()` computed
  list automatically.

## Out of scope

- No change to zone/cell inventory consumption or restoration.
- No JWT migration — opaque DB-backed tokens keep the existing design.
- No partial-purchase (per-unit) buying; "bought" clears the whole line.

## Testing

- **Sessions:** backend test that a token issued, then `resolve`d, returns the
  user; an expired row resolves to `null` and is removed; `revoke` deletes it.
  Manually: log in, restart backend, reload — still logged in.
- **Coloring:** verify a bed with one small zone shows a neutral bed with a
  single colored patch; multiple zones show distinct colored patches; empty bed
  stays neutral. (Existing `bed-zone-views` logic already covered by tests.)
- **Bought:** backend test that `bought` sets `toBuy` to 0 and leaves
  `quantity` untouched. Frontend: clicking "Gekauft ✓" removes the row from the
  Einkaufsliste.
