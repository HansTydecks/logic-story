# Prompt: Interaktive Logik‑Abenteuergeschichte — Raumfahrt (Prompt für Entwickler / AI)

**Ziel:**
Eine leichte, sichere und leicht erweiterbare Web‑Applikation (statische Seite, deploybar via GitHub Pages), die Schülerinnen und Schülern (Sek I/II) Logik und logische Operatoren beibringt. Die Lernenden navigieren eine spannende Raumfahrt‑Story, indem sie am Ende jeder Szene eine **Bedingung im Code‑Look** auswählen (z. B. `if`, `elif`, `else`, Kombinationen mit `and`/`or`/`not` etc.). Die Anwendung wertet aus, ob die gewählte Bedingung *die echte Branch‑Entscheidung* für den aktuellen Spielzustand wäre. Korrekte Auswahl → Story geht sinnvoll weiter; falsche Auswahl → pädagogischer Dead‑End oder Erklärung.

> **Kurze, starke Meinung:** Niemals `eval()` im Browser verwenden. Expressions müssen sicher und deterministisch geparst und ausgewertet werden (Whitelist der Operatoren, Whitelist der Variablen). Das ist nicht verhandelbar.

---

## 1) Didaktisches Konzept (kompakt und umsetzbar)

* **Lernziele:** Verständnis von Vergleichen (`==`, `!=`, `<`, `<=`, `>`, `>=`), logischen Operatoren (`and`, `or`, `not`), verschachtelten Bedingungen, Mehrfachverzweigungen (`if`/`elif`/`else`) und später: einfache Zustandsänderungen/Schleifen.
* **Progression:** Levelbasierte Steigerung (Level 1 → einfache Vergleiche; Level 2 → `and`/`or`; Level 3 → `not`/Verschachtelung; Level 4 → Bedingung mit State‑Änderung; Level 5 optional → Schleifen/iterative Logik/Fehlerbehandlung).
* **Motivation:** Raumfahrt („Mission Aurora“) als Rahmen: klares Problemsetting, hohe Identifikation, logische Entscheidungen mit sichtbaren Konsequenzen.
* **Aktivitätsform:** Einzel- oder Partnerarbeit. Lehrkraft kann Story‑JSON-Dateien ergänzen oder eigene Aufgaben erstellen.

---

## 2) High‑Level Gameplay / UX

* Start: **Storyauswahl** (Liste der verfügbaren `.json`‑Storyfiles in `/stories/`).
* Nach Auswahl: Lade `story.json`, initialisiere `variables` (vom JSON vorgegeben).
* Jede Szene (Node) zeigt einen Aushang/Erzähltext und darunter eine *ordinale Gruppe von Branches* (Buttons), beschriftet als Code‑Snippets (`if ...:`, `elif ...:`, `else:`). Reihenfolge ist wichtig.
* *Spielmechanik beim Klick:* Die Engine simuliert, welche Branch *(gemäß Interpreter‑Semantik)* ausgeführt würde (durch sequentielles Prüfen `if`, dann `elif`s, dann `else`). Wenn die vom Schüler gewählte Branch mit der simulierten Branch übereinstimmt → korrekt. Ansonsten → falsch.
* **Feedback:** Sofortiges, erklärendes Feedback (Warum war die andere Branch korrekt? Welche Ausdrücke sind wahr/falsch?). Optional: Visualisierung der Wahrheitswerte (Truth table / kurze Erklärung).
* **Persistenz & Resume:** Fortschritt lokal speichern (localStorage). Lehrkraft kann per Export/Import CSV/JSON die Ergebnisdaten herunterladen.

---

## 3) Technische Anforderungen (nicht verhandelbar)

* **Deployment:** Statische Web‑App, hostbar auf **GitHub Pages** (branch `main` oder `gh-pages`) — kein Backend, keine Datenbank.
* **Performance / Gewicht:** Lightweight: keine großen Frameworks. Vanilla HTML/CSS/JS oder minimaler Build mit kleinen Bibliotheken. Ziel: < 300 KB initial (assets minimiert).
* **Mobile‑first & Responsive:** Buttons groß genug, lesbare Code‑Fonts, Seitenlesbarkeit im Hochformat, Touch‑friendly UI.
* **Barrierefreiheit:** Tastatur‑navigierbar, ARIA‑Labels, kontrastreiche Farben.
* **Sicherheit:** Keine Verwendung von `eval()` oder dynamischem Script‑Einbau. Benutze eine kleine, sichere Ausdrucks‑Evaluierungsbibliothek (z. B. `expr-eval` oder selbst implementierter Parser mit erlaubten Operatoren) oder eine Whitelist‑Evaluierung.
* **Erweiterbarkeit:** Neue Stories per JSON einfügbar in `/stories/` — die App soll diese automatisch erkennen und in der Storyauswahl anzeigen.
* **Konfigurierbar:** Story + Level vollständig über JSON steuerbar (siehe Schema weiter unten).

---

## 4) JSON‑Datenmodell (empfohlenes Schema)

### Gesamtstruktur einer `story` (Dateiname z. B. `mission-aurora.json`)

```json
{
  "id": "mission-aurora",
  "title": "Mission Aurora",
  "author": "Lehrer Mustermann",
  "language": "de",
  "levels": [
    {
      "id": "lvl-1",
      "title": "Erste Prüfung",
      "start_node": "n1"
    }
  ],
  "variables": {
    "kapitaen_alter": 13,
    "treibstoff": 62,
    "schild_ok": true
  },
  "nodes": [ /* siehe Node‑Schema */ ]
}
```

### Node‑Schema (Wesentliches)

* `id` (string): eindeutige Node‑ID
* `title` (string): kurzer Titel
* `text` (string): erzählender Text (Markdown erlaubt)
* `branches` (array, **in Reihenfolge**): jede Branch ist ein object mit:

  * `type`: "if" | "elif" | "else"
  * `label`: (optional) wie der Button aussieht, z. B. `if kapitän_alter >= 18 :`
  * `expression`: (nur für `if`/`elif`) Ausdruck als String (z. B. `kapitaen_alter >= 18 and treibstoff > 50`). **Keine** direkten JavaScript‑Funktionen.
  * `on_true`: object `{ goto: "node_id", effects: [ ... ] }` — wohin springen, falls diese Branch ausgeführt wird
  * `on_false`: object `{ goto: "node_id", effects: [ ... ] }` — optional: wohin springen, falls ein Schüler diese Branch wählt, aber sie nicht die ausgeführte Branch ist (Pädagogische Dead‑End / Erklärung)
* `explain`: (optional) erklärender Text, der angezeigt werden kann, nachdem die Branch ausgewertet wurde

**Effekt‑Schema (`effects`)** (optional, Liste von Operationen):

* `{ "type": "set", "var": "treibstoff", "value": 30 }`
* `{ "type": "inc", "var": "treibstoff", "value": -10 }`
* `{ "type": "toggle", "var": "schild_ok" }`

---

## 5) Wie die Branch‑Evaluation funktioniert (Pseudocode)

```text
function computeTrueBranch(node, variables):
  for branch in node.branches:  // in order
    if branch.type == 'if' or branch.type == 'elif':
      if safeEval(branch.expression, variables) == true:
        return branch
    else if branch.type == 'else':
      return branch
  return null

// Wenn der Schüler auf eine branch klickt:
chosen = branchClicked
actual = computeTrueBranch(node, variables)
if chosen.id == actual.id:
  // korrekt: führe actual.on_true (goto + effects)
else:
  // falsch: zeige actual als korrekte Option, führe chosen.on_false (falls vorhanden)
```

Wichtig: `safeEval` ist eine sichere Evaluationsfunktion, die nur die erlaubten Operatoren und die im JSON definierten Variablen kennt.

---

## 6) Beispiel‑JSON (konkretes Mini‑Beispiel: Level 1 und 2)

```json
{
  "id": "mission-aurora",
  "title": "Mission Aurora",
  "language": "de",
  "variables": {
    "kapitaen_alter": 13,
    "treibstoff": 62,
    "schild_ok": true
  },
  "levels": [ { "id": "lvl-1", "title": "Startprobe", "start_node": "n1" }, { "id": "lvl-2", "title": "Notfall", "start_node": "n3" } ],
  "nodes": [
    {
      "id": "n1",
      "title": "Aufwachen",
      "text": "Du erwachst auf dem Kommandostuhl der Aurora. Auf deinem Display steht: \n'Crewmitgliedalter prüfen.'",
      "branches": [
        { "type": "if", "label": "if kapitaen_alter >= 18:", "expression": "kapitaen_alter >= 18", "on_true": { "goto": "n2", "effects": [] }, "on_false": { "goto": "n1_false", "effects": [] } },
        { "type": "elif", "label": "elif kapitaen_alter < 18:", "expression": "kapitaen_alter < 18", "on_true": { "goto": "n2_minor", "effects": [] }, "on_false": { "goto": "n1_false", "effects": [] } },
        { "type": "else", "label": "else:", "on_true": { "goto": "n1_else", "effects": [] } }
      ]
    },
    { "id": "n1_false", "title": "Alarm", "text": "Falsche Auswahl — der Alarm geht los.", "branches": [] },
    { "id": "n2", "title": "Volle Verantwortung", "text": "Du übernimmst das Kommando.", "branches": [] },
    { "id": "n2_minor", "title": "Aufsicht erforderlich", "text": "Du brauchst Aufsicht. Du wirst in den Nebenraum geführt.", "branches": [] },

    { "id": "n3", "title": "Notfall im Antrieb",
      "text": "Ein Thruster fällt aus. Auf dem Panel: Treibstoff und Schadenswerte.",
      "branches": [
        { "type": "if", "label": "if treibstoff > 50 and schild_ok:", "expression": "treibstoff > 50 and schild_ok", "on_true": { "goto": "n4_good", "effects": [ { "type": "inc", "var": "treibstoff", "value": -20 } ] }, "on_false": { "goto": "n4_bad", "effects": [] } },
        { "type": "elif", "label": "elif treibstoff <= 50:", "expression": "treibstoff <= 50", "on_true": { "goto": "n4_lowfuel", "effects": [] }, "on_false": { "goto": "n4_bad", "effects": [] } },
        { "type": "else", "label": "else:", "on_true": { "goto": "n4_bad", "effects": [] } }
      ]
    }
  ]
}
```

---

## 7) UI / Layout Vorschlag (mobile‑first)

* **Header:** Storytitel + Levelauswahl + Fortschrittsbalken (levelIndex / totalLevels).
* **Main:** linke Spalte (oder oben auf mobile): Storytext (scrollbar); rechte Spalte (oder Buttons unter Text auf mobile): Branch‑Buttons (groß, monospace Font, Touch‑friendly).
* **Footer:** Debug/Hints (nur für Lehrende oder nach 2 Fehlversuchen), Variable Inspector (optional: zeigt aktuelle Variablen, kann für Fortgeschrittene an/aus geschaltet werden).
* **Interaktion:** Bei Auswahl kurze Animation + Hervorhebung der korrekten Branch, Erklärungspopup. Button „Weiter“ zum nächsten Node.

---

## 8) Implementationsempfehlungen & Libraries

* **Minimal:** Vanilla JS, Fetch API zum Laden der JSONs, CSS Flexbox / Grid.
* **Expression Evaluation:** `expr-eval` (leichtgewichtig) oder eine kleine eigene Implementation, die nur die folgenden Token erlaubt: `and`, `or`, `not`, `==`, `!=`, `<=`, `>=`, `<`, `>`, Zahlen, Strings, Booleans, variable names. Niemals `Function()` oder `eval()`.
* **Optional (wenn gewünscht):** kleine UI‑Library (z. B. Preact) nur, wenn du Komponentenstruktur brauchst.

---

## 9) Folder‑Struktur (Vorschlag)

```
/ (root)
├─ index.html
├─ styles.css
├─ app.js
├─ /stories/                      # story JSON files
│   ├─ mission-aurora.json
│   └─ weitere-story.json
├─ /assets/
└─ README.md
```

---

## 10) Deployment (GitHub Pages) — kurze Anleitung

1. Neues Repository anlegen (z. B. `logic-adventure`).
2. Alle Dateien pushen (Branch `main` ist ok).
3. In GitHub: **Settings → Pages** → Branch: `main` / root → Save.
4. Seite erreichbar unter `https://<username>.github.io/<repo>/`.

---


---

## 12) Erweiterungen (optionale, aber nützliche Ideen)

* Visualisierung: Für komplexe Ausdrücke eine kleine grafische Darstellung (z. B. boolsche Baumschritte) zur Erklärung.

---

## 13) Lieferung / Erwartete Artefakte

* Eine statische Web‑App (HTML/CSS/JS), die lokal aufgerufen werden kann.
* Mindestens ein fertiges Story‑JSON: `mission-aurora.json` mit 5–8 Nodes, zwei Levels (Beispiel‑Inhalt wie oben).
* README mit Deployment‑Schritten und Hinweise für Lehrkräfte.

---

## 14) Prompt‑Verwendungshinweis

Nutze dieses Dokument als vollständigen Prompt für die Implementierung oder als Spezifikation für Entwickler. Falls du eine Implementierung wünschst, bitte ich zur Übergabe eines Repositories oder der Frage, ob ich ein Gerüst (index.html + app.js + sample JSON) direkt hier bereitstellen soll.

---

**Ende der Spezifikation.**

(Deutsch, formal; Ziel: sofort benutzbare Spezifikation, die ohne Rückfragen von einer technisch versierten Lehrkraft bzw. einem Entwicklerteam umgesetzt werden kann.)
