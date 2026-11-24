// Aufgabentyp „bug“: Fehler finden und reparieren
import { checkBugFix, runTests } from '../checks.js';
import { checkSyntax } from '../interpreter.js';
import { codeBlock } from '../ui/code.js';
import { esc } from '../util.js';
import { testTable, syntaxMsg } from './testresults.js';

export function renderBug(ctx) {
    const { mission, vars } = ctx;
    const lines = mission.code.split('\n');
    const firstTest = (mission.tests || [])[0] || {};
    const testVars = { ...vars, ...(firstTest.vars || {}) };

    const phase1 = () => {
        ctx.el.innerHTML = `
            <p class="task-q">🐞 In diesem Code steckt genau <strong>ein</strong> Fehler. Klicke auf die fehlerhafte Zeile.</p>
            ${codeBlock(mission.code, { clickable: 'all' })}
            <div class="task-actions">
                <button type="button" class="ghost" data-act="run">▶ Fehlerhaften Code testen</button>
            </div>
            <div class="task-result" aria-live="polite"></div>`;
        ctx.setStepper({ code: mission.code, vars: testVars, title: 'Der fehlerhafte Code Schritt für Schritt', note: firstTest.label ? 'Testlauf: ' + firstTest.label : '' });
    };

    const phase2 = () => {
        const indent = lines[mission.bugLine - 1].match(/^\s*/)[0];
        const template = lines.map((l, i) => i === mission.bugLine - 1 ? indent + '___' : l).join('\n');
        ctx.el.innerHTML = `
            <p class="task-q">🔧 Gefunden! Jetzt repariere Zeile ${mission.bugLine}.</p>
            ${codeBlock(template, { blanks: true, lineClass: (n) => n === mission.bugLine ? 'bug-line' : '' })}
            <div class="task-actions">
                <button type="button" class="primary" data-act="fix">▶ Reparatur testen</button>
                <button type="button" class="ghost" data-act="reveal" hidden>Lösung zeigen</button>
            </div>
            <div class="task-result" aria-live="polite"></div>`;
        const inp = ctx.el.querySelector('input.blank');
        inp.value = lines[mission.bugLine - 1].trim();
        inp.classList.add('blank-wide');
        inp.style.width = Math.max(16, inp.value.length + 4) + 'ch';
        inp.addEventListener('input', () => { inp.style.width = Math.max(16, inp.value.length + 4) + 'ch'; });
        inp.focus();
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fix(); } });
    };

    let fixFails = 0;
    const fix = () => {
        if (ctx.isSolved()) return;
        const inp = ctx.el.querySelector('input.blank');
        const resultEl = ctx.el.querySelector('.task-result');
        const text = inp.value;
        const fullCode = lines.map((l, i) => i === mission.bugLine - 1 ? l.match(/^\s*/)[0] + text.trim() : l).join('\n');
        const syn = checkSyntax(fullCode);
        if (syn) { resultEl.innerHTML = syntaxMsg(syn); return; }
        if (text.trim() === lines[mission.bugLine - 1].trim()) {
            resultEl.innerHTML = '<div class="info">Du hast die Zeile noch nicht verändert.</div>';
            return;
        }
        const r = checkBugFix(mission, vars, text);
        ctx.setStepper({ code: r.code, vars: testVars, title: 'Dein reparierter Code Schritt für Schritt' });
        if (r.rules.length) { resultEl.innerHTML = `<div class="info">${r.rules.map(esc).join('<br>')}</div>`; return; }
        resultEl.innerHTML = testTable(r);
        if (r.ok) {
            inp.readOnly = true;
            ctx.el.querySelector('[data-act="fix"]').disabled = true;
            ctx.solved('');
        } else {
            fixFails++;
            ctx.wrong('Die Reparatur klappt noch nicht in allen Testläufen.');
            if (fixFails >= 2) ctx.el.querySelector('[data-act="reveal"]').hidden = false;
        }
    };

    ctx.el.addEventListener('click', (e) => {
        if (ctx.isSolved()) return;
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'run') {
            const r = runTests(mission.code, mission, vars);
            ctx.el.querySelector('.task-result').innerHTML = testTable(r);
            return;
        }
        if (act === 'fix') { fix(); return; }
        if (act === 'reveal') {
            const inp = ctx.el.querySelector('input.blank');
            inp.value = mission.fix;
            inp.dispatchEvent(new Event('input'));
            ctx.el.querySelector('.task-result').innerHTML = '<div class="info">So könnte die reparierte Zeile aussehen. Teste sie!</div>';
            return;
        }
        const btn = e.target.closest('button.code-line');
        if (!btn) return;
        const line = Number(btn.dataset.line);
        if (line === mission.bugLine) {
            phase2();
        } else {
            btn.classList.add('wrong-perm');
            btn.disabled = true;
            ctx.wrong(`Zeile ${line} ist in Ordnung – der Fehler steckt woanders. Tipp: Teste den Code und überlege, welche Zeile für das falsche Ergebnis verantwortlich ist.`);
        }
    });

    phase1();
}
