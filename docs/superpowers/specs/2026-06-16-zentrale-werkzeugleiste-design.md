# Zentrale Werkzeugleiste für den Garten-Editor

**Datum:** 2026-06-16
**Status:** Entwurf zur Freigabe

## Ziel

Das Wechseln zwischen den Editier-Aktionen schneller und an *einem* Ort möglich machen. Heute ist die Steuerung auf zwei Orte verteilt: der Modus-Umschalter (Beet/Pflanzen) sitzt oben im Header, die Werkzeuge (Auswählen/Beet/Hindernis) in der linken Seitenleiste — und nur im Beet-Modus. Das soll durch eine **zentrale, vertikale Werkzeugleiste am Rand der Zeichenfläche** ersetzt werden, mit einem einheitlichen Werkzeug-Schema in beiden Modi.

Gleichzeitig wird das Werkzeug-Modell vereinheitlicht und um Funktionen ergänzt, die heute fehlen (sicheres Navigieren ohne Objekt-Eingriff; Verschieben von Hindernissen; Bearbeiten bestehender Pflanzungen).

## Nicht-Ziele

- Keine Änderung an der Daten-Persistenz / am Backend-Datenmodell (Beete, Hindernisse, Pflanzzonen bleiben wie sie sind).
- Kein Redesign der Pflanzen-Auswahl, der Zonenliste oder der Bestand-/Inventar-Logik.
- Keine neuen Editier-Operationen über die genannten hinaus (kein Rotieren von Pflanzungen o. Ä.).

## Heutiger Stand (Ausgangsbasis)

Hauptkomponente: `frontend/src/app/garden-layout/garden-layout.ts` (+ `.html`, `.scss`).

- **Modus-/Werkzeug-State:** `mode = signal<'beds'|'plant'>('beds')`, `tool = signal<'select'|'bed'|'obstacle'>('select')`.
- **Schwenken/Zoomen:** bereits vorhanden (`zoom`, `panX`, `panY`, `isPanning`, Pinch-Zoom, Mausrad, Zoom-Buttons). Pan passiert heute beim Ziehen auf leerer Fläche (Bewegung > 3px = Pan statt Klick).
- **Beete:** Platzieren (Ghost + Klick), Auswählen + **Verschieben** per Drag, Eigenschaften-Formular, Löschen, Rotieren — alles vorhanden (`onBedMouseDown`/`startBedDrag`, `updateGhost`/`handleBackgroundClick`, `saveEditBed`, `deleteBed`).
- **Hindernisse:** Platzieren ✅, Auswählen ✅, **aber kein Verschieben** (`selectObstacleCore` setzt nur Auswahl, kein Drag).
- **Pflanzungen (`PlantingZone`):** Felder `id, plantingPlanId, plantId, minCol, minRow, maxCol, maxRow, spacingFactor?, plant`. Anlegen per Rechteck-Ziehen auf einem Beet (`plantPointDown/Move/Up` → `confirmPlantSelection` → `api.addPlantingZone`). **Nach dem Anlegen nur Löschen möglich** (`removeZoneById` → `api.removePlantingZone`); kein Auswählen/Verschieben/Größe-Ändern.
- **Touch/Mobile:** vollständige Touch-Behandlung inkl. Pinch (`onCanvasTouchStart/Move/End`, `beginPinch`/`updatePinch`).
- **API:** `addPlantingZone` und `removePlantingZone` existieren; **kein** Update-Endpunkt für Zonen.

## Werkzeug-Modell (Soll)

**Zwei Modi**, in beiden dasselbe, einheitliche Werkzeug-Schema:

| Modus | Werkzeuge (in dieser Reihenfolge) |
|-------|-----------------------------------|
| **Beet** | Navigieren · Beet · Hindernis · Bearbeiten |
| **Pflanzen** | Navigieren · Pflanzen · Bearbeiten |

Bedeutung der Werkzeuge (in beiden Modi gleich gedacht):

1. **Navigieren** — nur den Bildausschnitt schieben/zoomen. Objekte werden *nicht* angefasst, auch wenn der Zug auf einem Beet/Hindernis/einer Pflanzung beginnt. Sicheres Anschauen, besonders auf dem Handy.
2. **Platzieren** (im Beet-Modus zwei getrennte Werkzeuge: *Beet* und *Hindernis*; im Pflanzen-Modus eines: *Pflanzen*) — Neues anlegen.
3. **Bearbeiten** — bestehende Objekte des aktiven Modus auswählen, **verschieben** und ihre Eigenschaften ändern bzw. löschen.

**Standard-Werkzeug** beim Öffnen eines Gartens und beim Moduswechsel: **Navigieren** (sicher; nichts wird versehentlich verändert).

### State-Umbau

- `mode = signal<'beds'|'plant'>` bleibt.
- `tool` wird erweitert auf: `'navigate' | 'bed' | 'obstacle' | 'plant' | 'edit'`.
  - Gültige Werkzeuge je Modus: `beds → {navigate, bed, obstacle, edit}`, `plant → {navigate, plant, edit}`.
  - Das heutige `'select'` wird zu `'edit'`.
  - Bei Moduswechsel: `tool` auf `'navigate'` zurücksetzen.
- Alle Verzweigungen, die heute auf `tool() === 'select'` bzw. `mode() === 'plant'` prüfen, werden auf das neue Schema umgestellt (siehe „Verhalten/Verdrahtung").

## UI / Layout

### Vertikale Leiste (Variante C)

- Position: **am linken Rand der Zeichenfläche** (innerhalb `canvas-container`, schwebend), vertikal.
- Aufbau von oben nach unten:
  - **Modus-Umschalter**: 2 Knöpfe (Beet, Pflanzen), als zusammenhängende Gruppe.
  - Trennlinie.
  - **Werkzeug-Knöpfe** des aktiven Modus (siehe Tabelle), aktives Werkzeug hervorgehoben.
- **Nur Icons** (Entscheidung des Nutzers). Jeder Knopf bekommt ein `aria-label` und – am Desktop – einen `title`-Tooltip. Icons müssen klar unterscheidbar sein; Vorschlag (final in der Umsetzung):
  - Modus Beet: Hochbeet-/Raster-Glyph · Modus Pflanzen: 🪴
  - Navigieren: ✋ · Beet (platzieren): Rechteck‑mit‑Plus · Hindernis: 🚧 · Pflanzen (platzieren): 🌱 · Bearbeiten: ✏️
  - Modus- und Werkzeug-Icons sind durch die Trennlinie und unterschiedliche Größe/Stil zusätzlich abgegrenzt.
- **Entfernt** wird der bisherige Beet/Pflanzen-Umschalter im Header.
- **Seitenleiste bleibt** als Kontextbereich: Formular für Name/Größe beim Platzieren bzw. Bearbeiten, Pflanzen-Auswahl, Zonenliste. Sie öffnet sich kontextabhängig (z. B. beim Auswählen eines Objekts im Bearbeiten-Werkzeug).

### Mobile

- Die Leiste bleibt am Rand sichtbar und kompakt (Icon-Knöpfe, touch-taugliche Größe ≥ 40px).
- Verhält sich identisch zum Desktop; die Seitenleiste bleibt das vorhandene Overlay.

## Verhalten / Verdrahtung der Werkzeuge

Bezogen auf die bestehenden Handler in `garden-layout.ts`:

- **Navigieren (`tool==='navigate'`):**
  - `onBedMouseDown`, `onObstacleMouseDown`, `onRotateHandleMouseDown`, `plantPointDown` → frühzeitig `return`, damit das Ereignis zur Canvas-Pan-Logik durchreicht. (Pan/Zoom bleibt unverändert.)
  - `updateGhost`/`handleBackgroundClick` tun nichts.
- **Beet/Hindernis platzieren (`tool==='bed'|'obstacle'`, nur Beet-Modus):** wie heute (`updateGhost` zeigt Ghost; `handleBackgroundClick` legt an).
- **Pflanzen platzieren (`tool==='plant'`, nur Pflanzen-Modus):** wie heute, aber zusätzlich an `tool==='plant'` gekoppelt (statt nur an `mode==='plant'`).
- **Bearbeiten (`tool==='edit'`):**
  - Beet-Modus: Beet auswählen + verschieben (wie heutiges `select`), Hindernis auswählen + **neu: verschieben** (Drag-Verhalten der Beete spiegeln), Eigenschaften/Löschen über die Seitenleiste.
  - Pflanzen-Modus: **neu** — Pflanzungen auswählen/verschieben/Größe ändern/bearbeiten (siehe unten).

## Neue Bausteine

### 1. Navigieren-Werkzeug (klein)
Objekt-Handler in `'navigate'` unterdrücken; sicherstellen, dass das Pointer-/Touch-Ereignis zur Pan-Logik gelangt. Cursor: `grab`/`grabbing`.

### 2. Hindernis verschieben (klein)
`selectObstacleCore` um dieselbe Drag-Mechanik wie bei Beeten erweitern: Drag-State, Snap-to-Grid, Klammern an Garten-Grenzen, Overlap-Prüfung, Commit über `api.updateObstacle` (analog `updateBed`). Touch-Pfad in `onCanvasTouchStart/Move/End` mit aufnehmen.

### 3. Pflanzungen bearbeiten (größter Brocken)
Ziel: bestehende `PlantingZone` im Pflanzen-Modus mit `tool==='edit'`:

- **Auswählen:** Klick/Tap auf das Zonen-Rechteck setzt `selectedZone`-Signal; Detail in der Seitenleiste (Pflanze, Abstand, Löschen).
- **Verschieben:** Drag der ausgewählten Zone verschiebt das Zellen-Rechteck (`minCol/minRow/maxCol/maxRow`) um den Zell-Versatz; an Beet-Grenzen klammern; Überlappung mit anderen Zonen desselben Beets verhindern (analog `wouldOverlap` auf Zellebene).
- **Größe ändern:** Anfasser an den Ecken/Kanten des Zonen-Rechtecks ändern min/max-Zellen.
- **Abstand ändern:** vorhandener Abstands-Regler wirkt auf `spacingFactor` der ausgewählten Zone.
- **Löschen:** vorhandenes `removeZoneById`.
- **Commit ohne Backend-Änderung:** Da kein Zonen-Update-Endpunkt existiert, wird eine Änderung als **Entfernen + Neu-Anlegen** umgesetzt (`api.removePlantingZone` + `api.addPlantingZone` mit neuen Grenzen/`spacingFactor`), gefolgt vom üblichen Reload. Die Zonen-`id` ändert sich dabei — unkritisch, da nach jeder Mutation neu geladen wird.
- **Touch:** Auswahl/Drag/Resize über die bestehende Touch-Routing-Struktur spiegeln.

## Tests

- **Reine Logik (Unit):** Zell-Mathematik für Verschieben/Resize der Zonen (Versatz, Klammern an Beet-Grenzen, Overlap-Erkennung auf Zellebene); Hindernis-Klammern/Snap/Overlap analog zur Beet-Logik. Falls noch nicht vorhanden, diese Berechnungen in pure Funktionen herauslösen, um sie testbar zu machen.
- **Komponenten-/Interaktionstest** (sofern Test-Harness im Projekt vorhanden): Moduswechsel setzt Werkzeug auf `navigate`; im `navigate`-Werkzeug verschiebt ein Drag auf einem Beet den Ausschnitt statt das Beet; im Pflanzen-`edit`-Werkzeug lässt sich eine Zone auswählen und verschieben.
- Bestehende Funktionalität (Beet platzieren/verschieben/bearbeiten, Pflanzung anlegen/löschen) bleibt grün.

## Risiken / offene Punkte

- **Icon-Verständlichkeit ohne Label auf Mobile:** durch klare, distinkte Icons + `aria-label` abgefedert; bei Bedarf später nachschärfen.
- **Entfernen+Neu-Anlegen statt Update der Zone:** kurzer Zustand ohne die Zone; bei Fehler im zweiten Schritt könnte die Zone verloren gehen. Mitigation: erst neu anlegen, dann alte entfernen — oder Fehlerbehandlung mit Reload.
- **Pflanzungen-Resize-Anfasser auf Mobile** können fummelig sein; ggf. großzügige Trefferflächen.
