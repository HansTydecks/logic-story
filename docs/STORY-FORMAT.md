# Story-Format (Version 2)

Eine Geschichte ist **eine JSON-Datei** in `stories/`. Die richtigen Antworten werden nie von Hand eingetragen – der eingebaute Mini-Python-Interpreter (`js/interpreter.js`) rechnet sie aus. `node --test tests/` prüft jede Mission automatisch.

## Gerüst

```jsonc
{
  "format": 2,
  "id": "mission-aurora",
  "title": "Mission Aurora",
  "subtitle": "Weltraumabenteuer",
  "theme": "space",                       // space | timetravel | mystery | default
  "computer": "ORION",                    // Name des Computers in Feedback-Texten
  "statusTitle": "Schiffsstatus",         // Überschrift der Ressourcen-Anzeige
  "cover": "images/mission-aurora.webp",
  "prolog": "Text vor Kapitel 1 …",
  "resources": [                          // Statusbalken rechts, Werte 0–100
    { "id": "huelle",  "label": "Hülle",      "icon": "🛡️", "start": 100 },
    { "id": "energie", "label": "Energie",    "icon": "⚡", "start": 80 },
    { "id": "moral",   "label": "Crew-Moral", "icon": "👥", "start": 50 }
    // "kind": "progress" = Wert, der wächst (neutrale Farbe statt Ampel)
  ],
  "defaultPenalty": [{ "res": "huelle", "inc": -4 }],   // pro Fehlversuch (max. 3 pro Mission)
  "defaultReward":  [{ "res": "moral",  "inc": 2 }],    // pro gelöster Mission
  "chapters": [ { …Kapitel… } ],
  "endings": {
    "code": "if huelle >= 75 and moral >= 75:\n    ende = \"triumph\"\nelif huelle >= 25:\n    ende = \"knapp\"\nelse:\n    ende = \"notlandung\"",
    "list": {
      "triumph":    { "title": "…", "text": "…", "image": "images/aurora/ende-triumph.webp" },
      "knapp":      { "title": "…", "text": "…", "image": "…" },
      "notlandung": { "title": "…", "text": "…", "image": "…" }
    }
  }
}
```

## Kapitel

```jsonc
{
  "id": "k1",
  "title": "Systeme hochfahren",
  "concept": "Variablen & Zuweisung",     // wird Lehrkräften/Schülern angezeigt
  "image": "images/aurora/k1.webp",
  "intro": "Story-Text zum Kapitelanfang (Markdown light: **fett**, *kursiv*, `code`)",
  "missions": [ …Missionen… ]
}
```

## Gemeinsame Felder jeder Mission

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ✔ | eindeutig in der Story, z. B. `"1-2"` |
| `type` | ✔ | `choice` · `trace` · `fill` · `bug` · `parsons` |
| `title` | ✔ | kurzer Titel |
| `text` | ✔ | Story + Aufgabenstellung. `{name}` wird durch den aktuellen Wert der Variable/Ressource ersetzt |
| `vars` |  | Startvariablen (Zahlen, Texte, true/false, Listen) |
| `useResources` |  | `true` oder `["energie"]`: aktuelle Ressourcenwerte werden zu Variablen |
| `lrs` |  | Kurzfassung für den LRS-Modus (wird zusätzlich angezeigt) |
| `hints` | ✔ | 1–2 gestufte Tipps (der zweite verrät fast alles) |
| `explain` | ✔ | Erklärung nach dem Lösen (das „Warum“) |
| `success` | ✔ | Story-Fortsetzung nach dem Lösen |
| `onSuccess` |  | Ressourcen-Effekte, z. B. `[{"res":"energie","inc":10}]` (statt `defaultReward`) |
| `onFail` |  | Effekte pro Fehlversuch (statt `defaultPenalty`) |

Code steht immer als **ein String mit `\n`** und 4 Leerzeichen Einrückung.

## Aufgabentypen

### `choice` – Welcher Zweig läuft?
```json
{ "type": "choice", "vars": {"kapitaen_alter": 15},
  "code": "if kapitaen_alter >= 18:\n    vollkommando()\nelse:\n    junior_kommando()" }
```
Die Schüler klicken eine `if`/`elif`/`else`-Zeile an. Richtig ist, was der Interpreter auswertet. Funktionsaufrufe in den Zweigen werden *nicht* ausgeführt (dürfen also erfunden sein).

### `trace` – Was kommt heraus?
```json
{ "type": "trace", "vars": {}, "code": "energie = 80\nenergie = energie - 15\nenergie = energie * 2",
  "ask": {"var": "energie"},
  "options": ["130", "65", "160"] }
```
`ask` ist eines von: `{"var": "name"}` (Wert am Ende), `{"output": true}` (alles, was `print` ausgibt), `{"loops": true}` (wie oft läuft der Körper der ersten Schleife; optional `"line": n`), `{"expr": "a + b"}`.
Ohne `options` gibt es ein Eingabefeld. Mit `options` muss **genau eine** Option stimmen.

### `fill` – Lückencode
```json
{ "type": "fill",
  "code": "if druck < 50:\n    schleuse = \"zu\"\nelse:\n    ___",
  "solution": ["schleuse = \"offen\""],
  "tests": [
    {"label": "Druck 30 → Schleuse bleibt zu", "vars": {"druck": 30}, "expect": {"schleuse": "zu"}},
    {"label": "Druck 90 → Schleuse öffnet",   "vars": {"druck": 90}, "expect": {"schleuse": "offen"}}
  ],
  "require": ["while "], "forbid": ["sum("] }
```
Jedes `___` wird ein Eingabefeld. `solution` (eine Antwort pro Lücke) dient dem Validator und dem Knopf „Lösung zeigen“. Tests: `vars` werden über die Mission-`vars` gelegt; `expect` prüft Variablen am Ende, `output` (Liste von Zeilen) prüft `print`-Ausgaben. Jede Lösung, die alle Tests besteht, zählt als richtig.
`require`/`forbid` können auch `{"pattern": "for ", "message": "Benutze eine for-Schleife."}` sein.

### `bug` – Fehler finden und reparieren
```json
{ "type": "bug",
  "code": "schild = 20\nwhile schild < 80:\n    print(schild)\nprint(\"fertig\")",
  "bugLine": 3, "fix": "schild = schild + 20",
  "tests": [ {"label": "Schild lädt bis 80", "expect": {"schild": 80}} ] }
```
Erst die fehlerhafte Zeile anklicken (`bugLine`, 1-basiert), dann die Zeile korrigieren. Der Validator prüft: Originalcode besteht die Tests **nicht**, Code mit `fix` besteht sie.

### `parsons` – Code-Puzzle
```json
{ "type": "parsons",
  "solution": "summe = 0\nfor x in range(1, 4):\n    summe = summe + x\nprint(summe)",
  "distractors": ["summe = 1"],
  "tests": [ {"label": "Ausgabe 6", "output": ["6"]} ] }
```
Die Zeilen werden gemischt, die Einrückung entfernt. Die Schüler ordnen sie und stellen die Einrückung ein; Ablenker-Zeilen müssen aussortiert werden. Mit `tests` zählt jede Anordnung, die die Tests besteht, sonst muss die Reihenfolge genau `solution` entsprechen.

## Was der Interpreter kann

`int`, `float`, `str`, `bool`, `None`, Listen · `+ - * / // % **` · Vergleiche (auch `1 < x < 5`) · `and or not` · `in`, `not in` · `= += -= *= /= //= %=` · `if/elif/else` · `while` · `for … in range(…)/Liste/Text` · `break`, `continue`, `pass` · `def`/`return` · `print len range str int float abs round min max sum sorted` · Listen: `append pop insert remove index count` · Text: `upper lower`.
Endlosschleifen brechen nach 5000 Schritten mit einer Erklärung ab.
