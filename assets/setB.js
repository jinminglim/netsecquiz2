/* Set B — 50 scenario questions (Topic 2 & 3) */
(function () {
  const S = (window.QSETS = window.QSETS || {});
  const tag = (x, y, t, color) => ({ x, y, t, color });

  const slowSeq = NetDiag.seq({
    w: 600, h: 250,
    actors: [{ id: 'A', name: 'Attacker (slowhttptest)', x: 130, w: 170 }, { id: 'S', name: 'Web Server :80', x: 470, w: 140 }],
    msgs: [
      { from: 'A', to: 'S', y: 62, t: 'SYN / SYN-ACK / ACK  (handshake completes)', color: '#1e8449' },
      { from: 'A', to: 'S', y: 102, t: 'GET / HTTP/1.1\\r\\n  Host: …\\r\\n', color: '#c0392b' },
      { from: 'A', to: 'S', y: 142, t: 'X-a: 1\\r\\n   (≈10 s later)', color: '#c0392b' },
      { from: 'A', to: 'S', y: 182, t: 'X-a: 2\\r\\n   (≈10 s later) …', color: '#c0392b' }
    ],
    notes: [{ x: 300, y: 222, t: 'The final blank line \\r\\n\\r\\n never arrives → the connection stays reserved × 1000 connections', a: 'middle', color: '#c0392b', bold: true }]
  });

  S.B = {
    title: 'Lab-scenario mix',
    desc: 'ACL numbering, wildcards & editing, ASA stateful behaviour & NAT, embryonic vs per-client limits, VRF tables, SSH keys, Proxmox, RADIUS/TACACS+ internals, NTP ACLs, syslog counting, NetFlow timeouts.',
    questions: [
      /* ============================ ACL ============================ */
      {
        topic: 'ACL', type: 'multi',
        q: `<p>A student tries to create a standard numbered ACL on R1:</p>
${cli(`R1(config)# access-list 150 permit 192.168.10.0 0.0.0.255
                                     ^
% Invalid input detected at '^' marker.`)}
<p>Which of the following ACL numbers could the student use to create a <b>standard</b> numbered ACL?</p>`,
        o: ['1', '99', '100', '1350', '2000'],
        a: [0, 1, 3],
        x: `<p><b>Standard</b> numbered ACLs use <b>1–99</b> and <b>1300–1999</b>. <b>Extended</b> numbered ACLs use <b>100–199</b> and <b>2000–2699</b>.</p>
<p>Because 150 is an extended number, IOS expects a protocol (ip/tcp/udp/icmp) after <code>permit</code>, so it rejects the IP address at the ^ marker. 100 and 2000 are also extended.</p>`
      },
      {
        topic: 'ACL', type: 'multi',
        q: `<p>An ACL is configured as follows:</p>
${cli(`R1(config)# access-list 20 permit 172.16.0.0 0.0.255.254`)}
<p>Which source IP addresses match this ACE?</p>`,
        o: ['172.16.4.2', '172.16.4.1', '172.16.255.254', '172.17.0.2', '172.16.0.0'],
        a: [0, 2, 4],
        x: `<p>In a wildcard mask, a <b>0 bit means “must match”</b> and a <b>1 bit means “ignore”</b>. 0.0.255.254 requires the first two octets to be <b>172.16</b> and the <b>last bit</b> to equal 0, i.e. even addresses only. This is the notes’ p.13 example.</p>
<ul><li>.4.2 ✔ even</li><li>.4.1 ✘ odd</li><li>.255.254 ✔ even</li><li>172.17.x ✘ wrong second octet</li><li>.0.0 ✔ even</li></ul>`
      },
      {
        topic: 'ACL', type: 'multi',
        dg: D.aclLab({ extra: { tags: [tag(95, 216, 'VLAN1: BRANCH-OFFICE-POLICY out', '#8e44ad')] } }),
        q: `<p>In Lab 2.1a the student configured a named standard ACL on DSW1. Static routes give full connectivity, and there are no other ACLs.</p>
${cli(`DSW1(config)# ip access-list standard BRANCH-OFFICE-POLICY
DSW1(config-std-nacl)# permit host 192.168.20.3
DSW1(config-std-nacl)# permit 192.168.40.0 0.0.0.255
DSW1(config-std-nacl)# exit
DSW1(config)# interface vlan 1
DSW1(config-if)# ip access-group BRANCH-OFFICE-POLICY out`)}
<p>Which of the following pings succeed?</p>`,
        o: ['PC-B pings PC-A.',
          'DSW2 extended ping to PC-A with source 192.168.20.1 (VLAN 1 of DSW2).',
          'DSW2 extended ping to PC-A with source 192.168.40.1 (Lo0 of DSW2).',
          'PC-A pings R1’s Lo0 at 209.165.200.225.',
          '<code>DSW1# ping 192.168.10.3</code> (from DSW1 itself to PC-A).'],
        a: [0, 2, 4],
        x: `<p>The ACL filters packets <b>leaving DSW1 VLAN 1 toward PC-A’s LAN</b>, by source IP.</p>
<ul><li>A ✔: the source is 192.168.20.3, which is permitted. PC-A’s reply leaves via G1/0/1, which has no ACL.</li>
<li>B ✘: source 192.168.20.1 is not permitted, so the implicit deny drops it. Lab step 4: “only PC-B host is allowed”.</li>
<li>C ✔: 192.168.40.0/24 is permitted.</li>
<li>D ✘: the request goes out fine, but the echo-<b>reply</b> from 209.165.200.225 exits VLAN 1 and is denied. Filtering one direction is enough to break a ping.</li>
<li>E ✔: packets originated by DSW1 itself are not filtered by its own outbound ACL.</li></ul>`
      },
      {
        topic: 'ACL', type: 'mcq',
        dg: D.aclLab({ extra: { tags: [tag(95, 216, 'VLAN1: BRANCH-OFFICE-POLICY out', '#8e44ad')] } }),
        q: `<p>Management decides that 209.165.200.224/27 must get full access to 192.168.10.0/24, and that every ACL must end with an explicit <code>deny any</code>. The student modifies the ACL in place (Option 2 in the lab):</p>
${out(`DSW1# show access-lists
Standard IP access list BRANCH-OFFICE-POLICY
    10 permit 192.168.20.3 (8 matches)
    20 permit 192.168.40.0, wildcard bits 0.0.0.255 (5 matches)`)}
${cli(`DSW1(config)# ip access-list standard BRANCH-OFFICE-POLICY
DSW1(config-std-nacl)# 30 permit 209.165.200.224 0.0.0.31
DSW1(config-std-nacl)# 40 deny any
DSW1(config-std-nacl)# end`)}
<p>Which statement is correct?</p>`,
        o: ['The ACL must be removed from VLAN 1 and re-applied with <code>ip access-group … out</code> for the new entries to take effect.',
          'Entries 30 and 40 are appended and take effect immediately. An extended ping from R1 sourced from Lo0 (209.165.200.225) to PC-A now succeeds, and denied packets are now counted against entry 40.',
          'The changes only take effect after <code>clear access-list counters</code> is entered.',
          'The new entries are inserted above entries 10 and 20, because explicitly numbered entries are always processed first.'],
        a: [1],
        x: `<p>An ACL is referenced by name from the interface, so in-place edits apply <b>immediately</b>; there is no need to re-apply it (lab question: “Do you have to apply the modified ACL again?” No).</p>
<p>Sequence numbers decide the position: 30 and 40 come after 20. Adding an explicit <code>deny any</code> gives you a match counter for denied packets, which the implicit deny never shows.</p>`
      },
      {
        topic: 'ACL', type: 'mcq',
        q: `<p>R1 has a numbered extended ACL that was created with global configuration commands and is applied with <code>ip access-group 101 in</code> on G0/0/0:</p>
${out(`R1# show access-lists 101
Extended IP access list 101
    10 permit tcp any host 10.1.1.5 eq www
    20 deny tcp any host 10.1.1.5 eq telnet
    30 permit ip any any`)}
<p>To remove only line 20, the student enters in global configuration mode:</p>
${cli(`R1(config)# no access-list 101 deny tcp any host 10.1.1.5 eq telnet`)}
<p>What is the result?</p>`,
        o: ['Only entry 20 is removed and entries 10 and 30 remain.',
          'The <b>entire</b> ACL 101 is deleted, not just entry 20. G0/0/0 still has <code>ip access-group 101 in</code> referencing a now non-existent ACL.',
          'The command is rejected, because numbered ACL entries can only be removed by sequence number.',
          'Only entry 20 is removed and the remaining entries are renumbered 10 and 20.'],
        a: [1],
        x: `<p>With the classic global syntax, <code>no access-list 101 …</code> deletes the <b>whole</b> numbered ACL, whatever follows the number.</p>
<p>The safe way to delete a single line is the named/sequence style: <code>ip access-list extended 101</code> then <code>no 20</code> (notes p.26).</p>
<p>The lab notes add that, depending on the IOS, an interface left referencing a removed ACL either passes all traffic or keeps filtering. Either way, you didn’t get what you wanted.</p>`
      },
      {
        topic: 'ACL', type: 'mcq',
        dg: D.edge({ pcName: 'Inside PCs', pcIp: '192.168.1.0/24', extra: { tags: [tag(380, 50, 'INET-IN in')] } }),
        q: `<p>ACL INET-IN is applied inbound on R1 G0/0/1 (Internet side) and ends with the implicit deny. Inside users must be able to ping Internet hosts, but Internet hosts must <b>not</b> be able to ping inside hosts. Which ACE should be added to INET-IN?</p>`,
        o: ['<code>permit icmp any 192.168.1.0 0.0.0.255 echo-reply</code>',
          '<code>permit icmp any 192.168.1.0 0.0.0.255 eq echo-reply</code>',
          '<code>permit icmp any 192.168.1.0 0.0.0.255 echo</code>',
          '<code>permit icmp 192.168.1.0 0.0.0.255 any echo-reply</code>'],
        a: [0],
        x: `<p>Inside → outside echo requests leave without restriction (no outbound ACL). Only the returning <b>echo-reply</b> (source = Internet host, destination = 192.168.1.x) must be permitted inbound.</p>
<ul><li>The <code>eq</code> form is invalid: there is no <code>eq</code> for ICMP message types (notes p.23).</li>
<li><code>echo</code> would allow Internet hosts to start pings, and still block the replies.</li>
<li>The last option has source and destination reversed.</li></ul>`
      },
      {
        topic: 'ACL', type: 'mcq',
        dg: D.aclLab({ extra: { tags: [tag(95, 216, 'VLAN1: ACL 120 in')] } }),
        q: `<p>A student wants PC-A’s LAN to be able to browse websites (HTTP) and resolve names (DNS), and writes:</p>
${cli(`DSW1(config)# access-list 120 permit tcp 192.168.10.0 0.0.0.255 eq www any
DSW1(config)# access-list 120 permit udp 192.168.10.0 0.0.0.255 any eq domain
DSW1(config)# interface vlan 1
DSW1(config-if)# ip access-group 120 in`)}
<p>Name resolution works, but no HTTP website can be opened. Why?</p>`,
        o: ['<code>eq www</code> written after the <i>source</i> matches the <b>source</b> port 80. Browsers use a random (ephemeral) source port and destination port 80, so the ACE should be <code>permit tcp 192.168.10.0 0.0.0.255 any eq www</code>.',
          'The keyword <code>www</code> is invalid in extended ACLs; the number 80 must be used.',
          'The DNS entry is processed first and implicitly denies all TCP traffic.',
          'Extended ACLs must be placed close to the destination, so the ACL must be moved to R1.'],
        a: [0],
        x: `<p>The syntax is <code>permit tcp SRC [operator port] DST [operator port]</code>. The port operator applies to whichever address it follows. Here <code>eq www</code> follows the source, so it matches packets <i>from</i> port 80, i.e. replies from web servers, not requests.</p>
<p>The DNS ACE is correct because <code>eq domain</code> follows <code>any</code>, the destination. Port names such as www (80), domain (53), ftp (21), telnet (23) and tftp (69) are valid (notes p.22).</p>`
      },

      /* ============================ ASA ============================ */
      {
        topic: 'ASA', type: 'multi',
        dg: D.asaLab({ extra: { tags: [tag(420, 100, 'OUTSIDE in', '#8e44ad')] } }),
        q: `<p>Consider the above topology as set up in the lab, with NAT removed. A student applies the following, but does <b>not</b> add <code>inspect icmp</code> to the default global_policy:</p>
${cli(`ciscoasa(config)# access-list OUTSIDE extended permit icmp any any
ciscoasa(config)# access-group OUTSIDE in interface outside`)}
<p>Assuming every host replies to ping, which pings succeed?</p>`,
        o: ['Inside User 1 → Internet Web Server',
          'User on the Internet → DMZ Web Server',
          'User on the Internet → Inside User 1',
          'Inside User 1 → DMZ Web Server',
          'DMZ Web Server → Inside User 2'],
        a: [0, 1, 2],
        x: `<p>Without inspection, ICMP is handled <b>packet by packet</b>, with no state. Each packet must be allowed by the security levels or by an ACL on the interface where it <i>enters</i>.</p>
<ul><li>A ✔: the request goes out 100 → 0 (allowed), and the reply enters on outside and is permitted by the ACL.</li>
<li>B ✔: the request enters on outside (ACL permits it), and the reply goes out 50 → 0 (allowed).</li>
<li>C ✔: <code>icmp any any</code> lets the Internet ping straight into the inside (no NAT), and the reply goes out 100 → 0. That is a security hole.</li>
<li>D ✘: the reply from the DMZ enters on dmz (50 → 100), with no ACL and no state.</li>
<li>E ✘: 50 → 100 is denied.</li></ul>`
      },
      {
        topic: 'ASA', type: 'mcq',
        dg: D.asaLab({ extra: { tags: [tag(250, 100, 'INSIDE_OUT in', '#8e44ad')] } }),
        q: `<p>Inside users could previously SSH to Internet servers and browse HTTPS sites. A student then adds:</p>
${cli(`ciscoasa(config)# access-list INSIDE_OUT extended permit tcp 10.0.0.0 255.255.255.0 any eq www
ciscoasa(config)# access-group INSIDE_OUT in interface inside`)}
<p>Now inside users can only open HTTP sites; SSH and HTTPS fail. Why?</p>`,
        o: ['Once an ACL is applied inbound on the inside interface, it replaces the default “allow traffic to lower security levels”. Only HTTP is permitted, and everything else hits the implicit deny.',
          'The outside interface now drops return traffic for SSH and HTTPS, because those protocols are not inspected.',
          'ASA ACLs are applied in both directions, so replies from SSH servers are now blocked.',
          'HTTPS and SSH need <code>inspect https</code> and <code>inspect ssh</code> in the global_policy.'],
        a: [0],
        x: `<p>Security levels are only the <b>default</b> when no ACL is applied to an interface. With an inbound ACL on inside, traffic entering inside is permitted <i>only</i> if an ACE matches, followed by the implicit deny.</p>
<p>To keep other traffic you would add, for example, <code>permit tcp 10.0.0.0 255.255.255.0 any eq 443</code>. Return traffic of permitted connections is still handled statefully.</p>`
      },
      {
        topic: 'ASA', type: 'mcq',
        dg: D.asaLab(),
        q: `<p>No ACL has been applied yet (Lab 2.2 Part 2). At the same moment, Inside User 1 (10.0.0.25) and the User on the Internet (23.1.2.10) both try to browse the DMZ Web Server. The student then enters <code>show conn</code>. What does the state table show?</p>`,
        o: ['A single TCP entry between inside 10.0.0.25 and dmz 192.168.2.100:80.',
          'Two entries, with the outside user’s entry flagged as denied.',
          'Only the entry for the outside user, because the inside user’s connection is trusted and not tracked.',
          'No entries, because the DMZ has a lower security level than the inside.'],
        a: [0],
        x: `<p>The firewall only creates a connection entry for traffic it <b>permits</b>. Inside (100) → DMZ (50) is allowed and appears as <code>TCP inside 10.0.0.25:xxxxx dmz 192.168.2.100:80 … flags UIO</code>.</p>
<p>The outside user’s SYN (0 → 50) is dropped before any state is created. After an ACL is added in Part 3, you would see a second entry from outside.</p>`
      },
      {
        topic: 'ASA', type: 'mcq',
        q: `<p>To reset the Firepower/ASA at the end of the lab, a student enters:</p>
${cli(`ciscoasa# write erase
Erase configuration in flash memory? [confirm]
[OK]
ciscoasa# reload
System config has been modified. Save? [Y]es / [N]o: Y`)}
<p>What happens after the reload?</p>`,
        o: ['The firewall boots with an empty/factory configuration.',
          'Answering <b>Y</b> saves the current running configuration back to flash, so the firewall boots with the student’s configuration and the next group inherits it.',
          'The reload is cancelled.',
          'The firewall boots into ROMMON because the startup configuration is missing.'],
        a: [1],
        x: `<p><code>write erase</code> erases the startup configuration, but the <b>running</b> configuration is still in memory. When <code>reload</code> asks to save, you must answer <b>N</b> (lab step 5.3). Otherwise the running configuration is written back and the erase is undone.</p>
<p>The alternative is <code>configure factory-default</code> from configuration mode.</p>`
      },
      {
        topic: 'ASA', type: 'multi',
        q: `<p>Which statements about Firepower/ASA security levels are correct?</p>`,
        o: ['An interface named <code>inside</code> gets security level 100 by default.',
          'Traffic from a higher to a lower security level is allowed by default, and the return traffic is allowed statefully.',
          'A DMZ interface must use security level 50; any other value is rejected.',
          'By default, hosts on a DMZ (level 50) can initiate connections to hosts on the inside (level 100).',
          'An ACL can override the default policy to permit traffic from a lower to a higher security level.'],
        a: [0, 1, 4],
        x: `<p>Security levels range from 0 to 100. <code>nameif inside</code> defaults to 100, and other names default to 0. 50 is simply the lab’s choice for the DMZ; any value from 0 to 100 is allowed.</p>
<p>The default is higher → lower allowed and lower → higher blocked. An ACL overrides this, and that is how the DMZ server is published (Part 3).</p>`
      },
      {
        topic: 'ASA', type: 'mcq',
        dg: D.asaLab(),
        q: `<p>A student skipped the lab note about the pre-configured NAT. Wireshark on the User on the Internet shows Inside User 1’s web requests arriving with source IP <b>23.1.2.3</b> instead of 10.0.0.25. The running configuration still contains:</p>
${conf(`object network obj_any
 subnet 0.0.0.0 0.0.0.0
 nat (any,outside) dynamic interface`)}
<p>What explains the observation?</p>`,
        o: ['The default dynamic NAT (PAT) translates the source address of traffic leaving through outside to the outside interface’s own IP address.',
          'The firewall proxies all HTTP connections and always uses its own address.',
          'Inside User 1 has its default gateway set to 23.1.2.3.',
          'TCP Intercept rewrites source addresses when the embryonic limit is reached.'],
        a: [0],
        x: `<p><code>nat (any,outside) dynamic interface</code> is dynamic PAT to the interface address. To see real addresses and keep the ACLs simple, the lab removes it with <code>object network obj_any</code> → <code>no nat (any,outside) dynamic interface</code>.</p>
<p>The lab also removes <code>nameif inside</code> from <code>int vlan 1</code>, because interface names must be unique.</p>`
      },

      /* ============================ SYN flood ============================ */
      {
        topic: 'SYN', type: 'mcq',
        dg: D.fpLab({ atk: '45.1.1.7 (spoofs many)' }),
        q: `<p>During the attack the student runs this on the web server:</p>
${out(`kali@kali:~$ ss -t -r state syn-recv | head -4
Recv-Q Send-Q   Local Address:Port      Peer Address:Port
0      0        192.168.2.100:http      45.1.1.7:4521
0      0        192.168.2.100:http      101.77.3.9:38810
0      0        192.168.2.100:http      12.200.4.61:61002`)}
<p>What do these entries represent?</p>`,
        o: ['Established connections that are waiting for the client to send its HTTP request.',
          'Connections in TIME-WAIT after the client closed them.',
          'Half-open (embryonic) connections: the server received a SYN and sent a SYN-ACK, and is waiting for the final ACK.',
          'Connections the server initiated, waiting for a SYN-ACK from the peer (SYN-SENT).'],
        a: [2],
        x: `<p><b>SYN-RECV</b> is the server-side half-open state. Counting these lines (<code>| wc -l</code>) is how the lab shows the backlog filling to the 512 maximum.</p>
<p>Many different peer addresses and ports point to spoofed sources. Once the backlog is full, legitimate users like PC-A cannot connect.</p>`
      },
      {
        topic: 'SYN', type: 'multi',
        dg: D.fpLab(),
        q: `<p>Which of the following measures help mitigate a TCP SYN flood with randomly spoofed source addresses against the DMZ web server?</p>`,
        o: ['MPF <code>set connection embryonic-conn-max</code> on a class matching traffic to the server',
          'Enabling SYN cookies on the server (<code>sysctl -w net.ipv4.tcp_syncookies=1</code>)',
          'An outside ACL <code>permit tcp any host 192.168.2.100 eq www</code>',
          'MPF <code>set connection per-client-max 10</code>',
          'MPF <code>set connection timeout embryonic 0:00:05</code>, so half-open connections are held for a shorter time'],
        a: [0, 1, 4],
        x: `<ul><li>A ✔: the embryonic limit triggers the firewall’s TCP Intercept.</li>
<li>B ✔: SYN cookies are the server-side defence (the lab disabled them on purpose).</li>
<li>E ✔: a shorter embryonic timeout frees slots faster.</li>
<li>C ✘: the ACL is what <i>lets</i> port 80 in, and it cannot tell attack SYNs apart.</li>
<li>D ✘: per-client limits are useless when every packet has a different spoofed source. It also counts established connections, not embryonic ones.</li></ul>`
      },
      {
        topic: 'SYN', type: 'multi',
        dg: D.fpLab({ extra: { tags: [tag(190, 52, 'WEB-POLICY (inside)', '#8e44ad')] } }),
        q: `<p>A student configured a correct class-map and policy-map with <code>set connection embryonic-conn-max 50</code> for traffic to 192.168.2.100:80, but applied it as:</p>
${cli(`ciscoasa(config)# service-policy WEB-POLICY interface inside`)}
<p>The Attacker’s SYN flood from the outside still brings the server down. Which statements are true?</p>`,
        o: ['The attack traffic (outside → dmz) never enters or leaves the inside interface, so the policy is never applied to it.',
          'Applying the service-policy to the outside interface instead would protect the server.',
          'The class-map must match on the TCP SYN flag; that is why the policy has no effect.',
          'Embryonic limits only work together with <code>inspect http</code>.',
          'A policy-map applied to an interface only takes effect after the firewall reloads.'],
        a: [0, 1],
        x: `<p>An interface service-policy only acts on traffic passing through <b>that</b> interface. The SYN flood enters on <b>outside</b> and leaves on <b>dmz</b>, so the policy belongs on outside (or dmz).</p>
<p>The class-map simply matches the server and port, and the connection limits handle half-open detection themselves. Changes take effect immediately.</p>`
      },
      {
        topic: 'SYN', type: 'mcq',
        q: `<p>Which statement correctly contrasts the DoS attacks studied in Topic 2, according to the lab notes?</p>`,
        o: ['Slowloris is a <b>low-rate</b> attack: a small amount of maliciously crafted traffic, even from a single PC, can make a server unavailable. Smurf and TCP SYN flooding are <b>volumetric</b> attacks that send overwhelming amounts of traffic.',
          'Slowloris is volumetric and needs a large botnet, while Smurf and TCP SYN flooding are low-rate.',
          'All three attacks abuse ICMP directed broadcasts.',
          'Slowloris targets the TCP 3-way handshake, while SYN flooding targets incomplete HTTP request headers.'],
        a: [0],
        x: `<p>Straight from the notes: “In contrast to Smurf and TCP SYN flooding attacks which are volumetric-based DoS/DDoS…, Slowloris is an example of low-rate DoS/DDoS…” and “a single attacker’s PC is sufficient to bring down a server”.</p>
<p>SYN flooding abuses the <b>handshake</b> (half-open connections). Slowloris abuses <b>HTTP</b> (incomplete request headers).</p>`
      },

      /* ============================ Slowloris ============================ */
      {
        topic: 'SLOW', type: 'mcq',
        dg: slowSeq,
        q: `<p>The diagram shows how Slowloris works. Which weakness of the HTTP protocol does it exploit?</p>`,
        o: ['The server must receive the complete HTTP request header before it can respond, and the connection stays reserved for that client until then.',
          'An HTTP server must answer every SYN with a SYN-ACK.',
          'HTTP runs over UDP, so the server cannot track connection state.',
          'HTTP servers reply to broadcast pings, which amplifies traffic.'],
        a: [0],
        x: `<p>HTTP needs the full request header, ending with an empty line (<code>\\r\\n\\r\\n</code>), before it responds. Slowloris opens many connections, sends a partial header, and then keeps adding a header line very slowly. Each connection stays reserved, the server runs out of connection slots, and legitimate users are refused.</p>`
      },
      {
        topic: 'SLOW', type: 'multi',
        dg: D.fpLab(),
        q: `<p>To defend against Slowloris, a student configures only <code>set connection conn-max 50</code> for the class matching HTTP to 192.168.2.100, applied on outside. The single Attacker then runs <code>slowhttptest -c 1000</code>. Which statements are true?</p>`,
        o: ['The server itself is not overwhelmed, because the firewall allows at most 50 concurrent connections to it.',
          'PC-A still cannot browse the web server, because the attacker holds all 50 allowed connections.',
          '<code>set connection per-client-max</code> would be a better choice for this attack.',
          '<code>conn-max 50</code> limits each client to 50 connections.',
          'Slowloris connections are embryonic, so they do not count towards conn-max.'],
        a: [0, 1, 2],
        x: `<p><b>conn-max</b> is a limit for the <b>whole class</b>. One attacker can use up all 50 slots, so the DoS simply moves from the server to the firewall rule (A ✔, B ✔).</p>
<p><b>per-client-max</b> limits each source IP, which stops a single attacker while other clients are served (C ✔).</p>
<p>D ✘ describes per-client-max. E ✘: Slowloris connections are fully established.</p>`
      },
      {
        topic: 'SLOW', type: 'mcq',
        q: `<p>Instead of connection limits, a student adds <code>set connection timeout idle 0:01:00</code> for web traffic. slowhttptest is launched with its default behaviour of sending a new header line about every 10 seconds on each connection. Is the defence effective?</p>`,
        o: ['No. Each connection sends data every ~10 s, so it is never idle for 60 s and the idle timer never expires.',
          'Yes. The idle timeout resets every connection to the server once a minute.',
          'Yes, because Slowloris connections are embryonic and idle by definition.',
          'No, because idle timeouts only apply to UDP.'],
        a: [0],
        x: `<p>An idle timeout closes connections that pass <i>no traffic</i> for the set time. Slowloris deliberately trickles a byte or a header line before typical timeouts, keeping each connection “active” while never finishing the request.</p>
<p>The effective controls are <b>per-client-max</b> and/or <b>conn-max</b>. That is why the lab asks you to try the different <code>set connection ?</code> parameters.</p>`
      },

      /* ============================ OOB / VRF / SSH ============================ */
      {
        topic: 'OOB', type: 'multi',
        dg: D.oob(),
        q: `<p>Referring to the diagram, which statements about in-band and out-of-band (OoB) management are correct?</p>`,
        o: ['OoB management uses a separate, dedicated network for management only, with no user traffic on it.',
          'In-band management traffic flows over the same network as user traffic.',
          'In-band management is more secure, because management traffic is hidden among user traffic.',
          'Catalyst 9200L/9300L switches and the Firepower 1010 have dedicated management ports for connecting to an OoB LAN.',
          'The Catalyst 8200L router has a dedicated management port, so VRF is never needed for OoB on it.'],
        a: [0, 1, 3],
        x: `<p>In-band management over the production LAN is exposed to attacks by malicious users there, which is why a separate OoB management LAN is recommended (A ✔, B ✔, C ✘).</p>
<p>The 9200L, 9300L and Firepower 1010 have management ports (D ✔). The <b>8200L has none</b>, so VRF is used to separate management traffic (a “management VRF”) (E ✘).</p>`
      },
      {
        topic: 'OOB', type: 'multi',
        dg: D.vrf5(),
        q: `<p>A router is configured as shown: Gi0/1 and Gi1/1 are in VRF <b>Red</b>, Gi0/2 and Gi1/2 are in VRF <b>Green</b>, and Gi2/0 is not in any VRF. Hosts use the router interfaces as their default gateways, and no route leaking is configured. Which statements are true?</p>`,
        o: ['<code>show ip route</code> lists only 10.1.1.0/24 as connected.',
          'A host in 192.168.10.0/24 can reach a host in 192.168.11.0/24 through the router.',
          'A host in 192.168.10.0/24 can reach a host in 192.168.21.0/24.',
          'A host in 192.168.20.0/24 can reach a host in 10.1.1.0/24.',
          '<code>show ip route vrf Green</code> lists 192.168.20.0/24 and 192.168.21.0/24.'],
        a: [0, 1, 4],
        x: `<p>Each VRF has its <b>own routing table</b>, which logically divides one router into separate routers. Interfaces not in a VRF use the <b>global</b> table.</p>
<ul><li>A ✔: the global table only has Gi2/0’s network (notes Fig. 7).</li>
<li>B ✔: both subnets are in the same VRF Red table.</li>
<li>C ✘ and D ✘: traffic never crosses between VRFs, or between a VRF and the global table, unless leaking is configured.</li>
<li>E ✔.</li></ul>`
      },
      {
        topic: 'OOB', type: 'multi',
        dg: D.jumpLab({ vrf: 'OOB', lt: '203.0.113.10', n0: '203.0.113.0/24', n1: '172.16.10.0/24', n2: '10.99.99.0/24', vm1: 'ens18: 172.16.10.10/24', vm2: 'ens19: 10.99.99.10/24' }),
        q: `<p>The lab is set up as shown. R1 G0/1/1 (10.99.99.1) is in VRF OOB. SSH on R1 is configured with:</p>
${cli(`R1(config)# access-list 10 permit 10.99.99.0 0.0.0.255
R1(config)# line vty 0 15
R1(config-line)# login local
R1(config-line)# transport input ssh
R1(config-line)# access-class 10 in vrf-also`)}
<p>The jump server VM has IP forwarding disabled. Which statements are true?</p>`,
        o: ['From the Laptop, <code>ssh admin@10.99.99.1</code> fails.',
          'After logging in to the jump server, <code>ssh admin@10.99.99.1</code> succeeds.',
          'After logging in to the jump server, <code>ssh admin@172.16.10.1</code> (R1 G0/0/1) succeeds.',
          'The jump server should enable IP forwarding, so the Laptop can SSH to 10.99.99.1 directly.',
          '<code>R1# show ip route vrf OOB</code> lists 10.99.99.0/24 as connected.'],
        a: [0, 1, 4],
        x: `<ul><li>A ✔: the Laptop’s packet enters R1 G0/0/0 (global table), which has no 10.99.99.0/24 route. The OOB network is not reachable from the production or Internet side.</li>
<li>B ✔: the jump server sources the session from 10.99.99.10, which is permitted, through the VRF interface (allowed by <code>vrf-also</code>).</li>
<li>C ✘: that session is sourced from 172.16.10.10, which access-class 10 doesn’t permit.</li>
<li>D ✘: forwarding would bypass the whole point of the jump host.</li>
<li>E ✔.</li></ul>`
      },
      {
        topic: 'OOB', type: 'mcq',
        dg: D.jumpLab({ vrf: 'OOB', n2: '10.99.99.0/24', vm2: 'ens19: 10.99.99.10/24' }),
        q: `<p>In Lab 3.1 step 2.4, which command on R1 verifies reachability from R1 to the jump server’s second interface on the OOB network?</p>`,
        o: ['<code>R1# ping 10.99.99.10</code>', '<code>R1# ping vrf OOB 10.99.99.10</code>', '<code>R1# show ip route 10.99.99.10</code>', '<code>R1# ping 10.99.99.10 vrf-also</code>'],
        a: [1],
        x: `<p>The syntax is <code>ping vrf <i>vrf-name</i> <i>ip</i></code>. A plain ping looks up the destination in the global table, which has no route to 10.99.99.0/24, so it fails. <code>vrf-also</code> is an <code>access-class</code> keyword, not a ping option.</p>`
      },
      {
        topic: 'OOB', type: 'mcq',
        q: `<p>A student enables SSH on R1:</p>
${cli(`R1(config)# ip domain-name netsec.lab
R1(config)# crypto key generate rsa modulus 512
R1(config)# ip ssh version 2
Please create RSA keys (of at least 768 bits size) to enable SSH v2.`)}
<p>What should the student do?</p>`,
        o: ['Regenerate the RSA key pair with a modulus of at least 768 bits; 2048 or 4096 is recommended.',
          'Enable <code>ip ssh version 1</code> first, then upgrade to version 2.',
          'Change the domain name, because <i>.lab</i> is not a valid top-level domain.',
          'Configure <code>transport input ssh</code> before enabling version 2.'],
        a: [0],
        x: `<p>SSHv2 needs an RSA modulus of at least 768 bits. The notes recommend <b>2048 or 4096</b> for better security. Run <code>crypto key generate rsa modulus 2048</code> again (it replaces the old key), then <code>ip ssh version 2</code>.</p>`
      },
      {
        topic: 'OOB', type: 'multi',
        q: `<p>RSA keys have been generated on R1, and the following is added:</p>
${cli(`R1(config)# username netadmin secret Adm1n!2217
R1(config)# line vty 0 15
R1(config-line)# login local
R1(config-line)# transport input ssh`)}
<p>Which statements are true?</p>`,
        o: ['Telnet connections to R1 are refused.',
          'netadmin can log in through SSH.',
          'The console port now also asks for netadmin’s username and password.',
          'netadmin’s password is stored as a hash in the configuration, not in clear text.',
          'At most 5 simultaneous SSH sessions are possible.'],
        a: [0, 1, 3],
        x: `<ul><li>A ✔: <code>transport input ssh</code> allows only SSH on the VTY lines.</li>
<li>B ✔: <code>login local</code> uses the local username database, which SSH requires.</li>
<li>C ✘: line con 0 was not changed.</li>
<li>D ✔: <code>secret</code> stores a one-way hash (MD5 per the notes; sha256/scrypt via algorithm-type).</li>
<li>E ✘: VTY 0–15 is 16 lines.</li></ul>`
      },

      /* ============================ Supermicro / Proxmox ============================ */
      {
        topic: 'SRV', type: 'mcq',
        q: `<p>For the jump server, the VM’s second NIC must connect to the physical port labelled <b>LAN 3</b> on the Supermicro server. Which bridge port should be entered when creating Linux bridge <b>vmbr2</b> in Proxmox?</p>`,
        o: ['eno3np0', 'eno5', 'eno6', 'eno2'],
        a: [1],
        x: `<p>The mapping is eno1 = LAN 1 (vmbr0, Proxmox 10.0.0.10), eno2 = LAN 2, eno3np0 = SFP 1, eno4np2 = SFP 2, <b>eno5 = LAN 3</b>, eno6 = LAN 4, enx… = IPMI.</p>
<p>In the lab: ens18 → vmbr1 → eno2 (LAN 2) and ens19 → vmbr2 → eno5 (LAN 3). Remember to click <i>Apply Configuration</i>.</p>`
      },
      {
        topic: 'SRV', type: 'mcq',
        q: `<p>A team wants to upload an Ubuntu ISO image to the Proxmox hypervisor to build an extra VM for their project. Which storage should they use?</p>`,
        o: ['local (pve)', 'local-lvm (pve)', 'vmbr0', 'The VM’s Hardware tab'],
        a: [0],
        x: `<p><b>local (pve)</b> is a physical disk partition used mainly for raw data such as <b>ISO images</b> and backups. <b>local-lvm (pve)</b> is a logical partition for <b>VM disks and container (CT) volumes</b>. vmbr0 is a Linux bridge, not storage.</p>`
      },
      {
        topic: 'SRV', type: 'multi',
        q: `<p>Which tasks can be done through the Supermicro BMC (IPMI) web interface at http://10.0.0.1?</p>`,
        o: ['Power on the server remotely, even when no OS is running',
          'Open a remote console (HTML5) to see the server’s screen without a monitor',
          'Perform a graceful shutdown of the server',
          'Open the Proxmox VE dashboard at https://10.0.0.1:8006',
          'Edit a VM’s netplan IP addresses'],
        a: [0, 1, 2],
        x: `<p>The BMC/IPMI is the server’s own out-of-band controller. It provides power control (Power ON, Graceful Shutdown) and Remote Control → Launch Console (HTML5).</p>
<p>Proxmox runs on the server OS at <b>https://10.0.0.10:8006</b> through LAN 1. VM IP addresses are set <i>inside</i> the VM with netplan.</p>`
      },

      /* ============================ AAA Authentication ============================ */
      {
        topic: 'AUTHN', type: 'mcq',
        dg: D.aaaLab(),
        q: `<p>To keep things simple, a student configured:</p>
${cli(`SW1(config)# aaa new-model
SW1(config)# tacacs server TACACSVR
SW1(config-server-tacacs)# address ipv4 192.168.1.11
SW1(config-server-tacacs)# key TACACS-pa55w0rd
SW1(config)# username ADMIN secret Str0ngPa55w0rd
SW1(config)# aaa authentication login default group tacacs+`)}
<p>The TACACS+ PC is then switched off. What happens when the student tries to log in?</p>`,
        o: ['ADMIN can log in, because IOS always falls back to the local database automatically.',
          'The console is not affected by AAA, so the console still works without a password.',
          'The enable password can be used instead.',
          'No one can log in on the console or through SSH until TACACS+ is reachable again, because the method list has no fallback.'],
        a: [3],
        x: `<p>Methods are tried <i>only as listed</i>. With TACACS+ unreachable (ERROR) and no further method, authentication fails. The <b>default</b> list also applies to the console, so the student is locked out. This is why the lab warns not to save the configuration.</p>
<p>Best practice is to end the list with <code>local</code>, e.g. <code>… group tacacs+ group radius local</code> (notes p.15).</p>`
      },
      {
        topic: 'AUTHN', type: 'multi',
        dg: D.aaaLab(),
        q: `<p>Running Wireshark on the RADIUS PC during a login, the student sees an <b>Access-Request</b> from the switch followed by an <b>Access-Accept</b>. Which statements are correct?</p>`,
        o: ['The username is visible in clear text in the Access-Request.',
          'The password attribute is encrypted.',
          'The entire RADIUS payload is encrypted.',
          'The packets use TCP port 49.',
          'Authorization attributes (e.g. cisco-avpair priv-lvl) come back in the Access-Accept.'],
        a: [0, 1, 4],
        x: `<p>RADIUS only encrypts the <b>password</b>; the rest, including the username, is readable. TACACS+ encrypts the entire packet body.</p>
<p>RADIUS runs over <b>UDP 1812</b> (authentication) and <b>1813</b> (accounting). It combines authentication and authorization, so attributes such as priv-lvl or cli-view-name come back in the <b>Access-Accept</b> (notes p.19).</p>`
      },
      {
        topic: 'AUTHN', type: 'mcq',
        fixed: true,
        q: `<p>Running Wireshark on the TACACS+ server during a <b>successful</b> login, how many TACACS+ <b>authentication</b> messages are exchanged between the switch and the server? Exclude the TCP handshake and pure ACKs, and assume the server asks for the username and password separately, as in the notes.</p>`,
        o: ['2', '4', '6', '8'],
        a: [2],
        x: `<p>The TACACS+ authentication flow (notes p.18) is:</p>
<ol><li>START (user trying to connect)</li><li>REPLY (request username)</li><li>CONTINUE (username)</li><li>REPLY (request password)</li><li>CONTINUE (password)</li><li>REPLY (pass)</li></ol>
<p>That is 6 messages. RADIUS needs only 2 (Access-Request and Access-Accept), with authorization included.</p>`
      },
      {
        topic: 'AUTHN', type: 'multi',
        q: `<p>A student sets up FreeRADIUS on Kali for Lab 3.2 Part 3. Which steps are correct?</p>`,
        o: ['Edit <code>clients.conf</code> so the switch’s IP address (or a block containing it) is an authorized client, with a shared secret matching the switch’s <code>key</code>.',
          'Add the username and Cleartext-Password to the <code>users</code> file.',
          'Run <code>sudo freeradius -X</code> to start the server in debug mode and watch each request.',
          'Edit <code>tacplus.xml</code> to change the listening IP from 127.0.0.1.',
          'Run <code>radtest</code> from the switch CLI to test the server.'],
        a: [0, 1, 2],
        x: `<p>The configuration lives in <code>/etc/freeradius/3.0</code> (after <code>chmod o+rx /etc/freeradius</code>): <b>clients.conf</b> holds NAS IPs and secrets, and <b>users</b> holds credentials, plus AV-pairs for authorization.</p>
<p><code>freeradius -X</code> runs it in the foreground in debug mode. <code>radtest</code> is run <i>locally on the RADIUS PC</i> in a second terminal. tacplus.xml belongs to TACACS.net.</p>`
      },
      {
        topic: 'AUTHN', type: 'mcq',
        dg: D.aaaLab({ swIp: 'VLAN1 192.168.10.2' }),
        q: `<p>The switch (192.168.10.2) uses <code>aaa authentication login default group radius local</code>. The student’s <code>clients.conf</code> only authorizes 192.168.1.0/24. During a login attempt, <code>freeradius -X</code> prints:</p>
${out(`Ignoring request to auth address * port 1812 bound to server default from unknown client 192.168.10.2 port 51032 proto udp`)}
<p>What happens to the login?</p>`,
        o: ['FreeRADIUS sends an Access-Reject, so the login fails immediately and local is not tried.',
          'The switch receives no reply. After the RADIUS timeout this counts as an ERROR, so the switch falls back to the local database.',
          'FreeRADIUS automatically adds 192.168.10.2 as a client and accepts the login.',
          'The login succeeds through RADIUS, because the shared secret is optional for unknown clients.'],
        a: [1],
        x: `<p>FreeRADIUS silently <b>ignores</b> requests from clients that aren’t in clients.conf. No Access-Reject is sent.</p>
<p>With no response, the switch times out (ERROR) and moves on to <code>local</code>. Only an explicit <b>reject</b> (FAIL) stops the method list. Fix clients.conf (lab step 3.6) so the switch IP is covered and the secret matches.</p>`
      },

      /* ============================ AAA Authorization ============================ */
      {
        topic: 'AUTHZ', type: 'multi',
        q: `<p>R1 has this configuration:</p>
${cli(`R1(config)# privilege exec level 5 ping
R1(config)# enable secret level 5 cisco5`)}
<p>A user at level 1 enters <code>enable 5</code> and the password <code>cisco5</code>. Which statements are true?</p>`,
        o: ['<code>show privilege</code> displays “Current privilege level is 5”.',
          'The user can run all level-1 commands as well as <code>ping</code>.',
          'The user can enter <code>configure terminal</code>.',
          '<code>privilege exec reset ping</code> would return ping to its default level.',
          'Level 0 includes the <code>show</code> commands.'],
        a: [0, 1, 3],
        x: `<ul><li>A ✔: <code>enable 5</code> moves the user to level 5, which the notes’ p.6 output confirms.</li>
<li>B ✔: a user at a given level can run every command at that level <b>or lower</b>.</li>
<li>C ✘: configure terminal is level 15.</li>
<li>D ✔: <code>privilege exec reset</code> restores the default level.</li>
<li>E ✘: level 0 only has <b>disable, enable, exit, help, logout</b>.</li></ul>`
      },
      {
        topic: 'AUTHZ', type: 'mcq',
        dg: NetDiag.seq({
          w: 560, h: 200,
          actors: [{ id: 'C', name: 'AAA client (SW1)', x: 130 }, { id: 'S', name: 'TACACS+ server', x: 430 }],
          msgs: [
            { from: 'S', to: 'C', y: 62, t: 'REPLY (authentication) – PASS', color: '#1e8449' },
            { from: 'C', to: 'S', y: 112, t: '???', color: '#8e44ad' },
            { from: 'S', to: 'C', y: 158, t: '???', color: '#8e44ad' }
          ]
        }),
        q: `<p>The switch has <code>aaa authorization exec default group tacacs+ local</code>. Wireshark on the TACACS+ server shows the authentication completing with REPLY (PASS). What happens next to assign the user’s privilege level or view?</p>`,
        o: ['The switch sends a separate TACACS+ authorization <b>REQUEST</b>, and the server answers with a <b>RESPONSE</b> containing e.g. priv-lvl or the view.',
          'Nothing more is exchanged; the privilege level was already in the authentication REPLY (PASS).',
          'The switch sends a RADIUS Access-Request to obtain the privilege level.',
          'The switch sends an accounting START, which carries the privilege level back to the switch.'],
        a: [0],
        x: `<p>TACACS+ <b>separates</b> authentication, authorization and accounting. Authorization is its own REQUEST/RESPONSE pair after authentication (notes p.19).</p>
<p>RADIUS, by contrast, returns authorization attributes in the same Access-Accept as authentication. Accounting is separate in both protocols.</p>`
      },
      {
        topic: 'AUTHZ', type: 'multi',
        q: `<p>In root view, an administrator enters:</p>
${cli(`R1(config)# parser view NETOPS
R1(config-view)# secret netops
R1(config-view)# commands exec include-exclusive show ip route
R1(config-view)# exit
R1(config)# parser view HELPDESK
R1(config-view)# secret help
R1(config-view)# commands exec include show ip route`)}
<p>Which statements are correct?</p>`,
        o: ['The last command is rejected, because <code>show ip route</code> was added to NETOPS as include-exclusive.',
          '<code>commands exec include all show</code> would add every command beginning with <code>show</code> to a view.',
          '<code>commands exec exclude …</code> makes a command unavailable in that view.',
          '<code>include-exclusive</code> still allows the command in other views, as long as they are superviews.',
          '<code>commands exec include …</code> can be entered inside a superview.'],
        a: [0, 1, 2],
        x: `<p>From the notes’ parameter table:</p>
<ul><li><b>include</b>: adds the command, and it may also be added to other views.</li>
<li><b>include-exclusive</b>: adds it here and stops it from being added to <i>any</i> other view.</li>
<li><b>exclude</b>: users of this view cannot use it.</li>
<li><b>all</b>: a wildcard for every command starting with the given keyword.</li></ul>
<p>Superviews contain only views, never commands.</p>`
      },
      {
        topic: 'AUTHZ', type: 'mcq',
        q: `<p>An administrator assigns a view to a local user so that the user lands in it at login:</p>
${cli(`R1(config)# username Wendell view ADMIN secret odom`)}
<p>After Wendell logs in, which command confirms the view he is in?</p>`,
        o: ['<code>show privilege</code>', '<code>show parser view</code>', '<code>show users</code>', '<code>show running-config | include view</code>'],
        a: [1],
        x: `<p><code>show parser view</code> displays “Current view is 'ADMIN'”. <code>show parser view all</code> (in root view) lists every view, with superviews marked by *.</p>
<p><code>show parser</code> is always available in any view. <code>show privilege</code> shows the privilege level, not the view.</p>`
      },

      /* ============================ AAA Accounting ============================ */
      {
        topic: 'ACCT', type: 'mcq',
        q: `<p>A RADIUS server’s accounting log for a switch only ever shows <b>Stop</b> records, each with a session time, and never any Start records. Which switch configuration explains this?</p>`,
        o: ['<code>aaa accounting exec default stop-only group radius</code>',
          '<code>aaa accounting exec default start-stop group radius</code>, because RADIUS does not support Start records',
          '<code>aaa accounting commands 15 default stop-only group radius</code>',
          '<code>aaa authorization exec default group radius</code>'],
        a: [0],
        x: `<p><b>start-stop</b> sends a Start when the EXEC session begins and a Stop when it ends. <b>stop-only</b> sends only the Stop, which still carries the elapsed time.</p>
<p>RADIUS supports exec Start/Stop records fine, but not command accounting. Authorization does not generate accounting records.</p>`
      },
      {
        topic: 'ACCT', type: 'multi',
        dg: D.aaaLab(),
        q: `<p>Which statements about RADIUS accounting in Lab 3.4 are correct?</p>`,
        o: ['FreeRADIUS writes the accounting records under <code>/var/log/freeradius/</code>.',
          'The records are sent to UDP port 1813, as set with <code>acct-port 1813</code>.',
          'RADIUS supports command accounting, just like TACACS+.',
          'For RADIUS, accounting is done separately, after authentication and authorization have completed.',
          'Accounting records are carried in Access-Request messages.'],
        a: [0, 1, 3],
        x: `<p>RADIUS accounting uses separate <b>Accounting-Request / Accounting-Response</b> messages on UDP <b>1813</b>, after the Access-Request/Accept exchange (notes p.4). The logs are under /var/log/freeradius (radacct).</p>
<p>Command accounting is a <b>TACACS+-only</b> feature.</p>`
      },
      {
        topic: 'ACCT', type: 'mcq',
        q: `<p>An auditor requires that privileged commands are still logged when the only TACACS+ server is down. The switch currently has:</p>
${cli(`SW1(config)# aaa accounting commands 15 default stop-only group tacacs+`)}
<p>Which change meets the requirement?</p>`,
        o: ['Change it to <code>… stop-only group tacacs+ group radius</code>, so RADIUS logs the commands when TACACS+ is down.',
          'RADIUS cannot do command accounting. Add a second TACACS+ server (e.g. in an <code>aaa group server tacacs+</code> group) for redundancy.',
          'Change <code>stop-only</code> to <code>start-stop</code>.',
          'Use <code>aaa accounting exec</code>, which already records every command typed.'],
        a: [1],
        x: `<p>The notes say TACACS+ (<b>but not RADIUS</b>) supports command accounting. The only way to keep command logs during an outage is more TACACS+ servers, since a method list can name a group of several servers.</p>
<p>Exec accounting only records session Start and Stop.</p>`
      },

      /* ============================ NTP ============================ */
      {
        topic: 'NTP', type: 'mcq',
        dg: D.ntpSeq({ client: 'S1 (NTP client)', server: 'R1 (NTP server)', t1: '11:00:00.100', t2: '11:00:00.180', t3: '11:00:00.200', t4: '11:00:00.300' }),
        q: `<p>Using the four timestamps shown, calculate S1’s clock offset θ and the round-trip delay δ.</p>`,
        o: ['θ = −10 ms, δ = 180 ms', 'θ = +10 ms, δ = 200 ms', 'θ = −10 ms, δ = 200 ms', 'θ = +90 ms, δ = 180 ms'],
        a: [0],
        x: `<p><b>θ = [(T2 − T1) + (T3 − T4)] / 2</b> = [(0.180 − 0.100) + (0.200 − 0.300)] / 2 = (0.080 − 0.100) / 2 = <b>−0.010 s</b>. S1 is 10 ms <i>ahead</i> of R1, so it must slow or step back.</p>
<p><b>δ = (T4 − T1) − (T3 − T2)</b> = 0.200 − 0.020 = <b>0.180 s</b>.</p>`
      },
      {
        topic: 'NTP', type: 'multi',
        q: `<p>Which statements about NTP operation and configuration on Cisco devices are correct?</p>`,
        o: ['<code>ntp master 5</code> makes the router an authoritative time source at stratum 5, using its own clock.',
          'A client that synchronises to a stratum 5 server becomes stratum 6.',
          '<code>ntp peer</code> (symmetric mode) lets two devices synchronise each other.',
          '<code>ntp broadcast client</code> is entered in global configuration mode.',
          'NTP uses TCP port 123.'],
        a: [0, 1, 2],
        x: `<p>RFC 5905 defines client/server, peer and broadcast modes. NTP runs over <b>UDP 123</b>.</p>
<ul><li><code>ntp master [stratum]</code> is only for when no reliable external source is reachable.</li>
<li>Stratum increases by one per hop away from the stratum 0 reference.</li>
<li>Broadcast mode is configured on an <b>interface</b>: <code>ntp broadcast</code> on the server and <code>ntp broadcast client</code> on the client.</li></ul>`
      },
      {
        topic: 'NTP', type: 'mcq',
        q: `<p>R1 synchronises to an external source and serves internal devices. It is protected with NTP ACLs:</p>
${cli(`R1(config)# ntp server 209.165.200.254
R1(config)# access-list 10 permit 209.165.200.254
R1(config)# ntp access-group peer 10
R1(config)# access-list 20 permit 10.0.0.0 0.0.0.7
R1(config)# ntp access-group serve-only 20`)}
<p>Which statement is correct?</p>`,
        o: ['R1 can synchronise with 209.165.200.254. A switch at 10.0.0.6 can get time from R1, but a switch at 10.0.0.9 cannot.',
          'A switch at 10.0.0.9 can get time from R1, because serve-only permits all clients.',
          'Hosts in 10.0.0.0/29 can also adjust R1’s clock, because serve-only works like peer.',
          'serve-only also lets 10.0.0.0/29 send NTP control queries.'],
        a: [0],
        x: `<p>From the notes (p.19):</p>
<ul><li><b>peer</b>: accept NTP replies (sync to it) and also respond to requests.</li>
<li><b>serve-only</b>: only answer requests from those hosts.</li>
<li><b>serve</b>: like serve-only, plus control queries.</li>
<li><b>query-only</b>: control queries only.</li></ul>
<p>The wildcard 0.0.0.7 covers 10.0.0.0–10.0.0.7, so .6 is included and .9 is not.</p>`
      },

      /* ============================ Syslog ============================ */
      {
        topic: 'SYSLOG', type: 'mcq',
        fixed: true,
        dg: D.syslogLab(),
        q: `<p>R2 is configured with <code>logging host 172.16.2.3</code> and <code>logging trap notifications</code>. The student creates and then deletes Loopback1, which produces:</p>
${out(`%LINK-3-UPDOWN: Interface Loopback1, changed state to up
%LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback1, changed state to up
%LINK-5-CHANGED: Interface Loopback1, changed state to administratively down
%LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback1, changed state to down`)}
<p>How many of these messages reach the syslog server?</p>`,
        o: ['0', '1', '3', '4'],
        a: [3],
        x: `<p><b>notifications = 5</b>, so levels 0–5 are sent. The severities are 3, 5, 5, 5, which are all ≤ 5, so all <b>4</b> are sent.</p>
<p>Compare: at <code>warnings</code> (4) only the %LINK-3 message is sent, and at <code>critical</code> (2) none are.</p>`
      },
      {
        topic: 'SYSLOG', type: 'multi',
        q: `<p>Which statements about syslog configuration on Cisco IOS are correct?</p>`,
        o: ['<code>logging host 172.16.2.3</code> sends log messages to a syslog server, by default over UDP 514.',
          '<code>logging buffered</code> stores messages in RAM, which you can view with <code>show logging</code>.',
          '<code>logging synchronous</code> (under a line) stops log messages from breaking up the command you are typing.',
          '<code>no logging console</code> also stops messages from appearing in SSH sessions.',
          '<code>logging monitor</code> alone shows messages in an SSH session, without <code>terminal monitor</code>.'],
        a: [0, 1, 2],
        x: `<ul><li>D ✘: the console, monitor (VTY), buffer and trap (server) destinations are controlled separately. <code>no logging console</code> only affects the console.</li>
<li>E ✘: VTY sessions also need the exec command <code>terminal monitor</code>.</li></ul>
<p>Each destination has its own level: <code>logging console|monitor|buffered|trap &lt;level&gt;</code>.</p>`
      },
      {
        topic: 'SYSLOG', type: 'mcq',
        q: `<p>A junior engineer sets <code>logging trap debugging</code> on all 200 routers and switches so that “nothing is missed”. What is the main problem?</p>`,
        o: ['The syslog server and network get flooded with low-value messages, wasting bandwidth, CPU and storage, and burying the important events.',
          'Only level-7 messages are logged; errors and warnings are dropped.',
          'No messages are sent, because debugging is the highest number.',
          'Messages are then sent over TCP 6514 instead of UDP 514.'],
        a: [0],
        x: `<p>A trap level includes that level and everything more severe (lower number). Debugging (7) sends <b>everything</b>.</p>
<p>The lab reflection asks about the trade-off: set the level too high (e.g. 0 or 1) and you miss important events; set it too low (7) and you drown in noise.</p>`
      },

      /* ============================ NetFlow ============================ */
      {
        topic: 'NETFLOW', type: 'mcq',
        fixed: true,
        dg: D.netflowLab(),
        q: `<p>On R1, flow monitors using the standard 7-key record are applied to G0/0/1 in <b>both</b> directions (<code>ip flow monitor M-IN input</code> and <code>ip flow monitor M-OUT output</code>). PC2 sends 100 pings to 10.0.0.1 and all are answered. No other traffic is present. How many flows are created in total across both monitors?</p>`,
        o: ['1', '2', '4', '100'],
        a: [1],
        x: `<p>A flow is a <b>unidirectional</b> stream of packets that share the same key fields. Many packets with the same keys form one flow.</p>
<ul><li>Input on G0/0/1: echo requests 192.168.1.75 → 10.0.0.1 (ICMP 8/0), 1 flow.</li>
<li>Output on G0/0/1: echo replies 10.0.0.1 → 192.168.1.75 (ICMP 0/0), 1 flow.</li></ul>
<p>That makes <b>2</b>.</p>`
      },
      {
        topic: 'NETFLOW', type: 'multi',
        q: `<p>Which statements about configuring Flexible NetFlow are correct?</p>`,
        o: ['A <b>flow record</b> defines the key fields (<code>match</code>) and the non-key statistics (<code>collect</code>).',
          'A <b>flow exporter</b> defines the collector destination, transport port and export protocol (e.g. netflow-v9).',
          'A <b>flow monitor</b> ties together a record, an exporter and the cache settings, and is applied to an interface.',
          'A flow record is applied directly to an interface with <code>ip flow record NAME input</code>.',
          'NetFlow exports full packet payloads to the collector for deep inspection.'],
        a: [0, 1, 2],
        x: `<p>The four-step workflow: 1. flow record, 2. flow exporter, 3. flow monitor (record + exporter + <code>cache timeout …</code>), 4. <code>ip flow monitor NAME input|output</code> on the interface.</p>
<p>NetFlow exports <b>statistics</b> (counts, bytes, timestamps per flow), not packet contents.</p>`
      },
      {
        topic: 'NETFLOW', type: 'mcq',
        dg: D.netflowLab(),
        q: `<p>On R1 the monitor shows <code>Inactive Timeout: 15 secs</code> and <code>Active Timeout: 30 secs</code>. A1 opens a Telnet session to R1, types one command and then leaves the session idle. At the same time PC2 runs a continuous ping to R1 for 2 minutes. Which statement is correct?</p>`,
        o: ['The ping flow is exported only once, when the ping stops.',
          'The ping flow is exported about every 30 s while it continues (active timeout). The idle Telnet flow is aged out and exported after about 15 s without packets (inactive timeout).',
          'Both flows are only exported after 30 minutes.',
          'The Telnet flow is exported every 15 s even while it is idle.'],
        a: [1],
        x: `<p>The <b>active timeout</b> exports long-lived flows periodically (here every 30 s; <code>cache timeout active 30</code> in the lab), so the collector gets timely data.</p>
<p>The <b>inactive timeout</b> removes a flow from the cache once no packet has matched it for that time (15 s), and exports it. The statistics output counts flows aged by each timeout.</p>`
      }
    ]
  };
})();
