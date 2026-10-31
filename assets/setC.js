/* Set C — 50 scenario questions (Topic 2 & 3) */
(function () {
  const S = (window.QSETS = window.QSETS || {});
  const tag = (x, y, t, color) => ({ x, y, t, color });

  S.C = {
    title: 'Lab-scenario mix',
    desc: 'ACL direction & OSPF side effects, Bob/Larry extended ACL, ASA ACL syntax & statefulness, TCP Intercept, Slowloris maths, jump-host workflow, password & login hardening, accounting logs, NTP timestamps, NetFlow security use.',
    questions: [
      /* ============================ ACL ============================ */
      {
        topic: 'ACL', type: 'mcq',
        q: `<p>A student enters the following on R1:</p>
${cli(`R1(config)# interface g0/0/0
R1(config-if)# ip access-group 10 in
R1(config-if)# ip access-group 20 in
R1(config-if)# ip access-group 110 out`)}
<p>Which ACLs are now active on G0/0/0?</p>`,
        o: ['ACL 10 and ACL 20 both inbound, processed in that order, plus ACL 110 outbound.',
          'Only ACL 20 inbound (it replaced ACL 10) and ACL 110 outbound.',
          'Only ACL 10 inbound, because the second inbound command is rejected; plus ACL 110 outbound.',
          'ACL 10 and ACL 20 are merged into one inbound ACL; plus ACL 110 outbound.'],
        a: [1],
        x: `<p>ACL guidelines: <b>one ACL per interface, per direction, per protocol</b>. Applying another inbound ACL simply <b>replaces</b> the previous one. To filter both directions you need two ACLs, one <code>in</code> and one <code>out</code>, as done here with ACL 110.</p>`
      },
      {
        topic: 'ACL', type: 'multi',
        dg: D.bobLarry({ extra: { tags: [tag(222, 92, 'G0/0: ACL 101 in')] } }),
        q: `<p>Based on the example in the ACL notes, Server 1 and Server 2 host both web and TFTP servers. Policy: Bob may use the web servers but not TFTP, and Larry must not access the web server on Server 1. The engineer configures:</p>
${cli(`R1(config)# access-list 101 deny udp host 10.1.1.10 10.2.2.0 0.0.0.255 eq tftp
R1(config)# access-list 101 deny tcp host 10.1.1.20 host 10.2.2.10 eq www
R1(config)# access-list 101 permit ip any any
R1(config)# interface g0/0
R1(config-if)# ip access-group 101 in`)}
<p>Which statements are true?</p>`,
        o: ['Bob can browse the website on Server 1.',
          'Bob can download a file from Server 2 using TFTP.',
          'Larry can browse the website on Server 2.',
          'TFTP uses TCP port 69.',
          'Without the final <code>permit ip any any</code>, all other traffic, such as Larry’s pings to the servers, would be dropped.'],
        a: [0, 2, 4],
        x: `<ul><li>A ✔: Bob’s HTTP doesn’t match the first two ACEs, so it is permitted by the third.</li>
<li>B ✘: entry 1 denies Bob’s TFTP (<b>UDP 69</b>) to the whole 10.2.2.0/24 (D ✘).</li>
<li>C ✔: Larry is only denied <code>www</code> to <i>host 10.2.2.10</i>.</li>
<li>E ✔: the final permit is needed because of the implicit <code>deny any</code> (notes p.18).</li></ul>
<p>The ACL is <b>extended</b>, so it is placed <b>near the source</b> (G0/0 in), so denied packets don’t waste bandwidth crossing the network.</p>`
      },
      {
        topic: 'ACL', type: 'mcq',
        q: `<p>In Lab 2.1a Part 4, management wants the 209.165.200.224/27 network (R1’s Lo0) to have access. Which ACE matches <b>exactly</b> the addresses of that network?</p>`,
        o: ['<code>permit 209.165.200.224 0.0.0.31</code>',
          '<code>permit 209.165.200.224 0.0.0.32</code>',
          '<code>permit 209.165.200.224 255.255.255.224</code>',
          '<code>permit 209.165.200.225 0.0.0.30</code>'],
        a: [0],
        x: `<p>Wildcard = 255.255.255.255 − subnet mask = 255.255.255.255 − 255.255.255.224 = <b>0.0.0.31</b>, covering .224–.255.</p>
<ul><li>0.0.0.32 ignores only one bit (value 32), so it matches just two addresses, .192 and .224.</li>
<li>Giving a subnet mask as a wildcard is a common error.</li>
<li>0.0.0.30 with .225 forces the last bit to be 1, so it matches only odd addresses.</li></ul>`
      },
      {
        topic: 'ACL', type: 'multi',
        dg: D.aclLab({ lo1: true, extra: { tags: [tag(95, 216, 'VLAN1: ACL 100 in'), tag(545, 216, 'VLAN1: WEB-POLICY in')] } }),
        q: `<p>After Lab 2.1b Part 4, the ACLs on DSW1 and DSW2 are:</p>
${out(`DSW1# show access-lists
Extended IP access list 100
    10 permit tcp host 192.168.10.3 host 10.2.2.1 eq 22 log
    20 permit tcp 192.168.10.0 0.0.0.255 any eq 443 log
    30 permit ip 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255

DSW2# show access-lists
Extended IP access list WEB-POLICY
    10 permit tcp 192.168.20.0 0.0.0.255 host 10.1.1.1 eq 443
    20 permit tcp 192.168.20.0 0.0.0.255 209.165.200.224 0.0.0.31 eq 443
    30 permit ip 192.168.20.0 0.0.0.255 192.168.10.0 0.0.0.255`)}
<p>Which of the following succeed?</p>`,
        o: ['PC-A pings PC-B.', 'PC-B pings PC-A.', 'PC-A pings R1’s Lo0 (209.165.200.225).', 'PC-B opens https://209.165.201.1 (R1 Lo1).', 'PC-A opens https://209.165.201.1 (R1 Lo1).'],
        a: [0, 1, 4],
        x: `<ul><li>A ✔ and B ✔: each entry 30 permits all IP between the two LANs. Requests and replies each enter through the ACL on the sender’s side and are permitted.</li>
<li>C ✘: ICMP from PC-A to 209.165.200.225 matches nothing in ACL 100, so the implicit deny drops it.</li>
<li>D ✘: WEB-POLICY only allows HTTPS from PC-B to 10.1.1.1 and to 209.165.200.224/27. Lo1 (209.165.201.1) isn’t included (lab step 4: “it should fail”).</li>
<li>E ✔: ACL 100 entry 20 allows HTTPS to <i>any</i>.</li></ul>`
      },
      {
        topic: 'ACL', type: 'mcq',
        q: `<p>DSW1 has ACL 100 (with <code>log</code> on its entries) applied, plus <code>logging host 172.16.2.3</code> and <code>logging trap warnings</code>. When PC-A SSHes to DSW2, the console shows:</p>
${out(`*Oct 30 10:02:11.004: %SEC-6-IPACCESSLOGP: list 100 permitted tcp 192.168.10.3(51544) -> 10.2.2.1(22), 1 packet`)}
<p>The syslog server, however, never receives any ACL log messages. Why?</p>`,
        o: ['ACL log messages have severity 6 (informational). <code>logging trap warnings</code> only sends severities 0–4.',
          'ACL log messages are only ever stored in the local buffer.',
          'Security-related messages must be sent over TCP 6514.',
          'The <code>log</code> keyword only produces messages for deny entries.'],
        a: [0],
        x: `<p>The severity is the digit after the facility: <code>%SEC-<b>6</b>-IPACCESSLOGP</code>. With trap level 4, only levels ≤ 4 are sent.</p>
<p>Use <code>logging trap informational</code> (6) to forward them. <code>log</code> works on both permit and deny ACEs. The leading * also tells you the clock isn’t NTP-synchronised.</p>`
      },
      {
        topic: 'ACL', type: 'mcq',
        dg: D.aclLab({ extra: { tags: [tag(228, 46, 'G0/0/1: ACL 1 in')] } }),
        q: `<p>The topology uses OSPF area 0 on R1, DSW1 and DSW2 (as in Lab 2.1b), and everything can ping everything. Intending to let only PC-A’s LAN into R1 from DSW1, a student enters:</p>
${cli(`R1(config)# access-list 1 permit 192.168.10.0 0.0.0.255
R1(config)# interface g0/0/1
R1(config-if)# ip access-group 1 in`)}
<p>What will be observed about a minute later?</p>`,
        o: ['Only traffic from 192.168.10.0/24 enters R1 on G0/0/1; nothing else changes.',
          'OSPF hellos from DSW1 (source 10.1.1.1) are denied. The R1–DSW1 adjacency goes down after the dead interval and R1 loses its routes to DSW1’s networks, so even PC-A can no longer reach PC-B.',
          'OSPF hellos are multicast, so ACLs never filter them, and routing is unaffected.',
          'The ACL only affects packets addressed to R1 itself, so transit traffic from PC-A is unaffected.'],
        a: [1],
        x: `<p>An <b>inbound</b> ACL filters <i>every</i> packet arriving on the interface, including control-plane traffic addressed to the router such as OSPF hellos to 224.0.0.5. The hellos are sourced from 10.1.1.1, which isn’t permitted, so after the dead interval (40 s by default) the neighbour is lost.</p>
<p>R1 then has no route back to 192.168.10.0/24, so PC-A’s traffic breaks too. The fix is to add <code>permit 10.1.1.0 0.0.0.3</code> (or similar), or to use an extended ACL near the source.</p>`
      },
      {
        topic: 'ACL', type: 'multi',
        q: `<p>R1’s clock is synchronised by NTP and its timezone is set correctly. The following is applied to traffic heading toward the server 192.168.1.10:</p>
${cli(`R1(config)# time-range OFFICE
R1(config-time-range)# periodic weekdays 8:00 to 18:00
R1(config)# ip access-list extended WEB-ACCESS
R1(config-ext-nacl)# 10 permit tcp any host 192.168.1.10 eq 443 time-range OFFICE
R1(config-ext-nacl)# 20 deny tcp any host 192.168.1.10 eq 443
R1(config-ext-nacl)# 30 permit ip any any`)}
<p>Which statements are true?</p>`,
        o: ['On Saturday at 10:00, HTTPS to the server is denied.',
          'On Wednesday at 17:59, HTTPS to the server is permitted.',
          'On Wednesday at 18:30, HTTPS to the server is permitted by entry 30.',
          'On Saturday, pings to the server are permitted.',
          'The time-range is evaluated against the clock of the client PC that sends the traffic.'],
        a: [0, 1, 3],
        x: `<p>Outside the time-range, entry 10 is inactive and is skipped. HTTPS then matches entry <b>20 (deny)</b> before it can reach entry 30 (A ✔, C ✘). Inside office hours, entry 10 permits it (B ✔). ICMP doesn’t match 10 or 20, so entry 30 permits it (D ✔).</p>
<p>Time-ranges use the <b>router’s</b> clock, which is why NTP matters (E ✘).</p>`
      },

      /* ============================ ASA ============================ */
      {
        topic: 'ASA', type: 'mcq',
        dg: D.asaLab(),
        q: `<p>With a default Firepower/ASA configuration (interfaces configured as shown, no ACLs, NAT removed), Inside User 1 cannot ping the Internet Web Server, although it can browse it. What is the reason?</p>`,
        o: ['The firewall blocks all ICMP echo requests from the inside interface.',
          'The echo request is allowed out, but ICMP is not inspected by default, so no state is created. The returning echo-reply (outside 0 → inside 100) is dropped.',
          'An outside interface with security level 0 cannot receive any ICMP.',
          'The pre-configured NAT drops ICMP.'],
        a: [1],
        x: `<p>TCP and UDP are stateful by default, so browsing works. ICMP is <b>not</b> inspected by default (Lab 2.2 Part 4.1: “Firepower/ASA will deny ICMP ping packets by default”).</p>
<p>The reply arrives on a lower security interface with no matching state, so it is dropped. Fix it with <code>inspect icmp</code> in <code>class inspection_default</code>, or with an outside ACL permitting echo-reply.</p>`
      },
      {
        topic: 'ASA', type: 'multi',
        dg: D.asaLab(),
        q: `<p>Which of the following, each on its own, would allow inside users to successfully ping hosts on the Internet?</p>`,
        o: ['Adding <code>inspect icmp</code> under <code>class inspection_default</code> in <code>policy-map global_policy</code>',
          'Applying an inbound ACL on outside that permits <code>icmp any any echo-reply</code>',
          'Applying an inbound ACL on inside that permits <code>icmp any any echo</code>',
          'Entering <code>same-security-traffic permit inter-interface</code>',
          'Entering <code>icmp permit any outside</code>'],
        a: [0, 1],
        x: `<ul><li>A ✔: makes ICMP stateful, so replies are allowed back.</li>
<li>B ✔: permits the replies statelessly on the interface where they enter.</li>
<li>C ✘: the echo was never the problem; the reply is.</li>
<li>D ✘: inside (100) and outside (0) have different levels, so this is irrelevant.</li>
<li>E ✘: <code>icmp permit</code> controls ICMP <i>to the firewall’s own interface</i>, not through it.</li></ul>`
      },
      {
        topic: 'ASA', type: 'mcq',
        dg: D.asaLab(),
        q: `<p>Which configuration correctly allows Internet users to browse <b>only</b> the DMZ web server 192.168.2.100?</p>`,
        o: ['<code>access-list OUT extended permit tcp any host 192.168.2.100 eq www</code><br><code>access-group OUT in interface outside</code>',
          '<code>access-list OUT extended permit tcp any host 192.168.2.100 eq www</code><br><code>access-group OUT out interface outside</code>',
          '<code>access-list OUT extended permit tcp host 192.168.2.100 eq www any</code><br><code>access-group OUT in interface outside</code>',
          '<code>access-list OUT extended permit tcp any host 192.168.2.100 eq www</code><br><code>interface ethernet1/1</code><br><code>ip access-group OUT in</code>'],
        a: [0],
        x: `<p>On the ASA, the ACL is bound with the global command <code>access-group NAME in interface IFNAME</code>, not with IOS-style <code>ip access-group</code> under the interface. It must be inbound on the interface where the traffic enters: <b>outside</b>.</p>
<p>The third option reverses source and destination, which matches traffic <i>from</i> the server’s port 80. Remember that ASA ACLs use subnet masks (e.g. <code>192.168.2.0 255.255.255.0</code>).</p>`
      },
      {
        topic: 'ASA', type: 'mcq',
        dg: D.asaLab({ extra: { tags: [tag(420, 100, 'OUT in: www → .100 only', '#8e44ad')] } }),
        q: `<p>The outside interface has an inbound ACL that only permits <code>tcp any host 192.168.2.100 eq www</code>. Inside User 2 opens https://45.10.20.30 (the Internet Web Server). Does it work?</p>`,
        o: ['Yes. The return traffic matches the connection entry created when Inside User 2 opened the connection, so the outside ACL is not consulted for it.',
          'No, because the outside ACL does not permit TCP from 45.10.20.30 port 443.',
          'Yes, but only because HTTPS is in the default inspection list.',
          'No. Once an ACL is applied on outside, inside users can no longer start connections.'],
        a: [0],
        x: `<p>The firewall is <b>stateful</b>. Inside (100) → outside (0) is allowed and recorded in the connection table (<code>show conn</code>). Packets belonging to that connection are passed without checking the interface ACL, which only applies to <i>new</i> connections entering outside.</p>`
      },
      {
        topic: 'ASA', type: 'multi',
        q: `<p>Which statements about the Modular Policy Framework (MPF) on Firepower/ASA are correct?</p>`,
        o: ['A <b>class-map</b> identifies traffic, e.g. with <code>match access-list</code>.',
          'A <b>policy-map</b> defines the actions (e.g. <code>inspect</code>, <code>set connection</code>) for each class.',
          'A <b>service-policy</b> activates a policy-map on an interface or globally.',
          'A policy-map takes effect as soon as it is created, even without a service-policy.',
          '<code>class inspection_default</code> matches all traffic passing through the firewall.'],
        a: [0, 1, 2],
        x: `<p>The structure is class-map (what) → policy-map (do what) → service-policy (where). Without a service-policy the policy-map does nothing.</p>
<p><code>inspection_default</code> matches <i>default-inspection-traffic</i>, i.e. the well-known ports of the inspected protocols, not everything. The defaults are applied with <code>service-policy global_policy global</code>.</p>`
      },
      {
        topic: 'ASA', type: 'mcq',
        q: `<p>Lab 2.2 says that before naming E1/5 <code>inside</code>, you must enter <code>int vlan 1</code> → <code>no nameif inside</code>. Why?</p>`,
        o: ['Interface names (nameif) must be unique. The name “inside” is pre-assigned to interface VLAN 1 in the factory configuration, so it must be removed before it can be reused.',
          'VLAN 1 has security level 0, which conflicts with inside.',
          'E1/5 cannot have security level 100 while VLAN 1 exists.',
          'nameif can only be configured on VLAN interfaces.'],
        a: [0],
        x: `<p>Every firewall interface needs a unique logical name, which ACLs (<code>access-group … interface inside</code>), service-policies and NAT refer to. The Firepower 1010 factory configuration already uses <i>inside</i> on VLAN 1, so it is freed first.</p>
<p>The factory dynamic NAT on outside is also removed (<code>object network obj_any</code> → <code>no nat (any,outside) dynamic interface</code>).</p>`
      },

      /* ============================ SYN flood ============================ */
      {
        topic: 'SYN', type: 'mcq',
        q: `<p>In Lab 2.5 the student uses this command on the web server:</p>
${cli(`kali@kali:~$ ss -t -r state syn-recv | wc -l`)}
<p>What does it measure?</p>`,
        o: ['The number of established TCP connections',
          'The number of SYN packets the attacker has sent',
          'The number of TCP connections in the SYN-RECV state, i.e. half-open or embryonic connections',
          'The number of connections in TIME-WAIT'],
        a: [2],
        x: `<p><code>ss -t</code> lists TCP sockets, <code>-r</code> resolves names, <code>state syn-recv</code> filters for half-open connections (SYN received, SYN-ACK sent, waiting for the ACK), and <code>wc -l</code> counts the lines.</p>
<p>During the undefended attack the count climbs to the default maximum of 512. With the MPF embryonic limit in place, it should stay low.</p>`
      },
      {
        topic: 'SYN', type: 'multi',
        dg: NetDiag.seq({
          w: 620, h: 220,
          actors: [{ id: 'C', name: 'Client / Attacker', x: 90, w: 130 }, { id: 'F', name: 'Firepower (TCP Intercept)', x: 320, w: 170 }, { id: 'S', name: 'Web Server', x: 540, w: 110 }],
          msgs: [
            { from: 'C', to: 'F', y: 62, t: 'SYN', color: '#c0392b' },
            { from: 'F', to: 'C', y: 98, t: 'SYN-ACK (on behalf of server)', color: '#1f618d' },
            { from: 'C', to: 'F', y: 134, t: 'ACK (only real clients)', color: '#1e8449' },
            { from: 'F', to: 'S', y: 170, t: 'SYN … handshake to server', color: '#1e8449' }
          ],
          notes: [{ x: 320, y: 205, t: 'Happens once embryonic-conn-max is exceeded', a: 'middle', bold: true }]
        }),
        q: `<p>The diagram shows the firewall’s behaviour after <code>set connection embryonic-conn-max 50</code> is exceeded. Which statements are true?</p>`,
        o: ['The firewall answers new SYNs with a SYN-ACK on behalf of the server.',
          'Only after the client completes the handshake does the firewall open the connection to the server.',
          'Spoofed SYNs that never complete the handshake never reach the server.',
          'The firewall drops all new SYNs, including those from legitimate users, until the embryonic count falls below 50.',
          'The server must have SYN cookies enabled for the firewall’s intercept to work.'],
        a: [0, 1, 2],
        x: `<p>This is <b>TCP Intercept</b>. The firewall proxies the handshake, typically using SYN cookies itself, so the server only sees validated clients.</p>
<p>It does <i>not</i> blindly drop new SYNs; that is how PC-A can still browse during the attack (Lab 2.5 step 2.4). It also needs nothing from the server; the lab deliberately disables the server’s own SYN cookies.</p>`
      },
      {
        topic: 'SYN', type: 'mcq',
        q: `<p>Which sequence of commands correctly limits embryonic connections to the DMZ web server for traffic arriving from the Internet?</p>`,
        o: [`<code>access-list WEB extended permit tcp any host 192.168.2.100 eq www</code><br><code>class-map WEB-C</code> → <code>match access-list WEB</code><br><code>policy-map WEB-P</code> → <code>class WEB-C</code> → <code>set connection embryonic-conn-max 100</code><br><code>service-policy WEB-P interface outside</code>`,
          `<code>access-list WEB extended permit tcp any host 192.168.2.100 eq www</code><br><code>class-map WEB-C</code> → <code>match access-list WEB</code> → <code>set connection embryonic-conn-max 100</code><br><code>service-policy WEB-C interface outside</code>`,
          `<code>access-list WEB extended permit tcp any host 192.168.2.100 eq www</code><br><code>policy-map WEB-P</code> → <code>set connection embryonic-conn-max 100</code><br><code>service-policy WEB-P interface outside</code>`,
          `<code>access-list WEB extended permit tcp any host 192.168.2.100 eq www</code><br><code>class-map WEB-C</code> → <code>match access-list WEB</code><br><code>policy-map WEB-P</code> → <code>class WEB-C</code> → <code>set connection embryonic-conn-max 100</code><br><code>service-policy WEB-P in interface outside</code>`],
        a: [0],
        x: `<p>The MPF template from the notes is: <code>access-list …</code> → <code>class-map NAME</code> / <code>match access-list …</code> → <code>policy-map NAME</code> / <code>class NAME</code> / <code>set connection …</code> → <code>service-policy NAME interface IF</code> (or <code>global</code>).</p>
<p>Actions go under a class inside a policy-map, never in the class-map itself. A service-policy has no <code>in</code>/<code>out</code> keyword, unlike <code>access-group</code>.</p>`
      },
      {
        topic: 'SYN', type: 'multi',
        q: `<p>Which statements about the DoS attacks studied in Topic 2 are correct?</p>`,
        o: ['Smurf and TCP SYN flooding are volumetric DoS/DDoS attacks.',
          'Slowloris is a low-rate DoS/DDoS attack.',
          'Slowloris needs thousands of bots to take down a web server.',
          'An ACL cannot defend against Slowloris, because the web server must stay reachable from the Internet.',
          'TCP SYN flooding exploits incomplete HTTP request headers.'],
        a: [0, 1, 3],
        x: `<p>From the notes: Smurf and SYN flood are volumetric. Slowloris is low-rate, and “a single attacker’s PC is sufficient”. “ACL is also unable to defend against Slowloris attack… ACL is intentionally applied to permit users… to visit” the web server.</p>
<p>SYN flooding abuses the TCP handshake; Slowloris abuses incomplete HTTP headers.</p>`
      },

      /* ============================ Slowloris ============================ */
      {
        topic: 'SLOW', type: 'mcq',
        q: `<p>In Lab 2.6 the attacker runs:</p>
${cli(`kali@kali:~$ slowhttptest -c 1000 -u http://192.168.2.100`)}
<p>What does the <code>-c 1000</code> option specify?</p>`,
        o: ['The number of concurrent connections to open to the target', 'The client IP address to spoof', 'The attack duration in seconds', 'The HTTP status code to expect'],
        a: [0],
        x: `<p>The lab syntax is <code>slowhttptest -c <i>connections</i> -u <i>URL</i></code>. The tool opens that many connections and keeps each one alive with slow, partial headers.</p>
<p>The defence is to cap connections <b>per client</b> on the firewall (<code>set connection per-client-max</code>).</p>`
      },
      {
        topic: 'SLOW', type: 'multi',
        q: `<p>A student defends the web server with <code>set connection per-client-max 20</code> on a class matching HTTP to the server, applied on outside. Which statements are true?</p>`,
        o: ['Each source IP can have at most 20 simultaneous connections through this class.',
          'A DDoS version of Slowloris from 500 bots, each opening 10 connections, would not be stopped by this limit alone.',
          'A legitimate user whose browser opens 6 parallel connections is unaffected.',
          'The limit only counts embryonic (half-open) connections.',
          'The <code>set connection</code> command is configured under the class-map.'],
        a: [0, 1, 2],
        x: `<ul><li>A ✔: per-client-max limits each source IP.</li>
<li>B ✔: 10 connections per bot is below the limit, yet 500 × 10 = 5000 connections can still exhaust the server. You would add <code>conn-max</code> and/or timeouts.</li>
<li>C ✔: 6 is below 20.</li>
<li>D ✘: that describes <code>per-client-embryonic-max</code>.</li>
<li>E ✘: <code>set connection</code> belongs under <code>policy-map</code> → <code>class</code>.</li></ul>`
      },
      {
        topic: 'SLOW', type: 'mcq',
        q: `<p>Why can a single attacker PC bring down an Apache web server with Slowloris, when the same PC sending a normal HTTP request flood usually cannot?</p>`,
        o: ['Each Slowloris connection occupies one of the server’s limited concurrent connection slots for a long time while using very little bandwidth. Once every slot is reserved, new users are refused.',
          'Slowloris saturates the server’s network link with gigabits of traffic.',
          'Slowloris sends malformed packets that crash Apache through a buffer overflow.',
          'Slowloris spoofs the server’s IP address so that replies go elsewhere.'],
        a: [0],
        x: `<p>Slowloris is a resource-exhaustion attack, not a bandwidth one. A server can only serve a finite number of concurrent connections, and HTTP keeps each one reserved until the full request header arrives.</p>
<p>A normal flood completes requests quickly, so the slots are freed again.</p>`
      },

      /* ============================ OOB / VRF / SSH ============================ */
      {
        topic: 'OOB', type: 'mcq',
        dg: D.oob(),
        q: `<p>In the OoB management network shown in the Lab 3.1 notes, which device lets an administrator on the management network reach the <b>console ports</b> of routers, switches and firewalls remotely?</p>`,
        o: ['A KVM over IP switch', 'A serial console server', 'A UPS / power strip', 'A SAN device'],
        a: [1],
        x: `<p>A <b>serial console server</b> connects to the devices’ console ports and exposes them over the management network, which is useful when a device’s IP configuration is broken.</p>
<p>A KVM over IP switch provides keyboard, video and mouse for servers. Server BMC/IPMI ports serve a similar out-of-band role for servers.</p>`
      },
      {
        topic: 'OOB', type: 'multi',
        q: `<p>Which statements about Virtual Routing and Forwarding (VRF) are correct?</p>`,
        o: ['Each VRF keeps its own separate routing table.',
          'Interfaces not assigned to any VRF belong to the global routing table.',
          'By default, traffic is routed between VRFs whenever routes exist.',
          'A management port may be implemented as a management VRF (e.g. <i>Mgmt-vrf</i> on Catalyst switches).',
          '<code>show ip route</code> displays the routes from all VRFs.'],
        a: [0, 1, 3],
        x: `<p>A VRF creates separate routing tables, so traffic in one never mixes with another. Conceptually it logically divides a router into separate routers (A ✔, B ✔, C ✘).</p>
<p>The notes say management ports may be implemented with VRF, hence “management VRF” (D ✔). <code>show ip route</code> only shows the global table; use <code>show ip route vrf NAME</code> for a VRF (E ✘).</p>`
      },
      {
        topic: 'OOB', type: 'mcq',
        q: `<p>Which is the typical, recommended implementation of a jump host according to the Lab 3.1 notes?</p>`,
        o: ['A securely hardened Linux machine running SSH, hosted in the DMZ and permitted to access the OoB management LAN',
          'A Windows PC on the production LAN with RDP open to the Internet',
          'A router on the OoB LAN that port-forwards each device’s SSH port to the Internet',
          'Any VM placed directly on the Internet without a firewall, since SSH already encrypts the traffic'],
        a: [0],
        x: `<p>“A typical implementation is to have a hardened Linux machine configured with SSH hosted at the DMZ which is then permitted to access the OoB management LAN.”</p>
<p>Exposing every device (port forwarding) or leaving the host unhardened defeats the purpose. The jump host is a high-value target and a single point of failure.</p>`
      },
      {
        topic: 'OOB', type: 'multi',
        dg: D.jumpLab({ vrf: 'OOB', vm1: 'ens18 (Internet side)', vm2: 'ens19 (OOB side)' }),
        q: `<p>The student completed Lab 3.1: VRF OOB on G0/1/1, SSH on R1 with <code>login local</code>, <code>transport input ssh</code>, and an access-class (with <code>vrf-also</code>) permitting only the OOB subnet. Which of these outcomes are expected?</p>`,
        o: ['After logging in to the jump server, the engineer can ping R1 G0/1/1.',
          'After logging in to the jump server, the engineer can SSH to R1 through G0/1/1.',
          'From the Laptop, the engineer can SSH directly to R1’s G0/0/0 address.',
          'From the Laptop, the engineer can ping R1 G0/1/1 directly.',
          'The Laptop can ping, and SSH to, the jump server’s first interface.'],
        a: [0, 1, 4],
        x: `<p>This is the jump-host workflow from lab steps 3.4–3.7. The Laptop reaches the jump server through LAN 2 (E ✔). From the jump server, which is directly on the OOB LAN, it can ping and SSH to R1 G0/1/1 (A ✔, B ✔).</p>
<p>Direct SSH from the Laptop is refused by the access-class, because its source is not in the OOB subnet (C ✘, step 3.4). G0/1/1 is not in the global table, so a direct ping fails (D ✘, step 2.2).</p>`
      },
      {
        topic: 'OOB', type: 'mcq',
        q: `<p>After configuring SSH, the administrator wants to see which SSH sessions are <b>currently connected</b> to R1. Which command should be used?</p>`,
        o: ['<code>show ip ssh</code>', '<code>show ssh</code>', '<code>show crypto key mypubkey rsa</code>', '<code>show running-config | include ssh</code>'],
        a: [1],
        x: `<p><code>show ssh</code> lists the active SSH connections (version, encryption, user). <code>show ip ssh</code> shows whether SSH is enabled, its version and settings such as the timeout and authentication retries. Both appear in the notes as SSH verification commands.</p>`
      },
      {
        topic: 'OOB', type: 'mcq',
        q: `<p>A student runs Wireshark between an administrator’s laptop and R1 while the administrator logs in through <b>Telnet</b> with a username and password. What can the student see in the capture?</p>`,
        o: ['The username and password in plain text', 'Only the username; the password is hashed', 'Nothing readable, because Telnet is encrypted with the router’s RSA key', 'Only the password; the username is encrypted'],
        a: [0],
        x: `<p>Telnet sends everything, including the credentials, in clear text. That is why the notes don’t cover Telnet (“insecure”) and the labs use <code>transport input ssh</code>. The RSA key pair is used only by SSH.</p>`
      },

      /* ============================ Supermicro / Proxmox ============================ */
      {
        topic: 'SRV', type: 'mcq',
        q: `<p>After powering on the Supermicro server through the BMC, a student moves the laptop’s cable to the <b>LAN 1</b> port to manage VMs. Which URL opens the Proxmox VE web UI?</p>`,
        o: ['http://10.0.0.1', 'https://10.0.0.10:8006', 'https://10.0.0.1:8006', 'https://10.0.0.10:443'],
        a: [1],
        x: `<p>Proxmox runs on bridge <b>vmbr0</b> (port eno1, LAN 1) at <b>10.0.0.10/24</b>, port <b>8006</b> over HTTPS; log in as root. http(s)://10.0.0.1 is the BMC/IPMI, reached through the dedicated IPMI port. Ignore the self-signed certificate warning (“Proceed to 10.0.0.10”).</p>`
      },
      {
        topic: 'SRV', type: 'mcq',
        q: `<p>A team needs a centralised AAA server running both TACACS+ and RADIUS for their project. Which pre-configured Proxmox VM should they start?</p>`,
        o: ['100 (Webserver), 10.0.0.11', '101 (DNS), 10.0.0.12', '102 (Tacacs), 10.0.0.13', '104 (File Server), 10.0.0.14'],
        a: [2],
        x: `<p>The pre-configured VMs (Appendix C) are: <b>100</b> Apache web server (.11), <b>101</b> Bind9 DNS (.12), <b>102</b> FreeRADIUS + TACACS for AAA (.13), <b>104</b> FTP + SMB file server (.14). All use gateway 10.0.0.254 and DNS 8.8.8.8, and log in as <i>ubuntu</i>.</p>`
      },
      {
        topic: 'SRV', type: 'multi',
        q: `<p>Inside the jump server VM (Ubuntu), the student needs to set IP addresses on both interfaces. Which statements are correct?</p>`,
        o: ['The configuration file is <code>/etc/netplan/50-cloud-init.yaml</code>.',
          'If the file does not exist, it can be generated with <code>sudo netplan generate</code>.',
          'The changes take effect after <code>sudo netplan apply</code>.',
          'In the lab, ens19 is linked to vmbr1, which maps to eno2 (LAN 2).',
          'The VM’s IP addresses are entered in the Proxmox <i>Create: Linux Bridge</i> dialog.'],
        a: [0, 1, 2],
        x: `<p>Appendix A Part 7: edit 50-cloud-init.yaml (e.g. with <code>sudo nano</code>), then run <code>sudo netplan apply</code>.</p>
<p>The mapping is <b>ens18 → vmbr1 → eno2 (LAN 2)</b> and <b>ens19 → vmbr2 → eno5 (LAN 3)</b>. The Linux bridge dialog should <i>not</i> contain IP addresses; those are for the hypervisor itself.</p>`
      },

      /* ============================ AAA Authentication ============================ */
      {
        topic: 'AUTHN', type: 'mcq',
        q: `<p>A switch is protected only with simple line passwords:</p>
${cli(`switch(config)# enable password faith
switch(config)# line vty 0 15
switch(config-line)# password love
switch(config-line)# login`)}
<p>What is the main weakness of this approach compared with <code>login local</code> or AAA?</p>`,
        o: ['Every administrator shares the same password, so there is no per-user accountability. SSH, which needs a username, cannot be used this way.',
          'The passwords are stored as SHA-256 hashes, which are slow to verify.',
          'The <code>login</code> command turns password checking off.',
          'Line passwords only work on the console.'],
        a: [0],
        x: `<p>The notes: “Cisco supports simple password security without username… But, everyone will use the same password!” A better method is a unique local username and password per user (<code>login local</code>), which is <b>required for SSH</b>, or centralised AAA.</p>
<p>These passwords are also stored in clear text unless <code>service password-encryption</code> is used, and that only gives weak type 7.</p>`
      },
      {
        topic: 'AUTHN', type: 'multi',
        q: `<p>Which are benefits of server-based AAA (TACACS+/RADIUS) over local authentication on each device?</p>`,
        o: ['Scalability and manageability: users are configured once, centrally.',
          'Fault tolerance: several AAA servers can be configured for backup.',
          'There is no longer any need for a local fallback account.',
          'Passwords can be changed or revoked centrally without touching every device.',
          'Authentication is always faster than the local database.'],
        a: [0, 1, 3],
        x: `<p>The notes list <b>scalability and manageability</b> and <b>fault tolerance</b>. Central password changes follow from the same idea.</p>
<p>A <b>local</b> fallback is still recommended, “to avoid being locked out if AAA servers are down”. Remote servers add network latency rather than speed.</p>`
      },
      {
        topic: 'AUTHN', type: 'mcq',
        dg: D.aaaLab(),
        q: `<p>SW1 uses <code>aaa authentication login default group tacacs+ group radius local</code>, and both servers are reachable. The user <b>carol</b> exists only on the RADIUS server. carol enters the correct RADIUS password over SSH. What happens?</p>`,
        o: ['carol logs in through RADIUS after TACACS+ fails to find her.',
          'Login fails. TACACS+ answers with a reject (FAIL), and a FAIL does not move on to the next method.',
          'carol logs in through the local database.',
          'The switch asks carol to choose which AAA server to use.'],
        a: [1],
        x: `<p>The next method is tried <b>only on ERROR</b> (server unreachable or no response). TACACS+ is up and returns FAIL for an unknown user, so authentication ends there.</p>
<p>That is why lab 3.2 step 3.13 finds that only TACACS+ credentials work while TACACS+ is up.</p>`
      },
      {
        topic: 'AUTHN', type: 'mcq',
        q: `<p>A new switch at 192.168.1.2 must be allowed to use the TACACS.net server, with the shared secret <i>TACACS-pa55w0rd</i>. Which TACACS.net configuration file should be edited?</p>`,
        o: ['tacplus.xml', 'clients.xml', 'authentication.xml', 'authorization.xml'],
        a: [1],
        x: `<p>TACACS.net files, in <code>C:\\ProgramData\\TACACS.net\\config</code>:</p>
<ul><li><b>tacplus.xml</b>: the server’s listening IP and port (default 127.0.0.1:49)</li>
<li><b>clients.xml</b>: authorized TACACS+ clients (NAS IPs) and their shared secret</li>
<li><b>authentication.xml</b>: users and passwords</li>
<li><b>authorization.xml</b>: privilege levels and views</li></ul>
<p>Restart the service afterwards with <code>sc stop TACACS.net</code> / <code>sc start TACACS.net</code>.</p>`
      },
      {
        topic: 'AUTHN', type: 'multi',
        q: `<p>Which statements about the login-hardening commands in the Lab 3.2 notes are correct?</p>`,
        o: ['<code>show login failures</code> displays the usernames, source IPs and counts of failed logins.',
          '<code>login delay 3</code> adds a delay between successive login attempts.',
          '<code>login block-for</code> blocks login attempts only on the console.',
          '<code>login on-success log</code> generates a syslog message for each successful login.',
          'The ACL in <code>login quiet-mode access-class</code> lists the hosts to block during quiet mode.'],
        a: [0, 1, 3],
        x: `<p><code>login delay</code> and <code>login block-for</code> slow down brute-force attacks. block-for applies to remote logins (Telnet, SSH, HTTP), not only the console (C ✘).</p>
<p>The quiet-mode ACL lists the hosts that are <b>still allowed</b> to log in during quiet mode, so admins aren’t locked out (E ✘). Logging success and failure supports accounting, viewed with <code>show login failures</code>.</p>`
      },

      /* ============================ AAA Authorization ============================ */
      {
        topic: 'AUTHZ', type: 'mcq',
        q: `<p>Why do the notes introduce role-based CLI views as an improvement over privilege levels?</p>`,
        o: ['With privilege levels, commands at lower levels are always available at higher levels. Views let you pick exactly which commands each role gets.',
          'Privilege levels cannot be assigned to users.',
          'Views do not need AAA to be enabled.',
          'Privilege levels only support three levels (0, 1 and 15).'],
        a: [0],
        x: `<p>“Privilege level has the problem that commands at lower level are always available for higher privilege users. Thus a more flexible RBAC using views…”</p>
<p>Views <i>do</i> require <code>aaa new-model</code>. Custom privilege levels 2–14 also exist.</p>`
      },
      {
        topic: 'AUTHZ', type: 'mcq',
        fixed: true,
        dg: D.aaaLab(),
        q: `<p>SW1 is configured with:</p>
${cli(`SW1(config)# username ADMIN privilege 15 secret Str0ngPa55w0rd
SW1(config)# aaa authentication login default group tacacs+ group radius local
SW1(config)# aaa authorization exec default group tacacs+ group radius local`)}
<p>authorization.xml on TACACS.net gives <i>tacuser</i> privilege level 10. The FreeRADIUS users file contains <code>raduser Cleartext-Password := "pw"</code> with <code>cisco-avpair = "shell:priv-lvl=5"</code>. The TACACS+ server is disconnected, and <b>raduser</b> logs in through SSH. What is raduser’s privilege level?</p>`,
        o: ['1', '5', '10', '15'],
        a: [1],
        x: `<p>With TACACS+ unreachable (ERROR), both authentication and exec authorization fall through to <b>RADIUS</b>. RADIUS returns <code>priv-lvl=5</code> in the Access-Accept, so raduser lands at level 5.</p>
<p>If RADIUS were down too, ADMIN (local) would get 15. This is lab 3.3 steps 1.12–1.13.</p>`
      },
      {
        topic: 'AUTHZ', type: 'multi',
        q: `<p>In root view, the administrator verifies the configured views:</p>
${out(`R1# show parser view all
Views/SuperViews Present in System:
 SHOWVIEW
 VERIFYVIEW
 REBOOTVIEW
 USER        *
 SUPPORT     *
 ADMIN       *
-------(*) represent superview-------`)}
<p>Which statements are correct?</p>`,
        o: ['There are 3 CLI views and 3 superviews.',
          'USER is a superview.',
          'REBOOTVIEW can contain commands added with <code>commands exec include</code>.',
          'ADMIN can contain commands added directly with <code>commands exec include</code>.',
          'The root view is one of the views listed.'],
        a: [0, 1, 2],
        x: `<p>Entries marked * are superviews (USER, SUPPORT, ADMIN), which contain <i>views</i> only. The others are CLI views, which contain commands. Root view isn’t listed; <code>show parser view</code> reports “Current view is 'root'”.</p>`
      },
      {
        topic: 'AUTHZ', type: 'mcq',
        q: `<p>Besides the commands explicitly included, which commands are <b>always</b> available to a user in any CLI view?</p>`,
        o: ['<code>enable</code>, <code>exit</code> and <code>show parser</code>', '<code>show running-config</code>, <code>show version</code> and <code>ping</code>', '<code>configure terminal</code>, <code>end</code> and <code>exit</code>', 'None; only the included commands are available'],
        a: [0],
        x: `<p>The notes’ output of <code>?</code> in SHOWVIEW lists <i>enable</i>, <i>exit</i> and <i>show</i>, and <code>show ?</code> includes <i>parser</i>: “By default, enable, exit and show parser commands are always available.”</p>`
      },

      /* ============================ AAA Accounting ============================ */
      {
        topic: 'ACCT', type: 'mcq',
        q: `<p>What does <code>aaa accounting exec default start-stop group tacacs+ group radius</code> record?</p>`,
        o: ['A Start record when a user’s EXEC shell begins (login) and a Stop record when it ends, including the session duration',
          'Every command typed by the user',
          'Only failed login attempts',
          'The number of packets and bytes routed through the device'],
        a: [0],
        x: `<p>EXEC accounting records terminal sessions after login. Start comes at the beginning and Stop at the end, with fields such as <code>elapsed_time</code> and <code>disc-cause</code>.</p>
<p>Individual commands need <code>aaa accounting commands &lt;level&gt;</code>, which is TACACS+ only. Traffic statistics are NetFlow’s job.</p>`
      },
      {
        topic: 'ACCT', type: 'multi',
        q: `<p>An excerpt from the TACACS.net accounting log:</p>
${out(`09:00:00 NAS_IP=192.168.1.2 Port=tty1 rem_addr=192.168.1.3 User=bob Flags=Start task_id=7 service=shell
09:00:20 NAS_IP=192.168.1.2 Port=tty1 rem_addr=192.168.1.3 User=bob Flags=Stop task_id=7 service=shell priv-lvl=15 cmd=show running-config <cr>
09:01:05 NAS_IP=192.168.1.2 Port=tty1 rem_addr=192.168.1.3 User=bob Flags=Stop task_id=7 service=shell priv-lvl=15 cmd=configure terminal <cr>
09:01:35 NAS_IP=192.168.1.2 Port=tty1 rem_addr=192.168.1.3 User=bob Flags=Stop task_id=7 service=shell disc-cause=1 elapsed_time=95`)}
<p>Which statements are correct?</p>`,
        o: ['bob issued two level-15 commands that were recorded.',
          'bob’s EXEC session lasted 95 seconds.',
          'bob logged in from the host 192.168.1.2.',
          'All four records belong to the same session (same task_id).',
          'These records could equally have come from the FreeRADIUS server.'],
        a: [0, 1, 3],
        x: `<ul><li>A ✔: <code>show running-config</code> and <code>configure terminal</code>, both priv-lvl 15.</li>
<li>B ✔: 09:00:00 → 09:01:35 = 95 s, matching elapsed_time.</li>
<li>C ✘: bob’s host is <b>rem_addr</b> = 192.168.1.3; NAS_IP is the switch.</li>
<li>D ✔: same task_id = 7.</li>
<li>E ✘: command records (cmd=…) can only come from TACACS+.</li></ul>`
      },
      {
        topic: 'ACCT', type: 'mcq',
        q: `<p>A switch has <code>aaa accounting commands 15 default stop-only group tacacs+</code>. A user at privilege level 15 runs the following commands. Which one produces a command accounting record?</p>`,
        o: ['<code>show running-config</code>', '<code>show version</code>', '<code>ping 10.1.1.1</code>', '<code>show clock</code>'],
        a: [0],
        x: `<p><code>aaa accounting commands <b>15</b></code> records commands whose <b>privilege level is 15</b>. <code>show running-config</code> is a level-15 command (the notes’ example log: <i>priv-lvl=15 cmd=show running-config</i>).</p>
<p>show version, ping and show clock are level-1 commands by default. Recording them needs <code>aaa accounting commands 1 …</code>.</p>`
      },

      /* ============================ NTP ============================ */
      {
        topic: 'NTP', type: 'mcq',
        dg: D.ntpSeq({ client: 'SW1 (NTP client)', server: 'R1 (NTP server)', t1: '08:00:00.0', t2: '08:30:00.4', t3: '08:30:00.6', t4: '08:00:01.0' }),
        q: `<p>A freshly booted switch has a badly wrong clock. Using the timestamps shown, what are the offset θ and the round-trip delay δ?</p>`,
        o: ['θ = +30 min, δ = 0.8 s', 'θ = +30 min 0.4 s, δ = 1.0 s', 'θ = −30 min, δ = 0.8 s', 'θ = +15 min, δ = 0.2 s'],
        a: [0],
        x: `<p>θ = [(T2 − T1) + (T3 − T4)] / 2 = [(30 min 0.4 s) + (29 min 59.6 s)] / 2 = 60 min / 2 = <b>+30 min</b>, so the client is 30 minutes behind.</p>
<p>δ = (T4 − T1) − (T3 − T2) = 1.0 − 0.2 = <b>0.8 s</b>. This is the same idea as the notes’ example of 1 h offset and 2 s delay.</p>`
      },
      {
        topic: 'NTP', type: 'multi',
        q: `<p>Which statements about the timestamp fields in NTP client/server messages are correct, according to the Lab 3.5 notes?</p>`,
        o: ['In the NTP request, the Transmit timestamp carries T1.',
          'In the NTP reply, the Origin timestamp carries T1, copied from the request.',
          'In the NTP reply, the Receive timestamp carries T4.',
          'In the NTP reply, the Transmit timestamp carries T3.',
          'The Reference timestamp is the time at which the client received the reply.'],
        a: [0, 1, 3],
        x: `<table class="simple"><tr><th>Field</th><th>Request</th><th>Reply</th></tr>
<tr><td>Origin</td><td>(ignore)</td><td>T1</td></tr><tr><td>Receive</td><td>(ignore)</td><td>T2</td></tr><tr><td>Transmit</td><td>T1</td><td>T3</td></tr></table>
<p>T4 is recorded locally by the client when the reply arrives; it is not a field in the reply. The <b>Reference</b> timestamp is when the sender’s system clock was last updated.</p>`
      },
      {
        topic: 'NTP', type: 'mcq',
        q: `<p>A Catalyst switch’s dedicated management port Gi0/0 belongs to <b>Mgmt-vrf</b> and connects to the OoB LAN, where the NTP server 10.0.0.1 is located. <code>ntp server 10.0.0.1</code> never synchronises. Which command fixes this?</p>`,
        o: ['<code>ntp server vrf Mgmt-vrf 10.0.0.1</code>', '<code>ntp server 10.0.0.1 source management</code>', '<code>ntp peer 10.0.0.1</code>', '<code>ntp master 10.0.0.1</code>'],
        a: [0],
        x: `<p>Without the VRF keyword, NTP looks up 10.0.0.1 in the global table, which has no route to the OOB network. The notes show the OOB variants: <code>ntp server vrf Mgmt-vrf 10.0.0.1</code> on a router or switch, and <code>ntp server 10.0.0.1 source management</code> on the <b>firewall</b>.</p>`
      },

      /* ============================ Syslog ============================ */
      {
        topic: 'SYSLOG', type: 'mcq',
        q: `<p>A router has <code>logging host 172.16.2.3</code> and <code>logging trap errors</code>. Which message is sent to the syslog server?</p>`,
        o: ['<code>%SYS-5-CONFIG_I: Configured from console by console</code>',
          '<code>%LINK-3-UPDOWN: Interface GigabitEthernet0/0/1, changed state to down</code>',
          '<code>%SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: admin] …</code>',
          '<code>%SEC-6-IPACCESSLOGP: list 100 denied tcp …</code>'],
        a: [1],
        x: `<p><b>errors = 3</b>, so only severities 0–3 are sent. LINK-<b>3</b> qualifies; 5, 4 and 6 do not.</p>
<p>Mnemonic for 0–7: <b>E</b>mergencies, <b>A</b>lerts, <b>C</b>ritical, <b>E</b>rrors, <b>W</b>arnings, <b>N</b>otifications, <b>I</b>nformational, <b>D</b>ebugging (“Every Awesome Cisco Engineer Will Need Ice cream Daily”).</p>`
      },
      {
        topic: 'SYSLOG', type: 'multi',
        dg: D.syslogLab(),
        q: `<p>Part of the output on R2:</p>
${out(`R2# show logging
Syslog logging: enabled (0 messages dropped, 2 messages rate-limited, 0 flushes, 0 overruns)
    Console logging: level debugging, 47 messages logged
    Monitor logging: level debugging, 0 messages logged
    Buffer logging:  level debugging, 47 messages logged
    Trap logging: level informational, 49 message lines logged
        Logging to 172.16.2.3  (udp port 514, audit disabled, link up),
              6 message lines logged`)}
<p>Which statements are correct?</p>`,
        o: ['The syslog server is 172.16.2.3.',
          'Syslog messages are sent over UDP port 514.',
          'Messages of severity 0–6 are sent to the server.',
          'Debug (level 7) messages are also sent to the syslog server.',
          'Logging to the local buffer is disabled.'],
        a: [0, 1, 2],
        x: `<p>These are the lab’s step 5 questions: server IP, protocol and port, and trap level. Trap logging is <i>informational</i> (6), so levels 0–6 go to the server and level 7 (debugging) does not.</p>
<p>Buffer logging is enabled at level debugging, with 47 messages logged.</p>`
      },
      {
        topic: 'SYSLOG', type: 'mcq',
        q: `<p>Which transport provides <b>secure</b> (encrypted and reliable) delivery of syslog messages, as mentioned in the notes?</p>`,
        o: ['UDP 514 (RFC 5426)', 'TLS over TCP 6514 (RFC 5425)', 'TCP 49', 'UDP 123'],
        a: [1],
        x: `<p>By default syslog uses <b>UDP 514</b>, which is neither reliable nor encrypted. <b>TLS over TCP 6514</b> (RFC 5425) is the secure option, though Cisco devices may not support it. The syslog message format itself is RFC 5424.</p>
<p>TCP 49 is TACACS+ and UDP 123 is NTP.</p>`
      },

      /* ============================ NetFlow ============================ */
      {
        topic: 'NETFLOW', type: 'mcq',
        q: `<p>Which NetFlow variant is the IETF standard based on Cisco NetFlow version 9?</p>`,
        o: ['sFlow (RFC 3176)', 'IPFIX (RFC 7011)', 'JFlow', 'Syslog (RFC 5424)'],
        a: [1],
        x: `<p>Variants listed in the notes: Flexible NetFlow / v9 (RFC 3954), <b>IPFIX (RFC 7011)</b>, the IETF standard derived from v9, sFlow (RFC 3176, packet sampling) and JFlow (Juniper).</p>`
      },
      {
        topic: 'NETFLOW', type: 'mcq',
        dg: D.netflowLab(),
        q: `<p>In Lab 3.6 the student used the Wireshark filter <code>ip.src == 192.168.1.1 &amp;&amp; udp.dstport == 9999 &amp;&amp; !icmp</code> on PC1 to see the export packets. The student then adds <code>source Loopback0</code> under the flow exporter. The collector still receives data, but the Wireshark filter now shows nothing. Why?</p>`,
        o: ['The export packets now use 10.0.0.1 (Loopback0) as their source IP, so they no longer match <code>ip.src == 192.168.1.1</code>.',
          'The <code>source</code> command turns export off.',
          'Loopback interfaces cannot send UDP packets.',
          'The destination port automatically changed to 2055.'],
        a: [0],
        x: `<p>Without <code>source</code>, the exporter uses the outgoing interface IP. The lab’s <code>show flow exporter</code> showed “Source IP address: 192.168.1.1”. With <code>source lo0</code> (as in the notes’ example), packets are sourced from 10.0.0.1. Update the filter to <code>ip.src == 10.0.0.1</code>.</p>`
      },
      {
        topic: 'NETFLOW', type: 'multi',
        q: `<p>Network security monitoring with NetFlow: which statements are correct?</p>`,
        o: ['A SYN flood shows up as a huge number of short flows to the web server’s port 80 from many sources, each with only 1–2 packets.',
          'Slowloris shows up as many long-lived flows from a single source to port 80, each with a very low byte count.',
          'NetFlow records the HTTP header contents, so Slowloris’s partial headers can be read directly from the collector.',
          'A Smurf attack shows up as a large volume of ICMP echo-reply traffic flowing toward the victim.',
          'NetFlow automatically blocks attack flows once it detects them.'],
        a: [0, 1, 3],
        x: `<p>NetFlow gives <b>statistics per flow</b>: key fields, packets, bytes and timestamps. Patterns of counts, durations and sources reveal attacks: many tiny one-packet flows (SYN flood), few-byte long-lived flows from one IP (Slowloris), and floods of echo-replies (Smurf).</p>
<p>It carries no payload and enforces nothing; SIEM correlation and firewall policy do the rest.</p>`
      }
    ]
  };
})();
