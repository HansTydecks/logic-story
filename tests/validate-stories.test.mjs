// Prüft alle Story-Dateien im Format 2: Jede Mission muss lösbar und eindeutig sein.
// Ausführen: node --test tests/   (oder nur dieses: node --test tests/validate-stories.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkSyntax, run } from '../js/interpreter.js';
import {
    missionVars, analyzeChoice, traceExpected, traceCheck, countBlanks, checkFill,
    checkBugFix, bugFixedCode, runTests, checkRules, parsonsLines, checkParsons, applyEffects, computeEnding
} from '../js/checks.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const storyDir = path.join(root, 'stories');
// STORY_FILE=/pfad/zur/story.json prüft nur diese eine Datei (praktisch beim Schreiben)
const files = process.env.STORY_FILE
    ? [path.resolve(process.env.STORY_FILE)]
    : readdirSync(storyDir).filter(f => f.endsWith('.json')).map(f => path.join(storyDir, f));

const TYPES = new Set(['choice', 'trace', 'fill', 'bug', 'parsons']);

for (let file of files) {
    const story = JSON.parse(readFileSync(file, 'utf8'));
    file = path.basename(file);
    if (story.format !== 2) continue;

    test(`${file}: Grundstruktur`, () => {
        for (const k of ['id', 'title', 'theme', 'resources', 'chapters', 'endings']) assert.ok(story[k], `Feld ${k} fehlt`);
        assert.ok(story.chapters.length > 0);
        const ids = new Set();
        for (const ch of story.chapters) {
            for (const k of ['id', 'title', 'concept', 'intro', 'missions']) assert.ok(ch[k], `Kapitel ${ch.id}: ${k} fehlt`);
            if (ch.image) assert.ok(existsSync(path.join(root, ch.image)), `Bild fehlt: ${ch.image}`);
            for (const m of ch.missions) {
                assert.ok(!ids.has(m.id), `Mission-ID doppelt: ${m.id}`);
                ids.add(m.id);
            }
        }
        if (story.cover) assert.ok(existsSync(path.join(root, story.cover)), `Cover fehlt: ${story.cover}`);
        for (const [key, e] of Object.entries(story.endings.list)) {
            assert.ok(e.title && e.text, `Ende ${key} unvollständig`);
            if (e.image) assert.ok(existsSync(path.join(root, e.image)), `Bild fehlt: ${e.image}`);
        }
    });

    const startRes = Object.fromEntries(story.resources.map(r => [r.id, r.start]));

    for (const ch of story.chapters) {
        for (const m of ch.missions) {
            test(`${file}: Mission ${m.id} (${m.type}) „${m.title}“`, () => {
                assert.ok(TYPES.has(m.type), `unbekannter Typ ${m.type}`);
                for (const k of ['title', 'text', 'hints', 'explain', 'success']) assert.ok(m[k], `${k} fehlt`);
                assert.ok(Array.isArray(m.hints) && m.hints.length >= 1, 'hints muss eine Liste sein');

                const vars = missionVars(m, startRes);

                // Platzhalter {name} müssen auflösbar sein
                for (const [, name] of m.text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
                    assert.ok(name in vars || name in startRes, `Platzhalter {${name}} unbekannt`);
                }

                // Missionen mit Ressourcen müssen für JEDEN Spielstand funktionieren
                if (m.useResources) {
                    for (const level of [0, 13, 50, 87, 100]) {
                        const res = Object.fromEntries(story.resources.map(r => [r.id, level]));
                        const v = missionVars(m, res);
                        if (m.type === 'choice') assert.ok(analyzeChoice(m.code, v).correctLine, `kein Zweig bei Ressourcen=${level}`);
                        if (m.type === 'trace') traceExpected(m, v);
                        if (m.type === 'fill') assert.ok(checkFill(m, v, m.solution).ok, `Musterlösung scheitert bei Ressourcen=${level}`);
                        if (m.type === 'bug') assert.ok(checkBugFix(m, v, m.fix).ok, `Fix scheitert bei Ressourcen=${level}`);
                        if (m.type === 'parsons') assert.ok(checkParsons(m, v, parsonsLines(m).filter(l => !l.distractor)).ok, `Lösung scheitert bei Ressourcen=${level}`);
                    }
                    assert.ok(!m.options, 'Mit useResources keine festen options verwenden (Antwort hängt vom Spielstand ab)');
                }

                switch (m.type) {
                    case 'choice': {
                        assert.equal(checkSyntax(m.code), null, 'Syntaxfehler im Code');
                        const a = analyzeChoice(m.code, vars);
                        assert.ok(a.headers.length >= 2, 'mindestens zwei Zweige');
                        assert.ok(a.correctLine, 'kein Zweig wird ausgeführt');
                        break;
                    }
                    case 'trace': {
                        const exp = traceExpected(m, vars);
                        if (m.options) {
                            const hits = m.options.filter(o => traceCheck(m, vars, o).ok);
                            assert.equal(hits.length, 1, `genau eine Option muss stimmen (richtig wäre ${exp.display}, passend: ${hits.join(', ')})`);
                        }
                        break;
                    }
                    case 'fill': {
                        assert.equal(countBlanks(m.code), (m.solution || []).length, 'Anzahl Lücken ≠ Anzahl Lösungen');
                        assert.ok(m.tests && m.tests.length >= 1, 'fill braucht Tests');
                        const r = checkFill(m, vars, m.solution);
                        assert.deepEqual(r.rules, [], 'Musterlösung verletzt require/forbid');
                        assert.ok(r.allPass, 'Musterlösung besteht Tests nicht: ' + JSON.stringify(r.results.filter(x => !x.pass).map(x => [x.label, x.error && x.error.message, x.details])));
                        // Mit „pass“ in allen Lücken darf es NICHT klappen
                        const blanks = m.solution.map(() => 'pass');
                        const naive = checkFill(m, vars, blanks);
                        assert.ok(!naive.ok, 'Aufgabe ist auch ohne Eingabe „gelöst“ – Tests verschärfen');
                        break;
                    }
                    case 'bug': {
                        const lines = m.code.split('\n');
                        assert.ok(m.bugLine >= 1 && m.bugLine <= lines.length, 'bugLine außerhalb');
                        assert.ok(m.tests && m.tests.length >= 1, 'bug braucht Tests');
                        const broken = runTests(m.code, m, vars);
                        assert.ok(!broken.allPass, 'Fehlerhafter Code besteht schon alle Tests');
                        const fixed = checkBugFix(m, vars, m.fix);
                        assert.ok(fixed.ok, 'Fix besteht Tests nicht: ' + JSON.stringify(fixed.results.filter(x => !x.pass).map(x => [x.label, x.error && x.error.message, x.details])));
                        assert.equal(checkSyntax(bugFixedCode(m)), null);
                        break;
                    }
                    case 'parsons': {
                        assert.equal(checkSyntax(m.solution), null, 'Syntaxfehler in solution');
                        const items = parsonsLines(m).filter(l => !l.distractor);
                        assert.ok(items.length >= 3, 'mindestens 3 Zeilen');
                        const r = checkParsons(m, vars, items);
                        assert.ok(r.ok, 'Lösung besteht Tests nicht: ' + JSON.stringify(r.results));
                        // Gemischte Reihenfolge (umgedreht) sollte nicht bestehen
                        const rev = items.slice().reverse();
                        assert.ok(!checkParsons(m, vars, rev).ok, 'Auch die umgedrehte Reihenfolge besteht – Tests verschärfen');
                        break;
                    }
                }
            });
        }
    }

    test(`${file}: Enden sind erreichbar, perfekter Durchlauf → bestes Ende`, () => {
        const keys = Object.keys(story.endings.list);
        const res = { ...startRes };
        const defs = story.resources;
        for (const ch of story.chapters) {
            for (const m of ch.missions) applyEffects(res, m.onSuccess || story.defaultReward || [], defs);
        }
        const best = computeEnding(story, res).key;
        assert.equal(best, keys[0], `Perfekter Durchlauf endet mit ${best} (Ressourcen: ${JSON.stringify(res)})`);
        // Schlechtester Durchlauf: 3 Fehler pro Mission
        const bad = { ...startRes };
        for (const ch of story.chapters) {
            for (const m of ch.missions) {
                for (let i = 0; i < 3; i++) applyEffects(bad, m.onFail || story.defaultPenalty || [], defs);
                applyEffects(bad, m.onSuccess || story.defaultReward || [], defs);
            }
        }
        const worst = computeEnding(story, bad).key;
        assert.equal(worst, keys[keys.length - 1], `Schlechtester Durchlauf endet mit ${worst} (Ressourcen: ${JSON.stringify(bad)})`);
        for (const k of [best, worst]) assert.ok(keys.includes(k));
    });
}
