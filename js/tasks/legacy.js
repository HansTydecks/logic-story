// Alte Missionen (Format 1, Krimi & Zeitreise): Antwort-Buttons mit festem correct-Flag
import { highlightLine, formatText } from '../util.js';

export function renderLegacy(ctx) {
    const { mission } = ctx;
    ctx.el.innerHTML = `
        <p class="task-q">🎯 Welche Anweisung führt der Computer aus?</p>
        <div class="legacy-options">
            ${mission.buttons.map((b, i) => `
                <button type="button" class="code-option" data-i="${i}">
                    <code>${b.label.split('\n').map(l => highlightLine(l.replace(/^\s{5,}/, '    '))).join('\n')}</code>
                </button>`).join('')}
        </div>`;
    ctx.el.addEventListener('click', (e) => {
        const btn = e.target.closest('.code-option');
        if (!btn || ctx.isSolved()) return;
        const b = mission.buttons[Number(btn.dataset.i)];
        if (b.correct) {
            btn.classList.add('right');
            ctx.el.querySelectorAll('.code-option').forEach(x => { x.disabled = true; });
            ctx.solved(formatText(b.explanation));
        } else {
            btn.classList.add('wrong-perm');
            btn.disabled = true;
            ctx.wrong(formatText(b.explanation));
        }
    });
}

/** Wandelt eine alte Story (Format 1) in das Kapitel-Format um. */
export function convertLegacy(raw, meta) {
    const cumulative = {};
    const missions = raw.missions.map(m => {
        Object.assign(cumulative, m.variables || {});
        Object.assign(cumulative, m.variables_discovered || {});
        return {
            id: String(m.id),
            type: 'legacy',
            title: m.title,
            text: m.text,
            lrs: m.lrs_support,
            vars: { ...cumulative },
            buttons: m.buttons,
            success: m.success_text,
            hints: ['Gehe die Bedingungen von oben nach unten durch. Die erste, die True ist, wird ausgeführt.',
                'Setze die Werte aus der Variablenliste in jede Bedingung ein. Bei `and` müssen beide Seiten True sein, bei `or` reicht eine.'],
            explain: ''
        };
    });
    return {
        format: 2,
        legacy: true,
        id: meta.id,
        title: meta.title,
        subtitle: meta.subtitle,
        description: meta.description,
        theme: meta.theme,
        cover: meta.cover,
        prolog: raw.description || '',
        resources: [{ id: 'punkte', label: meta.scoreName, icon: meta.scoreIcon, start: 100 }],
        defaultPenalty: [{ res: 'punkte', inc: -2 }],
        defaultReward: [],
        chapters: [{
            id: 'klassik',
            title: 'Alle Missionen',
            concept: 'if / elif / else · and / or / not',
            intro: (raw.description || '') + '\n\n*Diese Geschichte ist noch in der klassischen Form (nur Auswahl-Aufgaben). Sie wird bald wie „Mission Aurora“ mit Schleifen, Lückencode, Bug-Jagd und Code-Puzzles umgebaut.*',
            missions
        }],
        endings: {
            code: 'if punkte >= 80:\n    ende = "top"\nelif punkte >= 50:\n    ende = "gut"\nelse:\n    ende = "knapp"',
            intro: 'Deine Endwertung – berechnet mit deinem eigenen Punktestand:',
            list: meta.endings
        }
    };
}
