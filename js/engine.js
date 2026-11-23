/**
 * Logik-Geschichten – Spiel-Engine
 * Bildschirme: Start → Story-Übersicht (Kapitel) → Kapitel-Intro → Mission → … → Ende
 * Adressen (für Lehrkräfte verlinkbar):
 *   #/mission-aurora            Übersicht
 *   #/mission-aurora/k4         Kapitel 4
 *   #/mission-aurora/k4/4-2     Mission 4-2
 *   #/mission-aurora/ende       Ende
 */
import { STORIES, THEMES } from './stories.js';
import { formatText, esc, store, showValue, typeLabel } from './util.js';
import { missionVars, applyEffects, computeEnding } from './checks.js';
import { codeBlock } from './ui/code.js';
import { openStepper, closeStepper } from './ui/stepper.js';
import { renderChoice } from './tasks/choice.js';
import { renderTrace } from './tasks/trace.js';
import { renderFill } from './tasks/fill.js';
import { renderBug } from './tasks/bug.js';
import { renderParsons } from './tasks/parsons.js';
import { renderLegacy, convertLegacy } from './tasks/legacy.js';

const RENDERERS = { choice: renderChoice, trace: renderTrace, fill: renderFill, bug: renderBug, parsons: renderParsons, legacy: renderLegacy };
const TYPE_INFO = {
    choice: { icon: '🔀', label: 'Zweig wählen' },
    trace: { icon: '🔎', label: 'Code verfolgen' },
    fill: { icon: '✍️', label: 'Code schreiben' },
    bug: { icon: '🐞', label: 'Bug-Jagd' },
    parsons: { icon: '🧩', label: 'Code-Puzzle' },
    legacy: { icon: '🎯', label: 'Auswahl' }
};
const MAX_PENALTIES = 3;

export class Game {
    constructor(root) {
        this.root = root;
        this.cache = {};
        this.lrs = !!store.get('logicstory:lrs', false);
        document.body.classList.toggle('lrs', this.lrs);
    }

    start() {
        window.addEventListener('hashchange', () => this.route());
        this.root.addEventListener('click', (e) => {
            const a = e.target.closest('[data-go]');
            if (a) { e.preventDefault(); this.go(a.dataset.go); }
            if (e.target.closest('[data-lrs]')) this.toggleLRS();
        });
        this.route();
    }

    go(hash) {
        if (location.hash === hash || (hash === '#/' && !location.hash)) this.route();
        else location.hash = hash;
    }

    async route() {
        closeStepper();
        const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
        try {
            if (!parts.length) return this.showHome();
            const story = await this.load(parts[0]);
            if (!story) return this.showHome();
            this.applyTheme(story.theme);
            if (parts.length === 1) return this.showOverview(story);
            if (parts[1] === 'ende') return this.showEnding(story);
            const ch = story.chapters.find(c => c.id === parts[1]);
            if (!ch) return this.showOverview(story);
            if (parts.length === 2) return this.showChapter(story, ch);
            const m = ch.missions.find(x => x.id === parts[2]);
            if (!m) return this.showChapter(story, ch);
            return this.showMission(story, ch, m);
        } catch (err) {
            console.error(err);
            this.showError('Hier ist etwas schiefgelaufen: ' + err.message);
        }
    }

    // ------------------------------------------------------------------ Daten

    async load(id) {
        if (this.cache[id]) return this.cache[id];
        const entry = STORIES.find(s => s.id === id);
        if (!entry) return null;
        const res = await fetch(entry.file);
        if (!res.ok) throw new Error('Geschichte konnte nicht geladen werden (' + res.status + ')');
        const raw = await res.json();
        const story = entry.legacy ? convertLegacy(raw, entry.legacy) : raw;
        this.cache[id] = story;
        return story;
    }

    stateKey(story) { return 'logicstory:v2:' + story.id; }

    getState(story) {
        const st = store.get(this.stateKey(story), null) || {};
        const res = {};
        for (const r of story.resources) res[r.id] = (st.res && typeof st.res[r.id] === 'number') ? st.res[r.id] : r.start;
        return { res, done: st.done || {}, fails: st.fails || {}, endings: st.endings || [], seenProlog: !!st.seenProlog, last: st.last || null };
    }

    saveState(story, state) { store.set(this.stateKey(story), state); }

    resetState(story) { store.remove(this.stateKey(story)); }

    allMissions(story) {
        return story.chapters.flatMap(ch => ch.missions.map(m => ({ ch, m })));
    }

    progress(story, state) {
        const all = this.allMissions(story);
        const done = all.filter(x => state.done[x.m.id]).length;
        return { done, total: all.length };
    }

    // ------------------------------------------------------------------ Darstellung allgemein

    applyTheme(name) {
        const t = THEMES[name] || THEMES.default;
        const r = document.documentElement.style;
        r.setProperty('--bg-gradient', t.background);
        r.setProperty('--primary-color', t.primaryColor);
        r.setProperty('--secondary-color', t.secondaryColor);
        r.setProperty('--accent-color', t.accentColor);
        r.setProperty('--card-bg', t.cardBg);
        r.setProperty('--text-color', t.textColor);
        r.setProperty('--border-color', t.borderColor);
        r.setProperty('--font-family', t.fontFamily);
        document.body.dataset.theme = name || 'default';
    }

    render(html, { storyMode = true, title } = {}) {
        document.body.classList.toggle('story-mode', storyMode);
        this.root.innerHTML = html;
        document.title = title ? `${title} – Logik-Geschichten` : 'Logik-Geschichten – Programmieren verstehen';
        window.scrollTo(0, 0);
        const h = this.root.querySelector('h1, h2');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }

    toggleLRS() {
        this.lrs = !this.lrs;
        store.set('logicstory:lrs', this.lrs);
        document.body.classList.toggle('lrs', this.lrs);
        this.root.querySelectorAll('[data-lrs]').forEach(b => {
            b.classList.toggle('active', this.lrs);
            b.setAttribute('aria-pressed', String(this.lrs));
            const s = b.querySelector('.lrs-status');
            if (s) s.textContent = this.lrs ? 'EIN' : 'AUS';
        });
        this.root.querySelectorAll('.lrs-box').forEach(x => { x.hidden = !this.lrs; });
    }

    lrsButton() {
        return `<button type="button" class="lrs-button ${this.lrs ? 'active' : ''}" data-lrs aria-pressed="${this.lrs}">
            <span aria-hidden="true">👁️</span> LRS-Unterstützung <span class="lrs-status">${this.lrs ? 'EIN' : 'AUS'}</span></button>`;
    }

    resourceBars(story, res, changes = []) {
        return `<div class="resources">${story.resources.map(r => {
            const v = res[r.id];
            const ch = changes.find(c => c.res === r.id);
            const level = v >= 70 ? 'ok' : v >= 40 ? 'warn' : 'crit';
            return `<div class="res res-${level}${ch ? (ch.delta < 0 ? ' hit' : ' gain') : ''}">
                <div class="res-top"><span>${r.icon} ${esc(r.label)}</span><span class="res-val">${v}${ch ? ` <small>(${ch.delta > 0 ? '+' : ''}${ch.delta})</small>` : ''}</span></div>
                <div class="res-bar" role="progressbar" aria-label="${esc(r.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><span style="width:${v}%"></span></div>
            </div>`;
        }).join('')}</div>`;
    }

    changeChips(story, changes) {
        if (!changes.length) return '';
        return `<div class="chips">${changes.map(c => {
            const r = story.resources.find(x => x.id === c.res);
            return `<span class="chip ${c.delta < 0 ? 'neg' : 'pos'}">${r.icon} ${esc(r.label)} ${c.delta > 0 ? '+' : ''}${c.delta}</span>`;
        }).join('')}</div>`;
    }

    // ------------------------------------------------------------------ Startseite

    async showHome() {
        this.applyTheme('default');
        const cards = await Promise.all(STORIES.map(async (entry) => {
            let story;
            try { story = await this.load(entry.id); } catch { return ''; }
            const st = this.getState(story);
            const p = this.progress(story, st);
            const pct = Math.round(100 * p.done / Math.max(1, p.total));
            const badge = story.legacy ? '<span class="badge muted">Klassik</span>' : `<span class="badge">${story.chapters.length} Kapitel · ${p.total} Missionen</span>`;
            return `
                <a class="story-card" href="#/${story.id}">
                    <div class="story-image"><img src="${esc(story.cover)}" alt="" loading="lazy"></div>
                    <div class="story-info">
                        <div class="story-meta">${badge}</div>
                        <h3>${esc(story.title)}</h3>
                        <p class="story-subtitle">${esc(story.subtitle || '')}</p>
                        <p class="story-description">${esc(story.description || '')}</p>
                        <div class="mini-progress" aria-label="Fortschritt ${p.done} von ${p.total}"><span style="width:${pct}%"></span></div>
                        <small class="muted">${p.done ? `${p.done} von ${p.total} gelöst` : 'Noch nicht begonnen'}</small>
                    </div>
                </a>`;
        }));
        this.render(`
            <div class="home">
                <header class="selection-header">
                    <h1>🧠 Logik-Geschichten</h1>
                    <p>Rette Raumschiffe, löse Fälle, reise durch die Zeit – mit echtem Python-Denken.</p>
                    <ul class="skills">
                        <li>🔀 Bedingungen</li><li>🔁 Schleifen</li><li>📋 Listen</li><li>🛠️ Funktionen</li><li>🐞 Bugs finden</li><li>🧩 Code ordnen</li>
                    </ul>
                    <div class="lrs-toggle-container">${this.lrsButton()}
                        <p class="lrs-description">Größere Schrift, mehr Abstand und kurze Zusammenfassungen bei Lese-Rechtschreib-Schwäche.</p>
                    </div>
                </header>
                <div class="stories-grid">${cards.join('')}</div>
            </div>`, { storyMode: false });
    }

    // ------------------------------------------------------------------ Story-Übersicht

    showOverview(story) {
        const st = this.getState(story);
        const p = this.progress(story, st);
        const firstOpen = this.allMissions(story).find(x => !st.done[x.m.id]);
        const continueHash = firstOpen ? `#/${story.id}/${firstOpen.ch.id}/${firstOpen.m.id}` : `#/${story.id}/ende`;

        const chapters = story.chapters.map((ch, i) => {
            const doneCount = ch.missions.filter(m => st.done[m.id]).length;
            const dots = ch.missions.map(m => `<a class="dot ${st.done[m.id] ? 'done' : ''}" href="#/${story.id}/${ch.id}/${m.id}" title="${esc(m.id + ' ' + m.title)} (${TYPE_INFO[m.type].label})" aria-label="Mission ${esc(m.id)}: ${esc(m.title)}${st.done[m.id] ? ', gelöst' : ''}">${TYPE_INFO[m.type].icon}</a>`).join('');
            const status = doneCount === ch.missions.length ? '✔ geschafft' : doneCount ? `${doneCount}/${ch.missions.length}` : '';
            return `
                <article class="chapter-card ${doneCount === ch.missions.length ? 'complete' : ''}">
                    ${ch.image ? `<a class="ch-img" href="#/${story.id}/${ch.id}" tabindex="-1" aria-hidden="true"><img src="${esc(ch.image)}" alt="" loading="lazy"></a>` : ''}
                    <div class="ch-body">
                        <div class="ch-kicker">${story.legacy ? '' : `Kapitel ${i + 1} · `}<span class="concept">${esc(ch.concept)}</span></div>
                        <h3><a href="#/${story.id}/${ch.id}">${esc(ch.title)}</a> <small class="muted">${status}</small></h3>
                        <div class="dots">${dots}</div>
                    </div>
                </article>`;
        }).join('');

        const endings = st.endings.length
            ? `<p class="endings-got">🏁 Erreichte Enden: ${st.endings.map(k => `<strong>${esc(story.endings.list[k]?.title || k)}</strong>`).join(', ')}</p>` : '';

        this.render(`
            <div class="overview">
                <nav class="crumbs"><a href="#/">← Alle Geschichten</a></nav>
                <header class="ov-hero">
                    <img src="${esc(story.cover)}" alt="" class="ov-cover">
                    <div>
                        <h1>${esc(story.title)}</h1>
                        <p class="story-subtitle">${esc(story.subtitle || '')}</p>
                        <p>${esc(story.description || '')}</p>
                        <div class="ov-actions">
                            <a class="btn primary" href="${continueHash}">${p.done === 0 ? '🚀 Abenteuer starten' : firstOpen ? '▶ Weiterspielen' : '🏁 Zum Ende'}</a>
                            ${this.lrsButton()}
                        </div>
                    </div>
                </header>
                ${story.prolog && !story.legacy ? `<details class="prolog" ${st.seenProlog ? '' : 'open'}><summary>📜 Prolog</summary>${formatText(story.prolog)}</details>` : ''}
                <div class="ov-grid">
                    <section class="chapters" aria-label="Kapitel">${chapters}</section>
                    <aside class="ov-side">
                        <h3>${story.resources.length === 1 ? 'Wertung' : 'Schiffsstatus'}</h3>
                        ${this.resourceBars(story, st.res)}
                        <p class="muted small">${p.done} von ${p.total} Missionen gelöst.</p>
                        ${endings}
                        <details class="teacher"><summary>Für Lehrkräfte</summary>
                            <p>Jedes Kapitel und jede Mission hat eine eigene Adresse – einfach aus der Browserzeile kopieren, z. B. <code>#/${esc(story.id)}/${esc(story.chapters[story.chapters.length - 1].id)}</code>. Der Fortschritt wird nur in diesem Browser gespeichert.</p>
                            <ul class="legend">${Object.entries(TYPE_INFO).filter(([k]) => story.legacy ? k === 'legacy' : k !== 'legacy').map(([, t]) => `<li>${t.icon} ${t.label}</li>`).join('')}</ul>
                        </details>
                        <button type="button" class="ghost small" data-reset>↺ Spielstand zurücksetzen</button>
                    </aside>
                </div>
            </div>`, { title: story.title });

        const det = this.root.querySelector('.prolog');
        if (det && !st.seenProlog) {
            st.seenProlog = true;
            this.saveState(story, st);
        }
        this.root.querySelector('[data-reset]').addEventListener('click', () => {
            if (confirm('Wirklich den Spielstand dieser Geschichte löschen? Ressourcen und gelöste Missionen werden zurückgesetzt.')) {
                this.resetState(story);
                this.showOverview(story);
            }
        });
    }

    // ------------------------------------------------------------------ Kapitel-Intro

    showChapter(story, ch) {
        const idx = story.chapters.indexOf(ch);
        const st = this.getState(story);
        const first = ch.missions.find(m => !st.done[m.id]) || ch.missions[0];
        const prevDone = idx > 0 && story.chapters[idx - 1].missions.every(m => st.done[m.id]);
        this.render(`
            <div class="chapter-intro">
                <nav class="crumbs"><a href="#/${story.id}">← ${esc(story.title)}</a></nav>
                ${ch.image ? `<div class="ci-image"><img src="${esc(ch.image)}" alt=""></div>` : ''}
                <div class="ci-body">
                    ${prevDone && this.justFinished === story.chapters[idx - 1].id ? `<p class="ci-done">✔ Kapitel ${idx} geschafft!</p>` : ''}
                    <div class="ch-kicker">${story.legacy ? '' : `Kapitel ${idx + 1} von ${story.chapters.length} · `}<span class="concept">${esc(ch.concept)}</span></div>
                    <h1>${esc(ch.title)}</h1>
                    <div class="story-text">${formatText(ch.intro)}</div>
                    <ul class="ci-missions">${ch.missions.map(m => `<li class="${st.done[m.id] ? 'done' : ''}"><a href="#/${story.id}/${ch.id}/${m.id}">${TYPE_INFO[m.type].icon} <span>${esc(m.title)}</span> <small>${TYPE_INFO[m.type].label}</small></a></li>`).join('')}</ul>
                    <a class="btn primary big" href="#/${story.id}/${ch.id}/${first.id}">${st.done[first.id] ? 'Kapitel wiederholen' : 'Los geht\'s'} →</a>
                </div>
            </div>`, { title: ch.title });
        this.justFinished = null;
    }

    // ------------------------------------------------------------------ Mission

    showMission(story, ch, m) {
        const st = this.getState(story);
        const chIdx = story.chapters.indexOf(ch);
        const mIdx = ch.missions.indexOf(m);
        const vars = missionVars(m, st.res);
        const alreadyDone = !!st.done[m.id];
        st.last = m.id;
        this.saveState(story, st);

        const varRows = Object.entries(vars).map(([k, v]) => `
            <div class="var-row"><code class="vn">${esc(k)}</code><span class="eq">=</span><code class="vv t-${typeLabel(v)}">${esc(showValue(v))}</code><span class="vt">${typeLabel(v)}</span></div>`).join('');
        const textValues = { ...st.res, ...vars };

        this.render(`
            <div class="mission">
                <header class="mission-header">
                    <nav class="crumbs"><a href="#/${story.id}">${esc(story.title)}</a> › <a href="#/${story.id}/${ch.id}">${story.legacy ? '' : `Kapitel ${chIdx + 1}: `}${esc(ch.title)}</a></nav>
                    <div class="mh-row">
                        <h2><span class="type-badge" title="${TYPE_INFO[m.type].label}">${TYPE_INFO[m.type].icon} ${TYPE_INFO[m.type].label}</span> ${esc(m.title)}</h2>
                        <div class="mh-dots" aria-label="Mission ${mIdx + 1} von ${ch.missions.length}">${ch.missions.map((x, i) => `<a href="#/${story.id}/${ch.id}/${x.id}" class="mdot ${st.done[x.id] ? 'done' : ''} ${x === m ? 'cur' : ''}" aria-label="Mission ${i + 1}${x === m ? ' (aktuell)' : ''}"></a>`).join('')}</div>
                    </div>
                </header>
                <div class="mission-layout">
                    <section class="mission-left">
                        <div class="mission-text">${formatText(m.text, textValues)}</div>
                        ${varRows ? `<details class="vars-inline" open><summary>🔍 Variablen</summary><div class="var-list">${varRows}</div></details>` : ''}
                        ${m.lrs ? `<div class="lrs-box" ${this.lrs ? '' : 'hidden'}><strong>📋 Kurz gesagt:</strong> ${formatText(m.lrs, textValues)}</div>` : ''}
                        <div class="task"></div>
                        <div class="feedback" aria-live="polite"></div>
                    </section>
                    <aside class="mission-right">
                        <div class="panel">
                            <h3>${story.resources.length === 1 ? 'Wertung' : 'Schiffsstatus'}</h3>
                            <div class="res-wrap">${this.resourceBars(story, st.res)}</div>
                        </div>
                        ${varRows ? `<div class="panel vars-panel"><h3>🔍 Variablen</h3><div class="var-list">${varRows}</div><p class="muted small">Startwerte, bevor der Code läuft.</p></div>` : ''}
                        <div class="panel help">
                            <h3>🛟 Hilfe</h3>
                            ${(m.hints || []).map((hint, i) => `<button type="button" class="hint-btn" data-hint="${i}" ${i > 0 ? 'hidden' : ''}>💡 Tipp ${i + 1}</button><div class="hint" data-hint-text="${i}" hidden>${formatText(hint, textValues)}</div>`).join('')}
                            <button type="button" class="step-btn" data-step hidden>▶ Ablauf ansehen</button>
                            <p class="muted small step-note" hidden>Zeigt Zeile für Zeile, was ORION tut.</p>
                        </div>
                    </aside>
                </div>
            </div>`, { title: m.title });

        const left = this.root.querySelector('.mission-left');
        const feedback = left.querySelector('.feedback');
        const stepBtn = this.root.querySelector('[data-step]');
        let solved = false;
        let localFails = 0;
        let stepper = null;
        const studentCodeTypes = new Set(['fill', 'bug', 'parsons']);

        const updateStepBtn = () => {
            const ok = stepper && (solved || localFails >= 2 || studentCodeTypes.has(m.type));
            stepBtn.hidden = !ok;
            this.root.querySelector('.step-note').hidden = !ok;
        };

        this.root.querySelector('.help').addEventListener('click', (e) => {
            const hb = e.target.closest('[data-hint]');
            if (hb) {
                const i = Number(hb.dataset.hint);
                hb.hidden = true;
                this.root.querySelector(`[data-hint-text="${i}"]`).hidden = false;
                const next = this.root.querySelector(`[data-hint="${i + 1}"]`);
                if (next) next.hidden = false;
            }
            if (e.target.closest('[data-step]') && stepper) openStepper(stepper.code, stepper.vars, { title: stepper.title, note: stepper.note });
        });

        const ctx = {
            mission: m,
            vars,
            el: left.querySelector('.task'),
            isSolved: () => solved,
            failCount: () => localFails,
            setStepper: (s) => { stepper = s; updateStepBtn(); },
            wrong: (html) => {
                localFails++;
                let changes = [];
                const cur = this.getState(story);
                if (!cur.done[m.id]) {
                    cur.fails[m.id] = (cur.fails[m.id] || 0) + 1;
                    if (cur.fails[m.id] <= MAX_PENALTIES) changes = applyEffects(cur.res, m.onFail || story.defaultPenalty || [], story.resources);
                    this.saveState(story, cur);
                    this.root.querySelector('.res-wrap').innerHTML = this.resourceBars(story, cur.res, changes);
                }
                feedback.innerHTML = `
                    <div class="fb fb-wrong" role="status">
                        <div class="fb-head">❌ Nicht ganz${localFails > 1 ? ` <small>(${localFails}. Versuch)</small>` : ''}</div>
                        <div>${html}</div>
                        ${this.changeChips(story, changes)}
                        ${localFails === 2 && m.hints && m.hints.length ? '<p class="muted small">💡 Tipp: Rechts unter „Hilfe“ gibt es Hinweise.</p>' : ''}
                    </div>`;
                feedback.querySelector('.fb').animate?.([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 250 });
                updateStepBtn();
                if (localFails === 2) this.root.querySelector('[data-hint="0"]')?.classList.add('pulse');
            },
            solved: (extraHtml) => {
                if (solved) return;
                solved = true;
                const cur = this.getState(story);
                let changes = [];
                if (!cur.done[m.id]) {
                    cur.done[m.id] = true;
                    changes = applyEffects(cur.res, m.onSuccess || story.defaultReward || [], story.resources);
                    this.saveState(story, cur);
                    this.root.querySelector('.res-wrap').innerHTML = this.resourceBars(story, cur.res, changes);
                }
                const next = this.nextAfter(story, ch, m);
                feedback.innerHTML = `
                    <div class="fb fb-right" role="status">
                        <div class="fb-head">✅ Richtig!</div>
                        ${extraHtml || ''}
                        ${m.explain ? `<div class="explain"><h4>💡 Warum?</h4>${formatText(m.explain, textValues)}</div>` : ''}
                        ${this.changeChips(story, changes)}
                        ${m.success ? `<div class="success-story">${formatText(m.success, textValues)}</div>` : ''}
                        <div class="fb-actions">
                            ${stepper ? '<button type="button" class="ghost" data-step2>▶ Ablauf ansehen</button>' : ''}
                            <a class="btn primary" href="${next.hash}" data-next>${esc(next.label)} →</a>
                        </div>
                        ${alreadyDone ? '<p class="muted small">Du hattest diese Mission schon gelöst – Ressourcen bleiben unverändert.</p>' : ''}
                    </div>`;
                feedback.querySelector('[data-step2]')?.addEventListener('click', () => openStepper(stepper.code, stepper.vars, { title: stepper.title, note: stepper.note }));
                feedback.querySelector('[data-next]').addEventListener('click', () => {
                    if (next.finishedChapter) this.justFinished = ch.id;
                });
                updateStepBtn();
                feedback.scrollIntoView({ behavior: 'smooth', block: 'start' });
                feedback.querySelector('[data-next]').focus({ preventScroll: true });
            }
        };

        try {
            RENDERERS[m.type](ctx);
        } catch (err) {
            console.error(err);
            ctx.el.innerHTML = `<div class="syntax-err">Diese Mission ist fehlerhaft: ${esc(err.message)}</div>`;
        }
    }

    nextAfter(story, ch, m) {
        const mIdx = ch.missions.indexOf(m);
        if (mIdx < ch.missions.length - 1) {
            const n = ch.missions[mIdx + 1];
            return { hash: `#/${story.id}/${ch.id}/${n.id}`, label: 'Nächste Mission' };
        }
        const cIdx = story.chapters.indexOf(ch);
        if (cIdx < story.chapters.length - 1) {
            const n = story.chapters[cIdx + 1];
            return { hash: `#/${story.id}/${n.id}`, label: `Weiter zu Kapitel ${cIdx + 2}`, finishedChapter: true };
        }
        return { hash: `#/${story.id}/ende`, label: 'Zum Finale', finishedChapter: true };
    }

    // ------------------------------------------------------------------ Ende

    showEnding(story) {
        const st = this.getState(story);
        const p = this.progress(story, st);
        const { key, branch } = computeEnding(story, st.res);
        const end = story.endings.list[key];
        if (!st.endings.includes(key)) { st.endings.push(key); this.saveState(story, st); }
        const keys = Object.keys(story.endings.list);
        const rank = keys.indexOf(key);
        this.render(`
            <div class="ending ending-${rank === 0 ? 'best' : rank === keys.length - 1 ? 'worst' : 'mid'}">
                <nav class="crumbs"><a href="#/${story.id}">← ${esc(story.title)}</a></nav>
                <h1>${esc(end.title)}</h1>
                <div class="end-calc">
                    <p>${esc(story.endings.intro || 'So wird dein Ende berechnet:')}</p>
                    <div class="end-vars">${story.resources.map(r => `<code>${r.id} = ${st.res[r.id]}</code>`).join(' ')}</div>
                    ${codeBlock(story.endings.code, { small: true, lineClass: (n) => n === branch ? 'current' : '' })}
                </div>
                ${end.image ? `<div class="end-image"><img src="${esc(end.image)}" alt=""></div>` : ''}
                <div class="story-text">${formatText(end.text)}</div>
                ${this.resourceBars(story, st.res)}
                <p class="muted">${p.done} von ${p.total} Missionen gelöst${p.done < p.total ? ' – es gibt noch offene Missionen!' : '.'}</p>
                <div class="end-actions">
                    <button type="button" class="btn" data-restart>🔄 Neu beginnen (alle Ressourcen auf Start)</button>
                    <a class="btn" href="#/${story.id}">📖 Zur Kapitelübersicht</a>
                    <a class="btn primary" href="#/">📚 Andere Geschichte</a>
                </div>
                ${rank !== 0 ? `<p class="muted small">Es gibt ${keys.length} verschiedene Enden. Für „${esc(story.endings.list[keys[0]].title)}“ brauchst du weniger Fehlversuche.</p>` : ''}
            </div>`, { title: end.title });
        this.root.querySelector('[data-restart]').addEventListener('click', () => {
            if (confirm('Neu beginnen? Gelöste Missionen und Ressourcen werden zurückgesetzt (erreichte Enden bleiben gespeichert).')) {
                const keep = this.getState(story).endings;
                this.resetState(story);
                this.saveState(story, { ...this.getState(story), endings: keep, seenProlog: true });
                this.go(`#/${story.id}/${story.chapters[0].id}`);
            }
        });
    }

    showError(msg) {
        this.render(`<div class="error-container"><h2>❌ Fehler</h2><p>${esc(msg)}</p><a class="btn" href="#/">🏠 Zur Startseite</a></div>`);
    }
}
