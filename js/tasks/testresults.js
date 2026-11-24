// Testergebnis-Tabelle für fill / bug / parsons
import { esc } from '../util.js';

export function testTable(result) {
    const rows = result.results.map(r => {
        let detail = '';
        if (r.error) {
            detail = `<div class="err">⚠ ${r.error.line ? `Zeile ${r.error.line}: ` : ''}${esc(r.error.message)}</div>`;
        } else if (!r.pass) {
            detail = r.details.filter(d => !d.ok).map(d => d.isOutput
                ? `<div class="err">Ausgabe erwartet:<pre>${esc(d.want)}</pre>bekommen:<pre>${esc(d.got)}</pre></div>`
                : `<div class="err"><code>${esc(d.name)}</code> sollte <code>${esc(d.want)}</code> sein, ist aber <code>${esc(d.got)}</code></div>`
            ).join('');
        }
        return `<li class="${r.pass ? 'pass' : 'fail'}"><span class="mark">${r.pass ? '✅' : '❌'}</span><span class="lbl">${esc(r.label)}</span>${detail}</li>`;
    }).join('');
    const passed = result.results.filter(r => r.pass).length;
    return `<div class="tests"><h4>Testläufe: ${passed} von ${result.results.length} bestanden</h4><ul>${rows}</ul></div>`;
}

export function syntaxMsg(err) {
    return `<div class="syntax-err">⚠ <strong>${err.line ? `Zeile ${err.line}` : 'Fehler'}:</strong> ${esc(err.message)}</div>`;
}
