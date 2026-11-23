/**
 * Mini-Python für Logik-Geschichten
 * ---------------------------------
 * Ein kleiner, sicherer Python-Interpreter für den Schulstoff (Klasse 9+).
 * Kein eval(), kein Function(): Der Code wird tokenisiert, in einen Syntaxbaum
 * übersetzt und von einem Tree-Walker Schritt für Schritt ausgeführt.
 *
 * Unterstützt: int, float, str, bool, None, Listen, + - * / // % **,
 * Vergleiche (auch verkettet), and/or/not, in / not in, =, +=, -=, *=, /=, //=, %=,
 * if/elif/else, while, for … in, break, continue, pass, def/return,
 * print, len, range, str, int, float, abs, min, max, sum, round, sorted,
 * Listenmethoden append, pop, insert, remove, index, count,
 * Stringmethoden upper, lower.
 *
 * Fehlermeldungen sind auf Deutsch und nennen die Zeile.
 */

// ---------------------------------------------------------------------------
// Werte
// ---------------------------------------------------------------------------

/** Kommazahl (damit 6 / 2 als 3.0 angezeigt wird wie in Python). */
export class PyFloat {
    constructor(v) { this.v = v; }
}

class PyFunction {
    constructor(name, params, body, line) {
        this.name = name; this.params = params; this.body = body; this.line = line;
    }
}

class Builtin {
    constructor(name, fn) { this.name = name; this.fn = fn; }
}

export class PyError extends Error {
    constructor(message, line = null, kind = 'error') {
        super(message);
        this.line = line;
        this.kind = kind; // 'syntax' | 'name' | 'type' | 'value' | 'index' | 'loop' | 'error'
    }
}

const isNum = (x) => typeof x === 'number' || x instanceof PyFloat;
const numVal = (x) => (x instanceof PyFloat ? x.v : x === true ? 1 : x === false ? 0 : x);
const mkNum = (v, isFloat) => (isFloat ? new PyFloat(v) : v);

export function typeName(x) {
    if (x === null || x === undefined) return 'NoneType';
    if (typeof x === 'boolean') return 'bool';
    if (typeof x === 'number') return 'int';
    if (x instanceof PyFloat) return 'float';
    if (typeof x === 'string') return 'str';
    if (Array.isArray(x)) return 'list';
    if (x instanceof PyFunction || x instanceof Builtin) return 'function';
    return 'object';
}

const TYPE_DE = {
    int: 'Ganzzahl (int)', float: 'Kommazahl (float)', str: 'Text (str)', bool: 'Wahrheitswert (bool)',
    list: 'Liste (list)', NoneType: 'None', function: 'Funktion'
};

export function truthy(x) {
    if (x === null || x === undefined || x === false) return false;
    if (x === true) return true;
    if (isNum(x)) return numVal(x) !== 0;
    if (typeof x === 'string' || Array.isArray(x)) return x.length > 0;
    return true;
}

function floatStr(v) {
    if (Number.isInteger(v)) return v.toFixed(1);
    if (!isFinite(v)) return v > 0 ? 'inf' : '-inf';
    return String(v);
}

/** Python-repr(): Strings mit Anführungszeichen. */
export function pyRepr(x) {
    if (typeof x === 'string') return "'" + x.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    return pyStr(x);
}

/** Python-str(): so wie print() es ausgibt. */
export function pyStr(x) {
    if (x === null || x === undefined) return 'None';
    if (x === true) return 'True';
    if (x === false) return 'False';
    if (typeof x === 'number') return String(x);
    if (x instanceof PyFloat) return floatStr(x.v);
    if (typeof x === 'string') return x;
    if (Array.isArray(x)) return '[' + x.map(pyRepr).join(', ') + ']';
    if (x instanceof PyFunction) return `<Funktion ${x.name}>`;
    if (x instanceof Builtin) return `<eingebaute Funktion ${x.name}>`;
    return String(x);
}

export function pyEquals(a, b) {
    if (isNum(a) && isNum(b)) return numVal(a) === numVal(b);
    if ((typeof a === 'boolean' || isNum(a)) && (typeof b === 'boolean' || isNum(b))) return numVal(a) === numVal(b);
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((v, i) => pyEquals(v, b[i]));
    }
    if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
    return a === b;
}

/** Tiefe Kopie für Schnappschüsse (Listen werden kopiert). */
export function cloneValue(x) {
    if (Array.isArray(x)) return x.map(cloneValue);
    return x;
}

/** JSON-Wert → Python-Wert (Zahlen mit Nachkommastellen werden float). */
export function fromJSON(x) {
    if (Array.isArray(x)) return x.map(fromJSON);
    if (typeof x === 'number' && !Number.isInteger(x)) return new PyFloat(x);
    if (x && typeof x === 'object' && 'float' in x) return new PyFloat(x.float);
    return x;
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const KEYWORDS = new Set([
    'if', 'elif', 'else', 'while', 'for', 'in', 'break', 'continue', 'def', 'return',
    'and', 'or', 'not', 'True', 'False', 'None', 'pass'
]);

const OPERATORS = [
    '**', '//=', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
    '<', '>', '=', '+', '-', '*', '/', '%', '(', ')', '[', ']', ',', ':', '.'
];

export function tokenize(code) {
    const tokens = [];
    const lines = code.replace(/\t/g, '    ').replace(/\r/g, '').split('\n');
    const indentStack = [0];
    let depth = 0; // Klammertiefe – innerhalb von Klammern sind Zeilenumbrüche erlaubt
    let lastLogicalLine = 0;

    for (let li = 0; li < lines.length; li++) {
        const lineNo = li + 1;
        const raw = lines[li];
        let pos = 0;

        if (depth === 0) {
            // Leer- und Kommentarzeilen überspringen
            if (/^\s*(#.*)?$/.test(raw)) continue;
            const indent = raw.match(/^ */)[0].length;
            const top = indentStack[indentStack.length - 1];
            if (indent > top) {
                indentStack.push(indent);
                tokens.push({ type: 'INDENT', line: lineNo });
            } else if (indent < top) {
                while (indentStack[indentStack.length - 1] > indent) {
                    indentStack.pop();
                    tokens.push({ type: 'DEDENT', line: lineNo });
                }
                if (indentStack[indentStack.length - 1] !== indent) {
                    throw new PyError('Die Einrückung passt zu keinem vorherigen Block. Prüfe die Leerzeichen am Zeilenanfang.', lineNo, 'syntax');
                }
            }
            pos = indent;
        }

        while (pos < raw.length) {
            const ch = raw[pos];
            if (ch === ' ') { pos++; continue; }
            if (ch === '#') break;

            // Zahlen
            const numMatch = raw.slice(pos).match(/^(\d+\.\d*|\.\d+|\d+)/);
            if (numMatch) {
                const text = numMatch[0];
                tokens.push({ type: 'NUMBER', value: text.includes('.') ? new PyFloat(parseFloat(text)) : parseInt(text, 10), line: lineNo });
                pos += text.length;
                continue;
            }

            // Strings
            if (ch === '"' || ch === "'") {
                let end = pos + 1;
                let value = '';
                while (end < raw.length && raw[end] !== ch) {
                    if (raw[end] === '\\' && end + 1 < raw.length) {
                        const nx = raw[end + 1];
                        value += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx;
                        end += 2;
                    } else {
                        value += raw[end++];
                    }
                }
                if (end >= raw.length) {
                    throw new PyError('Ein Text (String) wurde nicht geschlossen – es fehlt ein Anführungszeichen.', lineNo, 'syntax');
                }
                tokens.push({ type: 'STRING', value, line: lineNo });
                pos = end + 1;
                continue;
            }

            // Namen und Schlüsselwörter
            const nameMatch = raw.slice(pos).match(/^[A-Za-z_äöüÄÖÜß][A-Za-z0-9_äöüÄÖÜß]*/);
            if (nameMatch) {
                const text = nameMatch[0];
                tokens.push({ type: KEYWORDS.has(text) ? 'KW' : 'NAME', value: text, line: lineNo });
                pos += text.length;
                continue;
            }

            // Operatoren
            const op = OPERATORS.find(o => raw.startsWith(o, pos));
            if (op) {
                if (op === '(' || op === '[') depth++;
                if (op === ')' || op === ']') depth = Math.max(0, depth - 1);
                tokens.push({ type: 'OP', value: op, line: lineNo });
                pos += op.length;
                continue;
            }

            if (ch === '!' ) {
                throw new PyError('In Python heißt "nicht" einfach `not`. Für "ungleich" schreibt man `!=`.', lineNo, 'syntax');
            }
            if (ch === '&' || ch === '|') {
                throw new PyError(`In Python schreibt man \`${ch === '&' ? 'and' : 'or'}\` statt \`${ch}${ch}\`.`, lineNo, 'syntax');
            }
            throw new PyError(`Unbekanntes Zeichen „${ch}“.`, lineNo, 'syntax');
        }

        if (depth === 0) {
            tokens.push({ type: 'NEWLINE', line: lineNo });
            lastLogicalLine = lineNo;
        }
    }
    if (depth > 0) throw new PyError('Eine Klammer wurde geöffnet, aber nicht geschlossen.', lastLogicalLine || lines.length, 'syntax');
    while (indentStack.length > 1) {
        indentStack.pop();
        tokens.push({ type: 'DEDENT', line: lastLogicalLine });
    }
    tokens.push({ type: 'EOF', line: lastLogicalLine });
    return tokens;
}

// ---------------------------------------------------------------------------
// Parser → Syntaxbaum
// ---------------------------------------------------------------------------

class Parser {
    constructor(tokens) { this.t = tokens; this.i = 0; }

    peek(o = 0) { return this.t[this.i + o]; }
    next() { return this.t[this.i++]; }
    is(type, value) {
        const tk = this.peek();
        return tk.type === type && (value === undefined || tk.value === value);
    }
    isOp(v) { return this.is('OP', v); }
    isKw(v) { return this.is('KW', v); }
    expect(type, value, msg) {
        const tk = this.peek();
        if (tk.type !== type || (value !== undefined && tk.value !== value)) {
            throw new PyError(msg || `Hier wurde ${value ? '`' + value + '`' : type} erwartet.`, tk.line, 'syntax');
        }
        return this.next();
    }

    parseProgram() {
        const body = [];
        while (!this.is('EOF')) {
            if (this.is('NEWLINE')) { this.next(); continue; }
            if (this.is('INDENT')) throw new PyError('Diese Zeile ist eingerückt, obwohl kein Block (if, while, for, def …) davor steht.', this.peek().line, 'syntax');
            body.push(this.parseStatement());
        }
        return body;
    }

    parseBlock(headerLine, what) {
        if (this.isOp('=')) throw new PyError('Ein einzelnes `=` ist eine Zuweisung. Zum Vergleichen nimmt man `==`.', this.peek().line, 'syntax');
        this.expect('OP', ':', `Nach ${what} fehlt der Doppelpunkt \`:\`.`);
        if (!this.is('NEWLINE')) {
            // Einzeiler: if x: y = 1
            const stmt = this.parseSimple();
            this.expect('NEWLINE');
            return [stmt];
        }
        this.next();
        if (!this.is('INDENT')) {
            throw new PyError(`Nach ${what} muss die nächste Zeile eingerückt sein.`, this.peek().line === headerLine ? headerLine + 1 : this.peek().line, 'syntax');
        }
        this.next();
        const body = [];
        while (!this.is('DEDENT') && !this.is('EOF')) {
            if (this.is('NEWLINE')) { this.next(); continue; }
            body.push(this.parseStatement());
        }
        if (this.is('DEDENT')) this.next();
        return body;
    }

    parseStatement() {
        const tk = this.peek();
        if (tk.type === 'KW') {
            switch (tk.value) {
                case 'if': return this.parseIf();
                case 'while': {
                    this.next();
                    const cond = this.parseExpr();
                    const body = this.parseBlock(tk.line, '`while …`');
                    return { type: 'While', cond, body, line: tk.line };
                }
                case 'for': {
                    this.next();
                    const target = this.expect('NAME', undefined, 'Nach `for` muss ein Variablenname stehen.').value;
                    this.expect('KW', 'in', 'In einer for-Schleife fehlt `in`: `for x in liste:`');
                    const iter = this.parseExpr();
                    const body = this.parseBlock(tk.line, '`for …`');
                    return { type: 'For', target, iter, body, line: tk.line };
                }
                case 'def': {
                    this.next();
                    const name = this.expect('NAME', undefined, 'Nach `def` muss der Funktionsname stehen.').value;
                    this.expect('OP', '(', 'Nach dem Funktionsnamen fehlt `(`.');
                    const params = [];
                    while (!this.isOp(')')) {
                        params.push(this.expect('NAME', undefined, 'Parameter müssen Namen sein.').value);
                        if (!this.isOp(')')) this.expect('OP', ',', 'Parameter werden mit Komma getrennt.');
                    }
                    this.next();
                    const body = this.parseBlock(tk.line, '`def …`');
                    return { type: 'Def', name, params, body, line: tk.line };
                }
                case 'elif':
                case 'else':
                    throw new PyError(`\`${tk.value}\` steht ohne passendes \`if\` davor (oder die Einrückung stimmt nicht).`, tk.line, 'syntax');
            }
        }
        const stmt = this.parseSimple();
        if (!this.is('EOF')) this.expect('NEWLINE', undefined, 'Nach dieser Anweisung erwartet der Computer eine neue Zeile.');
        return stmt;
    }

    parseIf() {
        const tk = this.next(); // if
        const clauses = [];
        const cond = this.parseExpr();
        clauses.push({ cond, body: this.parseBlock(tk.line, '`if …`'), line: tk.line, kind: 'if' });
        let orelse = null, elseLine = null;
        while (this.isKw('elif')) {
            const e = this.next();
            const c = this.parseExpr();
            clauses.push({ cond: c, body: this.parseBlock(e.line, '`elif …`'), line: e.line, kind: 'elif' });
        }
        if (this.isKw('else')) {
            const e = this.next();
            elseLine = e.line;
            orelse = this.parseBlock(e.line, '`else`');
        }
        return { type: 'If', clauses, orelse, elseLine, line: tk.line };
    }

    parseSimple() {
        const tk = this.peek();
        if (tk.type === 'KW') {
            if (tk.value === 'pass') { this.next(); return { type: 'Pass', line: tk.line }; }
            if (tk.value === 'break') { this.next(); return { type: 'Break', line: tk.line }; }
            if (tk.value === 'continue') { this.next(); return { type: 'Continue', line: tk.line }; }
            if (tk.value === 'return') {
                this.next();
                const value = (this.is('NEWLINE') || this.is('EOF')) ? null : this.parseExpr();
                return { type: 'Return', value, line: tk.line };
            }
        }
        const expr = this.parseExpr();
        if (this.isOp('=')) {
            this.next();
            this.checkTarget(expr);
            const value = this.parseExpr();
            if (this.isOp('=')) throw new PyError('Mehrfachzuweisungen wie `a = b = 1` kennt dieser Bordcomputer nicht.', tk.line, 'syntax');
            return { type: 'Assign', target: expr, value, line: tk.line };
        }
        if (this.is('OP') && ['+=', '-=', '*=', '/=', '//=', '%='].includes(this.peek().value)) {
            const op = this.next().value.slice(0, -1);
            this.checkTarget(expr);
            const value = this.parseExpr();
            return { type: 'AugAssign', target: expr, op, value, line: tk.line };
        }
        if (this.isOp('==') === false && this.is('OP') && this.peek().value === ':') {
            throw new PyError('Unerwarteter Doppelpunkt. Fehlt vorne ein `if`, `while` oder `for`?', tk.line, 'syntax');
        }
        return { type: 'ExprStmt', expr, line: tk.line };
    }

    checkTarget(expr) {
        if (expr.type !== 'Name' && expr.type !== 'Index') {
            throw new PyError('Links vom `=` muss ein Variablenname stehen. (Zum Vergleichen nimmt man `==`.)', expr.line, 'syntax');
        }
    }

    parseExpr() { return this.parseOr(); }

    parseOr() {
        let left = this.parseAnd();
        while (this.isKw('or')) {
            const tk = this.next();
            left = { type: 'BoolOp', op: 'or', left, right: this.parseAnd(), line: tk.line };
        }
        return left;
    }

    parseAnd() {
        let left = this.parseNot();
        while (this.isKw('and')) {
            const tk = this.next();
            left = { type: 'BoolOp', op: 'and', left, right: this.parseNot(), line: tk.line };
        }
        return left;
    }

    parseNot() {
        if (this.isKw('not')) {
            const tk = this.next();
            return { type: 'Not', operand: this.parseNot(), line: tk.line };
        }
        return this.parseComparison();
    }

    parseComparison() {
        const first = this.parseArith();
        const ops = [], operands = [first];
        for (;;) {
            const tk = this.peek();
            let op = null;
            if (tk.type === 'OP' && ['==', '!=', '<', '>', '<=', '>='].includes(tk.value)) { op = tk.value; this.next(); }
            else if (this.isKw('in')) { op = 'in'; this.next(); }
            else if (this.isKw('not') && this.peek(1).type === 'KW' && this.peek(1).value === 'in') { op = 'not in'; this.next(); this.next(); }
            else if (tk.type === 'OP' && tk.value === '=' && this.peek(1).type === 'OP' && this.peek(1).value === '=') { op = null; }
            if (!op) break;
            ops.push(op);
            operands.push(this.parseArith());
        }
        if (!ops.length) return first;
        return { type: 'Compare', ops, operands, line: first.line };
    }

    parseArith() {
        let left = this.parseTerm();
        while (this.isOp('+') || this.isOp('-')) {
            const tk = this.next();
            left = { type: 'BinOp', op: tk.value, left, right: this.parseTerm(), line: tk.line };
        }
        return left;
    }

    parseTerm() {
        let left = this.parseUnary();
        while (this.isOp('*') || this.isOp('/') || this.isOp('//') || this.isOp('%')) {
            const tk = this.next();
            left = { type: 'BinOp', op: tk.value, left, right: this.parseUnary(), line: tk.line };
        }
        return left;
    }

    parseUnary() {
        if (this.isOp('-') || this.isOp('+')) {
            const tk = this.next();
            return { type: 'Unary', op: tk.value, operand: this.parseUnary(), line: tk.line };
        }
        return this.parsePower();
    }

    parsePower() {
        const base = this.parsePostfix();
        if (this.isOp('**')) {
            const tk = this.next();
            return { type: 'BinOp', op: '**', left: base, right: this.parseUnary(), line: tk.line };
        }
        return base;
    }

    parsePostfix() {
        let node = this.parseAtom();
        for (;;) {
            if (this.isOp('(')) {
                const tk = this.next();
                const args = [];
                while (!this.isOp(')')) {
                    args.push(this.parseExpr());
                    if (!this.isOp(')')) this.expect('OP', ',', 'Argumente werden mit Komma getrennt – oder es fehlt eine `)`.');
                }
                this.next();
                node = { type: 'Call', func: node, args, line: tk.line };
            } else if (this.isOp('[')) {
                const tk = this.next();
                const index = this.parseExpr();
                this.expect('OP', ']', 'Hier fehlt die schließende `]`.');
                node = { type: 'Index', obj: node, index, line: tk.line };
            } else if (this.isOp('.')) {
                const tk = this.next();
                const name = this.expect('NAME', undefined, 'Nach dem Punkt muss ein Methodenname stehen.').value;
                node = { type: 'Attr', obj: node, name, line: tk.line };
            } else break;
        }
        return node;
    }

    parseAtom() {
        const tk = this.next();
        switch (tk.type) {
            case 'NUMBER': return { type: 'Const', value: tk.value, line: tk.line };
            case 'STRING': return { type: 'Const', value: tk.value, line: tk.line };
            case 'NAME': return { type: 'Name', name: tk.value, line: tk.line };
            case 'KW':
                if (tk.value === 'True') return { type: 'Const', value: true, line: tk.line };
                if (tk.value === 'False') return { type: 'Const', value: false, line: tk.line };
                if (tk.value === 'None') return { type: 'Const', value: null, line: tk.line };
                throw new PyError(`\`${tk.value}\` darf an dieser Stelle nicht stehen.`, tk.line, 'syntax');
            case 'OP':
                if (tk.value === '(') {
                    const e = this.parseExpr();
                    this.expect('OP', ')', 'Hier fehlt eine schließende Klammer `)`.');
                    return e;
                }
                if (tk.value === '[') {
                    const items = [];
                    while (!this.isOp(']')) {
                        items.push(this.parseExpr());
                        if (!this.isOp(']')) this.expect('OP', ',', 'Listenelemente werden mit Komma getrennt.');
                    }
                    this.next();
                    return { type: 'List', items, line: tk.line };
                }
                if (tk.value === '=') throw new PyError('Ein einzelnes `=` ist eine Zuweisung. Zum Vergleichen nimmt man `==`.', tk.line, 'syntax');
                throw new PyError(`Unerwartetes Zeichen \`${tk.value}\`.`, tk.line, 'syntax');
            case 'NEWLINE':
            case 'EOF':
                throw new PyError('Die Zeile hört zu früh auf – da fehlt noch etwas.', tk.line, 'syntax');
            case 'INDENT':
                throw new PyError('Unerwartete Einrückung.', tk.line, 'syntax');
            default:
                throw new PyError('Diese Zeile versteht der Bordcomputer nicht.', tk.line, 'syntax');
        }
    }
}

export function parse(code) {
    const tokens = tokenize(code);
    return new Parser(tokens).parseProgram();
}

// ---------------------------------------------------------------------------
// Interpreter (Generator – liefert nach jeder Zeile einen Schnappschuss)
// ---------------------------------------------------------------------------

class BreakSignal { }
class ContinueSignal { }
class ReturnSignal { constructor(v) { this.value = v; } }

const MAX_STEPS_DEFAULT = 5000;
const MAX_DEPTH = 60;

class Interp {
    constructor(globals, opts) {
        this.globals = globals;
        this.frames = [];             // lokale Scopes bei Funktionsaufrufen
        this.output = [];
        this.steps = 0;
        this.maxSteps = opts.maxSteps || MAX_STEPS_DEFAULT;
        this.lineHits = {};
        this.branches = [];           // {ifLine, taken}
        this.currentLine = null;
        this.builtins = makeBuiltins(this);
        this.stubCalls = !!opts.stubCalls;
    }

    get scope() { return this.frames.length ? this.frames[this.frames.length - 1].vars : this.globals; }

    snapshot(line, event) {
        const frame = this.frames.length ? this.frames[this.frames.length - 1] : null;
        const vars = {};
        for (const [k, v] of Object.entries(this.globals)) {
            if (!(v instanceof PyFunction)) vars[k] = cloneValue(v);
        }
        let locals = null;
        if (frame) {
            locals = {};
            for (const [k, v] of Object.entries(frame.vars)) locals[k] = cloneValue(v);
        }
        return { line, event, vars, locals, fn: frame ? frame.name : null, output: this.output.slice() };
    }

    *tick(line, event = 'line') {
        this.steps++;
        this.currentLine = line;
        this.lineHits[line] = (this.lineHits[line] || 0) + 1;
        if (this.steps > this.maxSteps) {
            throw new PyError(`Endlosschleife? Der Bordcomputer hat nach ${this.maxSteps} Schritten abgebrochen. Prüfe, ob sich die Bedingung der Schleife irgendwann ändert.`, line, 'loop');
        }
        yield this.snapshot(line, event);
    }

    *execBlock(stmts) {
        for (const s of stmts) yield* this.exec(s);
    }

    *exec(s) {
        switch (s.type) {
            case 'Assign': {
                yield* this.tick(s.line);
                const v = yield* this.eval(s.value);
                yield* this.assign(s.target, v);
                return;
            }
            case 'AugAssign': {
                yield* this.tick(s.line);
                const cur = yield* this.eval(s.target);
                const rhs = yield* this.eval(s.value);
                yield* this.assign(s.target, binop(s.op, cur, rhs, s.line));
                return;
            }
            case 'ExprStmt': {
                yield* this.tick(s.line);
                yield* this.eval(s.expr);
                return;
            }
            case 'Pass':
                yield* this.tick(s.line);
                return;
            case 'Break':
                yield* this.tick(s.line);
                throw new BreakSignal();
            case 'Continue':
                yield* this.tick(s.line);
                throw new ContinueSignal();
            case 'Return': {
                yield* this.tick(s.line);
                if (!this.frames.length) throw new PyError('`return` darf nur innerhalb einer Funktion stehen.', s.line, 'syntax');
                const v = s.value ? yield* this.eval(s.value) : null;
                throw new ReturnSignal(v);
            }
            case 'If': {
                for (const clause of s.clauses) {
                    yield* this.tick(clause.line, 'cond');
                    const c = yield* this.eval(clause.cond);
                    if (truthy(c)) {
                        this.branches.push({ ifLine: s.line, taken: clause.line });
                        yield* this.execBlock(clause.body);
                        return;
                    }
                }
                if (s.orelse) {
                    yield* this.tick(s.elseLine, 'else');
                    this.branches.push({ ifLine: s.line, taken: s.elseLine });
                    yield* this.execBlock(s.orelse);
                } else {
                    this.branches.push({ ifLine: s.line, taken: null });
                }
                return;
            }
            case 'While': {
                try { yield* this.runWhile(s); } catch (e) { throw tagLoop(e, s.line); }
                return;
            }
            case 'For': {
                try { yield* this.runFor(s); } catch (e) { throw tagLoop(e, s.line); }
                return;
            }
            case 'Def': {
                yield* this.tick(s.line);
                this.scope[s.name] = new PyFunction(s.name, s.params, s.body, s.line);
                return;
            }
            default:
                throw new PyError('Unbekannte Anweisung.', s.line);
        }
    }

    *runWhile(s) {
        for (;;) {
            yield* this.tick(s.line, 'cond');
            const c = yield* this.eval(s.cond);
            if (!truthy(c)) break;
            try {
                yield* this.execBlock(s.body);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof ContinueSignal) continue;
                throw e;
            }
        }
        return;
    }

    *runFor(s) {
        yield* this.tick(s.line, 'cond');
        const it = yield* this.eval(s.iter);
        let seq;
        if (Array.isArray(it)) seq = it.slice();
        else if (typeof it === 'string') seq = it.split('');
        else throw new PyError(`Über ${TYPE_DE[typeName(it)] || typeName(it)} kann man nicht mit for laufen. Nimm z. B. range(…) oder eine Liste.`, s.line, 'type');
        let first = true;
        for (const item of seq) {
            if (!first) yield* this.tick(s.line, 'cond');
            first = false;
            this.scope[s.target] = item;
            try {
                yield* this.execBlock(s.body);
            } catch (e) {
                if (e instanceof BreakSignal) return;
                if (e instanceof ContinueSignal) continue;
                throw e;
            }
        }
        return;
    }

    *assign(target, v) {
        if (target.type === 'Name') {
            this.scope[target.name] = v;
            return;
        }
        // Index-Zuweisung: liste[i] = v
        const obj = yield* this.eval(target.obj);
        const idx = yield* this.eval(target.index);
        if (!Array.isArray(obj)) throw new PyError(`Nur in Listen kann man mit [ ] etwas ändern, nicht in ${TYPE_DE[typeName(obj)]}.`, target.line, 'type');
        obj[normIndex(obj, idx, target.line)] = v;
    }

    isDefined(name) {
        if (this.frames.length && Object.hasOwn(this.frames[this.frames.length - 1].vars, name)) return true;
        return Object.hasOwn(this.globals, name) || Object.hasOwn(this.builtins, name);
    }

    lookup(name, line) {
        if (this.frames.length) {
            const local = this.frames[this.frames.length - 1].vars;
            if (Object.hasOwn(local, name)) return local[name];
        }
        if (Object.hasOwn(this.globals, name)) return this.globals[name];
        if (Object.hasOwn(this.builtins, name)) return this.builtins[name];
        const hint = suggestName(name, [
            ...Object.keys(this.globals),
            ...(this.frames.length ? Object.keys(this.frames[this.frames.length - 1].vars) : []),
            ...Object.keys(this.builtins)
        ]);
        let msg = `Die Variable \`${name}\` kennt der Bordcomputer nicht.`;
        if (name === 'true' || name === 'false') msg = `In Python schreibt man \`${name === 'true' ? 'True' : 'False'}\` mit großem Anfangsbuchstaben.`;
        else if (name === 'else' || name === 'elif') msg = `\`${name}\` steht hier an der falschen Stelle.`;
        else if (hint) msg += ` Meintest du \`${hint}\`?`;
        else msg += ' Wurde sie vorher schon festgelegt?';
        throw new PyError(msg, line, 'name');
    }

    *eval(e) {
        switch (e.type) {
            case 'Const': return e.value;
            case 'Name': return this.lookup(e.name, e.line);
            case 'List': {
                const out = [];
                for (const it of e.items) out.push(yield* this.eval(it));
                return out;
            }
            case 'BinOp': {
                const l = yield* this.eval(e.left);
                const r = yield* this.eval(e.right);
                return binop(e.op, l, r, e.line);
            }
            case 'Unary': {
                const v = yield* this.eval(e.operand);
                if (!isNum(v) && typeof v !== 'boolean') throw new PyError(`Vor ${TYPE_DE[typeName(v)]} kann kein Vorzeichen stehen.`, e.line, 'type');
                return e.op === '-' ? mkNum(-numVal(v), v instanceof PyFloat) : v;
            }
            case 'Not': {
                const v = yield* this.eval(e.operand);
                return !truthy(v);
            }
            case 'BoolOp': {
                const l = yield* this.eval(e.left);
                if (e.op === 'and') return truthy(l) ? yield* this.eval(e.right) : l;
                return truthy(l) ? l : yield* this.eval(e.right);
            }
            case 'Compare': {
                let left = yield* this.eval(e.operands[0]);
                for (let i = 0; i < e.ops.length; i++) {
                    const right = yield* this.eval(e.operands[i + 1]);
                    if (!compare(e.ops[i], left, right, e.line)) return false;
                    left = right;
                }
                return true;
            }
            case 'Index': {
                const obj = yield* this.eval(e.obj);
                const idx = yield* this.eval(e.index);
                if (Array.isArray(obj) || typeof obj === 'string') return obj[normIndex(obj, idx, e.line)];
                throw new PyError(`${TYPE_DE[typeName(obj)]} kann man nicht mit [ ] durchnummerieren.`, e.line, 'type');
            }
            case 'Attr':
                throw new PyError(`\`.${e.name}\` muss aufgerufen werden, z. B. \`.${e.name}(…)\`.`, e.line, 'syntax');
            case 'Call': {
                const args = [];
                for (const a of e.args) args.push(yield* this.eval(a));
                if (e.func.type === 'Attr') {
                    const obj = yield* this.eval(e.func.obj);
                    return callMethod(obj, e.func.name, args, e.line);
                }
                if (this.stubCalls && e.func.type === 'Name' && !this.isDefined(e.func.name)) {
                    // Erfundene Aktionen (z. B. junior_kommando_aktivieren()) nur „ausführen“
                    this.output.push('⚙ ' + e.func.name + '()');
                    return null;
                }
                const fn = yield* this.eval(e.func);
                return yield* this.call(fn, args, e.line, e.func.type === 'Name' ? e.func.name : null);
            }
            default:
                throw new PyError('Unbekannter Ausdruck.', e.line);
        }
    }

    *call(fn, args, line, name) {
        if (fn instanceof Builtin) return fn.fn(args, line);
        if (fn instanceof PyFunction) {
            if (args.length !== fn.params.length) {
                throw new PyError(`Die Funktion \`${fn.name}\` braucht ${fn.params.length} Wert${fn.params.length === 1 ? '' : 'e'} in den Klammern, bekommen hat sie ${args.length}.`, line, 'type');
            }
            if (this.frames.length >= MAX_DEPTH) throw new PyError('Zu viele verschachtelte Funktionsaufrufe (ruft sich die Funktion endlos selbst auf?).', line, 'loop');
            const vars = {};
            fn.params.forEach((p, i) => { vars[p] = args[i]; });
            this.frames.push({ name: fn.name, vars });
            try {
                yield* this.execBlock(fn.body);
                return null;
            } catch (sig) {
                if (sig instanceof ReturnSignal) return sig.value;
                if (sig instanceof BreakSignal || sig instanceof ContinueSignal) {
                    throw new PyError('`break`/`continue` dürfen nur in einer Schleife stehen.', this.currentLine, 'syntax');
                }
                throw sig;
            } finally {
                this.frames.pop();
            }
        }
        throw new PyError(`\`${name || pyStr(fn)}\` ist keine Funktion und kann nicht mit ( ) aufgerufen werden.`, line, 'type');
    }
}

function tagLoop(e, line) {
    if (e instanceof PyError && e.kind === 'loop' && !e.loopTagged) {
        e.line = line;
        e.loopTagged = true;
    }
    return e;
}

function suggestName(name, candidates) {
    let best = null, bestD = 3;
    for (const c of new Set(candidates)) {
        const d = levenshtein(name.toLowerCase(), c.toLowerCase());
        if (d < bestD && d <= Math.max(1, Math.floor(name.length / 3))) { best = c; bestD = d; }
    }
    return best;
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }
    return dp[m][n];
}

function normIndex(seq, idx, line) {
    if (typeof idx !== 'number' && typeof idx !== 'boolean') {
        throw new PyError(`Ein Listenindex muss eine Ganzzahl sein, nicht ${TYPE_DE[typeName(idx)]}.`, line, 'type');
    }
    let i = numVal(idx);
    if (i < 0) i += seq.length;
    if (i < 0 || i >= seq.length) {
        throw new PyError(`Index ${numVal(idx)} gibt es nicht – die ${Array.isArray(seq) ? 'Liste' : 'Zeichenkette'} hat nur ${seq.length} Element${seq.length === 1 ? '' : 'e'} (Index 0 bis ${seq.length - 1}).`, line, 'index');
    }
    return i;
}

function binop(op, l, r, line) {
    const tl = typeName(l), tr = typeName(r);
    const numeric = (x) => isNum(x) || typeof x === 'boolean';
    if (numeric(l) && numeric(r)) {
        const a = numVal(l), b = numVal(r);
        const anyFloat = l instanceof PyFloat || r instanceof PyFloat;
        switch (op) {
            case '+': return mkNum(a + b, anyFloat);
            case '-': return mkNum(a - b, anyFloat);
            case '*': return mkNum(a * b, anyFloat);
            case '/':
                if (b === 0) throw new PyError('Division durch 0 ist nicht erlaubt.', line, 'value');
                return new PyFloat(a / b);
            case '//':
                if (b === 0) throw new PyError('Division durch 0 ist nicht erlaubt.', line, 'value');
                return mkNum(Math.floor(a / b), anyFloat);
            case '%':
                if (b === 0) throw new PyError('Rest bei Division durch 0 ist nicht erlaubt.', line, 'value');
                return mkNum(((a % b) + b) % b, anyFloat);
            case '**': return mkNum(Math.pow(a, b), anyFloat || b < 0);
        }
    }
    if (op === '+' && tl === 'str' && tr === 'str') return l + r;
    if (op === '+' && tl === 'list' && tr === 'list') return l.concat(r);
    if (op === '*' && ((tl === 'str' && tr === 'int') || (tl === 'int' && tr === 'str'))) {
        return (tl === 'str' ? l : r).repeat(Math.max(0, tl === 'str' ? r : l));
    }
    if (op === '*' && ((tl === 'list' && tr === 'int') || (tl === 'int' && tr === 'list'))) {
        const [list, n] = tl === 'list' ? [l, r] : [r, l];
        let out = [];
        for (let i = 0; i < n; i++) out = out.concat(list);
        return out;
    }
    if (op === '+' && (tl === 'str' || tr === 'str')) {
        throw new PyError(`Text und ${TYPE_DE[tl === 'str' ? tr : tl]} kann man nicht mit + verbinden. Tipp: Wandle die Zahl mit str(…) in Text um.`, line, 'type');
    }
    throw new PyError(`Der Operator \`${op}\` funktioniert nicht zwischen ${TYPE_DE[tl] || tl} und ${TYPE_DE[tr] || tr}.`, line, 'type');
}

function compare(op, l, r, line) {
    switch (op) {
        case '==': return pyEquals(l, r);
        case '!=': return !pyEquals(l, r);
        case 'in':
        case 'not in': {
            let res;
            if (Array.isArray(r)) res = r.some(x => pyEquals(x, l));
            else if (typeof r === 'string') {
                if (typeof l !== 'string') throw new PyError('Mit `in` kann man in einem Text nur nach Text suchen.', line, 'type');
                res = r.includes(l);
            } else throw new PyError(`\`in\` funktioniert nur mit Listen oder Text, nicht mit ${TYPE_DE[typeName(r)]}.`, line, 'type');
            return op === 'in' ? res : !res;
        }
    }
    const numeric = (x) => isNum(x) || typeof x === 'boolean';
    let a, b;
    if (numeric(l) && numeric(r)) { a = numVal(l); b = numVal(r); }
    else if (typeof l === 'string' && typeof r === 'string') { a = l; b = r; }
    else {
        throw new PyError(`${TYPE_DE[typeName(l)]} und ${TYPE_DE[typeName(r)]} kann man nicht mit \`${op}\` vergleichen.`, line, 'type');
    }
    switch (op) {
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
    }
    return false;
}

function callMethod(obj, name, args, line) {
    if (Array.isArray(obj)) {
        switch (name) {
            case 'append': argc(name, args, 1, line); obj.push(args[0]); return null;
            case 'pop': {
                if (!obj.length) throw new PyError('pop() aus einer leeren Liste geht nicht.', line, 'index');
                if (args.length) { const i = normIndex(obj, args[0], line); return obj.splice(i, 1)[0]; }
                return obj.pop();
            }
            case 'insert': argc(name, args, 2, line); obj.splice(Math.max(0, Math.min(obj.length, numVal(args[0]))), 0, args[1]); return null;
            case 'remove': {
                argc(name, args, 1, line);
                const i = obj.findIndex(x => pyEquals(x, args[0]));
                if (i < 0) throw new PyError(`${pyRepr(args[0])} ist nicht in der Liste.`, line, 'value');
                obj.splice(i, 1); return null;
            }
            case 'index': {
                argc(name, args, 1, line);
                const i = obj.findIndex(x => pyEquals(x, args[0]));
                if (i < 0) throw new PyError(`${pyRepr(args[0])} ist nicht in der Liste.`, line, 'value');
                return i;
            }
            case 'count': argc(name, args, 1, line); return obj.filter(x => pyEquals(x, args[0])).length;
        }
    }
    if (typeof obj === 'string') {
        if (name === 'upper') return obj.toUpperCase();
        if (name === 'lower') return obj.toLowerCase();
    }
    throw new PyError(`${TYPE_DE[typeName(obj)] || typeName(obj)} hat keine Methode \`.${name}()\`.`, line, 'type');
}

function argc(name, args, n, line) {
    if (args.length !== n) throw new PyError(`\`${name}\` braucht ${n} Wert${n === 1 ? '' : 'e'} in den Klammern.`, line, 'type');
}

function makeBuiltins(interp) {
    const B = (name, fn) => new Builtin(name, fn);
    const needNums = (name, list, line) => {
        for (const x of list) if (!isNum(x) && typeof x !== 'boolean') throw new PyError(`\`${name}\` funktioniert nur mit Zahlen, nicht mit ${TYPE_DE[typeName(x)]}.`, line, 'type');
    };
    const minmax = (name, cmp) => B(name, (args, line) => {
        const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        if (!list.length) throw new PyError(`\`${name}\` von einer leeren Liste geht nicht.`, line, 'value');
        let best = list[0];
        for (const x of list.slice(1)) if (compare(cmp, x, best, line)) best = x;
        return best;
    });
    return {
        print: B('print', (args) => { interp.output.push(args.map(pyStr).join(' ')); return null; }),
        len: B('len', (args, line) => {
            argc('len', args, 1, line);
            if (Array.isArray(args[0]) || typeof args[0] === 'string') return args[0].length;
            throw new PyError(`${TYPE_DE[typeName(args[0])]} hat keine Länge.`, line, 'type');
        }),
        range: B('range', (args, line) => {
            if (args.length < 1 || args.length > 3) throw new PyError('`range` braucht 1 bis 3 Zahlen.', line, 'type');
            for (const a of args) if (typeof a !== 'number') throw new PyError('`range` braucht ganze Zahlen.', line, 'type');
            let [start, stop, step] = args.length === 1 ? [0, args[0], 1] : [args[0], args[1], args[2] ?? 1];
            if (step === 0) throw new PyError('Schrittweite 0 bei `range` ist nicht erlaubt.', line, 'value');
            const out = [];
            for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
                out.push(i);
                if (out.length > 100000) throw new PyError('Dieser Bereich ist zu groß.', line, 'value');
            }
            return out;
        }),
        str: B('str', (args) => pyStr(args[0])),
        int: B('int', (args, line) => {
            const x = args[0];
            if (typeof x === 'string') {
                if (!/^\s*[-+]?\d+\s*$/.test(x)) throw new PyError(`„${x}“ kann man nicht in eine Ganzzahl umwandeln.`, line, 'value');
                return parseInt(x, 10);
            }
            if (!isNum(x) && typeof x !== 'boolean') throw new PyError(`${TYPE_DE[typeName(x)]} kann man nicht in eine Ganzzahl umwandeln.`, line, 'type');
            return Math.trunc(numVal(x));
        }),
        float: B('float', (args, line) => {
            const x = args[0];
            if (typeof x === 'string') {
                const v = parseFloat(x);
                if (isNaN(v)) throw new PyError(`„${x}“ kann man nicht in eine Kommazahl umwandeln.`, line, 'value');
                return new PyFloat(v);
            }
            return new PyFloat(numVal(x));
        }),
        abs: B('abs', (args, line) => { needNums('abs', args, line); return mkNum(Math.abs(numVal(args[0])), args[0] instanceof PyFloat); }),
        round: B('round', (args, line) => {
            needNums('round', args, line);
            const v = numVal(args[0]);
            if (args.length > 1) return new PyFloat(parseFloat(v.toFixed(Math.max(0, numVal(args[1])))));
            // Python rundet .5 auf die gerade Zahl
            const r = Math.round(v);
            return (Math.abs(v % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r;
        }),
        min: minmax('min', '<'),
        max: minmax('max', '>'),
        sum: B('sum', (args, line) => {
            if (!Array.isArray(args[0])) throw new PyError('`sum` braucht eine Liste.', line, 'type');
            needNums('sum', args[0], line);
            const anyFloat = args[0].some(x => x instanceof PyFloat);
            return mkNum(args[0].reduce((s, x) => s + numVal(x), 0), anyFloat);
        }),
        sorted: B('sorted', (args, line) => {
            if (!Array.isArray(args[0])) throw new PyError('`sorted` braucht eine Liste.', line, 'type');
            return args[0].slice().sort((a, b) => (compare('<', a, b, line) ? -1 : compare('>', a, b, line) ? 1 : 0));
        })
    };
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

function prepareGlobals(initialVars) {
    const g = {};
    for (const [k, v] of Object.entries(initialVars || {})) g[k] = fromJSON(v);
    return g;
}

/**
 * Führt Code aus.
 * @returns {{ok:boolean, vars:object, output:string[], error:PyError|null,
 *            steps:object[]|null, stepCount:number, lineHits:object, branches:object[]}}
 */
export function run(code, initialVars = {}, opts = {}) {
    const globals = prepareGlobals(initialVars);
    const interp = new Interp(globals, opts);
    const steps = opts.record ? [] : null;
    let error = null;
    try {
        const ast = parse(code);
        const gen = interp.execBlock(ast);
        for (let r = gen.next(); !r.done; r = gen.next()) {
            if (steps) steps.push(r.value);
        }
    } catch (e) {
        if (e instanceof PyError) error = e;
        else if (e instanceof BreakSignal || e instanceof ContinueSignal) error = new PyError('`break`/`continue` dürfen nur in einer Schleife stehen.', interp.currentLine, 'syntax');
        else if (e instanceof ReturnSignal) error = new PyError('`return` darf nur innerhalb einer Funktion stehen.', interp.currentLine, 'syntax');
        else if (e instanceof RangeError) error = new PyError('Zu tief verschachtelt.', interp.currentLine, 'loop');
        else throw e;
        if (error.line == null) error.line = interp.currentLine;
    }
    const vars = {};
    for (const [k, v] of Object.entries(globals)) if (!(v instanceof PyFunction)) vars[k] = v;
    const functions = {};
    for (const [k, v] of Object.entries(globals)) if (v instanceof PyFunction) functions[k] = v;
    return {
        ok: !error, vars, functions, output: interp.output, error, steps,
        stepCount: interp.steps, lineHits: interp.lineHits, branches: interp.branches,
        _interp: interp
    };
}

/** Prüft nur die Syntax. Gibt null oder einen PyError zurück. */
export function checkSyntax(code) {
    try { parse(code); return null; } catch (e) { if (e instanceof PyError) return e; throw e; }
}

/**
 * Welcher Zweig des ersten if-Blocks wird genommen? (1-basierte Zeilennummer des if/elif/else
 * oder null, wenn kein Zweig läuft.)
 */
export function whichBranch(code, initialVars = {}) {
    const res = run(code, initialVars);
    if (!res.ok) throw res.error;
    const ast = parse(code);
    const firstIf = findFirstIf(ast);
    if (!firstIf) return null;
    const b = res.branches.find(x => x.ifLine === firstIf.line);
    return b ? b.taken : null;
}

function findFirstIf(stmts) {
    for (const s of stmts) {
        if (s.type === 'If') return s;
    }
    return null;
}

/** Liefert die Kopfzeilen (if/elif/else) des ersten if-Blocks: [{line, kind}] */
export function branchHeaders(code) {
    const ast = parse(code);
    const s = findFirstIf(ast);
    if (!s) return [];
    const out = s.clauses.map(c => ({ line: c.line, kind: c.kind }));
    if (s.orelse) out.push({ line: s.elseLine, kind: 'else' });
    return out;
}

/**
 * Wandelt eine Schülereingabe in einen Wert um (nur Literale, kein Code!).
 * "42" → 42, "3.5" → 3.5, "True" → true, "'Hallo'" / "Hallo" → "Hallo", "[1, 2]" → [1,2]
 */
export function parseLiteral(text) {
    const t = String(text).trim();
    if (t === '') return { ok: false };
    try {
        const ast = parse(t);
        if (ast.length === 1 && ast[0].type === 'ExprStmt') {
            const v = literalValue(ast[0].expr);
            if (v.ok) return v;
        }
    } catch (_) { /* ignorieren */ }
    // Ohne Anführungszeichen als Text auffassen
    return { ok: true, value: t, bare: true };
}

function literalValue(e) {
    if (e.type === 'Const') return { ok: true, value: e.value };
    if (e.type === 'Unary' && e.operand.type === 'Const' && isNum(e.operand.value)) {
        const v = e.operand.value;
        return { ok: true, value: e.op === '-' ? mkNum(-numVal(v), v instanceof PyFloat) : v };
    }
    if (e.type === 'List') {
        const out = [];
        for (const it of e.items) { const r = literalValue(it); if (!r.ok) return { ok: false }; out.push(r.value); }
        return { ok: true, value: out };
    }
    return { ok: false };
}

/**
 * Vergleicht eine Schülerantwort (Text) mit dem erwarteten Wert.
 * Zahlen: 3 == 3.0, Text: mit oder ohne Anführungszeichen, Groß/Klein bei True/False egal.
 */
export function answerMatches(input, expected) {
    const p = parseLiteral(input);
    if (!p.ok) return false;
    if (pyEquals(p.value, expected)) return true;
    const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
    if (typeof expected === 'boolean') return norm(input) === (expected ? 'true' : 'false');
    if (typeof expected === 'string') {
        const raw = String(input).trim().replace(/^["']|["']$/g, '');
        return raw === expected;
    }
    // Kommazahl mit deutschem Komma
    if (isNum(expected) && /^-?\d+,\d+$/.test(String(input).trim())) {
        return numVal(expected) === parseFloat(String(input).trim().replace(',', '.'));
    }
    return false;
}

/** Hilfsfunktion: Anzahl Durchläufe des Schleifenkörpers (Treffer der ersten Körperzeile). */
export function loopBodyCount(code, loopLine, initialVars = {}) {
    const ast = parse(code);
    const loop = findLoop(ast, loopLine);
    if (!loop) throw new Error('Keine Schleife in Zeile ' + loopLine);
    const res = run(code, initialVars);
    if (!res.ok) throw res.error;
    return res.lineHits[loop.body[0].line] || 0;
}

function findLoop(stmts, line) {
    for (const s of stmts) {
        if ((s.type === 'While' || s.type === 'For') && s.line === line) return s;
        const kids = [];
        if (s.body) kids.push(s.body);
        if (s.clauses) s.clauses.forEach(c => kids.push(c.body));
        if (s.orelse) kids.push(s.orelse);
        for (const k of kids) { const f = findLoop(k, line); if (f) return f; }
    }
    return null;
}

/** Erste Schleife im Programm (Zeilennummer) oder null. */
export function firstLoopLine(code) {
    const walk = (stmts) => {
        for (const s of stmts) {
            if (s.type === 'While' || s.type === 'For') return s.line;
            const kids = [];
            if (s.body) kids.push(s.body);
            if (s.clauses) s.clauses.forEach(c => kids.push(c.body));
            if (s.orelse) kids.push(s.orelse);
            for (const k of kids) { const f = walk(k); if (f) return f; }
        }
        return null;
    };
    return walk(parse(code));
}
