# NetSec Quiz 2: Practice Quiz & Study Guide (ICT2217, Topic 2 & 3)

Scenario-based practice for **Quiz 2** (MCQ + Multi-Select, 1% per question, partial marks for Multi-Select).
The questions follow the Quiz 1 style: a lab topology diagram, a CLI config, and then
"what works / how many / which is (NOT) needed".

## What's inside

| File | What it is |
|---|---|
| `index.html` | **Easy Learn**: every topic in plain words with an analogy, a picture, the commands, **annotated outputs**, **"what happens if…" scenario tables**, **traps**, quick checks, and interactive **"Try it" simulators** (ACL wildcard, firewall, AAA login, syslog level, NTP maths, NetFlow flow count). **Self-contained.** |
| `quiz.html` | Practice quiz: **Set A, B, C (50 questions each)** plus an **18-question mock quiz**. **Self-contained.** |
| `guide.html` | **Full study guide**: every concept, command, show-output, calculation and exam trap, with diagrams. **Self-contained.** |
| `src/*.html` | Page templates (source) |
| `assets/setA.js`, `setB.js`, `setC.js` | The 150 questions (scenario, drawn topology, CLI, options, answer key, explanation) |
| `assets/learn.js`, `assets/learn.css` | Easy Learn simulators and styles |
| `assets/diagram.js` | Small SVG engine that draws the lab topologies and ladder diagrams |
| `assets/app.js`, `assets/app.css` | Quiz engine (marking, practice/exam modes, navigator, saved progress) and shared styles |
| `build.py` | Inlines `assets/` into the `src/` pages to produce the root `index.html`, `quiz.html` and `guide.html` |

### Topics covered (each set has the same spread)
- **Topic 2**: ACLs (standard/extended/named, wildcards, placement, editing, time-based, object groups, Lab 2.1a/2.1b),
  Firepower/ASA (security levels, ACLs, stateful `show conn`, ICMP inspection, MPF), TCP SYN flood + `embryonic-conn-max`,
  Slowloris + `per-client-max`.
- **Topic 3**: OoB management, VRF, jump host, SSH (Lab 3.1); Supermicro IPMI/BMC & Proxmox (Appendices A–C);
  AAA authentication (local, TACACS+, RADIUS, method lists, ERROR vs FAIL), authorization (privilege levels, CLI views),
  accounting; NTP (offset/delay maths, stratum, authentication); Syslog (severity levels, trap counting);
  Flexible NetFlow (records, exporters, monitors, flow counting).

## How to use
1. Download **`index.html`** (Easy Learn), **`quiz.html`** and **`guide.html`** and open them in a browser. Each file works on its own; no install or internet needed.
2. Start with **Easy Learn**: read each topic, play with its "Try it" box, and mark it as understood.
3. In **quiz.html** choose **Exam mode** (answer all 50, then *Submit & mark*) or **Practice mode** (*Check answer* per question).
4. Read the explanations, then review weak topics in Easy Learn or **`guide.html`**.
5. Run several **Mock (18 Q)** rounds before the quiz.

Multi-Select marking defaults to D2L's **per-option ("Correct Answers")** scheme. Each option is scored independently,
which exactly reproduces the Quiz 1 average-grade statistics. You can switch the scheme in the toolbar.

> To host it online: in the repo **Settings → Pages**, deploy from the branch that contains these files (root folder).

## Editing the questions
Edit `assets/*.js` (or `src/*.html`), then run `python3 build.py` to regenerate the root `index.html` and `guide.html`.
