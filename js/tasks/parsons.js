// Aufgabentyp „parsons“: Code-Puzzle – Zeilen ordnen und einrücken
import { parsonsLines, checkParsons, assembleParsons } from '../checks.js';
import { checkSyntax } from '../interpreter.js';
import { highlightLine, esc, shuffle } from '../util.js';
import { testTable, syntaxMsg } from './testresults.js';

const MAX_INDENT = 3;

export function renderParsons(ctx) {
    const { mission, vars } = ctx;
    const all = parsonsLines(mission).map(l => ({ ...l, indent: 0 }));
    // Mischen, aber nie in der richtigen Reihenfolge starten
    let program = shuffle(all, hashSeed(mission.id));
    if (program.every((l, i) => l === all[i])) program = program.slice().reverse();
    let trash = [];
    const hasDistractors = all.some(l => l.distractor);

    ctx.el.innerHTML = `
        <p class="task-q">🧩 Bring die Zeilen in die richtige Reihenfolge und stelle die Einrückung ein (⇥ / ⇤).${hasDistractors ? ' <strong>Achtung:</strong> Mindestens eine Zeile gehört nicht ins Programm – sortiere sie mit 🗑 aus.' : ''}</p>
        <ol class="parsons program" aria-label="Programm"></ol>
        ${hasDistractors ? '<h4 class="trash-title">🗑 Aussortiert</h4><ol class="parsons trash" aria-label="Aussortierte Zeilen"></ol>' : ''}
        <div class="task-actions">
            <button type="button" class="primary" data-act="check">▶ Programm prüfen</button>
        </div>
        <div class="task-result" aria-live="polite"></div>`;

    const progEl = ctx.el.querySelector('.program');
    const trashEl = ctx.el.querySelector('.trash');
    const resultEl = ctx.el.querySelector('.task-result');
    let dragId = null;

    const row = (item, inTrash, idx, len) => `
        <li class="pline" draggable="true" data-id="${item.id}" style="--indent:${inTrash ? 0 : item.indent}">
            <span class="grip" aria-hidden="true">⋮⋮</span>
            <code class="pcode">${highlightLine(item.text)}</code>
            <span class="pbtns">
                ${inTrash ? `<button type="button" data-a="restore" aria-label="Zeile zurück ins Programm">↩</button>` : `
                <button type="button" data-a="out" aria-label="Weniger einrücken" ${item.indent === 0 ? 'disabled' : ''}>⇤</button>
                <button type="button" data-a="in" aria-label="Mehr einrücken" ${item.indent >= MAX_INDENT ? 'disabled' : ''}>⇥</button>
                <button type="button" data-a="up" aria-label="Nach oben" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" data-a="down" aria-label="Nach unten" ${idx === len - 1 ? 'disabled' : ''}>↓</button>
                ${hasDistractors ? `<button type="button" data-a="trash" aria-label="Zeile aussortieren">🗑</button>` : ''}`}
            </span>
        </li>`;

    const draw = (focus) => {
        progEl.innerHTML = program.map((it, i) => row(it, false, i, program.length)).join('') || '<li class="empty">Leer</li>';
        if (trashEl) trashEl.innerHTML = trash.map((it, i) => row(it, true, i, trash.length)).join('') || '<li class="empty">Hierher kommen Zeilen, die nicht ins Programm gehören.</li>';
        if (focus) ctx.el.querySelector(`[data-id="${focus.id}"] [data-a="${focus.a}"]:not(:disabled)`)?.focus()
            || ctx.el.querySelector(`[data-id="${focus.id}"] button:not(:disabled)`)?.focus();
        resultEl.innerHTML = '';
    };

    ctx.el.addEventListener('click', (e) => {
        if (ctx.isSolved()) return;
        if (e.target.closest('[data-act="check"]')) { check(); return; }
        const b = e.target.closest('button[data-a]');
        if (!b) return;
        const id = b.closest('.pline').dataset.id;
        const a = b.dataset.a;
        const pi = program.findIndex(x => x.id === id);
        const item = pi >= 0 ? program[pi] : trash.find(x => x.id === id);
        if (a === 'in') item.indent = Math.min(MAX_INDENT, item.indent + 1);
        if (a === 'out') item.indent = Math.max(0, item.indent - 1);
        if (a === 'up' && pi > 0) [program[pi - 1], program[pi]] = [program[pi], program[pi - 1]];
        if (a === 'down' && pi < program.length - 1) [program[pi + 1], program[pi]] = [program[pi], program[pi + 1]];
        if (a === 'trash') { program.splice(pi, 1); trash.push(item); }
        if (a === 'restore') { trash = trash.filter(x => x !== item); item.indent = 0; program.push(item); }
        draw({ id, a });
    });

    // Drag & Drop (Maus); Tastatur/Touch nutzen die Knöpfe
    ctx.el.addEventListener('dragstart', (e) => {
        const li = e.target.closest('.pline');
        if (!li || ctx.isSolved()) return;
        dragId = li.dataset.id;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch { /* egal */ }
    });
    ctx.el.addEventListener('dragend', () => {
        dragId = null;
        ctx.el.querySelectorAll('.dragging, .drop-before, .drop-after').forEach(x => x.classList.remove('dragging', 'drop-before', 'drop-after'));
    });
    ctx.el.addEventListener('dragover', (e) => {
        if (!dragId) return;
        const list = e.target.closest('.parsons');
        if (!list) return;
        e.preventDefault();
        ctx.el.querySelectorAll('.drop-before, .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
        const li = e.target.closest('.pline');
        if (li && li.dataset.id !== dragId) {
            const r = li.getBoundingClientRect();
            li.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
        }
    });
    ctx.el.addEventListener('drop', (e) => {
        if (!dragId) return;
        const list = e.target.closest('.parsons');
        if (!list) return;
        e.preventDefault();
        const item = program.find(x => x.id === dragId) || trash.find(x => x.id === dragId);
        program = program.filter(x => x !== item);
        trash = trash.filter(x => x !== item);
        const target = list.classList.contains('trash') ? trash : program;
        const li = e.target.closest('.pline');
        let idx = target.length;
        if (li && li.dataset.id !== dragId) {
            const r = li.getBoundingClientRect();
            idx = target.findIndex(x => x.id === li.dataset.id) + (e.clientY < r.top + r.height / 2 ? 0 : 1);
        }
        // Einrückung aus der horizontalen Position ableiten (nur im Programm)
        if (target === program) {
            const codeLeft = list.getBoundingClientRect().left + 40;
            const step = 28;
            item.indent = Math.max(0, Math.min(MAX_INDENT, Math.round((e.clientX - codeLeft - 60) / step)));
            if (!Number.isFinite(item.indent)) item.indent = 0;
        } else item.indent = 0;
        target.splice(idx, 0, item);
        dragId = null;
        draw();
    });

    const check = () => {
        const code = assembleParsons(program);
        const firstTest = (mission.tests || [])[0] || {};
        ctx.setStepper({ code, vars: { ...vars, ...(firstTest.vars || {}) }, title: 'Dein Programm Schritt für Schritt' });
        const syn = checkSyntax(code);
        if (syn) {
            resultEl.innerHTML = syntaxMsg(syn);
            ctx.wrong('Das Programm lässt sich so noch nicht ausführen – oft liegt es an der Einrückung.');
            return;
        }
        const r = checkParsons(mission, vars, program);
        resultEl.innerHTML = r.results.length ? testTable(r) : '';
        if (!r.ok && program.some(x => x.distractor)) {
            ctx.wrong('Noch nicht richtig. Gehört wirklich jede Zeile ins Programm?');
            return;
        }
        if (r.ok) {
            ctx.el.querySelectorAll('.pline button, [data-act="check"]').forEach(b => { b.disabled = true; });
            ctx.el.querySelectorAll('.pline').forEach(li => li.setAttribute('draggable', 'false'));
            ctx.solved(`<p>Dein Programm:</p><pre class="console code-out">${esc(code)}</pre>`);
        } else {
            ctx.wrong(r.results.length ? 'Die Testläufe zeigen, dass die Reihenfolge oder Einrückung noch nicht stimmt.' : 'Reihenfolge oder Einrückung stimmen noch nicht.');
        }
    };

    draw();
}

function hashSeed(s) {
    let h = 7;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
    return h + 1;
}
