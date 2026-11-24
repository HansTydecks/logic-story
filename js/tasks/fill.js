// Aufgabentyp „fill“: Lückencode selbst schreiben
import { checkFill, fillBlanks, countBlanks } from '../checks.js';
import { checkSyntax } from '../interpreter.js';
import { codeBlock } from '../ui/code.js';
import { esc } from '../util.js';
import { testTable, syntaxMsg } from './testresults.js';

export function renderFill(ctx) {
    const { mission, vars } = ctx;
    const n = countBlanks(mission.code);
    ctx.el.innerHTML = `
        <p class="task-q">✍️ Fülle ${n === 1 ? 'die Lücke' : `die ${n} Lücken`} und teste deinen Code.</p>
        ${codeBlock(mission.code, { blanks: true })}
        <div class="task-actions">
            <button type="button" class="primary" data-act="test">▶ Code testen</button>
            <button type="button" class="ghost" data-act="reveal" hidden>Lösung zeigen</button>
        </div>
        <div class="task-result" aria-live="polite"></div>`;

    const inputs = [...ctx.el.querySelectorAll('input.blank')];
    const resultEl = ctx.el.querySelector('.task-result');
    const autosize = (inp) => { inp.style.width = Math.max(inp.classList.contains('blank-wide') ? 16 : 6, inp.value.length + 2) + 'ch'; };
    inputs.forEach(inp => { autosize(inp); inp.addEventListener('input', () => autosize(inp)); });
    inputs[0]?.focus({ preventScroll: true });

    const updateStepper = () => {
        const code = fillBlanks(mission.code, inputs.map(i => i.value || 'pass'));
        const firstTest = (mission.tests || [])[0] || {};
        ctx.setStepper({ code, vars: { ...vars, ...(firstTest.vars || {}) }, title: 'Dein Code Schritt für Schritt', note: firstTest.label ? 'Testlauf: ' + firstTest.label : '' });
    };

    const test = () => {
        if (ctx.isSolved()) return;
        const answers = inputs.map(i => i.value.trim());
        if (answers.some(a => a === '')) {
            resultEl.innerHTML = '<div class="info">Fülle zuerst alle Lücken aus.</div>';
            inputs.find(i => !i.value.trim())?.focus();
            return;
        }
        const code = fillBlanks(mission.code, answers);
        const syn = checkSyntax(code);
        if (syn) { resultEl.innerHTML = syntaxMsg(syn); return; }
        const r = checkFill(mission, vars, answers);
        updateStepper();
        if (r.rules.length) {
            resultEl.innerHTML = `<div class="info">${r.rules.map(esc).join('<br>')}</div>`;
            return;
        }
        resultEl.innerHTML = testTable(r);
        if (r.ok) {
            inputs.forEach(i => { i.readOnly = true; });
            ctx.el.querySelector('[data-act="test"]').disabled = true;
            ctx.solved('');
        } else {
            ctx.wrong('Noch nicht alle Testläufe bestanden – schau dir an, welcher Fall scheitert.');
            if (ctx.failCount() >= 3 && mission.solution) ctx.el.querySelector('[data-act="reveal"]').hidden = false;
        }
    };

    ctx.el.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'test') test();
        if (act === 'reveal') {
            inputs.forEach((inp, i) => { inp.value = mission.solution[i]; autosize(inp); });
            resultEl.innerHTML = '<div class="info">Das ist eine mögliche Lösung. Lies sie genau und teste sie dann.</div>';
        }
    });
    ctx.el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('input.blank')) { e.preventDefault(); test(); }
    });
}
