# Deployment Konzept für Gardening Planner

Dieses Dokument beschreibt ein Konzept, um die Full-Stack-Anwendung (Frontend: Angular, Backend: NestJS, Database: PostgreSQL) **kostenlos** zu deployen und stellt eine Anleitung sowie CI/CD-Pipelines bereit.

## 1. Konzept (Free Tier Stack)

Wir nutzen folgende Cloud-Anbieter, die großzügige und dauerhafte Free-Tiers (kostenlose Kontingente) für Hobby-Projekte anbieten:

- **Frontend (Angular): [Vercel](https://vercel.com/)**
  - **Warum?** Bietet hervorragende Angular-Unterstützung, automatische Deployments per GitHub und globales CDN (Edge Network). Völlig kostenlos für Hobby-Nutzer.
  - Alternativen: Netlify, GitHub Pages.

- **Backend (NestJS): [Render](https://render.com/)**
  - **Warum?** Bietet "Web Services" im Free Tier an. Diese können Node.js-Anwendungen ausführen. _(Hinweis: Free-Tier Web Services gehen nach 15 Minuten Inaktivität in den "Schlaf"-Modus, weshalb der erste Aufruf nach einer Pause einige Sekunden länger dauern kann)._
  - Alternativen: Koyeb (Docker/Buildpacks), Fly.io (erfordert oft Kreditkarte zur Verifizierung).

- **Datenbank (PostgreSQL): [Neon.tech](https://neon.tech/)**
  - **Warum?** Neon ist eine Serverless-PostgreSQL-Datenbank, die sich hervorragend in moderne Stacks integriert und ein großzügiges kostenloses Kontingent anbietet.
  - Alternativen: Supabase (bietet ebenfalls eine kostenlose Postgres-DB).

## 2. Vorbereitung & Konten

Bevor wir die Pipeline einrichten, musst du Accounts bei den Anbietern erstellen:

1. Erstelle einen Account bei **Neon.tech** (Datenbank).
2. Erstelle einen Account bei **Render.com** (Backend).
3. Erstelle einen Account bei **Vercel.com** (Frontend).

_(Optional: Du kannst dich bei allen Anbietern direkt mit deinem GitHub-Account anmelden)._

## 3. Schritt-für-Schritt Anleitung

### 3.1 Datenbank (Neon) aufsetzen

1. Logge dich bei Neon ein und klicke auf **"New Project"**.
2. Wähle PostgreSQL, eine Region in deiner Nähe (z.B. Frankfurt) und erstelle das Projekt.
3. Kopiere den Connection String (`DATABASE_URL`).
   _(Format: `postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require`)_
4. Diese URL wird später für das Backend benötigt.

### 3.2 Frontend (Vercel) aufsetzen

Wir nutzen die direkte GitHub-Integration von Vercel, da diese am einfachsten ist und keine zusätzliche GitHub Actions Konfiguration erfordert (Vercel übernimmt das Build-Management).

1. Logge dich bei Vercel ein und klicke auf **"Add New..." -> "Project"**.
2. Wähle das GitHub-Repository `lohmann-cloud/gardening-planner` aus.
3. Konfiguriere das Projekt:
   - **Framework Preset:** Angular (sollte automatisch erkannt werden)
   - **Root Directory:** `./` (Lass es auf dem Root-Verzeichnis)
   - **Build Command:** `npx nx build frontend`
   - **Output Directory:** `dist/apps/frontend/browser` (abhängig von der Angular-Version, prüfe lokal deinen `dist`-Ordner)
4. Füge bei Bedarf Environment Variables hinzu (z.B. die URL zum Backend: `API_URL = https://dein-backend-url.onrender.com`).
5. Klicke auf **"Deploy"**. Vercel deployt nun bei jedem Push auf `master`.

### 3.3 Backend (Render) aufsetzen

Das Backend deployen wir mittels eines Dockerfiles über Render, oder direkt als Node Service. Hier nutzen wir die GitHub Actions Pipeline, um das Backend zu bauen und Render zum Pull zu triggern, ODER wir lassen Render direkt über GitHub bauen. Am einfachsten ist die direkte GitHub-Anbindung:

1. Logge dich bei Render ein und klicke auf **"New" -> "Web Service"**.
2. Wähle "Build and deploy from a Git repository" und verbinde das Repository.
3. Konfiguration:
   - **Name:** z.B. `gardening-planner-api`
   - **Region:** Frankfurt (oder in der Nähe)
   - **Branch:** `master`
   - **Root Directory:** `./`
   - **Environment:** Node
   - **Build Command:** `npm install && npx nx build backend && npx nx run @org/backend:prune` (oder die passenden Build-Schritte in deinem Workspace)
   - **Start Command:** `node apps/backend/dist/main.js` (Abhängig davon, wohin Nx dein Backend baut)
4. Füge unter **"Environment Variables"** hinzu:
   - `DATABASE_URL`: Den Connection String von Neon.
   - `NODE_ENV`: `production`
5. Wähle den **Free Tier** und klicke auf **Create Web Service**.

---

## 4. Alternative: Automatisches Deployment per GitHub Actions (Für das Backend)

Falls du das Backend nicht direkt von Render bauen lassen möchtest, sondern via Docker-Image deployen willst (was oft robuster in Monorepos ist), haben wir eine Pipeline `.github/workflows/deploy.yml` angelegt.

**Voraussetzungen für die Pipeline:**
Damit die Pipeline funktioniert, musst du folgende Secrets in deinem GitHub-Repository hinterlegen (unter _Settings -> Secrets and variables -> Actions_):

- `RENDER_DEPLOY_HOOK`: Den Deploy-Hook URL aus den Render-Einstellungen deines Web Services (findest du unter "Settings" im Render Dashboard). Dies triggert ein Deployment, wenn die Pipeline erfolgreich war.
- _(Für Vercel übernimmt das Vercel-Dashboard die Automatisierung auf dem `master`-Branch, wir binden hier keine Vercel-Token ein, da die direkte GitHub-App von Vercel den Standard darstellt)._
