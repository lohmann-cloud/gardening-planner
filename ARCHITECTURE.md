# Garden Planner Architecture & Tech Stack

This document outlines the current architecture and technology stack of the Garden Planner application.

## Overview

Garden Planner is built as a full-stack web application using a modern TypeScript-based tech stack. It utilizes a monorepo architecture managed by **Nx**, enabling seamless code sharing between the frontend and backend, unified tooling, and efficient build processes.

## Technology Stack

### Core Tooling

- **Monorepo Management:** Nx (v22.6)
- **Package Manager:** npm
- **Language:** TypeScript (v5.9)
- **Linting:** ESLint
- **Formatting:** Prettier

### Frontend (Client-side)

- **Framework:** Angular (v21.2)
- **Styling:** SCSS (Inline styles language configured via Angular builder)
- **E2E Testing:** Playwright
- **Unit Testing:** Vitest (with Vitest-Angular runner)

### Backend (Server-side)

- **Framework:** NestJS (v11.0)
- **API:** REST (or GraphQL, based on NestJS usage)
- **E2E Testing:** Playwright
- **Unit Testing:** NestJS Testing utilities (Jest/Vitest)
- **Database ORM:** Prisma (v7.7)

### Database & Infrastructure

- **Database Engine:** PostgreSQL 16
- **Database Management GUI:** pgAdmin4
- **Containerization:** Docker Compose (used for local database provisioning)

---

## Workspace Structure

The Nx workspace is organized into **apps** (runnable applications) and **libs** (reusable libraries).

```text
garden-planner/
├── apps/
│   ├── frontend/         # Angular web application
│   ├── frontend-e2e/     # Playwright e2e tests for frontend
│   ├── backend/          # NestJS server application
│   └── backend-e2e/      # Playwright e2e tests for backend
├── libs/
│   ├── database/         # Prisma schema, migrations, and generated client
│   └── shared-types/     # TypeScript interfaces/types shared across full-stack
├── docker-compose.yml    # Local DB setup
├── nx.json               # Nx workspace configuration
└── package.json          # Root dependencies and workspace scripts
```

### Libraries

1. **`shared-types`**: This library contains shared TypeScript definitions ensuring type safety between the NestJS backend and Angular frontend. It acts as the contract for API payloads and core domain models.
2. **`database`**: This encapsulates everything related to the database tier. It houses the `schema.prisma` file, manages database migrations, and exposes the generated `@prisma/client`. This ensures that database access is centralized and decoupled from the main backend business logic.

---

## Data Model (Domain Architecture)

The application domain is modeled using Prisma. The core entities include:

- **Users & Auth (`User`)**: Handles user identities, integrating with external providers (e.g., Google ID).
- **Gardens (`Garden`, `GardenMember`)**: Represents a physical garden. Supports a collaborative model where multiple users can manage a single garden with different roles (Owner, Collaborator, Viewer).
- **Layout (`Obstacle`, `GardenBed`)**: Defines the physical layout of the garden. A garden contains beds for planting and obstacles (e.g., sheds, paths). Dimensions are mapped in meters (`widthM`, `lengthM`).
- **Plant Catalog (`Plant`, `RotationGroup`, `CompanionRule`)**: A comprehensive catalog of plants containing requirements (sun, water, spacing, seasons). It also models complex agronomic relationships:
  - **Crop Rotation**: Through `RotationGroup` relationships.
  - **Companion Planting**: Through `CompanionRule` (beneficial or incompatible).
- **Seed Inventory (`SeedInventory`)**: Tracks a user's collection of seeds, quantities, and expiration.
- **Planting Plans (`PlantingPlan`, `PlantingCell`)**: Maps out what is planted in a specific `GardenBed` for a given year. The grid resolution is utilized to plot plants at specific row and column coordinates.

---

## Local Development Workflow

The project utilizes `docker-compose` to spin up local infrastructure:

- `npm run db:up`: Starts the PostgreSQL and pgAdmin containers.
- `npm run db:down`: Stops the containers.
- `npm run db:reset`: Resets the database volume entirely.

Prisma is used for schema management and database synchronization:

- `npm run prisma:generate`: Generates the Prisma Client based on the schema.
- `npm run prisma:migrate`: Applies migrations to the local PostgreSQL instance.
- `npm run prisma:studio`: Opens the local Prisma data browser.
