# 🧠 Logik-Geschichten

Ein Story-Lernspiel für Programmierlogik in Python, gedacht für Schülerinnen und Schüler **ab Klasse 9**.
Statt trockener Übungen entscheiden die Lernenden in spannenden Geschichten, was der Bordcomputer tut. Sie verfolgen Code, schreiben ihn selbst, jagen Bugs und puzzeln Programme zusammen.

**Live:** [lories.tinfo.space](https://lories.tinfo.space)  ·  Weitere Tools: [tinfo.space](https://tinfo.space/teachers/Digitale_Tools/)

## Was ist neu (Version 2)?

- **Mission Aurora** wurde komplett neu gebaut: 6 Kapitel mit 29 Missionen, die die Konzepte nacheinander aufbauen.
- **Fünf Aufgabentypen** statt nur „Welcher Zweig läuft?“.
- **Eigener Mini-Python-Interpreter:** Alle Antworten werden ausgerechnet, nicht von Hand eingetragen. Fehlermeldungen kommen auf Deutsch.
- **„Ablauf ansehen“:** Jedes Programm lässt sich Zeile für Zeile abspielen, mit Variablentabelle und Ausgabe.
- **Ressourcen statt Punkte:** Fehlversuche kosten Hülle. Am Ende berechnet ein `if/elif/else` mit den **eigenen Werten**, welches der drei Enden man erreicht.
- **Fortschritt** wird im Browser gespeichert, **Direktlinks** gibt es für jedes Kapitel und jede Mission.
- **LRS-Modus:** größere Schrift, mehr Abstand und kurze Zusammenfassungen.
- Krimi und Zeitreise laufen als „Klassik“ weiter und werden später im neuen Format umgebaut.

## Für Lehrkräfte

### Kapitel von Mission Aurora

| Kapitel | Konzept | Aufgabentypen |
|---|---|---|
| 1 · Systeme hochfahren | Variablen & Zuweisung | 🔎 Verfolgen, 🧩 Puzzle |
| 2 · Kommando-Entscheidungen | `if` / `elif` / `else` | 🔀 Zweig wählen, 🔎, ✍️ Lückencode |
| 3 · Logik-Gatter | `and` / `or` / `not` | 🔀, 🐞 Bug-Jagd, ✍️ |
| 4 · Durch das Asteroidenfeld | Schleifen (`while`, `for`/`range`) | 🔎 „Wie oft?“, 🐞 Endlosschleife & Off-by-one, ✍️ |
| 5 · Der Frachtraum der Hephaistos | Listen (Index, `append`, Summe/Maximum von Hand) | 🔎, ✍️, 🐞, 🧩 |
| 6 · Autopilot | Funktionen (`def`, Parameter, `return`) | 🔎, ✍️, 🐞, 🧩, Finale |

### Aufgabentypen

| | Typ | Was die Lernenden tun |
|---|---|---|
| 🔀 | **Zweig wählen** | die `if`/`elif`/`else`-Zeile anklicken, die ausgeführt wird. Das Feedback rechnet jede Bedingung vor (`15 >= 18 → False`). |
| 🔎 | **Code verfolgen** | den Wert einer Variable, die Ausgabe oder die Anzahl der Schleifendurchläufe vorhersagen |
| ✍️ | **Lückencode** | Bedingungen, Schleifen oder `return` selbst schreiben. Der Code läuft gegen mehrere Testfälle, inklusive Grenzfällen. |
| 🐞 | **Bug-Jagd** | die fehlerhafte Zeile finden und reparieren |
| 🧩 | **Code-Puzzle** | Zeilen ordnen, einrücken und Ablenker aussortieren |

### Im Unterricht

- **Direktlink auf ein Kapitel**, z. B. `https://lories.tinfo.space/#/mission-aurora/k4` für Schleifen. Jede Mission hat eine eigene Adresse wie `#/mission-aurora/k4/4-3`.
- **Fortschritt:** Er wird nur im jeweiligen Browser gespeichert. Es gibt kein Konto und keinen Server, und es werden keine Daten erhoben. Über „Spielstand zurücksetzen“ in der Kapitelübersicht fängt man neu an.
- **Hilfen:** Jede Mission hat zwei gestufte Tipps. Nach zwei Fehlversuchen wird „Ablauf ansehen“ freigeschaltet, bei Lückencode nach drei Fehlversuchen „Lösung zeigen“.
- **Bewertung:** Fehlversuche kosten die Ressource „Hülle“, höchstens drei Mal pro Mission. Mit ungefähr einem Fehler pro Mission erreicht man „Knapp, aber zu Hause“, fehlerfrei die „Triumphale Heimkehr“.

## Technik

Eine statische Seite ohne Build-Schritt und ohne Abhängigkeiten. Sie läuft auf GitHub Pages.

```
index.html              Gerüst + Footer
css/styles.css          Gestaltung (Farben je Geschichte über CSS-Variablen)
js/main.js              Start
js/engine.js            Bildschirme, Ressourcen, Fortschritt, Enden, Routing (#/…)
js/interpreter.js       Mini-Python: Tokenizer → Parser → Schritt-Interpreter (kein eval!)
js/checks.js            Prüflogik aller Aufgabentypen (Oberfläche UND Tests nutzen dieselbe)
js/tasks/*.js           ein Renderer pro Aufgabentyp (+ legacy.js für Klassik-Storys)
js/ui/stepper.js        „Ablauf ansehen“
js/ui/code.js           Code-Anzeige mit Syntaxfarben, klickbaren Zeilen, Lücken
js/stories.js           Verzeichnis der Geschichten + Farbthemen
stories/*.json          Geschichten
docs/STORY-FORMAT.md    Format für neue Geschichten/Missionen
tests/                  Interpreter-Tests + Story-Validator
```

### Lokal starten

ES-Module brauchen einen lokalen Server, ein Doppelklick auf `index.html` reicht nicht.

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000` öffnen.

### Tests

```bash
node --test tests/
```

- **`interpreter.test.mjs`** vergleicht den Mini-Interpreter mit echtem Python 3 (falls installiert). Außerdem prüft es Fehlermeldungen, Endlosschleifen-Schutz und Sicherheit.
- **`validate-stories.test.mjs`** prüft jede Mission jeder Story:
  - Lösungen bestehen die Tests.
  - Fehlerhafter Bug-Code fällt durch.
  - Bei Optionen ist genau eine richtig.
  - Missionen, die Ressourcen nutzen, funktionieren bei jedem Spielstand.
  - Fehlerfrei → bestes Ende, viele Fehler → schlechtestes Ende.

### Was der Mini-Interpreter kann

`int`, `float`, `str`, `bool`, `None`, Listen · `+ - * / // % **` · Vergleiche (auch verkettet) · `and or not` · `in` · `=`, `+=` usw. · `if/elif/else` · `while` · `for … in range()/Liste` · `break`, `continue`, `pass` · `def`/`return` · `print len range str int float abs round min max sum sorted` · Listenmethoden `append pop insert remove index count`.
Nach 5000 Schritten bricht er mit dem Hinweis „Endlosschleife?“ ab. Fehlermeldungen sind auf Deutsch, mit Zeilennummer und Tippfehler-Vorschlag („Meintest du `treibstoff`?“).

## Neue Geschichte oder Mission schreiben

Siehe **[docs/STORY-FORMAT.md](docs/STORY-FORMAT.md)**. Kurz gesagt:

1. Die JSON-Datei in `stories/` anlegen und in `js/stories.js` eintragen.
2. Missionen als `choice`, `trace`, `fill`, `bug` oder `parsons` schreiben. Richtige Antworten trägt man nicht ein, sondern schreibt Code und Testfälle.
3. `node --test tests/` ausführen. Der Validator meldet unlösbare oder mehrdeutige Missionen.

## Bilder

Die Kapitel- und Endbilder von Mission Aurora wurden mit fal.ai (Nano Banana 2.1) im Stil der vorhandenen Cover erzeugt und als WebP gespeichert.

## Lizenz & Autor

© 2025–2026 Hans Tydecks · [tinfo.space](https://tinfo.space) · [GitHub](https://github.com/HansTydecks)
