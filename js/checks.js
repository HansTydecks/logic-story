/**
 * Gemeinsame Prüflogik für alle Aufgabentypen.
 * Wird von der Oberfläche UND vom Story-Validator (tests/) benutzt –
 * so kann eine Mission nie „richtig“ markieren, was der Interpreter anders sieht.
 */
import {
    run, parse, PyError, pyStr, pyRepr, pyEquals, answerMatches, truthy, fromJSON
} from './interpreter.js';

export const BLANK = '___';

/** Startvariablen einer Mission (inkl. aktueller Ressourcen, falls gewünscht). */
export function missionVars(mission, resources = {}) {
    const vars = {};
    if (mission.useResources) {
        const wanted = Array.isArray(mission.useResources) ? mission.useResources : Object.keys(resources);
        for (const k of wanted) if (k in resources) vars[k] = resources[k];
    }
    Object.assign(vars, mission.vars || {});
    return vars;
}

// ---------------------------------------------------------------------------
// choice – welcher Zweig wird ausgeführt?
// ---------------------------------------------------------------------------

/** Wertet einen Ausdruck aus (nur zum Anzeigen/Prüfen). */
export function evalExpr(exprText, vars) {
    const r = run(`__wert = (${exprText})`, vars);
    if (!r.ok) throw r.error;
    return r.vars.__wert;
}

/**
 * Analysiert den ersten if-Block des Codes.
 * @returns {{headers: Array<{line, kind, cond, value, evaluated}>, correctLine:number|null}}
 */
export function analyzeChoice(code, vars) {
    const ast = parse(code);
    const ifNode = ast.find(s => s.type === 'If');
    if (!ifNode) throw new PyError('Im Code der Mission fehlt ein if-Block.');
    const lines = code.split('\n');
    const headers = [];
    let correctLine = null;
    for (const clause of ifNode.clauses) {
        const text = lines[clause.line - 1].trim();
        const cond = text.replace(/^(if|elif)\s+/, '').replace(/:\s*(#.*)?$/, '').trim();
        const h = { line: clause.line, kind: clause.kind, cond, value: null, evaluated: false };
        if (correctLine === null) {
            h.value = truthy(evalExpr(cond, vars));
            h.evaluated = true;
            if (h.value) correctLine = clause.line;
        }
        headers.push(h);
    }
    if (ifNode.orelse) {
        headers.push({ line: ifNode.elseLine, kind: 'else', cond: null, value: null, evaluated: correctLine === null });
        if (correctLine === null) correctLine = ifNode.elseLine;
    }
    return { headers, correctLine };
}

/** Zerlegt eine Bedingung in Teilausdrücke für die Erklärung („15 >= 18 → False“). */
export function explainCondition(cond, vars) {
    const parts = [];
    // Auf oberster Ebene an and/or teilen (Klammern respektieren)
    let depth = 0, cur = '', i = 0;
    const tokens = cond.split(/(\s+and\s+|\s+or\s+|\(|\))/).filter(s => s !== undefined && s !== '');
    for (const t of tokens) {
        if (t === '(') depth++;
        if (t === ')') depth--;
        if (depth === 0 && /^\s+(and|or)\s+$/.test(t)) {
            parts.push(cur.trim());
            parts.push(t.trim());
            cur = '';
        } else cur += t;
        i++;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts.map(p => {
        if (p === 'and' || p === 'or') return { op: p };
        let value = null, error = null, filled = p;
        try { value = evalExpr(p, vars); } catch (e) { error = e.message; }
        // Variablen durch Werte ersetzen (nur zur Anzeige)
        filled = p.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => {
            if (['and', 'or', 'not', 'True', 'False', 'None', 'in', 'len'].includes(name)) return name;
            return Object.prototype.hasOwnProperty.call(vars, name) ? pyRepr(fromJSON(vars[name])) : name;
        });
        return { expr: p, filled, value, error };
    });
}

// ---------------------------------------------------------------------------
// trace – was kommt heraus?
// ---------------------------------------------------------------------------

/**
 * Erwartete Antwort einer trace-Mission.
 * ask: {var:"x"} | {output:true} | {loops:true, line?:n} | {expr:"x + y"}
 */
export function traceExpected(mission, vars) {
    const res = run(mission.code, vars);
    if (!res.ok) throw res.error;
    const ask = mission.ask || {};
    if (ask.var) {
        if (!(ask.var in res.vars)) throw new PyError(`Variable ${ask.var} existiert am Ende nicht.`);
        return { value: res.vars[ask.var], display: pyStr(res.vars[ask.var]), res };
    }
    if (ask.output) {
        const text = res.output.join('\n');
        return { value: text, display: text, res, isOutput: true };
    }
    if (ask.loops) {
        const line = ask.line || firstLoop(mission.code);
        const ast = parse(mission.code);
        const loop = findStmt(ast, line);
        if (!loop || !loop.body) throw new PyError(`In Zeile ${line} steht keine Schleife.`);
        const n = res.lineHits[loop.body[0].line] || 0;
        return { value: n, display: String(n), res };
    }
    if (ask.expr) {
        const after = run(mission.code + `\n__wert = (${ask.expr})`, vars);
        if (!after.ok) throw after.error;
        return { value: after.vars.__wert, display: pyStr(after.vars.__wert), res };
    }
    throw new PyError('Mission hat keine gültige Frage (ask).');
}

export function traceCheck(mission, vars, input) {
    const exp = traceExpected(mission, vars);
    if (exp.isOutput) {
        const norm = (s) => String(s).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l !== '').join('\n');
        return { ok: norm(input) === norm(exp.value), expected: exp };
    }
    return { ok: answerMatches(input, exp.value), expected: exp };
}

function firstLoop(code) {
    const walk = (stmts) => {
        for (const s of stmts) {
            if (s.type === 'While' || s.type === 'For') return s.line;
            for (const k of children(s)) { const f = walk(k); if (f) return f; }
        }
        return null;
    };
    return walk(parse(code));
}

function children(s) {
    const kids = [];
    if (s.body) kids.push(s.body);
    if (s.clauses) s.clauses.forEach(c => kids.push(c.body));
    if (s.orelse) kids.push(s.orelse);
    return kids;
}

function findStmt(stmts, line) {
    for (const s of stmts) {
        if (s.line === line && (s.type === 'While' || s.type === 'For')) return s;
        for (const k of children(s)) { const f = findStmt(k, line); if (f) return f; }
    }
    return null;
}

// ---------------------------------------------------------------------------
// fill / bug / parsons – Code gegen Testfälle laufen lassen
// ---------------------------------------------------------------------------

/** Setzt die Antworten in die Lücken ein. */
export function fillBlanks(template, answers) {
    let i = 0;
    return template.replace(/___/g, () => {
        const a = answers[i++];
        return a === undefined ? BLANK : a;
    });
}

export function countBlanks(template) {
    return (template.match(/___/g) || []).length;
}

/**
 * Führt Code gegen alle Testfälle der Mission aus.
 * test: {label, vars?, expect?:{var:value}, output?:[...]}
 * @returns {{allPass:boolean, results:Array<{label, pass, error, details}>, syntaxError}}
 */
export function runTests(code, mission, baseVars) {
    const tests = mission.tests && mission.tests.length ? mission.tests : [{ label: 'Programm läuft' }];
    const results = [];
    for (const t of tests) {
        const vars = { ...baseVars, ...(t.vars || {}) };
        const res = run(code, vars);
        const r = { label: t.label || 'Test', pass: true, error: null, details: [] };
        if (!res.ok) {
            r.pass = false;
            r.error = res.error;
        } else {
            for (const [name, want] of Object.entries(t.expect || {})) {
                const has = Object.prototype.hasOwnProperty.call(res.vars, name);
                const got = has ? res.vars[name] : undefined;
                const ok = has && pyEquals(got, fromJSON(want));
                r.details.push({ name, want: pyRepr(fromJSON(want)), got: has ? pyRepr(got) : '(nicht vorhanden)', ok });
                if (!ok) r.pass = false;
            }
            if (t.output) {
                const want = t.output.join('\n');
                const got = res.output.join('\n');
                const ok = want === got;
                r.details.push({ name: 'Ausgabe', want, got: got || '(nichts)', ok, isOutput: true });
                if (!ok) r.pass = false;
            }
        }
        results.push(r);
    }
    return { allPass: results.every(r => r.pass), results };
}

/** Prüft require/forbid-Regeln (z. B. „benutze eine Schleife“, „ohne sum()“). */
export function checkRules(code, mission) {
    const problems = [];
    const stripped = code.split('\n').map(l => l.replace(/#.*$/, '')).join('\n');
    for (const r of mission.require || []) {
        const pattern = typeof r === 'string' ? r : r.pattern;
        const msg = typeof r === 'string' ? `Dein Code muss \`${r.trim()}\` enthalten.` : r.message;
        if (!new RegExp(escapeRegex(pattern)).test(stripped)) problems.push(msg);
    }
    for (const r of mission.forbid || []) {
        const pattern = typeof r === 'string' ? r : r.pattern;
        const msg = typeof r === 'string' ? `\`${r.trim()}\` ist hier nicht erlaubt.` : r.message;
        if (new RegExp(escapeRegex(pattern)).test(stripped)) problems.push(msg);
    }
    return problems;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function checkFill(mission, vars, answers) {
    const code = fillBlanks(mission.code, answers);
    const rules = checkRules(code, mission);
    const tests = runTests(code, mission, vars);
    return { code, rules, ...tests, ok: tests.allPass && rules.length === 0 };
}

export function bugFixedCode(mission) {
    const lines = mission.code.split('\n');
    const indent = lines[mission.bugLine - 1].match(/^\s*/)[0];
    lines[mission.bugLine - 1] = indent + mission.fix.trim();
    return lines.join('\n');
}

export function checkBugFix(mission, vars, newLineText) {
    const lines = mission.code.split('\n');
    const indent = lines[mission.bugLine - 1].match(/^\s*/)[0];
    lines[mission.bugLine - 1] = indent + newLineText.trim();
    const code = lines.join('\n');
    const rules = checkRules(code, mission);
    const tests = runTests(code, mission, vars);
    return { code, rules, ...tests, ok: tests.allPass && rules.length === 0 };
}

/** Parsons: Zeilen (mit Einrückungsstufe) zu Code zusammensetzen. */
export function assembleParsons(items) {
    return items.map(it => '    '.repeat(it.indent) + it.text).join('\n');
}

export function parsonsLines(mission) {
    const sol = mission.solution.split('\n').filter(l => l.trim() !== '');
    const lines = sol.map((l, i) => ({ id: 'l' + i, text: l.trim(), indent: Math.round(l.match(/^ */)[0].length / 4), distractor: false }));
    (mission.distractors || []).forEach((d, i) => lines.push({ id: 'd' + i, text: d.trim(), indent: 0, distractor: true }));
    return lines;
}

export function checkParsons(mission, vars, items) {
    const code = assembleParsons(items);
    if (mission.tests && mission.tests.length) {
        const tests = runTests(code, mission, vars);
        return { code, ...tests, ok: tests.allPass };
    }
    const norm = (c) => c.split('\n').map(l => l.replace(/\s+$/, '')).filter(Boolean).join('\n');
    const ok = norm(code) === norm(mission.solution);
    return { code, ok, results: [], allPass: ok };
}

// ---------------------------------------------------------------------------
// Ressourcen
// ---------------------------------------------------------------------------

export function applyEffects(resources, effects, defs) {
    const changes = [];
    for (const eff of effects || []) {
        if (!(eff.res in resources)) continue;
        const def = (defs || []).find(d => d.id === eff.res) || {};
        const max = def.max ?? 100, min = def.min ?? 0;
        const before = resources[eff.res];
        let after = before;
        if ('inc' in eff) after = before + eff.inc;
        if ('set' in eff) after = eff.set;
        after = Math.max(min, Math.min(max, after));
        resources[eff.res] = after;
        if (after !== before) changes.push({ res: eff.res, delta: after - before, after });
    }
    return changes;
}

/** Ermittelt das Ende anhand des Endungs-Codes (Variable `ende`). */
export function computeEnding(story, resources) {
    const res = run(story.endings.code, { ...resources });
    if (!res.ok) throw res.error;
    return { key: res.vars.ende, branch: res.branches[0] ? res.branches[0].taken : null };
}
