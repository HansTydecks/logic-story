// Aufgabentyp „choice“: Welcher Zweig wird ausgeführt?
import { analyzeChoice, explainCondition, evalExpr } from '../checks.js';
import { truthy, pyStr } from '../interpreter.js';
import { codeBlock, inlineCode } from '../ui/code.js';
import { esc } from '../util.js';

export function explainHeaders(analysis, vars) {
    const rows = [];
    for (const h of analysis.headers) {
        if (!h.evaluated) continue;
        if (h.kind === 'else') {
            rows.push(`<li><span class="tag">Zeile ${h.line}</span> ${inlineCode('else:')} → alle Bedingungen davor waren <b class="f">False</b>, also läuft der else-Zweig.</li>`);
            break;
        }
        const parts = explainCondition(h.cond, vars).map(p => p.op
            ? `<span class="op">${p.op}</span>`
            : `${inlineCode(p.filled)} → <b class="${p.value ? 't' : 'f'}">${esc(pyStr(truthy(p.value)))}</b>`
        ).join(' ');
        rows.push(`<li><span class="tag">Zeile ${h.line}</span> ${inlineCode(h.kind + ' ' + h.cond + ':')}<br><span class="eval">${parts}</span> ⇒ <b class="${h.value ? 't' : 'f'}">${h.value ? 'True – dieser Zweig läuft!' : 'False – weiter zur nächsten Zeile'}</b></li>`);
        if (h.value) break;
    }
    return `<ol class="cond-trace">${rows.join('')}</ol>`;
}

export function renderChoice(ctx) {
    const { mission, vars } = ctx;
    const analysis = analyzeChoice(mission.code, vars);
    const headerLines = new Set(analysis.headers.map(h => h.line));
    ctx.el.innerHTML = `
        <p class="task-q">👉 Klicke auf die Zeile (<code>if</code>, <code>elif</code> oder <code>else</code>), deren Zweig ${ctx.computer} ausführt.</p>
        ${codeBlock(mission.code, { clickable: headerLines })}`;
    ctx.setStepper({ code: mission.code, vars, title: `So prüft ${ctx.computer} die Bedingungen` });

    ctx.el.addEventListener('click', (e) => {
        const btn = e.target.closest('button.code-line');
        if (!btn || ctx.isSolved()) return;
        const line = Number(btn.dataset.line);
        if (line === analysis.correctLine) {
            btn.classList.add('right');
            ctx.el.querySelectorAll('button.code-line').forEach(b => { if (b !== btn) b.disabled = true; });
            ctx.solved(`<h4>So hat ${ctx.computer} entschieden:</h4>${explainHeaders(analysis, vars)}`);
            return;
        }
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 600);
        const idx = analysis.headers.findIndex(h => h.line === line);
        const correctIdx = analysis.headers.findIndex(h => h.line === analysis.correctLine);
        const h = analysis.headers[idx];
        let msg;
        if (h.kind === 'else') {
            msg = `<code>else</code> läuft nur, wenn <strong>alle</strong> Bedingungen darüber <b class="f">False</b> sind. Prüfe sie nochmal von oben nach unten.`;
        } else {
            let value;
            try { value = truthy(evalExpr(h.cond, vars)); } catch { value = false; }
            const parts = explainCondition(h.cond, vars).filter(p => !p.op).map(p => inlineCode(p.filled)).join(' … ');
            if (!value) {
                msg = `Die Bedingung ${inlineCode(h.cond)} ist hier <b class="f">False</b> (${parts}). Diesen Zweig überspringt ${ctx.computer}.`;
            } else if (idx > correctIdx) {
                msg = `Die Bedingung ${inlineCode(h.cond)} wäre zwar <b class="t">True</b> – aber ${ctx.computer} prüft <strong>von oben nach unten</strong> und nimmt nur den <strong>ersten</strong> passenden Zweig. Schau dir die Zeilen darüber an.`;
            } else {
                msg = 'Das ist nicht der Zweig, der läuft.';
            }
        }
        ctx.wrong(msg);
    });
}
