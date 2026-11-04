/* =====================================================================
   Easy Learn page: diagrams, progress tracking and the interactive
   "try any scenario" tools (wildcard, ASA, AAA, syslog, NTP, NetFlow).
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('nsq2:learn:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('nsq2:learn:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const OK = '<span class="yes">✔</span>', NO = '<span class="no">✘</span>';

  /* ---------- diagrams: <figure class="dg" data-dg="preset" data-opts='{...}'> ---------- */
  $$('figure.dg[data-dg]').forEach((f) => {
    const fn = window.D && window.D[f.dataset.dg];
    if (!fn) return;
    let opts = {};
    if (f.dataset.opts) { try { opts = JSON.parse(f.dataset.opts); } catch (e) { /* bad json */ } }
    const r = fn(opts);
    f.insertAdjacentHTML('afterbegin', typeof r === 'string' ? r : NetDiag.render(r));
  });

  /* ---------- "mark as understood" progress ---------- */
  const done = store.get('done', {});
  function paintProgress() {
    const topics = $$('section.topic[data-topic]');
    let n = 0;
    topics.forEach((sec) => {
      const on = !!done[sec.dataset.topic];
      if (on) n++;
      const b = $('.done-btn', sec);
      if (b) { b.classList.toggle('on', on); b.textContent = on ? '✔ Understood' : 'Mark as understood'; }
      const chip = $(`.chips a[href="#${sec.id}"]`);
      if (chip) chip.classList.toggle('on', on);
    });
    const bar = $('#progress-bar'), txt = $('#progress-txt');
    if (bar) bar.style.width = (topics.length ? (100 * n) / topics.length : 0) + '%';
    if (txt) txt.textContent = `${n} / ${topics.length} topics marked as understood`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.done-btn');
    if (!b) return;
    const t = b.closest('section.topic').dataset.topic;
    done[t] = !done[t];
    store.set('done', done);
    paintProgress();
  });
  paintProgress();

  /* =====================================================================
     1. ACL wildcard matcher + prefix converter
     ===================================================================== */
  function ip2int(s) {
    const p = String(s).trim().split('.');
    if (p.length !== 4) return null;
    let v = 0;
    for (const x of p) { if (!/^\d{1,3}$/.test(x) || +x > 255) return null; v = v * 256 + Number(x); }
    return v >>> 0;
  }
  const int2ip = (v) => [24, 16, 8, 0].map((s) => (v >>> s) & 255).join('.');
  const contiguous = (wild) => (((wild & (wild + 1)) >>> 0) === 0);

  function bitRow(v, colorFn) {
    let s = '';
    for (let i = 31; i >= 0; i--) {
      const bit = (v >>> i) & 1;
      s += `<span class="${colorFn ? colorFn(i) : ''}">${bit}</span>`;
      if (i % 8 === 0 && i) s += '<span class="dot">.</span>';
    }
    return s;
  }

  function wcTool() {
    const out = $('#wc-out');
    if (!out) return;
    const addr = ip2int($('#wc-addr').value), wild = ip2int($('#wc-wild').value), test = ip2int($('#wc-test').value);
    if (addr === null || wild === null || test === null) {
      out.innerHTML = '<p class="warnline">Enter three valid dotted addresses, e.g. 192.168.10.0 · 0.0.0.255 · 192.168.10.37</p>';
      return;
    }
    const care = (~wild) >>> 0;
    const match = (((addr ^ test) & care) >>> 0) === 0;
    const testColor = (i) => {
      if ((wild >>> i) & 1) return 'ign';
      return (((addr ^ test) >>> i) & 1) ? 'bad' : 'good';
    };
    let html = `<div class="bits"><div><span class="lbl">ACE address</span>${bitRow(addr)}</div>
      <div><span class="lbl">Wildcard</span>${bitRow(wild, (i) => (((wild >>> i) & 1) ? 'ign' : 'care'))}</div>
      <div><span class="lbl">Packet source</span>${bitRow(test, testColor)}</div></div>
      <p class="legend-small"><span class="good">green</span> = checked bit that matches · <span class="bad">red</span> = checked bit that differs · <span class="ign">grey</span> = wildcard 1 (ignored)</p>`;
    html += `<p class="verdict ${match ? 'ok' : 'ko'}">${match ? '✔ MATCH — this ACE applies to the packet' : '✘ NO MATCH — the router moves on to the next ACE (or the implicit deny)'}</p>`;
    const norm = (addr & care) >>> 0;
    if (norm !== addr) html += `<p class="note">Note: the address has bits set where the wildcard says “ignore”. IOS stores this ACE as <code>${int2ip(norm)} ${int2ip(wild)}</code>.</p>`;
    if (contiguous(wild)) {
      const first = norm, last = (norm | wild) >>> 0;
      html += `<p class="note">This ACE covers <b>${int2ip(first)} – ${int2ip(last)}</b> (${(wild + 1).toLocaleString()} address${wild ? 'es' : ''})${wild === 0 ? ' — same as <code>host ' + int2ip(first) + '</code>' : ''}${wild === 0xFFFFFFFF ? ' — same as <code>any</code>' : ''}.</p>`;
    } else {
      html += '<p class="note">This wildcard is not a simple block (e.g. 0.0.255.254 = even addresses only). Use the bit view above.</p>';
    }
    out.innerHTML = html;
  }

  function prefixTool() {
    const out = $('#pf-out');
    if (!out) return;
    const v = $('#pf-in').value.trim();
    let len = null, net = null;
    const m = v.match(/^(\d+\.\d+\.\d+\.\d+)?\s*\/\s*(\d{1,2})$/);
    if (m) {
      len = Number(m[2]);
      if (m[1]) { net = ip2int(m[1]); if (net === null) len = null; }
    } else {
      const mask = ip2int(v);
      if (mask !== null) { const inv = (~mask) >>> 0; if (contiguous(inv)) len = 32 - Math.round(Math.log2(inv + 1)); }
    }
    if (len === null || len > 32) { out.innerHTML = '<p class="warnline">Type a prefix like <code>/27</code>, <code>192.168.10.0/27</code> or a mask like <code>255.255.255.224</code>.</p>'; return; }
    const mask = len === 0 ? 0 : ((0xFFFFFFFF << (32 - len)) >>> 0);
    const wild = (~mask) >>> 0;
    let html = `<table class="mini"><tr><th>Prefix</th><td>/${len}</td></tr><tr><th>Subnet mask (ASA ACLs use this)</th><td><code>${int2ip(mask)}</code></td></tr><tr><th>Wildcard (router ACLs use this)</th><td><code>${int2ip(wild)}</code></td></tr><tr><th>Addresses in block</th><td>${(wild + 1).toLocaleString()}</td></tr>`;
    if (net !== null) {
      const first = (net & mask) >>> 0, last = (first | wild) >>> 0;
      const ace = len === 32 ? `host ${int2ip(first)}` : len === 0 ? 'any' : `${int2ip(first)} ${int2ip(wild)}`;
      html += `<tr><th>Range</th><td>${int2ip(first)} – ${int2ip(last)}</td></tr><tr><th>Router ACE</th><td><code>permit ${ace}</code></td></tr><tr><th>ASA ACE</th><td><code>permit ip ${len === 32 ? 'host ' + int2ip(first) : int2ip(first) + ' ' + int2ip(mask)} any</code></td></tr>`;
    }
    out.innerHTML = html + '</table>';
  }

  /* =====================================================================
     2. Firepower/ASA "will it pass?" simulator
     ===================================================================== */
  const ZN = { inside: 'Inside PC 10.0.0.25', dmz: 'DMZ web server 192.168.2.100', outside: 'Internet host 23.1.2.10' };
  function asaState() {
    return {
      src: $('#asa-src').value, dst: $('#asa-dst').value, proto: $('#asa-proto').value,
      dmz0: $('#asa-dmz0').checked, inspect: $('#asa-inspect').checked, outWeb: $('#asa-outweb').checked,
      outIcmp: $('#asa-outicmp').checked, inWeb: $('#asa-inweb').checked, dmzAcl: $('#asa-dmzacl').checked
    };
  }
  const levels = (st) => ({ inside: 100, dmz: st.dmz0 ? 0 : 50, outside: 0 });
  function aclOn(zone, st) {
    const a = [];
    if (zone === 'outside') {
      if (st.outWeb) a.push({ p: 'tcp', port: 80, dst: 'dmz', txt: 'permit tcp any host 192.168.2.100 eq www' });
      if (st.outIcmp) a.push({ p: 'icmp', txt: 'permit icmp any any' });
    }
    if (zone === 'inside' && st.inWeb) a.push({ p: 'tcp', port: 80, txt: 'permit tcp 10.0.0.0 255.255.255.0 any eq www' });
    if (zone === 'dmz' && st.dmzAcl) a.push({ p: 'tcp', port: 80, dst: 'dmz', txt: 'permit tcp any 192.168.2.0 255.255.255.0 eq www' });
    return a.length ? a : null;
  }
  const aceHit = (a, pkt) => a.p === pkt.p && (a.p !== 'tcp' || (a.port === pkt.port && (!a.dst || a.dst === pkt.dst)));
  function admit(ing, egr, pkt, st) {
    const lv = levels(st), acl = aclOn(ing, st);
    let ok, why, code;
    if (acl) {
      const hit = acl.find((a) => aceHit(a, pkt));
      if (hit) { ok = true; code = 'ACL permit'; why = `The ACL applied inbound on <b>${ing}</b> permits it (<code>${esc(hit.txt)}</code>).`; }
      else { ok = false; code = `ACL on ${ing}: implicit deny`; why = `An ACL is applied inbound on <b>${ing}</b> and nothing in it matches, so the implicit deny drops it. Once an interface has an ACL, the “higher → lower is free” default no longer applies there.`; }
    } else if (lv[ing] > lv[egr]) { ok = true; code = 'higher → lower'; why = `No ACL on <b>${ing}</b>, and ${ing} (${lv[ing]}) → ${egr} (${lv[egr]}) is higher → lower security, which is allowed by default.`; }
    else if (lv[ing] === lv[egr]) { ok = false; code = 'same level'; why = `${ing} and ${egr} both have security level ${lv[ing]}. Traffic between same-level interfaces is blocked by default.`; }
    else { ok = false; code = 'lower → higher'; why = `No ACL on <b>${ing}</b>, and ${ing} (${lv[ing]}) → ${egr} (${lv[egr]}) is lower → higher security, which is blocked unless an ACL permits it.`; }
    if (ok && acl && lv[ing] === lv[egr]) { ok = false; code = 'same level'; why += ` But ${ing} and ${egr} have the <b>same</b> security level (${lv[ing]}), and same-level traffic is blocked by default (it needs <code>same-security-traffic permit inter-interface</code>).`; }
    return { ok, why, code };
  }
  function asaEval(st) {
    if (st.src === st.dst) return { ok: null, steps: [], verdict: 'Pick two different zones.' };
    const ping = st.proto === 'icmp';
    const steps = [];
    const req = admit(st.src, st.dst, ping ? { p: 'icmp' } : { p: 'tcp', port: 80, dst: st.dst }, st);
    steps.push({ ok: req.ok, h: `Request: ${ZN[st.src]} → ${ZN[st.dst]} (${ping ? 'ICMP echo' : 'TCP port 80'})`, t: req.why });
    if (!req.ok) return { ok: false, short: req.code, steps, verdict: 'The request is dropped at the firewall.' };
    if (!ping) {
      steps.push({ ok: true, h: 'Reply (TCP)', t: 'TCP is always tracked statefully. The new connection appears in <code>show conn</code>, so the server’s reply matches it and is allowed back without checking any ACL.' });
      return { ok: true, short: 'works', steps, verdict: 'Works.' };
    }
    if (st.inspect) {
      steps.push({ ok: true, h: 'Echo-reply', t: '<code>inspect icmp</code> is on, so the echo request created a connection entry and the echo-reply matches it.' });
      return { ok: true, short: 'works (inspected)', steps, verdict: 'Works.' };
    }
    const rep = admit(st.dst, st.src, { p: 'icmp' }, st);
    steps.push({ ok: rep.ok, h: `Echo-reply: ${ZN[st.dst]} → ${ZN[st.src]}`, t: `ICMP is <b>not inspected</b> by default, so there is no state and the reply is checked like a brand-new packet. ${rep.why}` });
    return { ok: rep.ok, short: rep.ok ? 'works (reply allowed)' : 'reply dropped', steps, verdict: rep.ok ? 'Works.' : 'The ping fails: the request got through, but the REPLY was dropped.' };
  }
  function asaConfig(st) {
    const L = [];
    L.push('interface ethernet1/5', ' nameif inside', ' security-level 100', ' ip address 10.0.0.1 255.255.255.0');
    L.push('interface ethernet1/3', ' nameif dmz');
    L.push(st.dmz0 ? ' ! security-level not set → defaults to 0' : ' security-level 50');
    L.push(' ip address 192.168.2.254 255.255.255.0');
    L.push('interface ethernet1/1', ' nameif outside', ' security-level 0', ' ip address 23.1.2.3 255.255.255.0');
    const o = aclOn('outside', st), i = aclOn('inside', st), d = aclOn('dmz', st);
    if (o) { o.forEach((a) => L.push('access-list OUTSIDE extended ' + a.txt)); L.push('access-group OUTSIDE in interface outside'); }
    if (i) { i.forEach((a) => L.push('access-list INSIDE extended ' + a.txt)); L.push('access-group INSIDE in interface inside'); }
    if (d) { d.forEach((a) => L.push('access-list OUT2DMZ extended ' + a.txt)); L.push('access-group OUT2DMZ in interface dmz   ! wrong interface!'); }
    if (st.inspect) L.push('policy-map global_policy', ' class inspection_default', '  inspect icmp');
    if (!o && !i && !d && !st.inspect) L.push('! no ACLs, default global_policy (ICMP not inspected)');
    return L.join('\n');
  }
  function asaTool() {
    if (!$('#tool-asa')) return;
    const st = asaState();
    const r = asaEval(st);
    const out = $('#asa-out');
    if (r.ok === null) { out.innerHTML = `<p class="warnline">${r.verdict}</p>`; }
    else {
      out.innerHTML = `<p class="verdict ${r.ok ? 'ok' : 'ko'}">${r.ok ? '✔' : '✘'} ${r.verdict}</p><ol class="steps">` +
        r.steps.map((s) => `<li class="${s.ok ? 'ok' : 'ko'}"><b>${s.ok ? '✔' : '✘'} ${s.h}</b><br>${s.t}</li>`).join('') + '</ol>';
    }
    // matrix for the current settings
    const zones = ['inside', 'dmz', 'outside'];
    let rows = '';
    zones.forEach((a) => zones.forEach((b) => {
      if (a === b) return;
      const cell = (proto) => {
        const x = asaEval(Object.assign({}, st, { src: a, dst: b, proto }));
        return `<td class="${x.ok ? 'ok' : 'ko'}">${x.ok ? '✔' : '✘'} <small>${esc(x.short)}</small></td>`;
      };
      rows += `<tr><th>${a} → ${b}</th>${cell('tcp')}${cell('icmp')}</tr>`;
    }));
    $('#asa-matrix').innerHTML = `<table class="mini matrix"><tr><th>With the settings above</th><th>Web (TCP 80)</th><th>Ping (ICMP)</th></tr>${rows}</table>`;
    $('#asa-cfg').textContent = asaConfig(st);
  }

  /* =====================================================================
     3. AAA login simulator (authentication → authorization → accounting)
     ===================================================================== */
  const UNAME = { tac: 'tacuser', tacbad: 'tacuser', rad: 'raduser', loc: 'ADMIN' };
  const LISTS = {
    'tr-l': ['tacacs+', 'radius', 'local'], 't-l': ['tacacs+', 'local'], t: ['tacacs+'], l: ['local']
  };
  const listText = (k) => LISTS[k].map((m) => (m === 'local' ? 'local' : 'group ' + m)).join(' ');
  function aaaEval(st) {
    const steps = [];
    let by = null, failed = false;
    const u = UNAME[st.user];
    for (const m of LISTS[st.list]) {
      if (m === 'tacacs+') {
        if (st.tac !== 'up') {
          steps.push({ k: 'err', t: st.tac === 'down' ? 'TACACS+ (192.168.1.11, TCP 49) does not answer → <b>ERROR</b> → try the next method.' : 'TACACS.net is still listening on <b>127.0.0.1:49</b> (tacplus.xml not edited), so the switch can’t connect → <b>ERROR</b> → try the next method.' });
          continue;
        }
        if (st.user === 'tac') { steps.push({ k: 'pass', t: 'TACACS+ checks tacuser’s password → <b>PASS</b>.' }); by = 'tacacs+'; break; }
        steps.push({ k: 'fail', t: (st.user === 'tacbad' ? 'TACACS+ knows tacuser, but the password is wrong' : `TACACS+ has no user “${u}”`) + ' → <b>FAIL</b>. A FAIL ends the list: the next methods are NOT tried.' });
        failed = true; break;
      }
      if (m === 'radius') {
        if (st.rad !== 'up') {
          steps.push({ k: 'err', t: st.rad === 'down' ? 'RADIUS (192.168.1.12, UDP 1812) does not answer → <b>ERROR</b> → try the next method.' : 'The switch is not in FreeRADIUS <code>clients.conf</code>, so the request is silently ignored (“Ignoring request … from unknown client”). The switch times out → <b>ERROR</b> → try the next method.' });
          continue;
        }
        if (st.user === 'rad') { steps.push({ k: 'pass', t: 'RADIUS answers <b>Access-Accept</b> → PASS.' }); by = 'radius'; break; }
        steps.push({ k: 'fail', t: `RADIUS answers <b>Access-Reject</b> (${st.user === 'tacbad' || st.user === 'tac' ? 'it has no user tacuser' : 'it has no user ' + u}) → FAIL → stop.` });
        failed = true; break;
      }
      if (m === 'local') {
        if (st.user === 'loc') { steps.push({ k: 'pass', t: 'Local database: username ADMIN and its secret match → <b>PASS</b>.' }); by = 'local'; break; }
        steps.push({ k: 'fail', t: `The local database has no user “${u}” → <b>FAIL</b>.` });
        failed = true; break;
      }
    }
    if (!by && !failed) steps.push({ k: 'fail', t: 'Every method returned ERROR and the list has nothing left → <b>login fails</b>. Nobody can log in, and the default list covers the console too, so you are locked out.' });
    const res = { ok: !!by, by, steps };
    if (by) {
      if (!st.authz) res.priv = 'Lands at <b>privilege level 1</b> (user EXEC, <code>Switch&gt;</code>). Without <code>aaa authorization exec</code> the privilege level / view from the AAA server (or the local username) is not applied.';
      else if (by === 'tacacs+') res.priv = 'Exec authorization asks TACACS+ (separate REQUEST/RESPONSE) → authorization.xml gives <b>privilege level 10</b>.';
      else if (by === 'radius') res.priv = 'Exec authorization: TACACS+ is unreachable (ERROR) → RADIUS. Its Access-Accept carried <code>cisco-avpair = "shell:priv-lvl=5"</code> → <b>privilege level 5</b>.';
      else res.priv = 'Exec authorization follows the same list and ends at <b>local</b> (any servers before it are unreachable or not listed) → <code>username ADMIN privilege 15</code> → <b>privilege level 15</b>.';
      res.exec = st.tac === 'up' ? 'Exec Start/Stop records go to the <b>TACACS+</b> server (C:\\ProgramData\\TACACS.net\\Logs).'
        : st.rad === 'up' ? 'TACACS+ unreachable → exec Start/Stop records go to the <b>RADIUS</b> server (/var/log/freeradius).'
          : 'Both servers unreachable → the exec session is <b>not recorded anywhere</b>.';
      res.cmd = st.tac === 'up' ? 'Level-15 commands (e.g. show running-config) are recorded on the TACACS+ server.'
        : 'Level-15 commands are <b>NOT recorded</b>: command accounting only uses TACACS+, and RADIUS cannot do command accounting.';
    }
    return res;
  }
  function aaaTool() {
    if (!$('#tool-aaa')) return;
    const st = { list: $('#aaa-list').value, tac: $('#aaa-tac').value, rad: $('#aaa-rad').value, user: $('#aaa-user').value, authz: $('#aaa-authz').checked };
    const r = aaaEval(st);
    let html = `<p class="verdict ${r.ok ? 'ok' : 'ko'}">${r.ok ? '✔ Login succeeds (via ' + (r.by === 'local' ? 'local database' : r.by.toUpperCase()) + ')' : '✘ Login rejected'}</p><ol class="steps">`;
    html += r.steps.map((s) => `<li class="${s.k === 'pass' ? 'ok' : s.k === 'err' ? 'warn' : 'ko'}">${s.t}</li>`).join('') + '</ol>';
    if (r.ok) {
      html += `<p><b>Authorization:</b> ${r.priv}</p><p><b>Exec accounting:</b> ${r.exec}</p><p><b>Command accounting:</b> ${r.cmd}</p>`;
    }
    $('#aaa-out').innerHTML = html;
    const cfg = ['aaa new-model', 'tacacs server TACACSVR', ' address ipv4 192.168.1.11', ' key TACACS-pa55w0rd',
      'radius server RADIUSVR', ' address ipv4 192.168.1.12 auth-port 1812 acct-port 1813', ' key RADIUS-pa55w0rd',
      'username ADMIN privilege 15 secret Str0ngPa55w0rd',
      'aaa authentication login default ' + listText(st.list)];
    if (st.authz) cfg.push('aaa authorization exec default ' + listText(st.list));
    cfg.push('aaa accounting exec default start-stop group tacacs+ group radius', 'aaa accounting commands 15 default stop-only group tacacs+');
    $('#aaa-cfg').textContent = cfg.join('\n');
  }

  /* =====================================================================
     4. Syslog trap-level filter
     ===================================================================== */
  const LV_NAMES = ['emergencies', 'alerts', 'critical', 'errors', 'warnings', 'notifications', 'informational', 'debugging'];
  const MSGS = [
    [1, '%SEC_LOGIN-1-QUIET_MODE_ON: Still timeleft for watching failures is 158 secs, [user: admin] [Source: 203.0.113.5] …', false],
    [3, '%LINK-3-UPDOWN: Interface Loopback0, changed state to up', true],
    [4, '%SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: admin] [Source: 203.0.113.5] [localport: 22] …', false],
    [5, '%LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback0, changed state to up', true],
    [5, '%LINK-5-CHANGED: Interface Loopback0, changed state to administratively down', true],
    [5, '%LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback0, changed state to down', true],
    [5, '%SYS-5-CONFIG_I: Configured from console by admin on vty0 (192.168.1.3)', false],
    [5, '%OSPF-5-ADJCHG: Process 1, Nbr 10.1.1.1 on GigabitEthernet0/0/1 from FULL to DOWN, Neighbor Down: Dead timer expired', false],
    [6, '%SEC-6-IPACCESSLOGP: list 100 permitted tcp 192.168.10.3(51544) -> 10.2.2.1(22), 1 packet', false],
    [6, '%SYS-6-CLOCKUPDATE: System clock has been updated from 12:30:54 UTC … configured from console', false],
    [7, '(debug output, e.g. from debug ip packet: “IP: s=10.1.1.1 (local), d=10.1.1.2 …”)', false]
  ];
  let sysLevel = 4;
  function sysTool() {
    if (!$('#tool-sys')) return;
    $$('#tool-sys .lvl-btn').forEach((b) => b.classList.toggle('on', Number(b.dataset.l) === sysLevel));
    let sent = 0, labSent = 0;
    const rows = MSGS.map(([lv, msg, lab]) => {
      const ok = lv <= sysLevel;
      if (ok) sent++;
      if (ok && lab) labSent++;
      return `<tr class="${ok ? 'ok' : 'ko'}"><td>${ok ? OK : NO}</td><td class="sev">${lv}</td><td><code>${esc(msg)}</code>${lab ? ' <span class="pill">lab loopback</span>' : ''}</td></tr>`;
    }).join('');
    $('#sys-out').innerHTML = `<p class="verdict ok">logging trap ${sysLevel} (${LV_NAMES[sysLevel]}) → the server receives levels 0–${sysLevel}: <b>${sent} of ${MSGS.length}</b> messages below.</p>
      <p class="note">Lab check (create + delete Loopback0 = the 4 “lab loopback” messages): <b>${labSent}</b> of 4 reach the syslog server.</p>
      <table class="mini syslog"><tr><th></th><th>Sev</th><th>Message</th></tr>${rows}</table>`;
  }

  /* =====================================================================
     5. NTP offset / delay calculator
     ===================================================================== */
  function t2s(s) {
    const m = String(s).trim().match(/^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  function fmtSec(x) {
    const r = Math.round(x * 1e6) / 1e6;
    const a = Math.abs(r), sign = r < 0 ? '−' : r > 0 ? '+' : '';
    if (a >= 60) {
      const h = Math.floor(a / 3600), mi = Math.floor((a % 3600) / 60), se = Math.round((a % 60) * 1000) / 1000;
      return `${sign}${h ? h + ' h ' : ''}${mi ? mi + ' min ' : ''}${se ? se + ' s' : ''}`.trim() + ` (${sign}${a} s)`;
    }
    if (a < 1 && a > 0) return `${sign}${Math.round(a * 1e6) / 1e3} ms`;
    return `${sign}${a} s`;
  }
  function ntpTool() {
    if (!$('#tool-ntp')) return;
    const T = [1, 2, 3, 4].map((i) => t2s($('#ntp-t' + i).value));
    const out = $('#ntp-out');
    if (T.some((x) => x === null)) { out.innerHTML = '<p class="warnline">Use hh:mm:ss or hh:mm:ss.fff for all four timestamps.</p>'; return; }
    const [t1, t2, t3, t4] = T;
    const theta = ((t2 - t1) + (t3 - t4)) / 2;
    const delta = (t4 - t1) - (t3 - t2);
    const r6 = (x) => Math.round(x * 1e6) / 1e6;
    out.innerHTML = `<table class="mini">
      <tr><th>Offset θ = [(T2 − T1) + (T3 − T4)] / 2</th><td>[(${r6(t2 - t1)}) + (${r6(t3 - t4)})] / 2 = <b>${fmtSec(theta)}</b></td></tr>
      <tr><th>Delay δ = (T4 − T1) − (T3 − T2)</th><td>(${r6(t4 - t1)}) − (${r6(t3 - t2)}) = <b>${fmtSec(delta).replace(/^\+/, '')}</b></td></tr></table>
      <p class="verdict ${delta >= 0 ? 'ok' : 'ko'}">${theta > 0 ? 'θ is positive → the client clock is BEHIND the server by ' + fmtSec(theta).replace(/^\+/, '') + ', so it moves forward.' : theta < 0 ? 'θ is negative → the client clock is AHEAD of the server by ' + fmtSec(-theta).replace(/^\+/, '') + ', so it moves back.' : 'θ = 0 → the clocks already agree.'}</p>
      ${delta < 0 ? '<p class="warnline">A negative delay means the timestamps are inconsistent — check T1–T4.</p>' : ''}`;
  }

  /* =====================================================================
     6. NetFlow flow counter
     ===================================================================== */
  const KEYS = [['srcip', 'Source IP'], ['dstip', 'Destination IP'], ['sport', 'Source port'], ['dport', 'Destination port'], ['proto', 'Protocol'], ['tos', 'ToS'], ['inif', 'Input interface']];
  const STREAMS = [
    { d: 'PC2 pings 10.0.0.1 (100 echo requests)', srcip: '192.168.1.75', dstip: '10.0.0.1', sport: 0, dport: 2048, proto: 1, pk: 100, on: true },
    { d: 'PC1 pings 10.0.0.1 (50 echo requests)', srcip: '192.168.1.50', dstip: '10.0.0.1', sport: 0, dport: 2048, proto: 1, pk: 50, on: true },
    { d: 'A1 opens one Telnet session to 10.0.0.1', srcip: '192.168.1.3', dstip: '10.0.0.1', sport: 51000, dport: 23, proto: 6, pk: 40, on: true },
    { d: 'PC1 HTTP connection #1 to 10.0.0.1', srcip: '192.168.1.50', dstip: '10.0.0.1', sport: 50001, dport: 80, proto: 6, pk: 12, on: true },
    { d: 'PC1 HTTP connection #2 to 10.0.0.1', srcip: '192.168.1.50', dstip: '10.0.0.1', sport: 50002, dport: 80, proto: 6, pk: 12, on: true },
    { d: 'PC1 HTTP connection #3 to 10.0.0.1', srcip: '192.168.1.50', dstip: '10.0.0.1', sport: 50003, dport: 80, proto: 6, pk: 12, on: true },
    { d: 'D1 NTP request to R1 (D1 is an NTP client in the lab)', srcip: '192.168.1.2', dstip: '192.168.1.1', sport: 123, dport: 123, proto: 17, pk: 4, on: false },
    { d: 'A1 NTP request to R1 (A1 is an NTP client in the lab)', srcip: '192.168.1.3', dstip: '192.168.1.1', sport: 123, dport: 123, proto: 17, pk: 4, on: false }
  ].map((s) => Object.assign({ tos: '0x00', inif: 'Gi0/0/1' }, s));
  function nfTool() {
    if (!$('#tool-nf')) return;
    const keys = KEYS.filter(([k]) => $(`#nf-k-${k}`).checked);
    const active = STREAMS.filter((s, i) => $(`#nf-s-${i}`).checked);
    const groups = new Map();
    active.forEach((s) => {
      const id = keys.map(([k]) => s[k]).join('|');
      if (!groups.has(id)) groups.set(id, { s, pk: 0, n: 0 });
      const g = groups.get(id); g.pk += s.pk; g.n++;
    });
    const head = keys.map(([, l]) => `<th>${l}</th>`).join('');
    const rows = [...groups.values()].map((g) => `<tr>${keys.map(([k]) => `<td>${esc(g.s[k])}</td>`).join('')}<td>${g.pk}</td><td>${g.n > 1 ? '<span class="pill">' + g.n + ' streams merged</span>' : ''}</td></tr>`).join('');
    $('#nf-out').innerHTML = `<p class="verdict ok">${keys.length ? `<b>${groups.size}</b> flow${groups.size === 1 ? '' : 's'} in the input cache` : 'Pick at least one key field.'}</p>
      ${keys.length && active.length ? `<div class="scroll"><table class="mini"><tr>${head}<th>Packets</th><th></th></tr>${rows}</table></div>` : ''}
      <p class="note">ICMP echo shows “destination port” 2048 = type 8 × 256 + code 0. Echo-replies (type 0) leave R1 on G0/0/1 and are only seen by an <b>output</b> monitor, as separate flows.</p>`;
  }
  function nfPreset(which) {
    const set = which === 'dst' ? ['dstip', 'dport'] : KEYS.map(([k]) => k);
    KEYS.forEach(([k]) => { $(`#nf-k-${k}`).checked = set.includes(k); });
    nfTool();
  }

  /* ---------- wiring ---------- */
  function wire(boxId, fn) {
    const box = $('#' + boxId);
    if (!box) return;
    box.addEventListener('input', fn);
    box.addEventListener('change', fn);
    fn();
  }
  wire('tool-wc', wcTool);
  wire('tool-pf', prefixTool);
  wire('tool-asa', asaTool);
  wire('tool-aaa', aaaTool);
  wire('tool-ntp', ntpTool);
  wire('tool-nf', nfTool);
  if ($('#tool-sys')) {
    $('#tool-sys').addEventListener('click', (e) => {
      const b = e.target.closest('.lvl-btn');
      if (b) { sysLevel = Number(b.dataset.l); sysTool(); }
    });
    sysTool();
  }
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-ntp]');
    if (p) {
      const v = p.dataset.ntp.split('|');
      [1, 2, 3, 4].forEach((i) => { $('#ntp-t' + i).value = v[i - 1]; });
      ntpTool();
    }
    const n = e.target.closest('[data-nfpreset]');
    if (n) nfPreset(n.dataset.nfpreset);
    const a = e.target.closest('[data-asapreset]');
    if (a) {
      const p2 = JSON.parse(a.dataset.asapreset);
      ['dmz0', 'inspect', 'outweb', 'outicmp', 'inweb', 'dmzacl'].forEach((k) => { $('#asa-' + k).checked = !!p2[k]; });
      asaTool();
    }
  });

  // expose evaluators for automated checks
  window.LearnTools = { asaEval, aaaEval, ip2int, int2ip };
})();
