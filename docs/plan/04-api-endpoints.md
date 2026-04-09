# API Endpoints — Garden Planner

Base URL: `/api`  
Auth: All endpoints (except `/api/auth/*`) require a valid session JWT in the `Authorization: Bearer <token>` header.

---

## Auth

| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth/google` | Redirect to Google OAuth consent screen |
| GET | `/auth/google/callback` | OAuth callback; sets session JWT |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Return current authenticated user |

---

## Gardens

| Method | Endpoint | Description |
|---|---|---|
| GET | `/gardens` | List gardens the current user owns or collaborates on |
| POST | `/gardens` | Create a new garden |
| GET | `/gardens/:id` | Get garden details (layout, members) |
| PATCH | `/gardens/:id` | Update garden name / description / dimensions |
| DELETE | `/gardens/:id` | Delete garden (owner only) |

### Garden Members
| Method | Endpoint | Description |
|---|---|---|
| GET | `/gardens/:id/members` | List collaborators |
| POST | `/gardens/:id/members` | Invite collaborator by email |
| PATCH | `/gardens/:id/members/:userId` | Change collaborator role |
| DELETE | `/gardens/:id/members/:userId` | Remove collaborator |

---

## Obstacles

| Method | Endpoint | Description |
|---|---|---|
| GET | `/gardens/:id/obstacles` | List all obstacles in a garden |
| POST | `/gardens/:id/obstacles` | Add an obstacle |
| PATCH | `/gardens/:id/obstacles/:obstacleId` | Update position / label |
| DELETE | `/gardens/:id/obstacles/:obstacleId` | Remove obstacle |

---

## Garden Beds (Fields)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/gardens/:id/beds` | List all beds in a garden |
| POST | `/gardens/:id/beds` | Create a new bed |
| PATCH | `/gardens/:id/beds/:bedId` | Update bed name / position / size |
| DELETE | `/gardens/:id/beds/:bedId` | Delete bed (removes planting plans) |

---

## Planting Plans

| Method | Endpoint | Description |
|---|---|---|
| GET | `/beds/:bedId/plans` | List all yearly plans for a bed |
| GET | `/beds/:bedId/plans/:year` | Get planting plan for a specific year |
| POST | `/beds/:bedId/plans/:year` | Create or replace plan for a year |
| DELETE | `/beds/:bedId/plans/:year` | Clear plan for a year |

### Planting Cells
| Method | Endpoint | Description |
|---|---|---|
| GET | `/beds/:bedId/plans/:year/cells` | Get all placed plants for a plan |
| PUT | `/beds/:bedId/plans/:year/cells` | Bulk upsert cells (full grid save) |
| DELETE | `/beds/:bedId/plans/:year/cells` | Clear all cells in a plan |

---

## Plant Guidance (smart endpoints)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/beds/:bedId/plans/:year/guidance` | Returns companion conflicts, rotation warnings, fertilization schedule for the current plan |
| GET | `/plants/:id/companions` | List companion + incompatible plants for a given plant |
| GET | `/plants/:id/rotation` | Return rotation group + recommended follow-on group |

---

## Plant Catalog

| Method | Endpoint | Description |
|---|---|---|
| GET | `/plants` | List / search catalog (`?q=`, `?category=`, `?season=`) |
| GET | `/plants/:id` | Get full plant details |
| POST | `/plants` | Add custom plant (user-created) |
| PATCH | `/plants/:id` | Update custom plant (own entries only) |
| DELETE | `/plants/:id` | Delete custom plant (own entries only) |

---

## Seed Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/seeds` | List current user's seed inventory |
| POST | `/seeds` | Add a plant to seed inventory |
| PATCH | `/seeds/:id` | Update quantity / notes / best-before |
| DELETE | `/seeds/:id` | Remove seed from inventory |

---

## User / Profile

| Method | Endpoint | Description |
|---|---|---|
| GET | `/profile` | Get current user profile |
| PATCH | `/profile` | Update display name / preferences |

---

## Response Conventions

- **Success:** `200 OK` with `{ data: T }`
- **Created:** `201 Created` with `{ data: T }`
- **No content:** `204 No Content` (DELETE)
- **Validation error:** `400 Bad Request` with `{ error: string, details: string[] }`
- **Unauthorized:** `401 Unauthorized`
- **Forbidden:** `403 Forbidden` (authenticated but wrong role)
- **Not found:** `404 Not Found`

---

## NestJS Module Structure

```
src/
├── auth/          → AuthModule (Google OAuth, JWT strategy, guards)
├── gardens/       → GardensModule (gardens + members + obstacles + beds)
├── plans/         → PlansModule (planting plans + cells + guidance)
├── plants/        → PlantsModule (global catalog + custom plants)
├── seeds/         → SeedsModule (seed inventory)
└── users/         → UsersModule (profile)
```
