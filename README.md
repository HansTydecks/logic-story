# Logic Adventure - Interaktive Logik-Abenteuergeschichte

Eine leichte, sichere und erweiterbare Web-Applikation für den Unterricht, die Schülerinnen und Schülern (Sek I/II) Programmierlogik und logische Operatoren auf spielerische Weise beibringt.

## 🎯 Überblick

**Logic Adventure** ist eine statische Web-App, die komplexe logische Konzepte durch spannende Weltraum-Geschichten vermittelt. Schülerinnen und Schüler navigieren durch eine Story, indem sie die richtigen logischen Bedingungen (`if`, `elif`, `else`, `and`, `or`, `not`) auswählen.

### 🚀 Hauptfeatures

- ✅ **Vollständig statisch** - Deploybar auf GitHub Pages ohne Backend
- ✅ **Sicher** - Keine `eval()` Funktionen, sichere Expression-Evaluierung
- ✅ **Responsive** - Mobile-first Design, touch-friendly Interface
- ✅ **Barrierefrei** - ARIA-Labels, Tastatur-Navigation, hoher Kontrast
- ✅ **Dark Mode** - Angenehme dunkle Oberfläche
- ✅ **Erweiterbar** - Neue Geschichten einfach als JSON hinzufügbar
- ✅ **Persistenz** - Fortschritt wird lokal gespeichert

## 🎓 Lernziele

- Verständnis von Vergleichsoperatoren (`==`, `!=`, `<`, `<=`, `>`, `>=`)
- Logische Operatoren (`and`, `or`, `not`)
- Verschachtelte Bedingungen und Mehrfachverzweigungen
- If-elif-else Strukturen
- Zustandsänderungen und Variablen-Management

## 🏗️ Projekt-Struktur

```
logic-story/
├── index.html              # Haupt-HTML-Datei
├── styles.css              # CSS-Styling (Dark Mode)
├── app.js                  # JavaScript-Engine
├── stories/                # Story-JSON-Dateien
│   └── mission-aurora.json # Beispiel-Geschichte
└── README.md              # Diese Dokumentation
```

## 🚀 Installation & Deployment

### Lokale Entwicklung

1. **Repository klonen oder Dateien herunterladen**
   ```bash
   git clone <repository-url>
   cd logic-story
   ```

2. **Lokalen Server starten** (empfohlen)
   ```bash
   # Mit Python 3
   python -m http.server 8000
   
   # Mit Node.js (http-server)
   npx http-server
   
   # Mit Live Server (VS Code Extension)
   # Rechtsklick auf index.html → "Open with Live Server"
   ```

3. **Im Browser öffnen**
   ```
   http://localhost:8000
   ```

### GitHub Pages Deployment

1. **Repository auf GitHub erstellen**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```

2. **GitHub Pages aktivieren**
   - GitHub Repository öffnen
   - **Settings** → **Pages**
   - **Source**: Deploy from a branch
   - **Branch**: main / (root)
   - **Save** klicken

3. **Seite aufrufen**
   ```
   https://USERNAME.github.io/REPOSITORY/
   ```

## 📖 Benutzung

### Für Schülerinnen und Schüler

1. **Geschichte auswählen** aus dem Dropdown-Menü
2. **Story lesen** und die Situation verstehen
3. **Richtige Bedingung wählen** aus den Code-Buttons
4. **Feedback erhalten** mit Erklärungen
5. **Weiter navigieren** durch die Geschichte

### Für Lehrkräfte

#### Debug-Modus aktivieren
- Checkbox "Debug-Modus (für Lehrende)" aktivieren
- Zeigt zusätzliche technische Informationen
- Erklärt Expressions und Variablenwerte

#### Fortschritt verfolgen
- Variablen-Anzeige unten zeigt aktuellen Spielzustand
- LocalStorage speichert Fortschritt automatisch

#### Neue Geschichten hinzufügen
Siehe Abschnitt "Neue Geschichten erstellen"

## 📝 Neue Geschichten erstellen

### JSON-Struktur

Erstelle eine neue `.json`-Datei im `stories/` Ordner:

```json
{
  "id": "meine-geschichte",
  "title": "Meine Logik-Geschichte", 
  "author": "Ihr Name",
  "language": "de",
  "variables": {
    "variable_name": "initial_value"
  },
  "levels": [
    {
      "id": "level-1",
      "title": "Level-Titel",
      "start_node": "startknoten-id"
    }
  ],
  "nodes": [
    {
      "id": "startknoten-id",
      "title": "Szenen-Titel",
      "text": "Erzähltext der Szene...",
      "branches": [
        {
          "type": "if",
          "label": "if bedingung:",
          "expression": "variable_name > 10",
          "on_true": {
            "goto": "next-node-id",
            "effects": [
              {"type": "set", "var": "variable_name", "value": 20}
            ]
          },
          "on_false": {
            "goto": "failure-node-id",
            "effects": []
          }
        }
      ]
    }
  ]
}
```

### Erlaubte Expressions

Die folgenden Operatoren sind sicher und erlaubt:

**Vergleichsoperatoren:**
- `==` (gleich)
- `!=` (ungleich)  
- `<` (kleiner)
- `<=` (kleiner oder gleich)
- `>` (größer)
- `>=` (größer oder gleich)

**Logische Operatoren:**
- `and` (UND)
- `or` (ODER)
- `not` (NICHT)

**Beispiele:**
```javascript
"alter >= 18"
"treibstoff > 50 and schild_ok"
"not system_defekt"
"punkte <= 100 or bonus_aktiv"
```

### Effekt-Typen

**Variable setzen:**
```json
{"type": "set", "var": "variablen_name", "value": 42}
```

**Variable erhöhen/verringern:**
```json
{"type": "inc", "var": "punkte", "value": 10}
{"type": "inc", "var": "leben", "value": -1}
```

**Boolean umschalten:**
```json
{"type": "toggle", "var": "schalter_an"}
```

## 🛠️ Technische Details

### Sicherheit

Die App verwendet **keine** `eval()` Funktionen. Stattdessen:

1. **Tokenisierung** - Expressions werden in sichere Tokens zerlegt
2. **Validierung** - Nur erlaubte Operatoren und Variablen werden akzeptiert
3. **Sichere Evaluierung** - Kontrollierte Ausführung ohne Code-Injection

### Browser-Kompatibilität

- **Modern Browsers**: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+
- **Features**: ES6+, Fetch API, LocalStorage
- **Fallbacks**: Graceful degradation für ältere Browser

### Performance

- **Bundle-Größe**: < 50 KB (HTML + CSS + JS)
- **Assets**: Keine externen Abhängigkeiten
- **Loading**: Lazy Loading für Story-JSONs

## 🎨 Anpassungen

### Styling anpassen

Bearbeite `styles.css` und ändere die CSS-Variablen:

```css
:root {
  --bg-primary: #1a1a1a;        /* Haupthintergrund */
  --text-primary: #ffffff;       /* Haupttext */
  --accent-primary: #4a9eff;     /* Akzentfarbe */
  /* ... weitere Variablen */
}
```

### Neue Sprachen hinzufügen

1. Übersetze die UI-Texte in `index.html`
2. Passe JavaScript-Strings in `app.js` an
3. Erstelle Stories in der neuen Sprache

## 🐛 Fehlerbehebung

### Häufige Probleme

**"Geschichten laden nicht"**
- Überprüfe, ob ein lokaler Server läuft
- Browser-Konsole auf Fehler prüfen
- CORS-Probleme bei file:// URLs

**"Expression-Fehler"**
- Syntax in JSON überprüfen
- Nur erlaubte Operatoren verwenden
- Variablennamen müssen existieren

**"Buttons reagieren nicht"**
- JavaScript-Konsole auf Fehler prüfen
- Browser-Cache leeren
- Seite neu laden

### Debug-Informationen

Aktiviere den Debug-Modus für detaillierte Informationen:
- Expression-Evaluierung
- Variablen-Zustände
- Branch-Auswahl-Details

## 🤝 Beitrag leisten

### Code-Beitrag

1. Fork des Repositories erstellen
2. Feature-Branch erstellen (`git checkout -b feature/neue-funktion`)
3. Änderungen committen (`git commit -am 'Neue Funktion hinzugefügt'`)
4. Branch pushen (`git push origin feature/neue-funktion`)
5. Pull Request erstellen

### Story-Beitrag

Neue Geschichten können als JSON-Dateien beigesteuert werden:
- Folge der JSON-Struktur
- Teste die Geschichte gründlich
- Dokumentiere Lernziele
- Füge Beispiel-Lösungen hinzu

## 📚 Weitere Ressourcen

### Für Lehrkräfte

- **Didaktische Hinweise**: Wie integriert man Logic Adventure in den Unterricht
- **Beispiel-Lektionen**: Fertige Unterrichtsstunden mit der App
- **Assessment**: Bewertungskriterien für Schülerleistungen

### Für Entwickler

- **API-Dokumentation**: Detaillierte Beschreibung der JavaScript-API
- **Extension-Guide**: Wie erweitert man die App um neue Features
- **Testing**: Automatisierte Tests für Stories schreiben

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz - siehe die [LICENSE](LICENSE) Datei für Details.

## 👥 Autoren

- **Logic Adventure Team** - Initial development
- **Community Contributors** - Siehe [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 🙏 Danksagungen

- Inspiration durch moderne Lernspiele
- Feedback von Lehrkräften und Schülern
- Open Source Community für Tools und Bibliotheken

---

**Viel Spaß beim Lehren und Lernen von Programmierlogik! 🚀**