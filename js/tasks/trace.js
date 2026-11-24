// Aufgabentyp „trace“: Code im Kopf ausführen
import { traceCheck, traceExpected } from '../checks.js';
import { codeBlock, inlineCode } from '../ui/code.js';
import { esc } from '../util.js';

function question(mission) {
    if (mission.question) return mission.question;
    const a = mission.ask || {};
    if (a.var) return `Welchen Wert hat ${inlineCode(a.var)} am Ende?`;
    if (a.output) return 'Was gibt das Programm aus?';
    if (a.loops) return 'Wie oft wird der Schleifenkörper ausgeführt?';
    if (a.expr) return `Welchen Wert hat ${inlineCode(a.expr)} am Ende?`;
    return 'Was kommt heraus?';
}

export function renderTrace(ctx) {
    const { mission, vars } = ctx;
    const a = mission.ask || {};
    const multiline = a.output && !mission.options;
    let answerUi;
    if (mission.options) {
        answerUi = `<div class="options">${mission.options.map((o, i) =>
            `<button type="button" class="option" data-i="${i}">${a.output ? `<pre>${esc(o)}</pre>` : esc(o)}</button>`).join('')}</div>`;
    } else if (multiline) {
        answerUi = `<form class="answer-form"><textarea class="answer" rows="3" spellcheck="false" aria-label="Deine Antwort" placeholder="Jede Ausgabezeile in eine eigene Zeile"></textarea><button type="submit" class="primary">Prüfen</button></form>`;
    } else {
        answerUi = `<form class="answer-form"><input class="answer" spellcheck="false" autocomplete="off" aria-label="Deine Antwort" placeholder="${a.loops ? 'Anzahl' : 'Wert'}"><button type="submit" class="primary">Prüfen</button></form>`;
    }
    ctx.el.innerHTML = `
        ${codeBlock(mission.code)}
        <p class="task-q">❓ ${question(mission)}</p>
        ${answerUi}`;
    ctx.setStepper({ code: mission.code, vars, title: 'Ablauf Schritt für Schritt' });

    const check = (input, btn) => {
        if (ctx.isSolved()) return;
        if (String(input).trim() === '') return;
        const r = traceCheck(mission, vars, input);
        if (r.ok) {
            if (btn) btn.classList.add('right');
            ctx.el.querySelectorAll('.option, .answer-form button, .answer').forEach(b => { b.disabled = true; });
            const shown = r.expected.isOutput ? `<pre class="console">${esc(r.expected.display)}</pre>` : inlineCode(r.expected.display);
            ctx.solved(`<p>Richtige Antwort: ${shown}</p>`);
        } else {
            if (btn) { btn.classList.add('wrong-perm'); btn.disabled = true; }
            const hint = a.loops
                ? 'Zähle mit: Prüfe bei jedem Durchlauf die Bedingung und notiere den neuen Wert.'
                : 'Geh den Code Zeile für Zeile durch und notiere nach jeder Zeile den Wert jeder Variable – wie ein Computer.';
            ctx.wrong(`${esc(String(input).trim()) ? `„${esc(String(input).trim())}“ stimmt nicht.` : ''} ${hint}`);
        }
    };

    ctx.el.addEventListener('click', (e) => {
        const opt = e.target.closest('.option');
        if (opt) check(mission.options[Number(opt.dataset.i)], opt);
    });
    const form = ctx.el.querySelector('.answer-form');
    if (form) {
        const field = form.querySelector('.answer');
        form.addEventListener('submit', (e) => { e.preventDefault(); check(field.value); });
        if (multiline) {
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(field.value); }
            });
        }
    }
    // Sicherheitscheck (z. B. fehlerhafte Mission)
    traceExpected(mission, vars);
}
