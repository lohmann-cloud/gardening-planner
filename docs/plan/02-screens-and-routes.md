# Screens & Routes — Garden Planner

## Route Map

```
/                          → Redirect → /login or /dashboard
/login                     → Welcome / Google Sign-In screen
/dashboard                 → My Gardens overview
/gardens/new               → Create Garden wizard
/gardens/:gardenId         → Garden home (layout view)
/gardens/:gardenId/layout  → Garden layout editor (grid + obstacles)
/gardens/:gardenId/fields  → Field management (add / edit / delete beds)
/gardens/:gardenId/plan    → Planting plan for current year
/gardens/:gardenId/plan/:year → Planting plan for a specific year (rotation history)
/gardens/:gardenId/settings → Garden settings + collaborator management
/catalog                   → Global plant catalog (browse + search)
/catalog/:plantId          → Plant detail page
/seeds                     → My seed inventory
/seeds/new                 → Add seed to inventory
/profile                   → User profile & preferences
```

---

## Screen Descriptions

### `/login`
- Google Sign-In button (OAuth)
- App name + tagline
- No navigation until authenticated

---

### `/dashboard`
- List of gardens the user owns or collaborates on
- "Create new garden" CTA
- Each garden card shows: name, thumbnail of layout, collaborator count, last updated

---

### `/gardens/new`
**Step 1 — Name & Description**
- Garden name (required)
- Description (optional)

**Step 2 — Initial Dimensions**
- Width and length in metres
- Preview of grid scale

→ Creates garden and redirects to `/gardens/:gardenId/layout`

---

### `/gardens/:gardenId` (Garden Home)
- Tabbed view: **Layout** | **Plan** | **Settings**
- Default tab: Layout

---

### `/gardens/:gardenId/layout` (Layout Editor)
- Visual grid canvas (SVG or Canvas, scale: 0.5 m/cell)
- Toolbar:
  - Add obstacle (draw rectangle, label it)
  - Add field (opens field creation form)
  - Edit garden dimensions
- Existing obstacles shown in grey with label
- Existing fields shown in green with name
- Drag-to-reposition fields
- Click obstacle/field to edit or delete

---

### `/gardens/:gardenId/fields` (Field Management)
- List of all fields in the garden
- Each row: field name, size (m²), number of plants placed, actions (edit / delete)
- Clicking a field opens the field planting view (inline or modal)

---

### `/gardens/:gardenId/plan` (Planting Plan — Current Year)
- Year selector (defaults to current year, links to past years)
- Garden layout shown read-only with fields highlighted
- Clicking a field opens the **Field Planting Editor**:
  - Cell grid subdivided by 10 cm
  - Plant picker (from seed inventory first, then full catalog)
  - Placed plants shown as icons with colour coding
  - Sidebar panels:
    - **Spacing** — radius overlay per plant
    - **Companions** — green/red highlights for neighbours
    - **Rotation** — warning banner if same family as previous year
    - **Fertilization** — schedule chip (e.g. "Nitrogen-rich, apply in March")

---

### `/gardens/:gardenId/settings` (Garden Settings)
- Edit garden name / description
- Edit garden dimensions
- **Collaborators panel:**
  - List of current members with roles
  - Invite by email
  - Change role / remove member
- Danger zone: Delete garden

---

### `/catalog` (Plant Catalog)
- Search bar + filters (category, season, sun, water)
- Grid/list of plant cards
- Each card: plant name, category badge, season chips

### `/catalog/:plantId` (Plant Detail)
- All plant metadata
- Companion plants (links to their catalog pages)
- "Add to My Seeds" button

---

### `/seeds` (My Seed Inventory)
- List of seeds the user has logged
- Grouped by category or season
- Each row: plant name, quantity, best-before, notes
- "Add seed" button → `/seeds/new`
- Highlight seeds expiring this season

### `/seeds/new`
- Search/select plant from catalog
- Quantity, purchase date, best-before year, notes

---

### `/profile`
- Display name, profile picture (from Google)
- Notification preferences
- Default grid resolution setting

---

## Component Hierarchy (Angular)

```
AppComponent
├── AuthGuard (protects all routes except /login)
├── LoginComponent                  (/login)
├── ShellComponent                  (nav + sidebar wrapper)
│   ├── DashboardComponent          (/dashboard)
│   ├── GardenNewComponent          (/gardens/new)
│   ├── GardenShellComponent        (/gardens/:id)
│   │   ├── LayoutEditorComponent   (/layout)
│   │   │   ├── GridCanvasComponent
│   │   │   ├── ObstacleToolComponent
│   │   │   └── FieldToolComponent
│   │   ├── PlanningComponent       (/plan)
│   │   │   ├── YearSelectorComponent
│   │   │   ├── FieldPlanEditorComponent
│   │   │   │   ├── PlantPickerComponent
│   │   │   │   ├── CellGridComponent
│   │   │   │   └── GuidanceSidebarComponent
│   │   │   │       ├── SpacingPanelComponent
│   │   │   │       ├── CompanionPanelComponent
│   │   │   │       ├── RotationPanelComponent
│   │   │   │       └── FertilizationPanelComponent
│   │   └── GardenSettingsComponent (/settings)
│   ├── CatalogComponent            (/catalog)
│   │   └── PlantDetailComponent    (/catalog/:id)
│   ├── SeedsComponent              (/seeds)
│   └── ProfileComponent            (/profile)
```
