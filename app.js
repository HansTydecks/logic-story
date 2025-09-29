/**
 * Logic Story Game - Interactive Programming Logic Trainer
 * Mit Story-Auswahl und verbessertem Layout
 */

class LogicStoryEngine {
    constructor() {
        this.currentMission = 1;
        this.storyData = null;
        this.mission = null;
        this.currentTheme = 'default';
        this.lrsMode = false; // LRS-Unterstützung standardmäßig deaktiviert
        
        // Score tracking system - Story-specific scoring systems
        this.shipDamageScore = 100; // Start with 100 points
        this.consecutiveWrongAnswers = 0; // Track consecutive wrong answers for progressive penalty
        this.currentStoryId = null; // Track wh                            <li>${config.scoreIcon} ${config.finalText}: ${this.shipDamageScore}/100</li>ch story we're playing
        
        // Story-specific score terminology and theming
        this.scoreConfig = {
            'mission-aurora': {
                scoreName: 'Schiffsschadenindex',
                scoreIcon: '🛡️',
                scoreTitle: 'Schiffsstatus',
                statusLabels: {
                    excellent: 'Ausgezeichnet',
                    good: 'Gut', 
                    warning: 'Achtung',
                    danger: 'Gefahr',
                    critical: 'Kritisch'
                },
                penaltyText: 'Schiffsschaden',
                finalText: 'Finaler Schiffsstatus'
            },
            'krimi-mystery': {
                scoreName: 'Hinweispunkte',
                scoreIcon: '🔍',
                scoreTitle: 'Ermittlungsstatus',
                statusLabels: {
                    excellent: 'Brillant',
                    good: 'Gut',
                    warning: 'Unaufmerksam', 
                    danger: 'Verwirrt',
                    critical: 'Ratlos'
                },
                penaltyText: 'Hinweis verloren',
                finalText: 'Finale Hinweispunkte'
            },
            'zeitreise-abenteuer': {
                scoreName: 'Zeitmeterscore',
                scoreIcon: '⏰',
                scoreTitle: 'Zeitstrom-Status',
                statusLabels: {
                    excellent: 'Perfekt',
                    good: 'Stabil',
                    warning: 'Instabil',
                    danger: 'Chaotisch', 
                    critical: 'Kollaps'
                },
                penaltyText: 'Zeitstrom gestört',
                finalText: 'Finaler Zeitmeterscore'
            }
        };
        this.availableStories = [
            {
                id: 'mission-aurora',
                title: 'Mission Aurora',
                subtitle: 'Weltraumabenteuer',
                description: 'Kommandiere ein Raumschiff',
                image: 'images/mission-aurora.png',
                file: 'stories/mission-aurora.json',
                theme: 'space'
            },
            {
                id: 'zeitreise-abenteuer', 
                title: 'Zeitreiseabenteuer',
                subtitle: 'Durch die Jahrhunderte',
                description: 'Reise durch die Zeit und löse Rätsel',
                image: 'images/zeitreise-abenteuer.png',
                file: 'stories/zeitreise-abenteuer.json',
                theme: 'timetravel'
            },
            {
                id: 'krimi-mystery',
                title: 'Krimi-Mystery',
                subtitle: 'Detektiv-Fall',
                description: 'Löse einen spannenden Kriminalfall mit Logik',
                image: 'images/kirimi-mystery.png',
                file: 'stories/krimi-mystery.json',
                theme: 'mystery'
            }
        ];
        
        // Theme-Definitionen - Subtile, elegante Varianten mit serifenlosen Schriften
        this.themes = {
            default: {
                background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
                primaryColor: '#64ffda',
                secondaryColor: '#b0bec5',
                accentColor: '#ffd54f',
                cardBg: 'rgba(255, 255, 255, 0.05)',
                textColor: '#ffffff',
                fontFamily: "'Segoe UI', 'Roboto', sans-serif"
            },
            space: {
                background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e, #2d3748)',
                primaryColor: '#4fd1c7',
                secondaryColor: '#a0aec0',
                accentColor: '#68d391',
                cardBg: 'rgba(79, 209, 199, 0.03)',
                textColor: '#e2e8f0',
                borderColor: '#4fd1c7',
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
            },
            timetravel: {
                background: 'linear-gradient(135deg, #1a202c, #2d3748, #4a5568)',
                primaryColor: '#d69e2e',
                secondaryColor: '#cbd5e0',
                accentColor: '#ed8936',
                cardBg: 'rgba(214, 158, 46, 0.04)',
                textColor: '#f7fafc',
                borderColor: '#d69e2e',
                fontFamily: "'Open Sans', 'Helvetica Neue', sans-serif"
            },
            mystery: {
                background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d, #3d3d3d)',
                primaryColor: '#e53e3e',
                secondaryColor: '#a0a0a0',
                accentColor: '#fc8181',
                cardBg: 'rgba(229, 62, 62, 0.03)',
                textColor: '#f5f5f5',
                borderColor: '#e53e3e',
                fontFamily: "'Arial', 'Helvetica', sans-serif"
            }
        };
    }

    /**
     * Wendet ein Theme an
     */
    applyTheme(themeName) {
        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        const root = document.documentElement;
        
        // CSS Custom Properties setzen
        root.style.setProperty('--bg-gradient', theme.background);
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        root.style.setProperty('--accent-color', theme.accentColor);
        root.style.setProperty('--card-bg', theme.cardBg);
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--border-color', theme.borderColor || theme.primaryColor);
        root.style.setProperty('--font-family', theme.fontFamily);
        
        // Body-Klasse für Theme setzen
        document.body.className = `theme-${themeName}`;
        
        // Schriftart für den gesamten Body setzen
        document.body.style.fontFamily = theme.fontFamily;
    }

    /**
     * Zeigt die Story-Auswahl an
     */
    showStorySelection() {
        // Zurück zum Default-Theme
        this.applyTheme('default');
        
        // Remove story-mode class to show footer
        document.body.classList.remove('story-mode');
        
        const container = document.getElementById('game-container');
        
        let html = `
            <div class="story-selection">
                <div class="selection-header">
                    <h1>🧠 Logik-Geschichten</h1>
                    <p>Wähle dein Abenteuer und lerne Programmierlogik!</p>
                    
                    <div class="lrs-toggle-container">
                        <button id="lrs-toggle" class="lrs-button ${this.lrsMode ? 'active' : ''}" 
                                onclick="game.toggleLRS()">
                            <span class="lrs-icon">👁️</span>
                            <span class="lrs-text">LRS-Unterstützung</span>
                            <span class="lrs-status">${this.lrsMode ? 'EIN' : 'AUS'}</span>
                        </button>
                        <p class="lrs-description">
                            Aktiviere diese Option für eine bessere Lesbarkeit bei Lese-Rechtschreib-Schwäche
                        </p>
                    </div>
                </div>
                
                <div class="stories-grid">
        `;
        
        this.availableStories.forEach(story => {
            html += `
                <div class="story-card" onclick="game.selectStory('${story.id}')">
                    <div class="story-image">
                        <img src="${story.image}" alt="${story.title}">
                    </div>
                    <div class="story-info">
                        <h3>${story.title}</h3>
                        <p class="story-subtitle">${story.subtitle}</p>
                        <p class="story-description">${story.description}</p>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Toggles LRS-Unterstützung an/aus
     */
    toggleLRS() {
        this.lrsMode = !this.lrsMode;
        
        // Button-Status aktualisieren
        const button = document.getElementById('lrs-toggle');
        const statusSpan = button.querySelector('.lrs-status');
        
        if (this.lrsMode) {
            button.classList.add('active');
            statusSpan.textContent = 'EIN';
        } else {
            button.classList.remove('active');
            statusSpan.textContent = 'AUS';
        }
        
        // Falls wir in einer Mission sind, diese neu anzeigen
        if (this.mission) {
            this.displayMission();
        }
    }

    /**
     * Wählt eine Story aus und lädt sie
     */
    async selectStory(storyId) {
        const story = this.availableStories.find(s => s.id === storyId);
        if (!story) {
            this.showError('Story nicht gefunden');
            return;
        }

        // Reset score system for new story
        this.resetScoreSystem();
        this.currentStoryId = storyId;

        // Theme für die gewählte Story anwenden
        this.applyTheme(story.theme);

        try {
            const response = await fetch(story.file);
            this.storyData = await response.json();
            this.loadMission(1);
        } catch (error) {
            console.error('Fehler beim Laden der Story:', error);
            this.showError('Story konnte nicht geladen werden');
        }
    }

    /**
     * Resets the score system for a new story
     */
    resetScoreSystem() {
        this.shipDamageScore = 100;
        this.consecutiveWrongAnswers = 0;
    }

    /**
     * Updates the ship damage score based on wrong answers
     * Progressive penalty system: 1 point for first wrong answer, then 2 points per subsequent wrong answer
     */
    updateScoreOnWrongAnswer() {
        this.consecutiveWrongAnswers++;
        
        if (this.consecutiveWrongAnswers === 1) {
            // First wrong answer: lose 1 point
            this.shipDamageScore = Math.max(0, this.shipDamageScore - 1);
        } else {
            // Subsequent wrong answers: lose 2 points each
            this.shipDamageScore = Math.max(0, this.shipDamageScore - 2);
        }
    }

    /**
     * Resets consecutive wrong answers counter on correct answer
     */
    resetConsecutiveWrongAnswers() {
        this.consecutiveWrongAnswers = 0;
    }

    /**
     * Gets the score configuration for the current story
     */
    getCurrentScoreConfig() {
        return this.scoreConfig[this.currentStoryId] || this.scoreConfig['mission-aurora'];
    }

    /**
     * Restarts the current story with a fresh score
     */
    restartCurrentStory() {
        if (this.currentStoryId) {
            this.resetScoreSystem();
            this.loadMission(1);
        } else {
            // Fallback to story selection if no current story
            this.showStorySelection();
        }
    }

    /**
     * Lädt eine spezifische Mission
     */
    loadMission(missionId) {
        // Add story-mode class to hide footer
        document.body.classList.add('story-mode');
        
        // If loading mission 1, this might be a restart, so reset score if specified
        if (missionId === 1) {
            // Only reset if explicitly restarting (can be enhanced later)
            // For now, we keep score continuous across mission retries within the same story session
        }
        
        this.mission = this.storyData.missions.find(m => m.id === missionId);
        
        if (!this.mission) {
            this.showError(`Mission ${missionId} nicht gefunden`);
            return;
        }

        this.currentMission = missionId;
        this.displayMission();
    }

    /**
     * Verarbeitet den Übergang zur nächsten Mission und sammelt Variablen
     */
    proceedToNextMission(nextMissionId) {
        // Sammle entdeckte Variablen der aktuellen Mission
        if (this.mission.variables_discovered) {
            // Finde die nächste Mission und füge die entdeckten Variablen hinzu
            const nextMission = this.storyData.missions.find(m => m.id === nextMissionId);
            if (nextMission) {
                // Füge entdeckte Variablen zu den Variablen der nächsten Mission hinzu
                Object.assign(nextMission.variables, this.mission.variables_discovered);
            }
        }

        // Lade die nächste Mission
        this.loadMission(nextMissionId);
    }

    /**
     * Zeigt die aktuelle Mission an (neues Layout: Text links, Variablen rechts)
     */
    displayMission() {
        const container = document.getElementById('game-container');
        
        // Story-Text basierend auf LRS-Modus wählen
        let storyText = this.mission.text;
        if (this.lrsMode && this.mission.lrs_support) {
            // LRS-Modus: Originaler Text PLUS zusätzliche LRS-Information
            storyText = this.mission.text + '\n\n---\n\n**📋 LRS-Unterstützung:** ' + this.mission.lrs_support;
        }
        
        let html = `
            <div class="mission-container">
                <div class="mission-header">
                    <h2>Mission ${this.mission.id}: ${this.mission.title}</h2>
                    <button class="back-button" onclick="game.showStorySelection()">↩️ Zurück zur Auswahl</button>
                </div>
                
                <div class="mission-layout">
                    <div class="mission-left">
                        <div class="mission-text">
                            ${this.formatText(storyText)}
                        </div>
                        
                        <div class="choices">
                            <h3>🎯 Wähle die richtige Bedingung:</h3>
                            ${this.displayButtons()}
                        </div>
                    </div>
                    
                    <div class="mission-right">
                        <div class="variables-display">
                            <h3>🔍 Variablen:</h3>
                            ${this.displayVariables()}
                        </div>
                        
                        <div class="score-display">
                            <h3>${this.getCurrentScoreConfig().scoreIcon} ${this.getCurrentScoreConfig().scoreTitle}:</h3>
                            ${this.displayShipDamageScore()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Formatiert den Missionstext
     */
    formatText(text) {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    /**
     * Zeigt die Variablen an
     */
    displayVariables() {
        let html = '<div class="variables-list">';
        
        for (const [varName, value] of Object.entries(this.mission.variables)) {
            const displayValue = typeof value === 'string' ? `"${value}"` : value;
            const valueType = typeof value === 'boolean' ? 'boolean' : 
                             typeof value === 'string' ? 'string' : 'number';
            
            html += `
                <div class="variable-item ${valueType}">
                    <div class="var-name">${varName}</div>
                    <div class="var-equals">=</div>
                    <div class="var-value">${displayValue}</div>
                    <div class="var-type">(${valueType})</div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Displays the ship damage score with visual status indication
     */
    displayShipDamageScore() {
        const config = this.getCurrentScoreConfig();
        
        // Determine score status and color
        let statusClass = 'excellent';
        let statusIcon = '🟢';
        let statusText = config.statusLabels.excellent;
        
        if (this.shipDamageScore >= 80) {
            statusClass = 'excellent';
            statusIcon = '🟢';
            statusText = config.statusLabels.excellent;
        } else if (this.shipDamageScore >= 60) {
            statusClass = 'good';
            statusIcon = '🟡';
            statusText = config.statusLabels.good;
        } else if (this.shipDamageScore >= 40) {
            statusClass = 'warning';
            statusIcon = '🟠';
            statusText = config.statusLabels.warning;
        } else if (this.shipDamageScore >= 20) {
            statusClass = 'danger';
            statusIcon = '🔴';
            statusText = config.statusLabels.danger;
        } else {
            statusClass = 'critical';
            statusIcon = '💀';
            statusText = config.statusLabels.critical;
        }

        return `
            <div class="score-container">
                <div class="score-item ${statusClass}">
                    <div class="score-label">
                        ${statusIcon} ${config.scoreName}
                    </div>
                    <div class="score-value">
                        ${this.shipDamageScore}/100
                    </div>
                    <div class="score-status">
                        ${statusText}
                    </div>
                </div>
                <div class="score-info">
                    <small>
                        ${this.consecutiveWrongAnswers > 0 ? 
                          `⚠️ Nächster Fehler: -${this.consecutiveWrongAnswers === 0 ? 1 : 2} Punkte` : 
                          '✅ Bereit für nächste Mission'}
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Zeigt die Antwort-Buttons an
     */
    displayButtons() {
        let html = '<div class="button-container">';
        
        this.mission.buttons.forEach((button, index) => {
            html += `
                <button class="choice-button" onclick="game.selectAnswer(${index})">
                    <code>${button.label}</code>
                </button>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Verarbeitet die Antwortauswahl
     */
    selectAnswer(buttonIndex) {
        const button = this.mission.buttons[buttonIndex];
        
        if (!button) {
            this.showError('Ungültige Auswahl');
            return;
        }

        // Update score based on answer correctness
        if (button.correct) {
            this.resetConsecutiveWrongAnswers();
        } else {
            this.updateScoreOnWrongAnswer();
        }

        this.showResult(button);
    }

    /**
     * Zeigt das Ergebnis der Auswahl
     */
    showResult(button) {
        const container = document.getElementById('game-container');
        
        let html = `
            <div class="result-container">
                <div class="result-header ${button.correct ? 'correct' : 'incorrect'}">
                    ${button.correct ? '✅ RICHTIG!' : '❌ FALSCH!'}
                </div>
                
                <div class="explanation">
                    ${this.formatText(button.explanation)}
                </div>
        `;

        // Show score update if answer was wrong
        if (!button.correct) {
            const config = this.getCurrentScoreConfig();
            const pointsLost = this.consecutiveWrongAnswers === 1 ? 1 : 2;
            html += `
                <div class="score-penalty">
                    <div class="penalty-info">
                        ${config.scoreIcon} ${config.penaltyText}: -${pointsLost} Punkte
                        <br>
                        <small>Aktueller ${config.scoreTitle}: ${this.shipDamageScore}/100</small>
                    </div>
                </div>
            `;
        }

        if (button.correct) {
            html += `
                <div class="success-message">
                    ${this.formatText(this.mission.success_text)}
                </div>
                
                <div class="progress-info">
                    <strong>Mission ${this.mission.id} von ${this.storyData.missions.length} abgeschlossen!</strong>
                    <br>
                    <span class="score-display-inline">
                        ${this.getCurrentScoreConfig().scoreIcon} Aktueller ${this.getCurrentScoreConfig().scoreTitle}: ${this.shipDamageScore}/100
                    </span>
                </div>
            `;

            if (this.mission.next_mission) {
                html += `
                    <button class="continue-button" onclick="game.proceedToNextMission(${this.mission.next_mission})">
                        🚀 Weiter zu Mission ${this.mission.next_mission}
                    </button>
                `;
            } else {
                // Final mission completed - show comprehensive score summary
                html += this.getFinalScoreSummary();
            }
        } else {
            html += `
                <button class="retry-button" onclick="game.displayMission()">
                    🔄 Nochmal versuchen
                </button>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Generates the final score summary for story completion
     */
    getFinalScoreSummary() {
        const config = this.getCurrentScoreConfig();
        let performanceRating = '';
        let performanceIcon = '';
        let performanceColor = '';
        
        if (this.shipDamageScore >= 90) {
            performanceRating = this.getStorySpecificPerfectRating();
            performanceIcon = '🏆';
            performanceColor = 'gold';
        } else if (this.shipDamageScore >= 80) {
            performanceRating = this.getStorySpecificExcellentRating();
            performanceIcon = '🥇';
            performanceColor = 'gold';
        } else if (this.shipDamageScore >= 60) {
            performanceRating = this.getStorySpecificGoodRating();
            performanceIcon = '🥈';
            performanceColor = 'silver';
        } else if (this.shipDamageScore >= 40) {
            performanceRating = this.getStorySpecificOkayRating();
            performanceIcon = '🥉';
            performanceColor = 'bronze';
        } else if (this.shipDamageScore >= 20) {
            performanceRating = this.getStorySpecificBadRating();
            performanceIcon = '⚠️';
            performanceColor = 'red';
        } else {
            performanceRating = this.getStorySpecificCriticalRating();
            performanceIcon = '🚨';
            performanceColor = 'darkred';
        }

        const storyTitle = this.getStorySpecificCompletionTitle();

        return `
            <div class="final-success">
                <h2>🎊 ${storyTitle} 🎊</h2>
                
                <div class="final-score-display">
                    <div class="score-summary ${performanceColor}">
                        <div class="final-score-icon">${performanceIcon}</div>
                        <div class="final-score-text">
                            <h3>${config.finalText}</h3>
                            <div class="final-score-value">${this.shipDamageScore}/100</div>
                            <div class="final-performance">${performanceRating}</div>
                        </div>
                    </div>
                    
                    <div class="mission-stats">
                        <h4>📊 Missions-Statistik:</h4>
                        <ul>
                            <li>✅ Alle ${this.storyData.missions.length} Missionen abgeschlossen</li>
                            <li>�️ Finaler Schiffsstatus: ${this.shipDamageScore}/100</li>
                            <li>🎯 ${this.consecutiveWrongAnswers === 0 ? 'Perfekte Abschluss-Serie!' : 'Letzte Antworten benötigten Übung'}</li>
                        </ul>
                    </div>
                </div>
                
                <div class="final-buttons">
                    <button class="restart-button" onclick="game.restartCurrentStory()">
                        🔄 Mission wiederholen
                    </button>
                    <button class="new-story-button" onclick="game.showStorySelection()">
                        📚 Neue Geschichte wählen
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Gets story-specific performance ratings and completion messages
     */
    getStorySpecificCompletionTitle() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'MISSION AURORA ABGESCHLOSSEN!';
            case 'krimi-mystery':
                return 'KRIMI-MYSTERY GELÖST!';
            case 'zeitreise-abenteuer':
                return 'ZEITREISE-ABENTEUER BEENDET!';
            default:
                return 'GESCHICHTE ABGESCHLOSSEN!';
        }
    }

    getStorySpecificPerfectRating() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'PERFEKT! Kaum Schaden am Schiff!';
            case 'krimi-mystery':
                return 'PERFEKT! Alle Hinweise gefunden!';
            case 'zeitreise-abenteuer':
                return 'PERFEKT! Zeitstrom ungestört!';
            default:
                return 'PERFEKT!';
        }
    }

    getStorySpecificExcellentRating() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'AUSGEZEICHNET! Minimaler Schiffschaden!';
            case 'krimi-mystery':
                return 'AUSGEZEICHNET! Brillante Ermittlung!';
            case 'zeitreise-abenteuer':
                return 'AUSGEZEICHNET! Stabiler Zeitstrom!';
            default:
                return 'AUSGEZEICHNET!';
        }
    }

    getStorySpecificGoodRating() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'GUT! Moderater Schiffschaden';
            case 'krimi-mystery':
                return 'GUT! Solide Ermittlungsarbeit';
            case 'zeitreise-abenteuer':
                return 'GUT! Zeitstrom meist stabil';
            default:
                return 'GUT!';
        }
    }

    getStorySpecificOkayRating() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'AKZEPTABEL - Erheblicher Schiffschaden';
            case 'krimi-mystery':
                return 'AKZEPTABEL - Viele Hinweise übersehen';
            case 'zeitreise-abenteuer':
                return 'AKZEPTABEL - Zeitstrom instabil';
            default:
                return 'AKZEPTABEL';
        }
    }

    getStorySpecificBadRating() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'KRITISCH - Schwerer Schiffschaden!';
            case 'krimi-mystery':
                return 'KRITISCH - Ermittung mangelhaft!';
            case 'zeitreise-abenteuer':
                return 'KRITISCH - Zeitstrom chaotisch!';
            default:
                return 'KRITISCH!';
        }
    }

    getStorySpecificCriticalRating() {
        switch (this.currentStoryId) {
            case 'mission-aurora':
                return 'NOTFALL - Schiff fast zerstört!';
            case 'krimi-mystery':
                return 'NOTFALL - Fall ungelöst!';
            case 'zeitreise-abenteuer':
                return 'NOTFALL - Zeitparadox droht!';
            default:
                return 'NOTFALL!';
        }
    }

    /**
     * Zeigt Fehlermeldungen an
     */
    showError(message) {
        // Add story-mode class to hide footer
        document.body.classList.add('story-mode');
        
        const container = document.getElementById('game-container');
        container.innerHTML = `
            <div class="error-container">
                <h2>❌ Fehler</h2>
                <p>${message}</p>
                <button onclick="game.showStorySelection()">🏠 Zurück zur Auswahl</button>
            </div>
        `;
    }
}

// Globale Spiel-Instanz
let game;

// Spiel starten
document.addEventListener('DOMContentLoaded', () => {
    game = new LogicStoryEngine();
    // Initialisiere mit Default-Theme
    game.applyTheme('default');
    game.showStorySelection();
});