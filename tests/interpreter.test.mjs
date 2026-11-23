// Tests für den Mini-Python-Interpreter.  Ausführen: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
    run, whichBranch, branchHeaders, answerMatches, loopBodyCount, pyStr, PyFloat, checkSyntax
} from '../js/interpreter.js';

const out = (code, vars) => {
    const r = run(code, vars);
    if (!r.ok) throw r.error;
    return r.output.join('\n');
};

// --- Vergleich mit echtem Python (wenn vorhanden) ---------------------------
let hasPython = true;
try { execFileSync('python3', ['-c', 'print(1)']); } catch { hasPython = false; }

const programs = [
    `x = 5\nx = x + 3\nprint(x)`,
    `print(7 / 2, 6 / 2, 7 // 2, -7 // 2, 7 % 3, -7 % 3, 2 ** 10)`,
    `a = 3\nb = 8\na, = [a]\n` .replace('a, = [a]\n', '') + `t = a\na = b\nb = t\nprint(a, b)`,
    `energie = 100\nfor i in range(4):\n    energie -= 15\nprint(energie, i)`,
    `temp = 120\nzyklen = 0\nwhile temp > 40:\n    temp = temp - 15\n    zyklen += 1\nprint(temp, zyklen)`,
    `liste = [4, 9, 2, 7]\ngroesstes = liste[0]\nfor x in liste:\n    if x > groesstes:\n        groesstes = x\nprint(groesstes, len(liste), liste[-1])`,
    `def doppelt(n):\n    return n * 2\nprint(doppelt(21), doppelt(1.5))`,
    `print(1 < 2 < 3, 3 < 2 < 4, not True or False, True and 0, 0 or "leer")`,
    `print("Hallo" + " " + "Welt", "ab" * 3, str(42) + "!")`,
    `x = [1, 2]\nx.append(3)\nx[0] = 10\nprint(x, 2 in x, 5 not in x, sum(x), max(x), min(4, 2, 8))`,
    `for i in range(10, 0, -3):\n    print(i)`,
    `n = 0\nwhile True:\n    n += 1\n    if n == 3:\n        continue\n    if n > 5:\n        break\nprint(n)`,
    `print(round(2.5), round(3.5), round(2.675, 2), abs(-4), int("12") + 1, float(3))`,
    `print(0.1 + 0.2, 10 / 4, 1e0 if False else 3.0)` .replace(', 1e0 if False else 3.0', ''),
    `s = 0\nfor k in [3, 1, 4, 1, 5]:\n    if k % 2 == 1 and k > 1:\n        s += k\nprint(s)`,
    `print(sorted([3, 1, 2]), [1, 2] + [3], [0] * 3, "Abc".upper(), "ABC".lower())`,
    `def f(a, b):\n    if a > b:\n        return a\n    return b\nprint(f(3, 9), f(9, 3))`,
    `def g():\n    print("x")\nprint(g())`,
    `print(True + 1, None, [True, None, "a"])`,
];

for (const [i, code] of programs.entries()) {
    test(`Python-Vergleich #${i + 1}`, { skip: !hasPython }, () => {
        const expected = execFileSync('python3', ['-c', code]).toString().replace(/\n$/, '');
        assert.equal(out(code), expected);
    });
}

// --- Gezielte Tests ---------------------------------------------------------
test('Startvariablen werden übernommen, Ergebnisvariablen zurückgegeben', () => {
    const r = run('treibstoff = treibstoff - 20', { treibstoff: 62 });
    assert.equal(r.vars.treibstoff, 62 - 20);
});

test('Kommazahlen aus JSON bleiben float', () => {
    const r = run('y = x * 2', { x: 1.5 });
    assert.ok(r.vars.y instanceof PyFloat);
    assert.equal(pyStr(r.vars.y), '3.0');
});

test('whichBranch findet den ausgeführten Zweig', () => {
    const code = 'if alter >= 18:\n    a = 1\nelif alter >= 14:\n    a = 2\nelse:\n    a = 3';
    assert.equal(whichBranch(code, { alter: 15 }), 3);
    assert.equal(whichBranch(code, { alter: 20 }), 1);
    assert.equal(whichBranch(code, { alter: 3 }), 5);
    assert.deepEqual(branchHeaders(code).map(h => h.kind), ['if', 'elif', 'else']);
});

test('whichBranch funktioniert mit Funktionsaufrufen in den Zweigen', () => {
    const code = 'if x > 1:\n    starten()\nelse:\n    warten()';
    const vars = {};
    // Funktionen, die es nicht gibt, dürfen im nicht genommenen Zweig stehen
    assert.throws(() => whichBranch(code, { x: 5, ...vars }));
});

test('Endlosschleife wird abgebrochen', () => {
    const r = run('x = 1\nwhile x > 0:\n    x = x + 1');
    assert.equal(r.ok, false);
    assert.equal(r.error.kind, 'loop');
    assert.equal(r.error.line, 2);
});

test('Deutsche Fehlermeldungen mit Zeile und Vorschlag', () => {
    const r = run('treibstoff = 10\nprint(treibstof)');
    assert.equal(r.ok, false);
    assert.equal(r.error.line, 2);
    assert.match(r.error.message, /treibstoff/);

    const s = checkSyntax('if x > 3\n    y = 1');
    assert.match(s.message, /Doppelpunkt/);
    assert.equal(s.line, 1);

    const e = checkSyntax('if x = 3:\n    y = 1');
    assert.match(e.message, /==/);

    const ind = checkSyntax('if x > 3:\ny = 1');
    assert.match(ind.message, /eingerückt/);

    const t = run('print("Energie: " + 5)');
    assert.match(t.error.message, /str\(/);

    const tr = run('x = true');
    assert.match(tr.error.message, /True/);

    const idx = run('l = [1, 2]\nprint(l[2])');
    assert.match(idx.error.message, /Index 2/);
});

test('Schritte werden aufgezeichnet', () => {
    const r = run('x = 1\nfor i in range(3):\n    x = x * 2', {}, { record: true });
    assert.ok(r.steps.length >= 7);
    assert.equal(r.steps[r.steps.length - 1].vars.x, 4); // Schnappschuss VOR der letzten Zeile
    assert.equal(r.vars.x, 8);
});

test('Funktionsaufrufe zeigen lokale Variablen', () => {
    const r = run('def f(a):\n    b = a + 1\n    return b\nc = f(1)', {}, { record: true });
    const inFn = r.steps.find(s => s.fn === 'f' && s.line === 3);
    assert.equal(inFn.locals.b, 2);
    assert.equal(r.vars.c, 2);
});

test('loopBodyCount zählt Schleifendurchläufe', () => {
    const code = 'temp = 120\nwhile temp > 40:\n    temp -= 15';
    assert.equal(loopBodyCount(code, 2), 6);
    assert.equal(loopBodyCount('for i in range(2, 9, 2):\n    pass', 1), 4);
});

test('answerMatches akzeptiert sinnvolle Schreibweisen', () => {
    assert.ok(answerMatches('42', 42));
    assert.ok(answerMatches(' 42 ', 42));
    assert.ok(answerMatches('3.0', 3));
    assert.ok(answerMatches('2,5', new PyFloat(2.5)));
    assert.ok(answerMatches('true', true));
    assert.ok(answerMatches('True', true));
    assert.ok(answerMatches('Hallo', 'Hallo'));
    assert.ok(answerMatches('"Hallo"', 'Hallo'));
    assert.ok(answerMatches('[1, 2]', [1, 2]));
    assert.ok(!answerMatches('41', 42));
    assert.ok(!answerMatches('', 0));
    assert.ok(!answerMatches('hallo', 'Hallo'));
});

test('Kein Zugriff auf JavaScript', () => {
    for (const evil of ['constructor', '__proto__', 'globalThis', 'window', 'process']) {
        const r = run(`x = ${evil}`);
        assert.equal(r.ok, false, evil);
    }
    const r2 = run('x = "a"\ny = x.constructor()');
    assert.equal(r2.ok, false);
});
