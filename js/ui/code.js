// Code-Anzeige mit Zeilennummern, optional klickbaren Zeilen und Lücken-Eingabefeldern
import { esc, highlightLine } from '../util.js';

/**
 * @param {string} code
 * @param {object} opts
 *   clickable: Set<number> | 'all'  – Zeilen, die anklickbar sind (Buttons)
 *   blanks: boolean                 – ___ wird zu <input>
 *   dimOthers: boolean              – nicht-klickbare Zeilen abdunkeln
 *   lineClass: (n) => string
 */
export function codeBlock(code, opts = {}) {
    const lines = code.split('\n');
    let blankIndex = 0;
    const rows = lines.map((line, idx) => {
        const n = idx + 1;
        const clickable = opts.clickable === 'all' ? line.trim() !== '' : opts.clickable && opts.clickable.has(n);
        let content;
        if (opts.blanks && line.includes('___')) {
            const parts = line.split('___');
            content = parts.map((p, i) => {
                let html = highlightLine(p);
                if (i < parts.length - 1) {
                    const bi = blankIndex++;
                    const wide = parts.length === 2 && p.trim() === '' && parts[1].trim() === '';
                    html += `<input class="blank${wide ? ' blank-wide' : ''}" data-blank="${bi}" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Lücke ${bi + 1}, Zeile ${n}" placeholder="…">`;
                }
                return html;
            }).join('');
        } else {
            content = highlightLine(line) || '&nbsp;';
        }
        const extra = opts.lineClass ? opts.lineClass(n) : '';
        const cls = ['code-line', clickable ? 'clickable' : '', opts.dimOthers && !clickable ? 'dim' : '', extra].filter(Boolean).join(' ');
        const inner = `<span class="ln" aria-hidden="true">${n}</span><span class="lc">${content}</span>`;
        if (clickable) {
            return `<button type="button" class="${cls}" data-line="${n}" aria-label="Zeile ${n}: ${esc(line.trim())}">${inner}</button>`;
        }
        return `<div class="${cls}" data-line="${n}">${inner}</div>`;
    });
    return `<div class="code-block${opts.small ? ' small' : ''}" role="group" aria-label="Python-Code">${rows.join('')}</div>`;
}

/** Ein Inline-Codeschnipsel hervorheben. */
export function inlineCode(text) {
    return `<code class="hl">${highlightLine(text)}</code>`;
}
