# Logik-Geschichten 2.0 – Design (2026-11-23)

> Abgestimmt im Brainstorming mit Hans Tydecks. Entscheidungen: alle 4 neuen Aufgabentypen, Storys kapitelweise umbauen, Story-Motivation zuerst, zuerst Engine + Mission Aurora, Ressourcen + mehrere Enden.

## Approaches
- **Eigener Mini-Python-Interpreter (gewählt):** klein, sicher, ermöglicht Schritt-für-Schritt-Anzeige und deutsche Fehlermeldungen.
- Pyodide: echtes Python, aber ~10 MB und keine Schrittanzeige ohne Aufwand – verworfen.
- Skulpt/Brython: mittelgroß, Fehlermeldungen englisch, Tracing schwierig – verworfen.


## Context
Bisher sind `lories.tinfo.space` (logic-story) 3 Geschichten mit je 15 Missionen. Jede Mission funktioniert gleich: Welcher `if/elif/else`-Zweig läuft? Ab Mission 9 werden nur die `and`-Ketten länger, Neues kommt nicht dazu. Variablen sind nur zur Anzeige da, die Story ist linear. Ziel ist eine **story-getriebene Motivationsseite** (als Ergänzung zu den nüchternen tinfo.space-Übungen) für Klasse 9 aufwärts. Sie soll echtes Programmierdenken üben: Code verfolgen, Schleifen, eigenen Code schreiben, Fehler finden, Code ordnen.

**Entscheidungen des Nutzers:**
- Alle 4 neuen Aufgabentypen kommen rein: Verfolgen/Schleifen, Lückencode, Bug-Jagd, Parsons.
- Bestehende Storys werden **kapitelweise umgebaut**.
- **Story-Motivation hat Vorrang.**
- Jetzt werden **Engine + Mission Aurora komplett** gebaut, Krimi und Zeitreise folgen später im selben Format.
- **Ressourcen + mehrere Enden** statt eines Punktestands.

Sprache: Python-Syntax wie bisher. Die Seite bleibt statisch (GitHub Pages, CNAME `lories.tinfo.space`), ohne Framework und ohne Build-Schritt.

## Architektur (neue Dateistruktur)
```
index.html            nur Markup + Footer (CSS ausgelagert)
css/styles.css        bestehendes CSS aus index.html + neue Komponenten
js/interpreter.js     Mini-Python (Tokenizer → Parser → AST → Schritt-Interpreter)
js/engine.js          Story-/Kapitel-Ablauf, Ressourcen, Enden, Fortschritt (localStorage)
js/tasks/*.js         ein Renderer pro Aufgabentyp: choice, trace, fill, bug, parsons
js/ui/stepper.js      „Ablauf ansehen“: Zeile für Zeile + Variablentabelle + Ausgabe
js/main.js            Start, Story-Auswahl, Routing
stories/mission-aurora.json   neu im Kapitel-Format
stories/krimi-mystery.json, zeitreise-abenteuer.json   unverändert, laufen über Legacy-Adapter
images/aurora/*.webp  Kapitelbilder (fal.ai), Cover als WebP
tests/                Interpreter-Tests + Content-Validator (node --test)
docs/superpowers/specs/2026-11-23-logic-story-v2-design.md   Design-Doc
```
Das bestehende `app.js` wird in diese Module aufgeteilt. Weiterverwendet werden: das Theme-System (`themes`, `applyTheme`), der LRS-Modus, die `scoreConfig`-Begriffe (sie werden zu Ressourcen-Namen), `formatText` und das Layout „Text links / Status rechts“. Danach entfallen `app.js`, `app.js.backup`, `test-score.js` und `test-scores.html`.

### Mini-Python-Interpreter (`js/interpreter.js`)
- **Umfang:**
  - int, float, str, bool, None, Listen (Index, `len`, `append`, `in`)
  - `+ - * / // %`, Vergleiche, `and/or/not`
  - `=`, `+=`, `-=`
  - `if/elif/else`, `while`, `for … in range()/Liste`, `break`
  - `def`/`return`
  - Eingebaut: `print`, `len`, `range`, `str`, `int`, `abs`, `min`, `max`
  - Blöcke über Einrückung
- **Kein `eval`/`Function`.** Ein Tree-Walker als Generator, der pro ausgeführter Zeile einen Snapshot `{line, vars, output}` liefert. Daraus entstehen die Schritt-Animation und die Zählung von Schleifendurchläufen.
- **Schrittlimit:** Bei 5000 Schritten bricht er ab mit „Endlosschleife? Der Bordcomputer hat nach 5000 Schritten abgebrochen.“
- **Fehlermeldungen auf Deutsch mit Zeilennummer:** z. B. „Zeile 3: Die Variable `tank` kennt der Bordcomputer nicht.“ und „Einrückung prüfen“.
- **API:**
  - `run(code, initialVars) → {vars, output, steps, error}`
  - `stepIterator(...)`
  - `whichBranch(code, vars) → Zeilennummer`

### Aufgabentypen (Mission-JSON `type`)
Bei allen Typen wird die richtige Antwort **vom Interpreter berechnet**, nicht von Hand eingetragen. Das verhindert Datenfehler wie den heutigen `0.9`-Bug. Jeder Typ hat bis zu 2 gestufte Tipps, eine Erklärung und den Button „Ablauf ansehen“.

| type | Aufgabe | Prüfung |
|---|---|---|
| `choice` | Code mit if/elif/else, Zweig anklicken (bisherige Mechanik) | `whichBranch` |
| `trace` | „Wert von `x` am Ende?“ / „Was wird ausgegeben?“ / „Wie oft läuft die Schleife?“ (Eingabefeld oder Auswahl) | `run` und Vergleich mit `ask` |
| `fill` | Code mit Lücken `___`, Schüler tippen einzelne Zeilen/Ausdrücke | Läuft gegen `tests[]` (Setup-Variablen → erwartete Variablen/Ausgabe), Testtabelle in Story-Sprache ✅/❌ |
| `bug` | Fehlerhafte Zeile anklicken, dann direkt in der Zeile korrigieren | Klick-Zeile == `bugLine`, korrigierter Code besteht `tests[]` |
| `parsons` | Zeilen sortieren und einrücken (Drag & Drop plus Tasten ↑↓ ⇥ ⇤ für Tastatur/Touch) | Zusammengesetzter Code besteht `tests[]` (mehrere gültige Reihenfolgen erlaubt) |

### Story-Mechanik: Ressourcen & Enden
- Statt des Werts `shipDamageScore` gibt es pro Story `resources`. Für Aurora sind das `huelle`, `energie` und `crew_moral` (0–100). Sie erscheinen rechts als Statusbalken.
- Missionen haben `onSuccess.effects` / `onFail.effects` (`inc`/`set`), z. B. kostet ein Fehlversuch 5 Hülle.
- Ausgewählte Ressourcen werden als **echte Variablen in spätere Aufgaben eingespeist**, z. B. `energie` aus dem eigenen Spielstand.
- **Finale:** Das Ende wird durch ein if/elif/else über die eigenen Ressourcen bestimmt. Das zeigt der Spieler sich selbst als Code mit 3 Enden: Triumph, knapp gerettet, Notlandung. Kein Lernstoff wird übersprungen.
- **Fortschritt** im localStorage (in try/catch): abgeschlossene Missionen, Ressourcen, erreichte Enden. Kapitelauswahl mit „Fortsetzen“ und „Kapitel neu starten“.

### Legacy-Adapter
Krimi und Zeitreise bleiben spielbar. Ihre `missions[].buttons` (mit `correct`-Flag) werden als `choice`-Missionen in einem Kapitel „Klassik“ gemappt, mit einem Badge „Umbau folgt“. Die bisherigen Punkte werden zu einer einzelnen Ressource. Damit ist auch der „Schiffsstatus“-Text-Bug (`app.js:669`) behoben.

## Inhalt: Mission Aurora neu (6 Kapitel, ~28 Missionen)
Figuren und Bogen bleiben: Alex (15), Dr. Chen, Sarah Rodriguez, Kim Patel, Hypersprung-Unfall → Heimkehr. Die alten Missionen 1–7 werden gestrafft als `choice` übernommen, die 7-fach-elif-Ketten (8–15) fallen weg.

1. **Systeme hochfahren – Variablen & Zuweisung:** trace (`energie = energie - 15`), Tausch-Rätsel, parsons
2. **Kommando-Entscheidungen – if/elif/else:** choice (alte M1–M3), fill (eigene Bedingung für die Luftschleuse)
3. **Logik-Gatter – and/or/not:** choice (alte M4, M6, M7), bug (`or` statt `and` öffnet die Schleuse), fill
4. **Asteroidenfeld – Schleifen:** trace „Wie oft?“ (while, Kühlzyklus), for/range-Schubimpulse, bug (Endlosschleife / off-by-one), fill (Schleife bis Schild ≥ 80)
5. **Frachtraum – Listen:** for über eine Liste (Vorräte zählen), fill (`max` von Hand suchen), parsons, bug
6. **Autopilot – Funktionen:** fill `def kurs_berechnen(...)`, bug (fehlendes `return`), Finale mit gemischter Aufgabe und Ressourcen-Ende

## Bilder (fal.ai)
- **6 Kapitelbilder** im bestehenden Stil: gemalt, cinematisch, dunkel mit warmen Lichtakzenten, Retro-Sci-Fi-Kosmonauten.
- **3 Endbilder.**
- Ausgabe als WebP ≤ 1200 px, je ca. 150 KB.
- Die 3 vorhandenen Cover (je ca. 2 MB PNG) werden zu WebP umgewandelt.
- Kein Text in den Bildern.

## Aufräumen & Doku
- README auf den tatsächlichen Stand bringen: Aufgabentypen, JSON-Schema, „neue Mission schreiben“.
- Abschnitt „Für Lehrkräfte“ mit Kapitel ↔ Konzept-Übersicht.
- Design-Doc nach `docs/superpowers/specs/` legen.
- Footer: Jahr aktualisieren.

## Umsetzungsreihenfolge
1. Design-Doc schreiben und committen.
2. Interpreter + `tests/interpreter.test.mjs` (`node --test`).
3. Engine, Stepper, 5 Task-Renderer, Legacy-Adapter, CSS (bestehende Themes, mobil ab 360 px).
4. Aurora-Inhalt (JSON). Läuft parallel zu 3, sobald das Schema steht (Subagent pro 2 Kapitel möglich).
5. `tests/validate-stories.mjs`: Für jede Mission werden Lösung, Tests, Bugzeile und Musterantworten durch den Interpreter geprüft, z. B. muss die Bug-Version Tests nicht bestehen, die Fix-Version schon.
6. Bilder generieren und einbinden, Cover komprimieren.
7. README, Aufräumen, Commit & Push auf `claude/eloquent-tesla-ril17w`.

## Verifikation
- `node --test tests/`: Interpreter-Tests und Story-Validator sind grün.
- Lokaler Server `python3 -m http.server`. Ein Playwright-Skript spielt Aurora komplett mit den Musterlösungen durch, inklusive eines falschen Versuchs pro Typ und eines Reloads (Fortschritt bleibt erhalten). Es prüft jedes Ende, dass keine Konsolenfehler auftreten, und macht Screenshots bei 390 px und 1280 px.
- Krimi und Zeitreise im Legacy-Modus jeweils mit 2–3 Missionen anspielen.
- LRS-Modus und Tastaturbedienung von Parsons prüfen.
