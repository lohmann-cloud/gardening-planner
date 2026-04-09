# User Journeys — Garden Planner

## 1. Login

**Goal:** Authenticate securely without managing a password.

**Journey:**
1. User opens the app and lands on the welcome screen.
2. User clicks "Sign in with Google".
3. OAuth consent screen appears; user grants access.
4. User is redirected to their dashboard (or onboarding if first login).

**Rules:**
- New users are automatically registered on first Google login.
- Session is persisted; users stay logged in across browser sessions.

---

## 2. Create Garden / Add Collaborators

**Goal:** Set up a personal garden and optionally invite others to co-manage it.

### 2a. Create Garden
1. User clicks "Create new garden".
2. User enters a garden name and an optional description.
3. Garden is created and user is taken to the garden layout editor.

**Rules:**
- A user can own multiple gardens.
- The creator is automatically the garden owner (admin role).

### 2b. Add Collaborators
1. From garden settings, the owner clicks "Invite collaborator".
2. Owner enters the collaborator's email (must be a registered Google account).
3. Collaborator receives an invite and can accept/decline.
4. Accepted collaborators can view and edit the garden layout and fields.

**Rules:**
- Roles: **Owner** (full control), **Collaborator** (edit), **Viewer** (read-only).
- Only the owner can delete the garden or manage roles.

---

## 3. Garden Layout

**Goal:** Define the physical space of the garden — its dimensions and any fixed obstacles.

**Journey:**
1. User opens the garden layout editor.
2. User sets the total garden dimensions (width × length in metres).
3. A visual grid is rendered to scale.
4. User can add obstacles (e.g. shed, pond, path, tree) by drawing rectangles on the grid and labelling them.
5. Obstacles are saved and shown as blocked areas on the grid.

**Rules:**
- Grid resolution: 0.5 m per cell (configurable).
- Obstacles cannot overlap each other.
- The layout canvas is the source of truth for where fields can be placed.

---

## 4. Placing Fields (Beds)

**Goal:** Define planting beds within the garden and position them on the layout.

**Journey:**
1. User clicks "Add field" in the layout editor.
2. User specifies field dimensions (width × length in metres) and a name.
3. User drags the field onto the garden grid and positions it.
4. Field snaps to grid and must not overlap obstacles or other fields.
5. Fields are saved and shown distinctly on the layout.

**Rules:**
- A field can be resized after creation (as long as it doesn't collide).
- A field can be deleted; any plants inside are removed with it.
- Fields are the containers for plant placement.

---

## 5. Plant & Seed Catalog

**Goal:** Provide a reference catalog of plants, and let users track which seeds they personally own.

### 5a. Plant Catalog (Global)
- A pre-populated library of common garden plants.
- Each plant entry contains:
  - Name & scientific name
  - Category (vegetable, fruit, herb, flower, etc.)
  - Planting seasons (spring / summer / autumn / winter)
  - Sun requirement (full sun / partial shade / full shade)
  - Water requirement (low / medium / high)
  - Spacing needed (cm between plants)
  - Days to maturity
  - Companion plants (grows well with)
  - Incompatible plants (avoid planting next to)
  - Fertilization needs
  - Crop rotation group

### 5b. My Seeds (Personal Inventory)
1. User navigates to "My Seeds".
2. User picks a plant from the catalog and logs that they own seeds for it.
3. User can record: quantity, purchase date, expiry/best-before year, notes.
4. The app uses this inventory to suggest what can be planted this season.

**Rules:**
- Plants not in the global catalog can be added as custom entries by the user.
- Seed inventory is per-user (not shared with collaborators).

---

## 6. Filling the Fields

**Goal:** Place plants into fields and receive intelligent planting guidance.

**Journey:**
1. User selects a field on the garden layout.
2. The field opens in a cell grid (subdivided by plant spacing).
3. User selects a plant from their seed inventory or the catalog.
4. User clicks cells within the field to place the plant.
5. The app automatically calculates how many plants fit based on spacing.

**Guidance provided in real time:**
- **Plant spacing** — minimum distance between plants, shown as occupied radius per plant.
- **Companion planting** — highlights compatible neighbours (green) and incompatible ones (red) already placed in adjacent cells/fields.
- **Crop rotation** — warns if the same crop family was planted in this field in a previous year; suggests what rotation group to plant next.
- **Fertilization** — shows fertilization schedule and type needed for the placed plants.

**Rules:**
- Plants cannot be placed where spacing would be violated.
- Users can override warnings with a confirmation ("place anyway").
- The planting plan is versioned per year so rotation history is tracked.

---

## Summary — Key Concepts

| Concept | Description |
|---|---|
| **Garden** | Top-level container owned by a user |
| **Layout** | The physical dimensions + obstacles of a garden |
| **Field (Bed)** | A planting area placed inside the layout |
| **Plant** | A catalog entry with growing metadata |
| **Seed** | A user-owned instance of a plant they can grow |
| **Planting Plan** | The assignment of plants to field cells for a given year |
| **Rotation Group** | Family-based grouping used for year-over-year rotation rules |
