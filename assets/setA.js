/* Set A — 50 scenario questions (Topic 2 & 3) */
(function () {
  const S = (window.QSETS = window.QSETS || {});
  const tag = (x, y, t, color) => ({ x, y, t, color });

  S.A = {
    title: 'Lab-scenario mix',
    desc: 'Standard/extended ACL placement, ASA security levels & MPF, SYN flood vs Slowloris, VRF & jump host, AAA fallback, NTP maths, syslog levels, NetFlow flows.',
    questions: [
      /* ============================ ACL ============================ */
      {
        topic: 'ACL', type: 'multi',
        dg: D.aclLab({ extra: { tags: [tag(95, 216, 'VLAN1: ACL 10 in')] } }),
        q: `<p>A student set up the above network topology in the lab with static routes so that every network can reach every other network. The security policy is: <i>hosts in 192.168.10.0/24 must not reach the 192.168.20.0/24 LAN, and all other traffic must stay unaffected.</i> The student configured DSW1 as follows:</p>
${cli(`DSW1(config)# access-list 10 deny 192.168.10.0 0.0.0.255
DSW1(config)# access-list 10 permit any
DSW1(config)# interface vlan 1
DSW1(config-if)# ip access-group 10 in`)}
<p>Which of the following statements are true?</p>`,
        o: ['PC-A can no longer ping PC-B.',
          'PC-A can still ping R1’s Lo0 at 209.165.200.225.',
          'PC-A can no longer ping even its own default gateway, 192.168.10.1.',
          'PC-B can still ping PC-A successfully.',
          'Applying the same ACL 10 <b>outbound on DSW2 interface VLAN 1</b> instead would meet the policy without over-filtering.'],
        a: [0, 2, 4],
        x: `<p>A standard ACL can only match the <b>source</b> IP. Applied inbound on DSW1 VLAN 1 (near the source), <code>deny 192.168.10.0 0.0.0.255</code> drops <i>every</i> packet PC-A sends, whatever its destination. That is the over-filtering the notes warn about.</p>
<ul><li>A ✔: PC-A → PC-B is dropped.</li>
<li>B ✘: PC-A → R1 Lo0 is also dropped, which violates “all other traffic unaffected”.</li>
<li>C ✔: an <b>inbound</b> ACL also filters packets addressed to the device itself (notes p.6), so pings to the SVI 192.168.10.1 are dropped too.</li>
<li>D ✘: PC-B’s echo request reaches PC-A, but PC-A’s echo-reply enters DSW1 VLAN 1 inbound with source 192.168.10.3 and is denied.</li>
<li>E ✔: standard ACLs belong <b>near the destination</b>. Outbound on DSW2 VLAN 1, only packets from 192.168.10.0/24 heading into the 192.168.20.0/24 LAN are dropped.</li></ul>`
      },
      {
        topic: 'ACL', type: 'mcq',
        dg: D.aclLab({ extra: { tags: [tag(395, 140, 'G1/0/24: ACL 1 in')] } }),
        q: `<p>In Lab 2.1a, the student configured and applied ACL 1 on DSW2:</p>
${cli(`DSW2(config)# access-list 1 remark Allow DSW1 LANs Access
DSW2(config)# access-list 1 permit 192.168.10.0 0.0.0.255
DSW2(config)# access-list 1 permit 192.168.30.0 0.0.0.255
DSW2(config)# interface g1/0/24
DSW2(config-if)# ip access-group 1 in`)}
${out(`DSW2# show access-lists
Standard IP access list 1
    10 permit 192.168.10.0, wildcard bits 0.0.0.255 (10 matches)
    20 permit 192.168.30.0, wildcard bits 0.0.0.255 (5 matches)`)}
<p>The student then enters a normal <code>ping 192.168.20.3</code> on DSW1 (5 echo requests, no source specified) and runs <code>show access-lists</code> on DSW2 again. What is observed?</p>`,
        o: ['5 replies are received; the counter of ACE 10 increases to 15 because DSW1 sources the ping from VLAN 1.',
          '5 replies are received, because packets originated by a network device are never filtered by any ACL.',
          'The ping fails (0/5), and neither counter displayed by <code>show access-lists</code> increases.',
          'The ping fails (0/5), and the counter of ACE 20 increases to 10.'],
        a: [2],
        x: `<p>A normal ping from DSW1 uses the IP of the <b>exit interface</b>, G1/0/1 = <b>10.1.1.1</b>, as its source. ACL 1 permits only 192.168.10.0/24 and 192.168.30.0/24, so the packet falls through to the <b>implicit deny any</b>.</p>
<p>The implicit deny is not listed in <code>show access-lists</code>, so no displayed counter changes. To see a count for denied packets you must add an explicit <code>deny any</code> (notes p.16).</p>
<p>“Router-originated packets are not filtered” only applies to <b>outbound</b> ACLs on the router that creates the packet. Here the packet is filtered <b>inbound on another device</b> (DSW2). The lab uses an <i>extended ping with source 192.168.30.1</i> to make the test succeed.</p>`
      },
      {
        topic: 'ACL', type: 'multi',
        dg: D.aclLab({ lo1: true, extra: { tags: [tag(95, 216, 'VLAN1: ACL 100 in'), tag(545, 216, 'VLAN1: WEB-POLICY in')] } }),
        q: `<p>A student completed Part 3 of Lab 2.1b (extended ACLs). HTTP/HTTPS servers are enabled on R1, DSW1 and DSW2, and SSH is enabled on DSW2. OSPF advertises all networks.</p>
${cli(`DSW1(config)# access-list 100 permit tcp host 192.168.10.3 host 10.2.2.1 eq 22 log
DSW1(config)# access-list 100 permit tcp 192.168.10.0 0.0.0.255 any eq 443 log
DSW1(config)# interface vlan 1
DSW1(config-if)# ip access-group 100 in

DSW2(config)# ip access-list extended WEB-POLICY
DSW2(config-ext-nacl)# permit tcp 192.168.20.0 0.0.0.255 host 10.1.1.1 eq 443
DSW2(config-ext-nacl)# permit tcp 192.168.20.0 0.0.0.255 209.165.200.224 0.0.0.31 eq 443
DSW2(config-ext-nacl)# interface vlan 1
DSW2(config-if)# ip access-group WEB-POLICY in`)}
<p>Which of the following will succeed <b>from PC-A</b>?</p>`,
        o: ['SSH to DSW2 using IP address 10.2.2.1',
          'SSH to DSW2 using IP address 192.168.20.1',
          'HTTPS to R1 at https://209.165.201.1',
          'Ping to 10.2.2.1',
          'HTTP (TCP 80) to R1 at http://209.165.200.225'],
        a: [0, 2],
        x: `<p>Only ACL 100 (inbound on DSW1 VLAN 1) affects PC-A’s outgoing traffic. WEB-POLICY filters traffic <i>entering DSW2 from VLAN 1</i>, which PC-A’s packets never do.</p>
<ul><li>A ✔: matches ACE 10 exactly (host 192.168.10.3 → host 10.2.2.1, TCP 22).</li>
<li>B ✘: same device, but the destination 192.168.20.1 is not 10.2.2.1, so the packet hits the implicit deny. Extended ACLs match the <i>destination IP</i>, not “the device”.</li>
<li>C ✔: ACE 20 allows TCP 443 from 192.168.10.0/24 to <b>any</b> destination, including R1 Lo1.</li>
<li>D ✘: ICMP isn’t permitted, so it is implicitly denied. This is lab step 4: “explain your results”.</li>
<li>E ✘: port 80 is not permitted, only 443.</li></ul>
<p>Return traffic is fine because no ACL filters traffic leaving toward PC-A (there is no <i>outbound</i> ACL on DSW1 VLAN 1).</p>`
      },
      {
        topic: 'ACL', type: 'mcq',
        q: `<p>On DSW2 the student displays the named ACL and then edits it:</p>
${out(`DSW2# show access-lists
Extended IP access list WEB-POLICY
    10 permit tcp 192.168.20.0 0.0.0.255 host 10.1.1.1 eq 443
    20 permit tcp 192.168.20.0 0.0.0.255 209.165.200.224 0.0.0.31 eq 443`)}
${cli(`DSW2(config)# ip access-list extended WEB-POLICY
DSW2(config-ext-nacl)# deny tcp host 192.168.20.3 any eq 443
DSW2(config-ext-nacl)# 15 permit icmp 192.168.20.0 0.0.0.255 any echo
DSW2(config-ext-nacl)# exit
DSW2(config)# ip access-list resequence WEB-POLICY 100 5`)}
<p>Which statement correctly describes the result?</p>`,
        o: ['The deny statement is automatically placed at the top (sequence 10), so PC-B (192.168.20.3) is blocked from all HTTPS.',
          'The order becomes: 100 permit …host 10.1.1.1 eq 443, 105 permit icmp…, 110 permit …209.165.200.224…, 115 deny tcp host 192.168.20.3 any eq 443. PC-B can therefore still open https://10.1.1.1.',
          'The resequence command is rejected because only numbered ACLs can be resequenced.',
          'The entries are renumbered 100, 105, 110, 115 with the deny at 105, because IOS sorts more specific (host) entries first.'],
        a: [1],
        x: `<p>An entry without a sequence number is <b>appended</b> at the end (seq 30). An entry with a sequence number (15) is <b>inserted</b> at that position. Before resequencing the order is 10, 15, 20, 30.</p>
<p><code>ip access-list resequence WEB-POLICY 100 5</code> means “start at 100, increment 5”, giving 100, 105, 110, 115 in the same order.</p>
<p>ACEs are processed top-down and the first match wins. PC-B’s HTTPS to 10.1.1.1 matches entry 100 (permit) before it can reach the deny at 115, so the deny only affects HTTPS to destinations not already permitted. Named and numbered ACLs can both be resequenced (notes p.27).</p>`
      },
      {
        topic: 'ACL', type: 'mcq',
        dg: D.edge({ pcName: 'Web Server', pcIp: '192.168.1.10', inIf: 'G0/0/0', outIf: 'G0/0/1', extra: { tags: [tag(380, 50, 'WEB-HOURS in')] } }),
        q: `<p>A company only allows Internet users to reach its internal web server during office hours. The network engineer configured R1:</p>
${cli(`R1(config)# time-range OFFICE
R1(config-time-range)# periodic weekdays 8:00 to 18:00
R1(config)# ip access-list extended WEB-HOURS
R1(config-ext-nacl)# permit tcp any host 192.168.1.10 eq 80 time-range OFFICE
R1(config)# interface g0/0/1
R1(config-if)# ip access-group WEB-HOURS in`)}
<p>On a Tuesday at 10:00 a.m. Singapore time, Internet users report that the web server is unreachable. The engineer checks R1:</p>
${out(`R1# show clock
*21:10:05.123 UTC Sun Oct 5 2025`)}
<p>What is the most likely cause, and what is the fix?</p>`,
        o: ['Time-based ACLs use the clock of the destination server, so the web server’s clock must be corrected.',
          'R1’s clock is wrong and not synchronised (note the leading <code>*</code>). R1 thinks it is Sunday night, outside OFFICE, so the permit is inactive and traffic hits the implicit deny. Synchronise R1 with NTP and set <code>clock timezone SGT 8</code>.',
          '<code>periodic weekdays</code> only covers Monday, Wednesday and Friday; use <code>periodic daily</code>.',
          'The <code>time-range</code> keyword is only supported on standard ACLs.'],
        a: [1],
        x: `<p>A time-range is evaluated against the <b>router’s own internal clock</b>. The notes say this clock should be synchronised with NTP for accuracy. The asterisk in <code>show clock</code> means the time is <b>not authoritative</b> (never synchronised).</p>
<p>R1 believes it is Sunday 21:10, outside “weekdays 8:00 to 18:00”, so the ACE is inactive and every packet falls to the implicit deny.</p>
<p>Even a correct <i>UTC</i> clock would be wrong here: 10:00 SGT is 02:00 UTC, which is still outside the range. That is why the timezone (UTC+8) must also be set. <code>weekdays</code> means Monday to Friday.</p>`
      },
      {
        topic: 'ACL', type: 'multi',
        q: `<p>To make the ACL more readable, an engineer configured an object group-based ACL on R1:</p>
${cli(`R1(config)# object-group network ADMINS
R1(config-network-group)# host 10.0.0.5
R1(config-network-group)# 10.0.1.0 /28
R1(config-network-group)# exit
R1(config)# object-group service MGMT
R1(config-service-group)# tcp 22
R1(config-service-group)# tcp 443
R1(config-service-group)# exit
R1(config)# access-list 110 permit object-group MGMT object-group ADMINS any
R1(config)# interface g0/0/1
R1(config-if)# ip access-group 110 in`)}
<p>Which packets entering G0/0/1 are permitted?</p>`,
        o: ['TCP to port 22 from 10.0.0.5 to any destination',
          'TCP to port 443 from 10.0.1.14 to any destination',
          'TCP to port 443 from 10.0.1.16 to any destination',
          'UDP to port 443 from 10.0.0.5 to any destination',
          'ICMP echo from 10.0.0.5 to any destination'],
        a: [0, 1],
        x: `<p>The ACE <code>permit object-group MGMT object-group ADMINS any</code> expands to every combination of <b>services</b> (tcp 22, tcp 443), <b>sources</b> (host 10.0.0.5 and 10.0.1.0/28 = .0–.15) and destination <i>any</i>. The protocol comes from the service object group, so there is no separate protocol keyword.</p>
<ul><li>A ✔ and B ✔: 10.0.1.14 lies inside 10.0.1.0/28.</li>
<li>C ✘: 10.0.1.16 is outside /28 (.0–.15).</li>
<li>D ✘: the service group only lists <i>tcp</i> 443.</li>
<li>E ✘: ICMP isn’t in the service group, so it hits the implicit deny.</li></ul>
<p>Nesting is also possible with <code>group-object</code>.</p>`
      },
      {
        topic: 'ACL', type: 'multi',
        dg: D.edge({ pcName: 'PC-A', pcIp: '192.168.1.10', extra: { tags: [tag(380, 50, 'BLOCK-OUT out')] } }),
        q: `<p>R1 runs OSPF with the ISP router over G0/0/1. To test egress filtering, a student applies the following ACL:</p>
${cli(`R1(config)# ip access-list extended BLOCK-OUT
R1(config-ext-nacl)# deny ip any any
R1(config-ext-nacl)# exit
R1(config)# interface g0/0/1
R1(config-if)# ip access-group BLOCK-OUT out`)}
<p>Assume there are no other ACLs. Which statements are true?</p>`,
        o: ['A ping to 8.8.8.8 issued <b>on R1 itself</b> succeeds.',
          'A ping to 8.8.8.8 from PC-A fails.',
          'An Internet host can ping R1’s G0/0/1 address but never gets a reply, because R1’s echo-replies are denied by BLOCK-OUT.',
          'R1’s OSPF hellos sent out G0/0/1 are dropped, so the OSPF adjacency with the ISP goes down.',
          '<code>show access-lists</code> shows the match counter of <code>deny ip any any</code> increasing when PC-A pings the Internet.'],
        a: [0, 1, 4],
        x: `<p>From the notes (p.7): <b>packets originated by the router itself are not filtered by outbound ACLs</b>. An outbound ACL only checks packets that are <i>forwarded</i> through the router.</p>
<ul><li>A ✔: R1’s own echo requests bypass BLOCK-OUT, and the replies come back inbound where there is no ACL.</li>
<li>B ✔: PC-A’s packets are forwarded, so they are filtered and denied.</li>
<li>C ✘: R1’s echo-replies are router-originated, so they are not filtered.</li>
<li>D ✘: OSPF hellos are router-originated, so they are not filtered.</li>
<li>E ✔: an <b>explicit</b> deny counts its matches (unlike the implicit deny).</li></ul>`
      },

      /* ============================ ASA / Firepower ============================ */
      {
        topic: 'ASA', type: 'multi',
        dg: D.asaLab(),
        q: `<p>Consider the above network topology as set up in Lab 2.2. The student configured the interface names, security levels and IP addresses as shown and removed the default dynamic NAT. <b>No ACL</b> has been applied, and the default <code>global_policy</code> has not been modified. Assume all hosts run the services needed.</p>
<p>Which of the following will succeed?</p>`,
        o: ['Inside User 1 browses the website on the DMZ Web Server.',
          'The User on the Internet browses the website on the DMZ Web Server.',
          'The DMZ Web Server initiates an HTTP connection to the Internet Web Server.',
          'Inside User 1 pings the DMZ Web Server.',
          'The DMZ Web Server initiates an SSH connection to Inside User 2.'],
        a: [0, 2],
        x: `<p>Default Firepower/ASA policy: traffic from a <b>higher</b> to a <b>lower</b> security level is allowed, and the return traffic is allowed statefully (it appears in <code>show conn</code>). Traffic from <b>lower to higher</b> is blocked unless an ACL permits it.</p>
<ul><li>A ✔: 100 → 50.</li>
<li>B ✘: 0 → 50 needs an ACL (Part 3 of the lab).</li>
<li>C ✔: 50 → 0.</li>
<li>D ✘: ICMP is <b>not inspected by default</b>. The echo request leaves, but the echo-reply from the DMZ (50 → 100) doesn’t match any state and is dropped. Part 4 fixes this with <code>inspect icmp</code>.</li>
<li>E ✘: 50 → 100 is blocked.</li></ul>`
      },
      {
        topic: 'ASA', type: 'multi',
        dg: D.asaLab(),
        q: `<p>Continuing from the previous setup (no ACLs applied), the student modifies the default MPF policy:</p>
${cli(`ciscoasa(config)# policy-map global_policy
ciscoasa(config-pmap)# class inspection_default
ciscoasa(config-pmap-c)# inspect icmp`)}
<p>Assuming every host replies to ping, which pings now succeed?</p>`,
        o: ['Inside User 1 → Internet Web Server',
          'Inside User 1 → DMZ Web Server',
          'DMZ Web Server → Internet Web Server',
          'DMZ Web Server → Inside User 2',
          'User on the Internet → DMZ Web Server'],
        a: [0, 1, 2],
        x: `<p>With <code>inspect icmp</code>, ICMP becomes <b>stateful</b>. An echo request allowed out (higher → lower) creates a connection entry, and the matching echo-reply is allowed back in.</p>
<p>Inspection does <b>not</b> override security levels for <i>new</i> traffic. Pings started from a lower level toward a higher level are still blocked: DMZ (50) → Inside (100) and Outside (0) → DMZ (50) both need an ACL. So A, B and C succeed, and D and E fail.</p>
<p><code>global_policy</code> is already applied globally by default (<code>service-policy global_policy global</code>), so no extra service-policy command is needed.</p>`
      },
      {
        topic: 'ASA', type: 'multi',
        dg: D.asaLab({ extra: { tags: [tag(270, 190, 'OUT2DMZ in', '#8e44ad')] } }),
        q: `<p>To allow Internet users to visit the DMZ website, a student entered:</p>
${cli(`ciscoasa(config)# access-list OUT2DMZ extended permit tcp any 192.168.2.0 255.255.255.0 eq www
ciscoasa(config)# access-group OUT2DMZ in interface dmz`)}
<p>Which statements are true?</p>`,
        o: ['The User on the Internet still cannot browse the DMZ Web Server.',
          'The DMZ Web Server can no longer initiate new connections to the Internet (e.g. software updates).',
          'The ACE is invalid because Firepower/ASA ACLs require wildcard masks such as 0.0.0.255.',
          'The fix is <code>access-group OUT2DMZ in interface outside</code>.',
          'Inside users can no longer browse the DMZ Web Server, because the dmz interface now has an inbound ACL.'],
        a: [0, 1, 3],
        x: `<p>An ACL must be applied <b>inbound on the interface where the traffic enters</b> the firewall. Internet traffic enters on <b>outside</b>, so the ACL on dmz never sees it (A ✔, D ✔).</p>
<p>An inbound ACL on dmz <i>replaces</i> the default “higher-to-lower allowed” rule for traffic entering dmz. New connections from the DMZ server to the Internet don’t match the ACE (wrong destination) and hit the implicit deny (B ✔).</p>
<p>ASA ACLs use <b>subnet masks</b>, not wildcard masks (C ✘). Inside users are unaffected (E ✘): their connections start on the inside interface, and the server’s replies belong to an existing connection in the state table, which the ACL does not re-check.</p>`
      },
      {
        topic: 'ASA', type: 'multi',
        dg: D.asaLab({ extra: { tags: [tag(420, 100, 'ACL in (www → DMZ)', '#8e44ad')] } }),
        q: `<p>After correctly applying an inbound ACL on the outside interface that permits only <code>tcp any host 192.168.2.100 eq www</code>, the student generates some traffic and views the state table:</p>
${out(`ciscoasa# show conn
3 in use, 5 most used
TCP outside  23.1.2.10:51544 dmz  192.168.2.100:80, idle 0:00:02, bytes 3150, flags UIO
TCP inside   10.0.0.25:50112 dmz  192.168.2.100:80, idle 0:00:05, bytes 1830, flags UIO
TCP inside   10.0.0.37:49870 outside 45.10.20.30:443, idle 0:00:01, bytes 6120, flags UIO`)}
<p>Which statements are correct?</p>`,
        o: ['All three entries are TCP connections that are up, with data seen in both the inbound and outbound directions.',
          'The connection from 23.1.2.10 exists only because of the ACL on the outside interface.',
          'Return traffic from 45.10.20.30 to 10.0.0.37 is allowed because it matches a state-table entry, even though the outside ACL does not permit TCP 443 to 10.0.0.37.',
          'If Inside User 1 now pings the DMZ server, an ICMP entry will appear in this table.',
          'The DMZ Web Server initiated the connection with 10.0.0.25.'],
        a: [0, 1, 2],
        x: `<p>ASA connection flags: <b>U</b> = up, <b>I</b> = inbound data, <b>O</b> = outbound data (A ✔).</p>
<ul><li>B ✔: outside (0) → dmz (50) is lower-to-higher, so only the ACL allows it.</li>
<li>C ✔: this is stateful filtering. Once 10.0.0.37 opened the connection (100 → 0), return packets match the entry and are not checked against the outside ACL.</li>
<li>D ✘: ICMP is not inspected by default, so no ICMP connection entries are created (and the reply would be dropped). That only changes after <code>inspect icmp</code>.</li>
<li>E ✘: the entry shows inside 10.0.0.25:50112 (ephemeral port) → dmz :80, so the inside user initiated it.</li></ul>`
      },
      {
        topic: 'ASA', type: 'mcq',
        q: `<p>Inside users of a Firepower 1010 (default configuration except for interface settings) cannot ping hosts on the Internet. A student enters:</p>
${cli(`ciscoasa(config)# policy-map global_policy
ciscoasa(config-pmap)# class inspection_default
ciscoasa(config-pmap-c)# inspect icmp`)}
<p>Which statement is correct?</p>`,
        o: ['Nothing more is needed. <code>global_policy</code> is already applied by the default <code>service-policy global_policy global</code>, so inside users can now ping outside hosts.',
          'The student must also enter <code>service-policy global_policy interface inside</code>, or the change has no effect.',
          'The student must also create <code>class-map inspection_default</code> with <code>match icmp</code>, because inspection_default does not match ICMP.',
          'The student must also apply an outside ACL permitting echo-reply, otherwise the replies are still dropped.'],
        a: [0],
        x: `<p>The Modular Policy Framework (MPF) has three parts: a <b>class-map</b> identifies traffic, a <b>policy-map</b> sets the actions, and a <b>service-policy</b> applies it to an interface or globally.</p>
<p>The factory default already has <code>class-map inspection_default</code> (match default-inspection-traffic), <code>policy-map global_policy</code> and <code>service-policy global_policy global</code>. Adding <code>inspect icmp</code> under <code>class inspection_default</code> is enough: the reply is then allowed statefully.</p>
<p>An outside ACL permitting echo-reply is an <i>alternative</i> fix, not an extra requirement.</p>`
      },
      {
        topic: 'ASA', type: 'multi',
        dg: D.fpLab({ dmzNet: '192.168.2.0/24 (sec ?)' }),
        q: `<p>A student set up the above topology. E1/5 and E1/1 were given <code>nameif inside</code> and <code>nameif outside</code> respectively. For the DMZ, the student entered only:</p>
${cli(`ciscoasa(config)# interface ethernet1/3
ciscoasa(config-if)# nameif dmz
ciscoasa(config-if)# ip address 192.168.2.254 255.255.255.0`)}
<p>No ACLs are configured and default settings apply otherwise. Which statements are true?</p>`,
        o: ['PC-A can browse the PC-B Web Server.',
          'The dmz interface has security level 0.',
          'The Attacker can browse the PC-B Web Server, because outside and dmz have the same security level.',
          'PC-B can initiate connections to hosts on the outside network.',
          'PC-A cannot reach PC-B, because an interface without a configured security level drops all traffic.'],
        a: [0, 1],
        x: `<p>When you set <code>nameif inside</code> the security level defaults to <b>100</b>. Any other name (outside, dmz, …) defaults to <b>0</b> unless you set <code>security-level</code>. So dmz is 0 (B ✔).</p>
<ul><li>A ✔: inside (100) → dmz (0) is higher-to-lower, so it is allowed.</li>
<li>C ✘ and D ✘: outside and dmz are now <b>both 0</b>. By default the ASA blocks traffic between interfaces of the <b>same</b> security level (this needs <code>same-security-traffic permit inter-interface</code>).</li>
<li>E ✘: the interface works; it simply has level 0.</li></ul>
<p>Lesson: always set <code>security-level 50</code> explicitly for the DMZ, as the lab instructs.</p>`
      },

      /* ============================ SYN flood ============================ */
      {
        topic: 'SYN', type: 'mcq',
        q: `<p>In Lab 2.5, before launching the attack, the student ran this on the PC-B web server:</p>
${cli(`kali@kali:~$ sudo systemctl start apache2
kali@kali:~$ sudo sysctl -w net.ipv4.tcp_syncookies=0`)}
<p>Why was the second command needed for the lab?</p>`,
        o: ['With SYN cookies the server does not need to store state for half-open connections when its SYN backlog is full. Disabling them lets the flood exhaust the backlog, so the attack can be demonstrated.',
          'SYN cookies make Apache refuse connections from the attacker’s subnet, so they must be off for the attack packets to arrive.',
          'SYN cookies conflict with the Firepower MPF policy. Disabling them stops the firewall from dropping the attack.',
          'With SYN cookies enabled, the server answers SYNs with RST instead of SYN-ACK.'],
        a: [0],
        x: `<p>A SYN flood fills the server’s queue of <b>half-open (embryonic, SYN-RECV)</b> connections. The lab’s default maximum is 512, after which new clients like PC-A cannot connect.</p>
<p>Linux <b>SYN cookies</b> defeat this. When the queue overflows, the server encodes the connection state in the SYN-ACK sequence number and allocates nothing until a valid ACK returns.</p>
<p>The lab turns them off (<code>tcp_syncookies=0</code>) so you can watch the attack succeed (<code>ss -t -r state syn-recv | wc -l</code> → 512). Then you defend with the firewall’s MPF instead.</p>`
      },
      {
        topic: 'SYN', type: 'mcq',
        dg: D.fpLab(),
        q: `<p>During Lab 2.5 a classmate says: <i>“Just add an ACL on the outside interface to stop the SYN flood.”</i> The attacker’s scapy script sends TCP SYNs to 192.168.2.100 port 80 with <b>randomly spoofed source IP addresses</b>, and Internet users must still be able to visit the website.</p>
<p>Why is an ACL alone insufficient?</p>`,
        o: ['The ACL must permit TCP 80 from <i>any</i> source to the web server for legitimate users. The flood packets have the same destination and port, and random sources, so they are permitted as well.',
          'ACLs on Firepower/ASA cannot match TCP; only MPF can.',
          'ACLs on Firepower/ASA only filter outbound traffic.',
          'TCP SYN packets have no IP header until the handshake completes, so ACLs cannot see them.'],
        a: [0],
        x: `<p>The notes make the same point for Slowloris: the ACL is <i>intentionally</i> written to permit users from the Internet, which includes attackers, to reach the web server. A spoofed SYN to port 80 looks exactly like a legitimate one.</p>
<p>The defence must limit <b>connection behaviour</b>, using MPF <code>set connection embryonic-conn-max …</code> and TCP Intercept, rather than filter by address or port.</p>`
      },
      {
        topic: 'SYN', type: 'multi',
        dg: D.fpLab(),
        q: `<p>To defend the web server, the student configured:</p>
${cli(`ciscoasa(config)# access-list WEB extended permit tcp any host 192.168.2.100 eq www
ciscoasa(config)# class-map WEB-CLASS
ciscoasa(config-cmap)# match access-list WEB
ciscoasa(config-cmap)# exit
ciscoasa(config)# policy-map WEB-POLICY
ciscoasa(config-pmap)# class WEB-CLASS
ciscoasa(config-pmap-c)# set connection embryonic-conn-max 50 per-client-embryonic-max 5
ciscoasa(config-pmap-c)# exit
ciscoasa(config-pmap)# exit
ciscoasa(config)# service-policy WEB-POLICY interface outside`)}
<p>An inbound ACL on outside already permits HTTP to the server. The SYN flood (random spoofed sources) is launched again. Which statements are true?</p>`,
        o: ['The count of SYN-RECV connections on the web server stays far below 512.',
          'Once 50 embryonic connections exist, the firewall intercepts new SYNs and answers with a SYN-ACK on the server’s behalf. Only clients that complete the handshake are connected to the server.',
          'PC-A’s connections from the inside network to the web server are also subject to these limits.',
          'If only <code>per-client-embryonic-max 5</code> were configured, without <code>embryonic-conn-max</code>, the flood would still be stopped.',
          'The access-list WEB inside the class-map also acts as the access rule, so no <code>access-group</code> is needed for Internet users.'],
        a: [0, 1],
        x: `<ul><li>A ✔ and B ✔: when the embryonic limit is reached, the ASA’s <b>TCP Intercept</b> answers SYNs itself (using SYN cookies). Spoofed sources never complete the handshake, so they never reach the server, while real users (like PC-A in Lab 2.5 step 2.4) still get through.</li>
<li>C ✘: the service-policy is bound to <b>outside</b>. PC-A’s traffic goes inside → dmz and never touches that interface.</li>
<li>D ✘: with random spoofed IPs, every packet comes from a “new client”, so a per-client limit is never reached.</li>
<li>E ✘: an ACL used in <code>match access-list</code> only <i>classifies</i> traffic for the policy. It does not permit or deny anything; access control still needs <code>access-group</code>.</li></ul>`
      },
      {
        topic: 'SYN', type: 'multi',
        dg: NetDiag.seq({
          w: 580, h: 210,
          actors: [{ id: 'A', name: 'Attacker (spoofs 10.20.30.40)', x: 120, w: 200 }, { id: 'S', name: 'Web Server 192.168.2.100', x: 450, w: 180 }],
          msgs: [
            { from: 'A', to: 'S', y: 70, t: 'SYN  src=10.20.30.40  dst port 80', color: '#c0392b' },
            { from: 'S', to: 'A', y: 115, t: 'SYN-ACK → 10.20.30.40', color: '#1f618d', lost: true },
            { from: 'A', to: 'S', y: 160, t: 'SYN  src=172.19.4.7 … (thousands)', color: '#c0392b' }
          ],
          notes: [{ x: 460, y: 190, t: 'SYN-RECV: 512 / 512', color: '#c0392b', bold: true }]
        }),
        q: `<p>The diagram shows the TCP SYN flood in Lab 2.5. Which of the following statements are true?</p>`,
        o: ['The server keeps each such connection in the SYN-RECV (embryonic) state until it times out.',
          'If a spoofed source IP belongs to a live host, that host replies to the unexpected SYN-ACK with a RST, which frees the server’s slot early.',
          'The attack only works if every TCP 3-way handshake is completed.',
          'According to the lab notes, TCP SYN flooding, like Smurf, is a volumetric DoS/DDoS attack.',
          'The attacker must receive the SYN-ACKs to keep the half-open connections alive.'],
        a: [0, 1, 3],
        x: `<p>The server answers each SYN with a SYN-ACK and waits for the final ACK, which never arrives. The connection sits <b>half-open (SYN-RECV)</b> and uses a backlog slot until timeout (A ✔). That is why the attacker spoofs addresses and never completes the handshake (C ✘, E ✘).</p>
<p>A live host that receives an unsolicited SYN-ACK sends RST, freeing the slot (B ✔). Attackers therefore prefer unused or unreachable addresses.</p>
<p>The DoS notes contrast <b>Smurf and TCP SYN flooding (volumetric)</b> with <b>Slowloris (low-rate)</b> (D ✔).</p>`
      },

      /* ============================ Slowloris ============================ */
      {
        topic: 'SLOW', type: 'mcq',
        dg: D.fpLab(),
        q: `<p>In Lab 2.6 a <b>single</b> attacker PC (23.1.2.66) runs <code>slowhttptest -c 1000 -u http://192.168.2.100</code>. The student creates a class-map matching <code>tcp any host 192.168.2.100 eq www</code> and applies the policy-map on the outside interface. Which <code>set connection</code> parameter best stops this attack <b>without</b> denying service to other Internet users?</p>`,
        o: ['<code>set connection embryonic-conn-max 50</code>',
          '<code>set connection per-client-max 20</code>',
          '<code>set connection conn-max 50</code>',
          '<code>set connection random-sequence-number enable</code>'],
        a: [1],
        x: `<p>Slowloris opens many <b>fully established</b> connections and keeps each one busy by sending incomplete HTTP headers very slowly.</p>
<ul><li><b>per-client-max</b> limits simultaneous connections <i>per source IP</i>. One attacker is capped at 20, so the server’s pool is never exhausted, and every other client still gets its own 20.</li>
<li><b>embryonic-conn-max</b> only counts half-open connections. Slowloris completes the handshake, so this limit never triggers.</li>
<li><b>conn-max 50</b> caps the total. The attacker grabs all 50 and legitimate users are refused, so the DoS just moves to the firewall.</li>
<li>Random sequence numbers are unrelated.</li></ul>`
      },
      {
        topic: 'SLOW', type: 'multi',
        q: `<p>After adding <code>set connection per-client-max 10</code> for web traffic to the DMZ server, the student re-launches slowhttptest from the attacker PC. The tool reports <code>service available: NO</code>, yet PC-A can still load the web page. Which statements are true?</p>`,
        o: ['slowhttptest reports “not available” because its own probe connections come from the same attacker IP, which has already reached the per-client limit, so they are refused.',
          'PC-A can browse because its connections are counted separately from the attacker’s.',
          'Apache’s worker pool on the server is exhausted, but the firewall serves a cached copy of the page to PC-A.',
          'Slowloris is a low-rate DoS that sends incomplete HTTP request headers slowly to keep connections reserved.',
          'Blocking the attacker’s IP with an ACL is the recommended general defence, because Slowloris attackers’ IPs are known in advance.'],
        a: [0, 1, 3],
        x: `<p>This is Lab 2.6 step 2.4: the tool checks availability from the attacker’s own IP, and that IP is the one being limited. That is why it wrongly reports the service as down (A ✔) while other clients are served normally (B ✔).</p>
<p>The server is <i>not</i> exhausted, and the ASA does not cache web pages (C ✘).</p>
<p>D ✔ matches the notes’ definition. E ✘: the notes say ACLs cannot defend against Slowloris, because the web server must be open to the Internet and attacker addresses aren’t known beforehand.</p>`
      },
      {
        topic: 'SLOW', type: 'mcq',
        q: `<p>A student reuses the SYN-flood defence from Lab 2.5 (<code>set connection embryonic-conn-max 50 per-client-embryonic-max 5</code>) against the Slowloris attack in Lab 2.6. The web server still becomes unavailable to PC-A. What is the best explanation?</p>`,
        o: ['Slowloris completes the TCP 3-way handshake, so its connections are established, not embryonic, and the embryonic limits never trigger.',
          'Slowloris uses UDP, so TCP limits do not apply.',
          'Embryonic limits only work when the policy is applied with <code>service-policy … global</code>.',
          'slowhttptest spoofs a different source IP for each connection, so per-client limits can never work.'],
        a: [0],
        x: `<p>An <b>embryonic</b> connection is a half-open one (SYN received, handshake not finished). Slowloris finishes the handshake and then sends a partial HTTP header (no terminating blank line), adding one header line at a time at a very slow rate.</p>
<p>To the firewall these are <b>established</b> TCP connections, so you need <code>per-client-max</code> or <code>conn-max</code> and/or timeouts. slowhttptest does not spoof; it needs real TCP sessions.</p>`
      },

      /* ============================ OoB / VRF / Jump host / SSH ============================ */
      {
        topic: 'OOB', type: 'mcq',
        dg: D.jumpLab({ vrf: 'OOB', vm2: 'ens19: 172.16.99.10/24' }),
        q: `<p>In Lab 3.1 a student entered the following on R1:</p>
${cli(`R1(config)# interface g0/1/1
R1(config-if)# ip address 172.16.99.1 255.255.255.0
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# vrf definition OOB
R1(config-vrf)# address-family ipv4
R1(config-vrf-af)# exit-address-family
R1(config-vrf)# exit
R1(config)# interface g0/1/1
R1(config-if)# vrf forwarding OOB`)}
<p><code>ping vrf OOB 172.16.99.10</code> fails, and <code>show ip route vrf OOB</code> shows no connected route. What is the reason?</p>`,
        o: ['Entering <code>vrf forwarding</code> removes the IPv4 address already configured on the interface. The address must be re-entered <i>after</i> <code>vrf forwarding</code>.',
          '<code>address-family ipv4</code> must also be configured under interface G0/1/1.',
          'A VRF needs a static default route before any connected route can appear.',
          '<code>ping vrf</code> only works for routes learned through OSPF.'],
        a: [0],
        x: `<p>IOS prints <i>“% Interface GigabitEthernet0/1/1 IPv4 disabled and address(es) removed due to enabling VRF OOB”</i>. That is why the lab notes give the order <b>vrf forwarding first, then ip address</b>.</p>
<p>Once the address is re-entered, the connected route 172.16.99.0/24 appears in <code>show ip route vrf OOB</code>, not in the global table.</p>`
      },
      {
        topic: 'OOB', type: 'multi',
        dg: D.jumpLab({ vrf: 'OOB', vm2: 'ens19: 172.16.99.10/24', n2: '172.16.99.0/24' }),
        q: `<p>R1’s G0/1/1 is now correctly configured with <code>vrf forwarding OOB</code> and IP address 172.16.99.1/24. The jump server VM’s second interface (ens19) is 172.16.99.10/24. No routing protocols or static routes are configured. Which statements are true?</p>`,
        o: ['<code>R1# ping 172.16.99.10</code> succeeds.',
          '<code>R1# ping vrf OOB 172.16.99.10</code> succeeds.',
          '<code>R1# show ip route</code> lists 172.16.99.0/24 as directly connected.',
          '<code>R1# show ip route vrf OOB</code> lists 172.16.99.0/24 as directly connected.',
          'The Laptop can ping 172.16.99.1, because R1 is directly connected to that network.'],
        a: [1, 3],
        x: `<p>A VRF gives the router a <b>separate routing table</b>, as if it were a separate logical router. Interfaces outside any VRF stay in the global table.</p>
<ul><li>A ✘ and C ✘: a plain <code>ping</code> and <code>show ip route</code> use the <b>global</b> table, which has no 172.16.99.0/24 entry.</li>
<li>B ✔ and D ✔: you must say <code>vrf OOB</code> (lab step 2.4: <code>ping vrf vrf-name …</code>).</li>
<li>E ✘: the Laptop’s packets arrive on G0/0/0 (global table), where 172.16.99.0/24 doesn’t exist. This is exactly lab step 2.2: the Laptop must <i>not</i> be able to ping G0/1/1.</li></ul>`
      },
      {
        topic: 'OOB', type: 'multi',
        dg: D.jumpConcept(),
        q: `<p>An enterprise wants network engineers to manage devices remotely from the Internet. Instead of exposing the OOB management LAN, it deploys a jump host as shown. Which statements about this design are correct?</p>`,
        o: ['The attack surface is reduced to a single point of entry.',
          'Access is easier to log, monitor and audit, because all administrative sessions pass through one host.',
          'Because of the jump host, the managed devices no longer need SSH or AAA to be configured.',
          'The jump host becomes an attractive target and a single point of failure, so it must be securely hardened.',
          'The jump host should route (IP-forward) packets between its Internet-facing and OOB interfaces, so engineers can SSH from their laptops straight to the devices.'],
        a: [0, 1, 3],
        x: `<p>From the notes: a jump host is an intermediary that acts as the entry point from a less-secure to a more-secure zone. It reduces the attack surface to one point that is easier to log, monitor and audit (A ✔, B ✔). Its drawbacks are that it is an attractive target and a single point of failure, so it must be hardened, typically a hardened Linux SSH server in the DMZ (D ✔).</p>
<p>C ✘: devices still need SSH and AAA. E ✘: if the jump host forwarded packets it would just be a router, and the OOB LAN would be directly exposed. Engineers SSH <i>to</i> the jump host, then open a <i>second</i> SSH session from it to the device.</p>`
      },
      {
        topic: 'OOB', type: 'mcq',
        q: `<p>A student starts configuring SSH on a freshly reloaded router:</p>
${cli(`Router(config)# ip domain-name netsec.lab
Router(config)# crypto key generate rsa modulus 2048
% Please define a hostname other than Router.`)}
<p>What must the student do?</p>`,
        o: ['Configure a hostname (e.g. <code>hostname R1</code>) and then generate the RSA keys.',
          'Enter <code>ip ssh version 2</code> before generating keys.',
          'Use <code>modulus 1024</code>, because 2048 is not supported.',
          'Create a local user with <code>username … secret …</code> before generating keys.'],
        a: [0],
        x: `<p>The RSA key pair is named <i>hostname.domain-name</i>, so IOS requires a <b>non-default hostname</b> and an <b>ip domain-name</b> before <code>crypto key generate rsa</code>.</p>
<p>The notes’ order is: hostname → ip domain-name → crypto key generate rsa modulus 2048 (or 4096) → ip ssh version 2 → optional authentication-retries and time-out → username/secret, <code>login local</code>, <code>transport input ssh</code>.</p>`
      },
      {
        topic: 'OOB', type: 'mcq',
        dg: D.jumpLab({ vrf: 'OOB', vm2: 'ens19: 172.16.99.10/24', n2: '172.16.99.0/24' }),
        q: `<p>To restrict SSH to the OOB network only (lab step 3.3), the student configured:</p>
${cli(`R1(config)# username netadmin secret Adm1n#2217
R1(config)# ip access-list standard OOB-ONLY
R1(config-std-nacl)# permit 172.16.99.0 0.0.0.255
R1(config-std-nacl)# exit
R1(config)# line vty 0 15
R1(config-line)# login local
R1(config-line)# transport input ssh
R1(config-line)# access-class OOB-ONLY in`)}
<p>RSA keys and SSH are working. From the jump server (172.16.99.10), <code>ssh netadmin@172.16.99.1</code> is refused. Which change fixes it while keeping the restriction?</p>`,
        o: ['Change the line command to <code>access-class OOB-ONLY in vrf-also</code>. Without <code>vrf-also</code>, VTY connections arriving on VRF interfaces are rejected.',
          'Use an extended ACL, because <code>access-class</code> only accepts extended ACLs.',
          'Remove the access-class and apply <code>ip access-group OOB-ONLY in</code> on G0/1/1 instead.',
          'Change to <code>transport input telnet ssh</code>, because SSH over VRF needs Telnet enabled.'],
        a: [0],
        x: `<p><code>access-class</code> filters who can connect to the VTY lines (Telnet/SSH to the router itself). When it is applied <b>without <code>vrf-also</code></b>, IOS only accepts matching sessions from the global routing table and rejects sessions that arrive on VRF interfaces.</p>
<p>The jump server reaches R1 through G0/1/1 in VRF OOB, so you need <code>access-class OOB-ONLY in vrf-also</code>. Standard ACLs are the normal choice for access-class. Moving the filter to an interface ACL on G0/1/1 would not stop SSH arriving from the production side.</p>`
      },
      {
        topic: 'OOB', type: 'multi',
        q: `<p>Which of the following commands make SSH remote management of a router <b>more</b> secure?</p>`,
        o: ['<code>ip ssh version 2</code>',
          '<code>crypto key generate rsa modulus 4096</code> instead of 1024',
          '<code>ip ssh authentication-retries 2</code>',
          '<code>transport input all</code> under <code>line vty 0 15</code>',
          '<code>service password-encryption</code>, which encrypts the SSH session traffic'],
        a: [0, 1, 2],
        x: `<ul><li>A ✔: SSHv2 is the recommended standard.</li>
<li>B ✔: a larger modulus (2048 or 4096) is stronger.</li>
<li>C ✔: fewer retries slows down password guessing.</li>
<li>D ✘: <code>transport input all</code> re-enables <b>Telnet</b>, which sends credentials in clear text. Use <code>transport input ssh</code>.</li>
<li>E ✘: service password-encryption only applies weak type-7 obfuscation to passwords stored in the configuration. It has nothing to do with SSH traffic.</li></ul>`
      },

      /* ============================ Supermicro / Proxmox ============================ */
      {
        topic: 'SRV', type: 'mcq',
        dg: {
          w: 560, h: 150,
          nodes: [{ id: 'L', type: 'laptop', x: 70, y: 70, label: 'Laptop', sub: ['10.0.0.100/24'] },
            { id: 'S', type: 'rack', x: 420, y: 70, label: 'Supermicro server', sub: ['ports: IPMI · LAN1 · LAN2 · LAN3 · LAN4 · SFP1/2'] }],
          links: [{ a: 'L', b: 'S', lb: 'LAN 1 (eno1)', lbP: [340, 58], m: 'cable plugged into LAN 1', mP: [220, 90] }]
        },
        q: `<p>A student connects the laptop (10.0.0.100/24) with an Ethernet cable to the Supermicro server’s <b>LAN 1</b> port. Browsing to <code>http://10.0.0.1</code> to power on the server times out, but <code>ping 10.0.0.10</code> succeeds. What is the reason?</p>`,
        o: ['10.0.0.1 is the IPMI/BMC web interface, reachable only through the dedicated <b>IPMI port</b>. LAN 1 (eno1, bridge vmbr0) carries the Proxmox host at https://10.0.0.10:8006.',
          'The BMC web server only listens on HTTPS port 8006.',
          'The laptop must use the IP 10.0.0.10 to reach the BMC.',
          'The BMC is disabled while the server is powered off, so it cannot be reached until the server is powered on.'],
        a: [0],
        x: `<p>Per Appendix A/B, the <b>IPMI port</b> leads to the Baseboard Management Controller (BMC) at <b>10.0.0.1/24</b>. It is out-of-band and works even when the server is powered off, which is how you power it on and open the HTML5 remote console.</p>
<p><b>LAN 1 = eno1</b>, bridged to <b>vmbr0</b>, carries the Proxmox hypervisor at <b>https://10.0.0.10:8006</b>. Don’t use 10.0.0.1 or 10.0.0.10 as your laptop address; something like 10.0.0.100 is fine.</p>`
      },
      {
        topic: 'SRV', type: 'multi',
        q: `<p>For the jump server, a VM’s first NIC (ens18) is already bridged via <b>vmbr1</b> to <b>eno2</b> (LAN 2). For the second NIC, the student selects <i>pve → System → Network → Create → Linux Bridge</i>, enters name <b>vmbr2</b> and bridge port <b>eno5</b>, and clicks Create. Which statements are true?</p>`,
        o: ['vmbr2 shows as pending and does not work until <b>Apply Configuration</b> is clicked and confirmed.',
          'eno5 is the physical port labelled <b>LAN 3</b>.',
          'The VM’s IP address for the OOB network should be typed into the IPv4/CIDR field of the Create: Linux Bridge dialog.',
          'A VM can be attached directly to physical port eno5 without a Linux bridge, by selecting eno5 under Hardware → Network Device.',
          'After editing the VM’s <code>/etc/netplan/50-cloud-init.yaml</code>, the student must run <code>sudo netplan apply</code>.'],
        a: [0, 1, 4],
        x: `<ul><li>A ✔: a new bridge is “pending changes” until you click <b>Apply Configuration</b> and confirm with Yes.</li>
<li>B ✔: the port mapping is eno1 = LAN 1, eno2 = LAN 2, eno3np0/eno4np2 = SFP 1/2, <b>eno5 = LAN 3</b>, eno6 = LAN 4, enx… = IPMI.</li>
<li>C ✘: the notes warn not to enter IP addresses in that dialog. Those fields are for the Proxmox host, not the VM.</li>
<li>D ✘: a VM can <b>only</b> connect to a Linux bridge, never to a physical port directly.</li>
<li>E ✔: the VM’s IP addresses are set in netplan and applied with <code>sudo netplan apply</code>. If the file is missing, create it with <code>sudo netplan generate</code>.</li></ul>`
      },
      {
        topic: 'SRV', type: 'mcq',
        q: `<p>While practising for the team project, a student misconfigures the pre-configured <b>102 (Tacacs)</b> VM and can no longer log in. Which Proxmox action returns the VM to its original, freshly configured state with the default credentials?</p>`,
        o: ['Hibernate the VM, then start it again.', 'Reset the VM.', 'Roll back to the snapshot named <b>Original-Image</b>.', 'Pause the VM, then resume it.'],
        a: [2],
        x: `<p>Each pre-configured VM has one snapshot called <b>Original-Image</b>; don’t delete it. Use <i>VM → Snapshots → Original-Image → Rollback</i>, and the snapshot description lists the default username and password.</p>
<p>The other options keep the broken configuration. Hibernate saves the memory state to disk, Pause keeps the RAM, and Reset is a forced restart, which is <b>not recommended</b>, just like <b>Stop</b>. The best practice is a graceful Shutdown or Reboot.</p>`
      },

      /* ============================ AAA Authentication ============================ */
      {
        topic: 'AUTHN', type: 'multi',
        dg: D.aaaLab(),
        q: `<p>The switch is configured as below. The TACACS+ server only contains the user <b>tacuser</b>, the RADIUS server only contains <b>raduser</b>, and the switch’s local database only contains <b>ADMIN</b>.</p>
${cli(`SW1(config)# aaa new-model
SW1(config)# tacacs server TACACSVR
SW1(config-server-tacacs)# address ipv4 192.168.1.11
SW1(config-server-tacacs)# key TACACS-pa55w0rd
SW1(config)# radius server RADIUSVR
SW1(config-radius-server)# address ipv4 192.168.1.12 auth-port 1812 acct-port 1813
SW1(config-radius-server)# key RADIUS-pa55w0rd
SW1(config)# username ADMIN secret Str0ngPa55w0rd
SW1(config)# aaa authentication login default group tacacs+ group radius local`)}
<p>Which statements are true?</p>`,
        o: ['With both servers up, only <b>tacuser</b> can log in.',
          'With both servers up, <b>ADMIN</b> can still log in: TACACS+ rejects it, so the switch then tries the local database.',
          'With the TACACS+ server disconnected and the RADIUS server up, <b>raduser</b> can log in.',
          'With both servers disconnected, <b>ADMIN</b> can log in.',
          'With both servers disconnected, nobody can log in, not even on the console.'],
        a: [0, 2, 3],
        x: `<p>A method list moves to the next method only when the current one returns an <b>ERROR</b> (no response or server unreachable). A <b>FAIL</b>, meaning the server answered “reject”, ends authentication immediately.</p>
<ul><li>A ✔ and B ✘: TACACS+ answers for every user, so raduser and ADMIN are rejected and never reach RADIUS or local.</li>
<li>C ✔: TACACS+ times out (ERROR), so RADIUS is tried.</li>
<li>D ✔ and E ✘: both servers ERROR, so the local database is used. The default list applies to the console and VTY lines.</li></ul>
<p>This is lab 3.2 steps 3.13–3.15. Keeping <code>local</code> at the end prevents a lock-out.</p>`
      },
      {
        topic: 'AUTHN', type: 'multi',
        q: `<p>Consider the following configuration on R1:</p>
${cli(`R1(config)# aaa new-model
R1(config)# tacacs server TAC1
R1(config-server-tacacs)# address ipv4 192.168.1.11
R1(config-server-tacacs)# key TACACS-pa55w0rd
R1(config)# username ADMIN secret Str0ngPa55w0rd
R1(config)# aaa authentication login default group tacacs+ local
R1(config)# aaa authentication login CON-LIST none
R1(config)# line con 0
R1(config-line)# login authentication CON-LIST`)}
<p>Which statements are true?</p>`,
        o: ['Logging in on the console requires no username or password.',
          'SSH/Telnet (VTY) logins are checked against TACACS+ first, and against the local database only if TACACS+ is unreachable.',
          'VTY logins use CON-LIST because it was the most recently configured list.',
          'If <code>login authentication CON-LIST</code> were removed from line con 0, the console would use the default list.',
          'A custom (named) method list automatically takes effect on all VTY lines once it is configured.'],
        a: [0, 1, 3],
        x: `<p>The <b>default</b> method list applies automatically to the console and VTY lines unless a line has a custom list applied. A <b>custom</b> list only takes effect where it is applied with <code>login authentication LIST</code> (notes p.11).</p>
<ul><li>A ✔: the console uses CON-LIST, whose method is <code>none</code>.</li>
<li>B ✔: VTY uses the default list (tacacs+, then local on ERROR).</li>
<li>C ✘ and E ✘.</li>
<li>D ✔: without the custom list, the console falls back to the default list.</li></ul>`
      },
      {
        topic: 'AUTHN', type: 'mcq',
        q: `<p>An auditor reviews this excerpt of a switch’s running configuration:</p>
${out(`enable secret 9 $9$nhEmQVczB7dqsO$X.HsgL6x1il0RxkOSSvyQYwucySCt7qFm4v7pqCxkKM
username user1 password 7 0822455D0A16
username user2 secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
username user3 secret 8 $8$dsYGNam3K1SIJO$7nv/35M/qr6t.dVc7UY9zrJDWRVqncHub1PE9UlMQFs`)}
<p>Whose password can be most easily recovered by anyone who obtains a copy of this configuration?</p>`,
        o: ['The enable secret', 'user1', 'user2', 'user3'],
        a: [1],
        x: `<p>Type <b>7</b> comes from <code>service password-encryption</code> on a <code>password</code> command. It is a weak, <b>reversible</b> obfuscation that free online tools decode instantly.</p>
<p><code>secret</code> uses a one-way hash: <b>type 5 = MD5</b> (the default in the notes), <b>type 8 = SHA-256</b> and <b>type 9 = scrypt</b>. The notes recommend sha256 or scrypt, e.g. <code>username X algorithm-type scrypt secret …</code>.</p>`
      },
      {
        topic: 'AUTHN', type: 'multi',
        q: `<p>A router is configured as follows:</p>
${cli(`R1(config)# login block-for 120 attempts 3 within 60
R1(config)# ip access-list standard PERMIT-ADMIN
R1(config-std-nacl)# permit 192.168.10.10
R1(config-std-nacl)# exit
R1(config)# login quiet-mode access-class PERMIT-ADMIN
R1(config)# login on-failure log`)}
<p>An attacker at 203.0.113.5 fails three SSH logins within 40 seconds. Which statements are true?</p>`,
        o: ['R1 enters quiet mode for 120 seconds.',
          'During quiet mode, the administrator at 192.168.10.10 can still log in.',
          'During quiet mode, a second administrator at 192.168.10.11 can still log in.',
          'Quiet mode blocks only 203.0.113.5; all other hosts can still log in.',
          'Each failed attempt generates a <code>%SEC_LOGIN-4-LOGIN_FAILED</code> syslog message.'],
        a: [0, 1, 4],
        x: `<p><code>login block-for 120 attempts 3 within 60</code>: after 3 failures within 60 seconds, the router enters <b>quiet mode</b> for 120 seconds and refuses <b>all</b> remote login attempts, not just the attacker’s (A ✔, D ✘).</p>
<p>So that this DoS doesn’t lock out the admins, <code>login quiet-mode access-class</code> names the hosts that are <b>still allowed</b>. Only 192.168.10.10 is permitted (B ✔, C ✘).</p>
<p><code>login on-failure log</code> produces <code>%SEC_LOGIN-4-LOGIN_FAILED</code> messages, which you can also view with <code>show login failures</code> (E ✔).</p>`
      },
      {
        topic: 'AUTHN', type: 'mcq',
        dg: D.aaaLab(),
        q: `<p>The switch is configured with <code>aaa authentication login default group tacacs+ local</code>, server address 192.168.1.11 and a key matching the one entered during the TACACS.net installation. On the TACACS+ PC the student forgot to edit <code>tacplus.xml</code>:</p>
${out(`C:\\> netstat -an | findstr :49
  TCP    127.0.0.1:49           0.0.0.0:0              LISTENING`)}
<p>What happens when an administrator tries to SSH into the switch?</p>`,
        o: ['TACACS+ credentials work, because the switch and server keys match.',
          'TACACS+ credentials fail. The switch gets no response from 192.168.1.11:49 (an ERROR), so it falls back to the local database, and local credentials work.',
          'All logins fail and the switch is locked out until reload.',
          'TACACS+ credentials work only from the console, not via SSH.'],
        a: [1],
        x: `<p>By default TACACS.net listens on <b>127.0.0.1:49</b>, the loopback address, so it is unreachable from the network. Lab step 2.6 says to change it in <code>tacplus.xml</code> to the PC’s real IP, then restart the service (<code>sc stop TACACS.net</code> / <code>sc start TACACS.net</code>) and check with <code>netstat -an</code>.</p>
<p>The switch’s TCP connection to 192.168.1.11:49 is refused or times out. That is an <b>ERROR</b>, so the next method, <code>local</code>, is used. TACACS+ usernames don’t exist locally, so they fail.</p>`
      },

      /* ============================ AAA Authorization ============================ */
      {
        topic: 'AUTHZ', type: 'multi',
        q: `<p>A router is configured without AAA (no <code>aaa new-model</code>):</p>
${cli(`R1(config)# username USER privilege 1 secret cisco
R1(config)# privilege exec level 5 ping
R1(config)# enable secret level 5 cisco5
R1(config)# username SUPPORT privilege 5 secret cisco5
R1(config)# privilege exec level 10 reload
R1(config)# enable secret level 10 cisco10
R1(config)# username JR-ADMIN privilege 10 secret cisco10
R1(config)# line vty 0 15
R1(config-line)# login local`)}
<p>Which statements are true after each user logs in via SSH?</p>`,
        o: ['USER can no longer use <code>ping</code>.',
          'SUPPORT can use <code>ping</code> but not <code>reload</code>.',
          'JR-ADMIN can use both <code>ping</code> and <code>reload</code>.',
          'JR-ADMIN can enter <code>configure terminal</code>.',
          'USER can still ping, because commands moved to a higher level remain available at their original level.'],
        a: [0, 1, 2],
        x: `<p>A user can run a command only if they are at the <b>same or a higher</b> privilege level than the command. Lower-level commands are always available at higher levels.</p>
<ul><li>A ✔ and E ✘: <code>privilege exec level 5 ping</code> moves ping from level 1 to level 5, so level-1 users lose it.</li>
<li>B ✔: SUPPORT is at level 5, and reload is at level 10.</li>
<li>C ✔: JR-ADMIN is at level 10, which is ≥ 5 and ≥ 10.</li>
<li>D ✘: <code>configure terminal</code> is still a level-15 command.</li></ul>`
      },
      {
        topic: 'AUTHZ', type: 'multi',
        q: `<p>An administrator creates a CLI view:</p>
${cli(`R1(config)# aaa new-model
R1(config)# exit
R1# enable view
Password:
R1# configure terminal
R1(config)# parser view SHOWVIEW
R1(config-view)# secret cisco
R1(config-view)# commands exec include show version
R1(config-view)# end
R1# disable
R1> enable view SHOWVIEW
Password: cisco`)}
<p>Which commands can be used in this view?</p>`,
        o: ['<code>show version</code>', '<code>show parser view</code>', '<code>show running-config</code>', '<code>ping 10.1.1.1</code>', '<code>exit</code>'],
        a: [0, 1, 4],
        x: `<p>A CLI view contains only the commands explicitly included, <b>plus</b> the commands that are always available: <code>enable</code>, <code>exit</code> and <code>show parser</code> (notes p.14: <code>show ?</code> lists <i>parser</i> and <i>version</i>).</p>
<p><code>show running-config</code> and <code>ping</code> were not included, so they are unavailable. This is the advantage of views over privilege levels: you pick exactly which commands a role gets.</p>`
      },
      {
        topic: 'AUTHZ', type: 'multi',
        q: `<p>Which of the following statements about role-based CLI views and superviews are correct?</p>`,
        o: ['A superview contains CLI views, not individual commands.',
          '<code>commands exec include ping</code> can be entered directly under a superview.',
          'The same CLI view can be added to more than one superview.',
          'Root view is entered with <code>enable view</code> using a separate root password configured with <code>parser view root</code>.',
          'Creating views requires <code>aaa new-model</code> and entering root view first.'],
        a: [0, 2, 4],
        x: `<ul><li>A ✔ and B ✘: a superview only groups views (<code>view SHOWVIEW</code>). Commands cannot be configured in it directly.</li>
<li>C ✔: in the notes, SHOWVIEW belongs to the USER, SUPPORT and ADMIN superviews.</li>
<li>D ✘: root view is entered with <code>enable view</code> and the normal <b>enable secret</b>.</li>
<li>E ✔: the steps are 1. <code>aaa new-model</code>, 2. <code>enable view</code> (root), 3. <code>parser view …</code>.</li></ul>
<p>Up to 15 views can be created.</p>`
      },
      {
        topic: 'AUTHZ', type: 'mcq',
        dg: D.aaaLab(),
        q: `<p>The FreeRADIUS <code>users</code> file contains:</p>
${out(`wendell  Cleartext-Password := "odom"
         Service-Type = NAS-Prompt-User,
         cisco-avpair = "shell:cli-view-name=ADMIN"`)}
<p>The switch has the ADMIN superview defined and is configured with:</p>
${cli(`SW1(config)# aaa new-model
SW1(config)# aaa authentication login default group radius local`)}
<p>There is no other AAA configuration. Where does <b>wendell</b> land after a successful SSH login?</p>`,
        o: ['In the ADMIN superview, because RADIUS returned cli-view-name in the Access-Accept.',
          'In user EXEC mode (privilege level 1), not in the ADMIN view, because the switch does not apply exec authorization without <code>aaa authorization exec</code>.',
          'Authentication fails, because NAS-Prompt-User cannot be used without authorization.',
          'In root view.'],
        a: [1],
        x: `<p>RADIUS does send the authorization attributes in the same Access-Accept, but the device only <b>applies</b> them if exec authorization is enabled, e.g. <code>aaa authorization exec default group radius local</code> (notes p.8 and p.18).</p>
<p>Without it, the priv-lvl and cli-view-name AV-pairs are ignored and the user lands at level 1. Lab 3.3 step 1.1 also reminds you that authorization only works when authentication is configured as well.</p>`
      },

      /* ============================ AAA Accounting ============================ */
      {
        topic: 'ACCT', type: 'multi',
        q: `<p>The following entries appear in the TACACS.net accounting log:</p>
${out(`<102> 2025-10-21 14:02:11 [10.10.10.2:43972] 10/21/2025 14:02:11 NAS_IP=10.10.10.2 Port=tty2
      rem_addr=10.10.10.50 User=alice Flags=Start task_id=41 timezone=UTC service=shell
<102> 2025-10-21 14:02:30 [10.10.10.2:44251] 10/21/2025 14:02:30 NAS_IP=10.10.10.2 Port=tty2
      rem_addr=10.10.10.50 User=alice Flags=Stop task_id=41 timezone=UTC service=shell
      priv-lvl=15 cmd=configure terminal <cr>
<102> 2025-10-21 14:05:41 [10.10.10.2:32751] 10/21/2025 14:05:41 NAS_IP=10.10.10.2 Port=tty2
      rem_addr=10.10.10.50 User=alice Flags=Stop task_id=41 timezone=UTC service=shell
      disc-cause=1 disc-cause-ext=9 elapsed_time=210`)}
<p>Which statements are correct?</p>`,
        o: ['alice connected from the host 10.10.10.50.',
          'The managed network device (the AAA client) is 10.10.10.2.',
          'alice’s EXEC session lasted 210 seconds.',
          'If the TACACS+ server had been down, the RADIUS server would have recorded the second entry (cmd=configure terminal) instead.',
          'The Flags=Start record was generated when alice entered <code>configure terminal</code>.'],
        a: [0, 1, 2],
        x: `<ul><li>A ✔: <b>rem_addr</b> is the remote user’s address.</li>
<li>B ✔: <b>NAS_IP</b> is the device sending the accounting record.</li>
<li>C ✔: 14:02:11 → 14:05:41 = 3 min 30 s = <b>elapsed_time=210</b>.</li>
<li>D ✘: command accounting (<code>aaa accounting commands 15 … group tacacs+</code>) is a <b>TACACS+-only</b> feature. RADIUS cannot record commands.</li>
<li>E ✘: the exec Start is sent when the shell <i>starts</i> at login (<code>start-stop</code>). A command record is a <b>stop-only</b> record sent when the command runs.</li></ul>`
      },
      {
        topic: 'ACCT', type: 'mcq',
        dg: D.aaaLab(),
        q: `<p>Accounting is configured as in Lab 3.4:</p>
${cli(`SW1(config)# aaa accounting exec default start-stop group tacacs+ group radius
SW1(config)# aaa accounting commands 15 default stop-only group tacacs+`)}
<p>The TACACS+ server is disconnected. An administrator logs in via SSH, using RADIUS credentials as the authentication list allows, runs <code>show running-config</code>, and exits. What is recorded?</p>`,
        o: ['The TACACS+ server records everything after it is reconnected, because the switch queues the records.',
          'The RADIUS server records the exec Start and Stop. The <code>show running-config</code> command is not recorded anywhere.',
          'The RADIUS server records the exec Start/Stop and the <code>show running-config</code> command.',
          'Nothing is recorded, because accounting stops when the first server in the list is down.'],
        a: [1],
        x: `<p>Exec accounting falls back from TACACS+ to RADIUS on ERROR, which is what lab steps 1.9–1.12 check in <code>/var/log/freeradius</code>. Command accounting lists <b>only</b> <code>group tacacs+</code>, and RADIUS does not support command accounting anyway, so no command record is produced while TACACS+ is down.</p>`
      },
      {
        topic: 'ACCT', type: 'multi',
        q: `<p>Which statements comparing TACACS+ and RADIUS, as covered in the AAA notes, are correct?</p>`,
        o: ['TACACS+ uses TCP port 49.',
          'RADIUS encrypts the entire packet body.',
          'RADIUS combines authentication and authorization, returning authorization attributes in the Access-Accept.',
          'TACACS+ can authorize individual router commands per user or per group.',
          'RADIUS is mainly used for device administration, and TACACS+ mainly for network access.'],
        a: [0, 2, 3],
        x: `<table class="simple"><tr><th></th><th>TACACS+</th><th>RADIUS</th></tr>
<tr><td>Transport</td><td>TCP 49</td><td>UDP 1812 (auth) / 1813 (acct)</td></tr>
<tr><td>Security</td><td>entire packet body encrypted</td><td>only the password encrypted</td></tr>
<tr><td>AAA functions</td><td>separates authN, authZ and acct</td><td>combines authN + authZ; acct separate</td></tr>
<tr><td>Command authorization</td><td>yes, per user/group</td><td>no</td></tr>
<tr><td>Standard</td><td>mostly Cisco</td><td>open RFC standard</td></tr>
<tr><td>Primary use</td><td>device administration</td><td>network access</td></tr></table>`
      },

      /* ============================ NTP ============================ */
      {
        topic: 'NTP', type: 'mcq',
        dg: D.ntpSeq({ client: 'R2 (NTP client)', server: 'R1 (NTP server)', t1: '10:00:00.000', t2: '10:00:05.300', t3: '10:00:05.400', t4: '10:00:00.500' }),
        q: `<p>The diagram shows one client/server NTP exchange with the four timestamps recorded. Using the formulas from the Lab 3.5 notes, what are R2’s clock offset θ relative to R1 and the round-trip delay δ?</p>`,
        o: ['θ = +5.1 s, δ = 0.4 s', 'θ = +5.0 s, δ = 0.5 s', 'θ = −5.1 s, δ = 0.4 s', 'θ = +4.9 s, δ = 0.6 s'],
        a: [0],
        x: `<p><b>θ = [(T2 − T1) + (T3 − T4)] / 2</b> = [(5.300) + (5.400 − 0.500)] / 2 = (5.3 + 4.9) / 2 = <b>5.1 s</b>. The result is positive, so the client is 5.1 s <i>behind</i> and must move its clock forward.</p>
<p><b>δ = (T4 − T1) − (T3 − T2)</b> = 0.500 − 0.100 = <b>0.4 s</b>. That is the total time minus the server’s processing time.</p>
<p>Remember: T1 and T4 are read from the <i>client</i> clock, T2 and T3 from the <i>server</i> clock.</p>`
      },
      {
        topic: 'NTP', type: 'multi',
        dg: D.syslogLab(),
        q: `<p>R1 was configured with <code>ntp master 5</code>, and R2 with <code>ntp server 10.1.1.1</code>. A few minutes later:</p>
${out(`R2# show ntp associations
  address         ref clock       st   when   poll reach  delay  offset   disp
*~10.1.1.1        127.127.1.1      5     11     64   177  1.312  -0.018  4.298
 * sys.peer, # selected, + candidate, - outlyer, x falseticker, ~ configured`)}
<p>Which statements are true?</p>`,
        o: ['R2 is synchronised to 10.1.1.1.',
          'R1 uses its own internal clock as the reference, as shown by the ref clock 127.127.1.1.',
          '<code>show ntp status</code> on R2 would report stratum 6.',
          'R2 is a stratum 5 time source.',
          'R2 has rejected 10.1.1.1 as a falseticker.'],
        a: [0, 1, 2],
        x: `<ul><li>A ✔: <b>*</b> means sys.peer, the source R2 is synchronised to, and <b>~</b> means configured.</li>
<li>B ✔: <code>ntp master</code> makes R1 an authoritative source using its local clock, shown as reference 127.127.1.1.</li>
<li>C ✔ and D ✘: the <b>st</b> column (5) is the stratum of the <i>server</i>. A client is one hop further, so R2 is stratum <b>6</b>. In the notes, syncing to stratum 1 makes a device stratum 2.</li>
<li>E ✘: a falseticker would be marked <b>x</b>.</li></ul>`
      },
      {
        topic: 'NTP', type: 'mcq',
        q: `<p>NTP authentication is configured between R1 (the server at 10.0.0.1) and S1:</p>
${cli(`R1(config)# ntp authentication-key 1 md5 NTP-pa55w0rd
R1(config)# ntp trusted-key 1
R1(config)# ntp master 3

S1(config)# ntp authentication-key 1 md5 NTP-Pa55w0rd
S1(config)# ntp authenticate
S1(config)# ntp trusted-key 1
S1(config)# ntp server 10.0.0.1 key 1`)}
<p>What is the result?</p>`,
        o: ['S1 synchronises, because the key number 1 matches on both devices.',
          'S1 does not synchronise. The key strings differ (they are case-sensitive), so the MD5 digest S1 computes doesn’t match the one received, and S1 rejects R1’s NTP replies.',
          'S1 synchronises but logs a warning, because NTP authentication is optional.',
          'S1 does not synchronise, because R1 is missing <code>ntp authenticate</code>.'],
        a: [1],
        x: `<p>The server uses the pre-shared key to compute an MD5 digest and sends it with each NTP message. The client re-computes the digest with <i>its</i> key and accepts the message only if the two match.</p>
<p>“NTP-pa55w0rd” ≠ “NTP-Pa55w0rd”, so verification fails. Because S1 has <code>ntp authenticate</code>, it refuses unauthenticated time.</p>
<p>The server side in the notes only needs <code>authentication-key</code> and <code>trusted-key</code>. <code>ntp authenticate</code> is what makes a <i>client</i> insist on authentication.</p>`
      },

      /* ============================ Syslog ============================ */
      {
        topic: 'SYSLOG', type: 'mcq',
        dg: D.syslogLab(),
        q: `<p>On R2 the student configured <code>logging host 172.16.2.3</code> and <code>logging trap warnings</code>, then created and deleted a loopback. The console showed:</p>
${out(`Jul  5 09:57:47.162: %LINK-3-UPDOWN: Interface Loopback0, changed state to up
Jul  5 09:57:48.162: %LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback0, changed state to up
Jul  5 10:02:58.910: %LINK-5-CHANGED: Interface Loopback0, changed state to administratively down
Jul  5 10:02:59.910: %LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback0, changed state to down`)}
<p>How many of these messages appear on the Tftpd64 syslog server on PC-B?</p>`,
        fixed: true,
        o: ['0', '1', '2', '4'],
        a: [1],
        x: `<p><code>logging trap warnings</code> = level <b>4</b>, so only severities <b>0–4</b> are sent. The severity is the digit in <code>%FACILITY-<b>n</b>-MNEMONIC</code>: 3, 5, 5, 5. Only <b>%LINK-3-UPDOWN</b> qualifies, so 1 message.</p>
<p>In the lab, changing to <code>logging trap 6</code> (informational) makes all four appear.</p>`
      },
      {
        topic: 'SYSLOG', type: 'multi',
        q: `<p>A router configured with <code>logging host 172.16.2.3</code> and <code>logging trap errors</code> displays this message on its console:</p>
${out(`*Oct 21 09:15:02.118: %SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: admin] [Source: 203.0.113.5]
 [localport: 22] [Reason: Login Authentication Failed] at 09:15:02 UTC Tue Oct 21 2025`)}
<p>Which statements are correct?</p>`,
        o: ['The facility is SEC_LOGIN and the mnemonic is LOGIN_FAILED.',
          'The severity level is 4 (warnings).',
          'This message is forwarded to the syslog server at 172.16.2.3.',
          'The leading asterisk shows that the router’s clock is not authoritative (e.g. not synchronised by NTP).',
          'By default the message would be sent to the syslog server over TCP port 514.'],
        a: [0, 1, 3],
        x: `<p>Message anatomy is timestamp, <b>%FACILITY</b>-<b>SEVERITY</b>-<b>MNEMONIC</b>, then the description (A ✔, B ✔).</p>
<p><code>logging trap errors</code> = 3, so only levels 0–3 are sent and this level-4 message is not (C ✘). That is a real risk: failed logins can go unseen.</p>
<p>The <b>*</b> means the time isn’t authoritative, i.e. not synced. Once NTP syncs, the asterisk disappears, as in the lab output (D ✔).</p>
<p>Syslog uses <b>UDP 514</b> (RFC 5426). Secure syslog uses TLS over TCP 6514 (RFC 5425) (E ✘).</p>`
      },
      {
        topic: 'SYSLOG', type: 'mcq',
        q: `<p>An administrator is connected to R2 via SSH. <code>logging monitor</code> is enabled at its default level (debugging). When the administrator shuts down and re-enables a loopback interface, the log messages appear on the <b>console</b> session but not in the SSH session. Which command must the administrator enter in the SSH session?</p>`,
        o: ['<code>logging synchronous</code>', '<code>terminal monitor</code>', '<code>logging console</code>', '<code>logging buffered</code>'],
        a: [1],
        x: `<p>Monitor logging sends messages to VTY (Telnet/SSH) sessions, but each session must also opt in with the exec command <b><code>terminal monitor</code></b> (notes p.23).</p>
<p><code>logging synchronous</code> (a line command) only stops messages from breaking up what you are typing. <code>logging console</code> controls the console, and <code>logging buffered</code> stores messages in RAM (view them with <code>show logging</code>).</p>`
      },

      /* ============================ NetFlow ============================ */
      {
        topic: 'NETFLOW', type: 'mcq',
        dg: D.netflowLab({ pc1: 'NetFlow Analyzer (listens UDP 9996)' }),
        q: `<p>A student configured Flexible NetFlow on R1:</p>
${cli(`R1(config)# flow exporter COLLECTOR
R1(config-flow-exporter)# destination 192.168.1.50
R1(config-flow-exporter)# transport udp 9999
R1(config-flow-exporter)# export-protocol netflow-v9
R1(config)# flow monitor MON
R1(config-flow-monitor)# record netflow ipv4 original-input
R1(config-flow-monitor)# exporter COLLECTOR
R1(config-flow-monitor)# cache timeout active 30
R1(config)# interface g0/0/1
R1(config-if)# ip flow monitor MON input`)}
<p>Wireshark on PC1 shows UDP datagrams from 192.168.1.1 to 192.168.1.50 port 9999 every ~30 s, but the NetFlow Analyzer (configured to listen on UDP 9996) displays no data. What is the fix?</p>`,
        o: ['Apply the monitor in both the input and output directions; export only starts when both are configured.',
          'Change the exporter to <code>transport udp 9996</code> to match the collector’s listening port.',
          'Change the export protocol to IPFIX, because NetFlow Analyzer only accepts IPFIX.',
          'Add <code>source loopback0</code>, because collectors only accept exports sourced from a loopback interface.'],
        a: [1],
        x: `<p>The four building blocks work: the record is predefined, the exporter sends, the monitor ties them together, and it is applied to the interface. The capture proves records are being exported, but to the wrong port.</p>
<p>The exporter’s <code>destination</code> and <code>transport udp &lt;port&gt;</code> must match the collector’s listener. The <code>source</code> command is optional; it only changes the exporter’s source IP.</p>`
      },
      {
        topic: 'NETFLOW', type: 'multi',
        dg: D.netflowLab(),
        q: `<p>PC2 runs <code>ping 10.0.0.1 -t -l 1475</code>. R1 shows the following cache entry for the input monitor on G0/0/1 (record <i>netflow ipv4 original-input</i>):</p>
${out(`IPV4 SOURCE ADDRESS:       192.168.1.75
IPV4 DESTINATION ADDRESS:  10.0.0.1
TRNS SOURCE PORT:          0
TRNS DESTINATION PORT:     2048
INTERFACE INPUT:           Gi0/0/1
IP TOS:                    0x00
IP PROTOCOL:               1
counter bytes:             12024
counter packets:           8`)}
<p>Which statements are correct?</p>`,
        o: ['This flow is the ICMP echo requests from PC2 to R1’s Loopback0.',
          'The “destination port” 2048 encodes ICMP type 8, code 0 (8 × 256 + 0).',
          'Each packet is 1503 bytes, i.e. 1475 bytes of data + 8-byte ICMP header + 20-byte IP header.',
          'R1’s echo replies to PC2 are counted in this same flow record.',
          'IP protocol 1 indicates TCP.'],
        a: [0, 1, 2],
        x: `<ul><li>A ✔: the source is PC2 (.75) and the destination is Lo0 10.0.0.1.</li>
<li>B ✔: for ICMP, NetFlow puts <b>type × 256 + code</b> in the destination-port field. Echo request (8,0) = 2048; echo-reply (0,0) = 0.</li>
<li>C ✔: 12024 / 8 = 1503 = 1475 + 8 + 20.</li>
<li>D ✘: a flow is <b>unidirectional</b>. The replies are a separate flow with source 10.0.0.1, and they leave via G0/0/1 <i>output</i>, so this input monitor doesn’t see them.</li>
<li>E ✘: protocol 1 = ICMP, 6 = TCP, 17 = UDP.</li></ul>`
      },
      {
        topic: 'NETFLOW', type: 'mcq',
        dg: D.netflowLab(),
        q: `<p>A custom record is applied to an <b>input</b> monitor on R1 G0/0/1:</p>
${cli(`R1(config)# flow record DST-ONLY
R1(config-flow-record)# match ipv4 destination address
R1(config-flow-record)# match transport destination-port
R1(config-flow-record)# collect counter bytes
R1(config-flow-record)# collect counter packets`)}
<p>Within one active-timeout period, the following traffic enters G0/0/1, and no other IP traffic (e.g. NTP) is present:</p>
<ul><li>PC2 continuously pings 10.0.0.1</li><li>PC1 continuously pings 10.0.0.1</li><li>A1 opens one Telnet session to 10.0.0.1</li><li>PC1 opens three separate HTTP connections to 10.0.0.1</li></ul>
<p>How many flow entries are in the cache?</p>`,
        fixed: true,
        o: ['2', '3', '4', '6'],
        a: [1],
        x: `<p>A flow is defined by its <b>key (match) fields</b>. Here the keys are only the destination address and destination port, so the source IP and source port are ignored and flows that differ only in those merge.</p>
<ul><li>(10.0.0.1, 2048): both pings, ICMP echo</li><li>(10.0.0.1, 23): Telnet</li><li>(10.0.0.1, 80): all three HTTP connections</li></ul>
<p>That gives <b>3</b> entries. With the default 7-key record (source/destination IP, source/destination port, protocol, ToS, input interface) it would be 2 + 1 + 3 = 6.</p>`
      }
    ]
  };
})();
