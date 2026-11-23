// Kleine Helfer für die Oberfläche
import { pyRepr, fromJSON, typeName } from './interpreter.js';

export function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Markdown light: **fett**, *kursiv*, `code`, Absätze, {platzhalter}. */
export function formatText(text, values = {}) {
    let s = esc(text || '');
    s = s.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, name) =>
        Object.prototype.hasOwnProperty.call(values, name) ? `<span class="ph">${esc(String(values[name]))}</span>` : m);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
    return s.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

const PY_KW = new Set(['if', 'elif', 'else', 'while', 'for', 'in', 'break', 'continue', 'def', 'return', 'and', 'or', 'not', 'pass']);
const PY_CONST = new Set(['True', 'False', 'None']);
const PY_BUILTIN = new Set(['print', 'len', 'range', 'str', 'int', 'float', 'abs', 'round', 'min', 'max', 'sum', 'sorted']);

/** Hebt eine Zeile Python farbig hervor (gibt HTML zurück). */
export function highlightLine(line) {
    let out = '';
    let i = 0;
    while (i < line.length) {
        const rest = line.slice(i);
        let m;
        if (rest[0] === '#') { out += `<span class="tk-com">${esc(rest)}</span>`; break; }
        if ((m = rest.match(/^("([^"\\]|\\.)*"?|'([^'\\]|\\.)*'?)/))) {
            out += `<span class="tk-str">${esc(m[0])}</span>`; i += m[0].length; continue;
        }
        if ((m = rest.match(/^\d+(\.\d+)?/))) { out += `<span class="tk-num">${m[0]}</span>`; i += m[0].length; continue; }
        if ((m = rest.match(/^[A-Za-z_äöüÄÖÜß][A-Za-z0-9_äöüÄÖÜß]*/))) {
            const w = m[0];
            const after = line.slice(i + w.length);
            let cls = null;
            if (PY_KW.has(w)) cls = 'tk-kw';
            else if (PY_CONST.has(w)) cls = 'tk-const';
            else if (PY_BUILTIN.has(w) && /^\s*\(/.test(after)) cls = 'tk-builtin';
            else if (/^\s*\(/.test(after)) cls = 'tk-fn';
            out += cls ? `<span class="${cls}">${esc(w)}</span>` : `<span class="tk-name">${esc(w)}</span>`;
            i += w.length; continue;
        }
        if ((m = rest.match(/^(==|!=|<=|>=|\+=|-=|\*=|\/\/=|\/=|%=|\/\/|\*\*|[+\-*/%<>=])/))) {
            out += `<span class="tk-op">${esc(m[0])}</span>`; i += m[0].length; continue;
        }
        out += esc(rest[0]);
        i++;
    }
    return out;
}

/** Wert für die Anzeige (Python-Schreibweise). */
export function showValue(v) {
    return pyRepr(fromJSON(v));
}

export function typeLabel(v) {
    const t = typeName(fromJSON(v));
    return { int: 'int', float: 'float', str: 'str', bool: 'bool', list: 'list', NoneType: 'None' }[t] || t;
}

/** localStorage mit try/catch (privates Fenster, blockierte Cookies …). */
export const store = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* egal */ }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch { /* egal */ }
    }
};

export function shuffle(arr, seed = Date.now()) {
    const a = arr.slice();
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
}
