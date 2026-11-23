// „Ablauf ansehen“: Code Zeile für Zeile mit Variablentabelle und Ausgabe
import { run, pyRepr, pyEquals } from '../interpreter.js';
import { esc } from '../util.js';
import { codeBlock } from './code.js';

let openDialog = null;

/**
 * Öffnet den Schritt-Modus.
 * @param {string} code
 * @param {object} vars  Startvariablen
 * @param {object} opts  { title, stubCalls, note }
 */
export function openStepper(code, vars, opts = {}) {
    closeStepper();
    const res = run(code, vars, { record: true, stubCalls: opts.stubCalls !== false, maxSteps: 2000 });
    const steps = res.steps.slice();
    // Schlusszustand anhängen
    steps.push({ line: null, event: 'end', vars: res.vars, locals: null, fn: null, output: res.output.slice(), error: res.error });

    const dlg = document.createElement('dialog');
    dlg.className = 'stepper';
    dlg.setAttribute('aria-label', 'Ablauf Schritt für Schritt');
    dlg.innerHTML = `
        <div class="stepper-head">
            <h3>▶ ${esc(opts.title || 'Ablauf Schritt für Schritt')}</h3>
            <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">✕</button>
        </div>
        ${opts.note ? `<p class="stepper-note">${esc(opts.note)}</p>` : ''}
        <div class="stepper-body">
            <div class="stepper-code">${codeBlock(code, { small: true })}</div>
            <div class="stepper-side">
                <div class="stepper-status" aria-live="polite"></div>
                <h4>Variablen</h4>
                <table class="var-table"><tbody></tbody></table>
                <div class="locals-wrap" hidden>
                    <h4>In der Funktion <code class="fn-name"></code></h4>
                    <table class="var-table locals"><tbody></tbody></table>
                </div>
                <h4>Ausgabe</h4>
                <pre class="console"></pre>
            </div>
        </div>
        <div class="stepper-controls">
            <button type="button" data-act="first" aria-label="Zum Anfang">⏮</button>
            <button type="button" data-act="prev" aria-label="Schritt zurück">◀</button>
            <button type="button" data-act="play" class="play" aria-label="Automatisch abspielen">▶ Abspielen</button>
            <button type="button" data-act="next" aria-label="Nächster Schritt">▶</button>
            <button type="button" data-act="last" aria-label="Zum Ende">⏭</button>
            <span class="step-count"></span>
        </div>`;
    document.body.appendChild(dlg);
    openDialog = dlg;

    let i = 0;
    let timer = null;
    const $ = (sel) => dlg.querySelector(sel);

    const renderVars = (tbody, cur, prev) => {
        const keys = Object.keys(cur || {}).filter(k => !k.startsWith('__'));
        if (!keys.length) { tbody.innerHTML = '<tr><td class="empty" colspan="2">– noch keine –</td></tr>'; return; }
        tbody.innerHTML = keys.map(k => {
            const changed = !prev || !(k in prev) || !pyEquals(prev[k], cur[k]);
            return `<tr class="${changed && i > 0 ? 'changed' : ''}"><th>${esc(k)}</th><td>${esc(pyRepr(cur[k]))}</td></tr>`;
        }).join('');
    };

    const render = () => {
        const s = steps[i];
        const prev = i > 0 ? steps[i - 1] : null;
        dlg.querySelectorAll('.code-line').forEach(el => {
            el.classList.toggle('current', s.line !== null && Number(el.dataset.line) === s.line);
        });
        const cur = dlg.querySelector('.code-line.current');
        if (cur) cur.scrollIntoView({ block: 'nearest' });
        let status;
        if (s.event === 'end') {
            status = s.error
                ? `<span class="bad">⚠ Abbruch in Zeile ${s.error.line}: ${esc(s.error.message)}</span>`
                : '<span class="good">✔ Programm beendet.</span>';
        } else {
            const what = s.event === 'cond' ? 'prüft die Bedingung in' : s.event === 'else' ? 'springt in den else-Zweig,' : 'führt aus:';
            status = `ORION ${what} <strong>Zeile ${s.line}</strong>`;
        }
        $('.stepper-status').innerHTML = status;
        renderVars($('.var-table tbody'), s.vars, prev && prev.vars);
        const lw = $('.locals-wrap');
        lw.hidden = !s.locals;
        if (s.locals) {
            $('.fn-name').textContent = s.fn + '()';
            renderVars($('.locals tbody'), s.locals, prev && prev.fn === s.fn ? prev.locals : null);
        }
        $('.console').textContent = s.output.length ? s.output.join('\n') : '';
        $('.console').classList.toggle('empty', !s.output.length);
        $('.step-count').textContent = `Schritt ${i + 1} / ${steps.length}`;
        $('[data-act="prev"]').disabled = $('[data-act="first"]').disabled = i === 0;
        $('[data-act="next"]').disabled = $('[data-act="last"]').disabled = i === steps.length - 1;
    };

    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
        $('[data-act="play"]').textContent = '▶ Abspielen';
    };
    const go = (n) => { i = Math.max(0, Math.min(steps.length - 1, n)); render(); };

    dlg.addEventListener('click', (e) => {
        if (e.target === dlg) { closeStepper(); return; }
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        if (act !== 'play') stop();
        if (act === 'close') closeStepper();
        if (act === 'first') go(0);
        if (act === 'prev') go(i - 1);
        if (act === 'next') go(i + 1);
        if (act === 'last') go(steps.length - 1);
        if (act === 'play') {
            if (timer) { stop(); return; }
            if (i === steps.length - 1) go(0);
            $('[data-act="play"]').textContent = '⏸ Pause';
            timer = setInterval(() => {
                if (i >= steps.length - 1) { stop(); return; }
                go(i + 1);
            }, 700);
        }
    });
    dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { stop(); go(i + 1); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { stop(); go(i - 1); e.preventDefault(); }
    });
    dlg.addEventListener('close', () => { stop(); dlg.remove(); if (openDialog === dlg) openDialog = null; });

    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    render();
    $('[data-act="next"]').focus();
}

export function closeStepper() {
    if (openDialog) {
        if (typeof openDialog.close === 'function' && openDialog.open) openDialog.close();
        else { openDialog.remove(); openDialog = null; }
    }
}
