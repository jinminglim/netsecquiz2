/* =====================================================================
   NetSec Quiz 2 practice app — sets A/B/C (50 Q each) + mock quiz.
   Marking mirrors D2L "Correct Answers" for Multi-Select (each option
   scored independently), all-or-nothing for MCQ.
   ===================================================================== */
(function () {
  'use strict';
  const SETS = window.QSETS || {};
  const TOPICS = {
    ACL: 'ACL (Lab 2.1)', ASA: 'Firepower/ASA (Lab 2.2)', SYN: 'TCP SYN Flood (Lab 2.5)', SLOW: 'Slowloris (Lab 2.6)',
    OOB: 'OoB / VRF / Jump Host / SSH (Lab 3.1)', SRV: 'Supermicro / IPMI / Proxmox (Lab 3.1 App.)',
    AUTHN: 'AAA Authentication (Lab 3.2)', AUTHZ: 'AAA Authorization (Lab 3.3)', ACCT: 'AAA Accounting (Lab 3.4)',
    NTP: 'NTP (Lab 3.5)', SYSLOG: 'Syslog (Lab 3.5)', NETFLOW: 'Flexible NetFlow (Lab 3.6)'
  };
  const LETTERS = 'ABCDEFGH';
  const LS = 'nsq2:';
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');

  // ---------- index all questions ----------
  const ALL = {};
  Object.keys(SETS).forEach((k) => SETS[k].questions.forEach((q, i) => { q.id = k + (i + 1); q.set = k; q.n = i + 1; ALL[q.id] = q; }));

  // ---------- persistence ----------
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(LS + k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const settings = Object.assign({ mode: 'exam', scheme: 'option', shuffle: false, showTopic: false }, load('settings', {}));

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function hashStr(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 233280; return h + 69; }
  function shuffled(n, seed) {
    const a = [...Array(n).keys()]; let s = seed || 1;
    for (let i = n - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- scoring ----------
  function scoreQ(q, sel) {
    sel = sel || [];
    if (q.type !== 'multi') return sel.length === 1 && q.a.includes(sel[0]) ? 1 : 0;
    const n = q.o.length, C = q.a.length;
    const R = sel.filter((i) => q.a.includes(i)).length, W = sel.length - R;
    if (settings.scheme === 'aon') return R === C && W === 0 ? 1 : 0;
    if (settings.scheme === 'rmw') return Math.max(0, (R - W) / C);
    let ok = 0; for (let i = 0; i < n; i++) if (sel.includes(i) === q.a.includes(i)) ok++;
    return ok / n;
  }
  const fmt = (x) => (Math.round(x * 100) / 100).toString();

  // ---------- state per exam ----------
  function examState(key) {
    const st = load('exam:' + key, null) || { answers: {}, checked: {}, submitted: false, start: Date.now(), seed: Math.floor(Math.random() * 1e6) };
    st.answers = st.answers || {}; st.checked = st.checked || {};
    return st;
  }
  function questionsFor(key) {
    if (key === 'mock') {
      let ids = load('mockIds', null);
      if (!ids || !ids.every((id) => ALL[id])) ids = newMockIds();
      return ids.map((id) => ALL[id]);
    }
    return (SETS[key] && SETS[key].questions) || [];
  }
  function newMockIds() {
    // 18 questions, spread across topics, drawn from all three sets
    const pool = Object.values(ALL);
    const byTopic = {};
    pool.forEach((q) => (byTopic[q.topic] = byTopic[q.topic] || []).push(q));
    const keys = Object.keys(byTopic).sort(() => Math.random() - 0.5);
    const ids = [];
    keys.forEach((t) => { const arr = byTopic[t]; ids.push(arr[Math.floor(Math.random() * arr.length)].id); });
    while (ids.length < 18) { const q = pool[Math.floor(Math.random() * pool.length)]; if (!ids.includes(q.id)) ids.push(q.id); }
    const final = ids.slice(0, 18).sort(() => Math.random() - 0.5);
    save('mockIds', final);
    return final;
  }

  // ---------- rendering ----------
  function diagramHTML(dg) {
    if (!dg) return '';
    const parts = Array.isArray(dg) ? dg : [dg];
    return parts.map((d) => `<div class="diagram">${typeof d === 'string' ? d : NetDiag.render(d)}</div>`).join('');
  }

  function renderQuestion(q, idx, st, key) {
    // MCQ options are shuffled deterministically per question (so the correct letter is spread out), unless the
    // options are an ordered list (q.fixed). With "Shuffle options" on, the MCQ order is re-randomised per attempt.
    // Multi-Select options keep their authored order because explanations refer to them by letter.
    let order = [...Array(q.o.length).keys()];
    if (q.type !== 'multi' && !q.fixed) order = shuffled(q.o.length, settings.shuffle ? st.seed + idx * 7919 : hashStr(q.id));
    const sel = st.answers[q.id] || [];
    const name = `${key}-${q.id}`;
    const inputType = q.type === 'multi' ? 'checkbox' : 'radio';
    const reveal = st.submitted || st.checked[q.id];
    const opts = order.map((oi, pos) => {
      const isSel = sel.includes(oi), isAns = q.a.includes(oi);
      let cls = isSel ? 'sel' : '', mark = '';
      if (reveal) {
        if (isAns && isSel) { cls = 'correct'; mark = '<span class="mark" style="color:var(--green)">✔ correct</span>'; }
        else if (isAns && !isSel) { cls = 'correct missed'; mark = '<span class="mark" style="color:var(--green)">✔ answer (missed)</span>'; }
        else if (!isAns && isSel) { cls = 'wrong'; mark = '<span class="mark" style="color:var(--red)">✘ wrong</span>'; }
      }
      return `<li><label class="${cls}"><input type="${inputType}" name="${name}" value="${oi}" ${isSel ? 'checked' : ''} ${st.submitted ? 'disabled' : ''}>` +
        `<span class="letter">${LETTERS[pos]}.</span><span>${q.o[oi]}</span>${mark}</label></li>`;
    }).join('');
    let scoreHTML = '';
    if (reveal) {
      const s = scoreQ(q, sel);
      const col = s === 1 ? 'var(--green)' : s === 0 ? 'var(--red)' : 'var(--amber)';
      scoreHTML = `<span class="score" style="color:${col}">${fmt(s)} / 1</span>`;
    }
    const showTopic = settings.showTopic || reveal;
    return `<div class="q" id="q-${q.id}" data-qid="${q.id}">
      <div class="q-head"><span class="num">Question ${idx + 1}</span>
        <span class="chip ${q.type === 'multi' ? 'multi' : 'mcq'}">${q.type === 'multi' ? 'Multi-Select' : 'MCQ'}</span>
        ${showTopic ? `<span class="chip topic">${TOPICS[q.topic] || q.topic}</span>` : ''}
        ${key === 'mock' ? `<span class="chip topic">from Set ${q.set} Q${q.n}</span>` : ''}
        ${scoreHTML}</div>
      <div class="q-body">${diagramHTML(q.dg)}${q.q}
        ${q.type === 'multi' ? '<div class="select-all">Select ALL that apply.</div>' : ''}
        <ul class="opts">${opts}</ul></div>
      ${st.submitted ? '' : `<div class="q-foot">${settings.mode === 'practice' ? `<button class="btn small ghost" data-act="check">${st.checked[q.id] ? 'Hide answer' : 'Check answer'}</button>` : ''}<button class="btn small ghost" data-act="clear" style="border-color:#bbb;color:#666">Clear</button></div>`}
      <div class="explain ${reveal ? '' : 'hidden'}"><b>Answer: ${q.a.map((oi) => LETTERS[order.indexOf(oi)]).sort().join(', ')}</b><br>${q.x}</div>
    </div>`;
  }

  function navigatorHTML(qs, st) {
    const cells = qs.map((q, i) => {
      const sel = st.answers[q.id] || [];
      let cls = sel.length ? 'ans' : '';
      if (st.submitted || st.checked[q.id]) { const s = scoreQ(q, sel); cls = s === 1 ? 'ok' : s === 0 ? 'bad' : 'part'; }
      return `<a href="#" data-jump="${q.id}" class="${cls}">${i + 1}</a>`;
    }).join('');
    return `<h4>Questions</h4><div class="navgrid">${cells}</div>
      <div class="legend"><span style="background:var(--blue-soft);border:1px solid #a9c8ea"></span>answered
      <span style="background:var(--green-soft);border:1px solid #8fd1a6;margin-left:6px"></span>full
      <span style="background:var(--amber-soft);border:1px solid #f0c27b;margin-left:6px"></span>partial
      <span style="background:var(--red-soft);border:1px solid #e6a19a;margin-left:6px"></span>0</div>`;
  }

  function resultsHTML(qs, st) {
    let total = 0; const per = {};
    qs.forEach((q) => { const s = scoreQ(q, st.answers[q.id]); total += s; (per[q.topic] = per[q.topic] || { s: 0, n: 0 }); per[q.topic].s += s; per[q.topic].n++; });
    const pct = (total / qs.length) * 100;
    const rows = Object.keys(per).map((t) => `<tr><td>${TOPICS[t] || t}</td><td>${fmt(per[t].s)} / ${per[t].n}</td><td>${Math.round((per[t].s / per[t].n) * 100)}%</td></tr>`).join('');
    const weakest = Object.keys(per).sort((a, b) => per[a].s / per[a].n - per[b].s / per[b].n).slice(0, 3).map((t) => TOPICS[t] || t);
    return `<div class="results"><h2>Result</h2>
      <div class="big">${fmt(total)} / ${qs.length} <span style="font-size:18px;color:var(--muted)">(${pct.toFixed(1)}%)</span></div>
      <div class="bar" style="margin:8px 0 12px"><div style="width:${pct}%"></div></div>
      <p class="muted" style="margin:0 0 10px">Marking: MCQ all-or-nothing; Multi-Select = ${settings.scheme === 'option' ? 'per-option (D2L “Correct Answers”)' : settings.scheme === 'rmw' ? 'right-minus-wrong' : 'all-or-nothing'}. Revise first: <b>${weakest.join(' · ')}</b> — see the <a href="guide.html">Study Guide</a>.</p>
      <table class="simple topic-table"><tr><th>Topic</th><th>Score</th><th>%</th></tr>${rows}</table>
      <p style="margin:12px 0 0"><button class="btn small ghost" data-act="only-wrong">Show only questions not fully correct</button>
      <button class="btn small ghost" data-act="show-all">Show all</button></p></div>`;
  }

  function controlsHTML(key, st, qs) {
    const answered = qs.filter((q) => (st.answers[q.id] || []).length).length;
    return `<div class="controls">
      <span class="stat">${key === 'mock' ? 'Mock Quiz (18 random questions)' : 'Set ' + key + ' — ' + (SETS[key].title || '')}</span>
      <span class="muted">Answered <b id="ansCount">${answered}</b>/${qs.length}</span>
      <span class="muted">⏱ <b id="timer">0:00</b></span>
      <span class="spacer"></span>
      <label>Mode <select data-set="mode"><option value="exam" ${settings.mode === 'exam' ? 'selected' : ''}>Exam (reveal on submit)</option><option value="practice" ${settings.mode === 'practice' ? 'selected' : ''}>Practice (check each)</option></select></label>
      <label>Multi-select marking <select data-set="scheme"><option value="option" ${settings.scheme === 'option' ? 'selected' : ''}>Per-option (D2L)</option><option value="rmw" ${settings.scheme === 'rmw' ? 'selected' : ''}>Right − wrong</option><option value="aon" ${settings.scheme === 'aon' ? 'selected' : ''}>All-or-nothing</option></select></label>
      <label title="Re-randomise MCQ option order for each attempt"><input type="checkbox" data-set="shuffle" ${settings.shuffle ? 'checked' : ''}> Re-shuffle MCQ options</label>
      <label><input type="checkbox" data-set="showTopic" ${settings.showTopic ? 'checked' : ''}> Show topic tags</label>
      ${st.submitted ? '' : '<button class="btn green" data-act="submit">Submit &amp; mark</button>'}
      <button class="btn warn small" data-act="reset">${key === 'mock' ? 'New mock' : 'Reset set'}</button>
    </div>`;
  }

  let timerHandle = null;
  function startTimer(st) {
    clearInterval(timerHandle);
    const el = () => $('#timer');
    const tick = () => {
      if (!el()) return;
      const end = st.submitted && st.end ? st.end : Date.now();
      const s = Math.max(0, Math.floor((end - st.start) / 1000));
      el().textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    };
    tick(); timerHandle = setInterval(tick, 1000);
  }

  function renderExam(key) {
    const qs = questionsFor(key);
    if (!qs.length) { view.innerHTML = '<p>Set not found.</p>'; return; }
    const st = examState(key);
    view.innerHTML = `${controlsHTML(key, st, qs)}
      <div class="layout"><div id="qlist">${st.submitted ? resultsHTML(qs, st) : ''}${qs.map((q, i) => renderQuestion(q, i, st, key)).join('')}
      ${st.submitted ? '' : '<div style="text-align:center;margin:20px 0"><button class="btn green" data-act="submit">Submit &amp; mark all ' + qs.length + ' questions</button></div>'}</div>
      <aside class="navigator" id="nav">${navigatorHTML(qs, st)}</aside></div>`;
    startTimer(st);

    const rerenderCard = (q) => {
      const idx = qs.indexOf(q);
      const old = $('#q-' + q.id);
      const tmp = document.createElement('div');
      tmp.innerHTML = renderQuestion(q, idx, st, key);
      old.replaceWith(tmp.firstElementChild);
      $('#nav').innerHTML = navigatorHTML(qs, st);
    };

    view.onchange = (e) => {
      const t = e.target;
      if (t.dataset.set) {
        settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : t.value;
        save('settings', settings); renderExam(key); return;
      }
      const card = t.closest('.q'); if (!card || st.submitted) return;
      const q = ALL[card.dataset.qid];
      const vals = [...card.querySelectorAll('input:checked')].map((i) => +i.value);
      st.answers[q.id] = vals; save('exam:' + key, st);
      card.querySelectorAll('.opts label').forEach((l) => l.classList.toggle('sel', l.querySelector('input').checked));
      if (st.checked[q.id]) rerenderCard(q);
      $('#ansCount').textContent = qs.filter((x) => (st.answers[x.id] || []).length).length;
      $('#nav').innerHTML = navigatorHTML(qs, st);
    };
    view.onclick = (e) => {
      const jump = e.target.closest('[data-jump]');
      if (jump) { e.preventDefault(); const el = $('#q-' + jump.dataset.jump); if (el) { el.classList.remove('hidden'); el.scrollIntoView({ behavior: 'smooth' }); } return; }
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const act = btn.dataset.act;
      const card = btn.closest('.q'); const q = card ? ALL[card.dataset.qid] : null;
      if (act === 'check' && q) { st.checked[q.id] = !st.checked[q.id]; save('exam:' + key, st); rerenderCard(q); }
      else if (act === 'clear' && q) { st.answers[q.id] = []; delete st.checked[q.id]; save('exam:' + key, st); rerenderCard(q); $('#ansCount').textContent = qs.filter((x) => (st.answers[x.id] || []).length).length; }
      else if (act === 'submit') {
        const un = qs.filter((x) => !(st.answers[x.id] || []).length).length;
        if (un && !confirm(`${un} question(s) unanswered. Submit anyway?`)) return;
        st.submitted = true; st.end = Date.now(); save('exam:' + key, st); renderExam(key); window.scrollTo(0, 0);
      } else if (act === 'reset') {
        if (!confirm(key === 'mock' ? 'Generate a new random mock quiz? Current answers will be cleared.' : 'Clear all answers for this set?')) return;
        localStorage.removeItem(LS + 'exam:' + key); if (key === 'mock') newMockIds(); renderExam(key); window.scrollTo(0, 0); toast('Cleared');
      } else if (act === 'only-wrong') {
        qs.forEach((x) => { const el = $('#q-' + x.id); if (el) el.classList.toggle('hidden', scoreQ(x, st.answers[x.id]) === 1); });
      } else if (act === 'show-all') { document.querySelectorAll('.q.hidden').forEach((el) => el.classList.remove('hidden')); }
    };
  }

  function renderHome() {
    const setTiles = ['A', 'B', 'C'].filter((k) => SETS[k]).map((k) => {
      const qs = SETS[k].questions; const st = load('exam:' + k, null);
      const multi = qs.filter((q) => q.type === 'multi').length;
      let status = 'Not started';
      if (st && st.submitted) { const tot = qs.reduce((a, q) => a + scoreQ(q, st.answers[q.id]), 0); status = `Last score: <b>${fmt(tot)}/${qs.length}</b>`; }
      else if (st && Object.keys(st.answers || {}).length) status = `In progress (${Object.values(st.answers).filter((v) => v.length).length}/${qs.length})`;
      return `<div class="tile"><h3>Set ${k}</h3><p>${SETS[k].desc || ''}</p>
        <div class="meta">${qs.length} questions · ${qs.length - multi} MCQ · ${multi} Multi-Select</div>
        <div class="meta">${status}</div><a class="btn" href="#${k}">Open Set ${k}</a></div>`;
    }).join('');
    const counts = {};
    Object.values(ALL).forEach((q) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    const rows = Object.keys(TOPICS).map((t) => `<tr><td>${TOPICS[t]}</td><td>${counts[t] || 0}</td></tr>`).join('');
    view.innerHTML = `
      <div class="hero"><h1>ICT2217 Network Security — Quiz 2 Practice</h1>
        <p>Scenario-based MCQ &amp; Multi-Select questions on <b>Topic 2</b> (ACL, Firepower/ASA, SYN flood, Slowloris, MPF) and <b>Topic 3</b> (OoB/VRF/Jump host/SSH, Supermicro/Proxmox, AAA, Syslog/NTP, Flexible NetFlow).</p>
        <p>3 sets × 50 questions with lab topologies drawn, CLI configs, and full explanations.</p></div>
      <div class="grid">${setTiles}
        <div class="tile"><h3>Mock Quiz (18 Q)</h3><p>Real quiz length (17–18 questions, 1% each). Random mix across all topics and sets.</p><div class="meta">Re-generate any time for a fresh mix.</div><a class="btn" href="#mock">Start mock</a></div>
        <div class="tile"><h3>Study Guide</h3><p>Every key concept, command, show-output, calculation and exam trap for Topics 2 &amp; 3, with diagrams.</p><a class="btn" href="guide.html">Open guide</a></div>
      </div>
      <div class="panel"><h2>How the real quiz is marked (and why it matters)</h2>
        <p>The Quiz 1 statistics in the photos give it away. Multi-Select questions use D2L's <b>“Correct Answers”</b> scheme, where <b>every option is marked on its own</b>. You earn 1/n of the mark for each option you tick correctly <i>or leave blank correctly</i>. Check: on the IPSG question, 62% ticked the only correct option and 47/34/40/40% ticked the four wrong ones. The per-option average is (0.62+0.53+0.66+0.60+0.60)/5 = <b>0.60</b>, which is exactly the reported “Average Grade 0.6/1”. The smurf question works out to 0.57, also an exact match.</p>
        <ul><li><b>Treat each option as its own True/False.</b> Tick it only if you think it is more likely true than false.</li>
        <li>Never leave a Multi-Select blank. An unanswered question may score 0, and ticking the options you believe are true can only help.</li>
        <li>Wrong ticks only cost you that option's share (e.g. 1/5), so don't avoid an option you think is true just because you're unsure.</li>
        <li>MCQ is all-or-nothing, so always answer it.</li></ul>
        <p class="muted" style="margin:0">You can switch the marking scheme in each set's toolbar to compare.</p></div>
      <div class="two">
        <div class="panel"><h2>Question bank by topic</h2><table class="simple">${rows}<tr><th>Total</th><th>${Object.keys(ALL).length}</th></tr></table></div>
        <div class="panel"><h2>How to use</h2><ol>
          <li><b>Exam mode</b>: answer all 50, then <i>Submit &amp; mark</i> to see the score, a per-topic breakdown and every explanation.</li>
          <li><b>Practice mode</b>: use <i>Check answer</i> on each question as you go.</li>
          <li>Answers save automatically in this browser. <i>Reset set</i> clears them.</li>
          <li>After marking, use <i>Show only questions not fully correct</i>, then read the matching guide section.</li>
          <li>Do all 3 sets, then several mocks. Aim for 90%+ before the quiz.</li></ol></div>
      </div>`;
  }

  function route() {
    const h = (location.hash || '#home').slice(1);
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + h || (h === 'home' && a.getAttribute('href') === '#home')));
    clearInterval(timerHandle);
    view.onchange = null; view.onclick = null;
    if (h === 'A' || h === 'B' || h === 'C' || h === 'mock') renderExam(h);
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
