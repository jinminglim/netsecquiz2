# NetSec Quiz 2: Practice Quiz & Study Guide (ICT2217, Topic 2 & 3)

Scenario-based practice for **Quiz 2** (MCQ + Multi-Select, 1% per question, partial marks for Multi-Select).
The questions follow the Quiz 1 style: a lab topology diagram, a CLI config, and then
"what works / how many / which is (NOT) needed".

## What's inside

| File | What it is |
|---|---|
| `index.html` | Practice quiz app: **Set A, B, C (50 questions each)** plus an **18-question mock quiz** drawn from all sets |
| `guide.html` | **Full study guide** covering every Topic 2 & 3 concept, command, show-output, calculation and exam trap, with diagrams |
| `assets/setA.js`, `setB.js`, `setC.js` | The 150 questions (scenario, drawn topology, CLI, options, answer key, explanation) |
| `assets/diagram.js` | Small SVG engine that draws the lab topologies and sequence diagrams |
| `assets/app.js`, `assets/app.css` | Quiz engine (marking, practice/exam modes, navigator, saved progress) |

### Topics covered (each set has the same spread)
- **Topic 2**: ACLs (standard/extended/named, wildcards, placement, editing, time-based, object groups, Lab 2.1a/2.1b),
  Firepower/ASA (security levels, ACLs, stateful `show conn`, ICMP inspection, MPF), TCP SYN flood + `embryonic-conn-max`,
  Slowloris + `per-client-max`.
- **Topic 3**: OoB management, VRF, jump host, SSH (Lab 3.1); Supermicro IPMI/BMC & Proxmox (Appendices A–C);
  AAA authentication (local, TACACS+, RADIUS, method lists, ERROR vs FAIL), authorization (privilege levels, CLI views),
  accounting; NTP (offset/delay maths, stratum, authentication); Syslog (severity levels, trap counting);
  Flexible NetFlow (records, exporters, monitors, flow counting).

## How to use
1. Download or clone the repo and open **`index.html`** in a browser. No install or internet needed.
2. Choose **Exam mode** (answer all 50, then *Submit & mark*) or **Practice mode** (*Check answer* per question).
3. Read the explanations, then review weak topics in **`guide.html`**.
4. Run several **Mock (18 Q)** rounds before the quiz.

Multi-Select marking defaults to D2L's **per-option ("Correct Answers")** scheme. Each option is scored independently,
which exactly reproduces the Quiz 1 average-grade statistics. You can switch the scheme in the toolbar.

> To host it online: in the repo **Settings → Pages**, deploy from the branch that contains these files (root folder).
