// Verzeichnis aller Geschichten. Neue Geschichte: JSON in stories/ ablegen und hier eintragen.
export const STORIES = [
    {
        id: 'mission-aurora',
        file: 'stories/mission-aurora.json'
    },
    {
        id: 'zeitreise-abenteuer',
        file: 'stories/zeitreise-abenteuer.json',
        legacy: {
            id: 'zeitreise-abenteuer',
            title: 'Zeitreise-Abenteuer',
            subtitle: 'Durch die Jahrhunderte',
            description: 'Reise durch die Zeit und löse Rätsel.',
            theme: 'timetravel',
            cover: 'images/zeitreise-abenteuer.webp',
            scoreName: 'Zeitstrom',
            scoreIcon: '⏰',
            endings: {
                top: { title: 'Zeitstrom ungestört!', text: 'Perfekt navigiert – die Geschichte ist sicher, und niemand hat bemerkt, dass du da warst.' },
                gut: { title: 'Zeitstrom stabil', text: 'Ein paar Wellen im Zeitstrom, aber nichts, was die Zukunft verändert. Gute Arbeit!' },
                knapp: { title: 'Zeitparadox knapp verhindert', text: 'Puh! Der Zeitstrom war ziemlich chaotisch. Versuch es nochmal und lies die Bedingungen genauer.' }
            }
        }
    },
    {
        id: 'krimi-mystery',
        file: 'stories/krimi-mystery.json',
        legacy: {
            id: 'krimi-mystery',
            title: 'Krimi-Mystery',
            subtitle: 'Detektiv-Fall',
            description: 'Löse einen spannenden Kriminalfall mit Logik.',
            theme: 'mystery',
            cover: 'images/krimi-mystery.webp',
            scoreName: 'Hinweispunkte',
            scoreIcon: '🔍',
            endings: {
                top: { title: 'Fall brillant gelöst!', text: 'Alle Hinweise gefunden, der Täter überführt. Die Kommissarin will dich sofort ins Team holen.' },
                gut: { title: 'Fall gelöst', text: 'Solide Ermittlungsarbeit – ein paar Hinweise sind dir durch die Lappen gegangen, aber der Fall ist gelöst.' },
                knapp: { title: 'Gerade noch gelöst', text: 'Viele Spuren wurden übersehen. Spiel den Fall nochmal und prüfe jede Bedingung genau.' }
            }
        }
    }
];

export const THEMES = {
    default: {
        background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        primaryColor: '#64ffda', secondaryColor: '#b0bec5', accentColor: '#ffd54f',
        cardBg: 'rgba(255, 255, 255, 0.05)', textColor: '#ffffff', borderColor: '#64ffda',
        fontFamily: "'Segoe UI', 'Roboto', system-ui, sans-serif"
    },
    space: {
        background: 'linear-gradient(135deg, #07090f, #121a2b, #23304a)',
        primaryColor: '#4fd1c7', secondaryColor: '#a0aec0', accentColor: '#f6ad55',
        cardBg: 'rgba(79, 209, 199, 0.04)', textColor: '#e2e8f0', borderColor: '#4fd1c7',
        fontFamily: "'Segoe UI', 'Roboto', system-ui, sans-serif"
    },
    timetravel: {
        background: 'linear-gradient(135deg, #1a202c, #2d3748, #4a5568)',
        primaryColor: '#d69e2e', secondaryColor: '#cbd5e0', accentColor: '#ed8936',
        cardBg: 'rgba(214, 158, 46, 0.05)', textColor: '#f7fafc', borderColor: '#d69e2e',
        fontFamily: "'Open Sans', 'Helvetica Neue', system-ui, sans-serif"
    },
    mystery: {
        background: 'linear-gradient(135deg, #141414, #232323, #333333)',
        primaryColor: '#fc8181', secondaryColor: '#a0a0a0', accentColor: '#f6ad55',
        cardBg: 'rgba(229, 62, 62, 0.04)', textColor: '#f5f5f5', borderColor: '#e53e3e',
        fontFamily: "'Arial', 'Helvetica', system-ui, sans-serif"
    }
};
