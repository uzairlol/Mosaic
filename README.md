# Mosaic — Persistent Artificial Civilization Platform

> **Mosaic** is a persistent artificial civilization system designed to run continuously for years on a dedicated computer, generating its own history, cultures, politics, businesses, relationships, conflicts, and stories without predetermined narratives.

---

## 🌟 Vision & Key Architecture

Mosaic is not a game, not a chatbot, and not a traditional simulation. It is a persistent world of ~500 autonomous agents living across four heterogeneous cities (*Aethelgard*, *Vespera*, *Oakhaven*, and *Solaria*). Time advances in discrete monthly steps (1 tick = 1 month of in-world time).

Every design decision prioritizes long-term extensibility, modularity, explainability, and emergent storytelling.

```
       +-------------------------------------------------------------+
       |                     MOSAIC CORE ENGINE                      |
       |  Discrete Monthly Ticks | Deterministic PRNG | State Saves  |
       +-------------------------------+-----------------------------+
                                       |
       +-------------------------------+-----------------------------+
       |                 HYBRID AGENT COGNITION ARCH                 |
       |  Tier 1: Fast Probabilistic Rules (Work, Spend, Routine)    |
       |  Tier 2: LLM Deliberation Gateway (Marriage, Politics, etc) |
       +-------------------------------+-----------------------------+
                                       |
    +------------------+---------------+------------------+
    |                  |                                  |
+---v------------+ +---v------------+              +------v---------+
| SOCIO-ECONOMY  | | POLITICS & CIV |              | SIM-SOCIAL     |
| Companies, GDP | | Elections,     |              | Echo Feed &    |
| Taxes, Labor   | | Parties, Laws  |              | Misinformation |
+----------------+ +----------------+              +----------------+
                                       |
       +-------------------------------+-----------------------------+
       |                CAUSAL GRAPH & HISTORIAN ENGINE              |
       |  "Why did this happen?" DAG  | Automated News Gazette       |
       |  Living Encyclopedia Wiki    | Observer Web Portal UI       |
       +-------------------------------------------------------------+
```

---

## ✨ Features

- **Discrete Monthly Ticks**: Reproducible, deterministic step execution where 1 tick equals 1 month in-world.
- **Versioned State Persistence**: Entire world state serialized to versioned JSON snapshots (`/saves/snapshot_yYYYY_mMM_tTT.json`), enabling deterministic replay, rollback, branching, and power-failure recovery.
- **Hybrid Agent Cognition**:
  - *Tier 1 (Fast Path)*: Efficient rule-based probabilistic state machines for daily routines, spending, working, taxes, and mood.
  - *Tier 2 (Slow Path - LLM Gateway)*: Reserved for high-stakes life turning points (career shifts, marriages, company foundings, political candidacies, scandals).
- **Heterogeneous Cities**:
  - **Aethelgard**: Industrial Port (Manufacturing, Trade Unions, Shipping).
  - **Vespera**: Tech & Financial Hub (Venture Capital, Software, Wealth Inequality).
  - **Oakhaven**: Agrarian & Craft Valley (Agriculture, Ecotourism, Organic Crafts).
  - **Solaria**: Cultural & Media Capital (Journalism, Public Relations, Civic Debate).
- **Causal Graph & Explainability**: Every macro event records a `CausalNode` with antecedent links so observers can ask *"Why did this happen?"* and view the causal chain.
- **Automated Historian**: At the conclusion of every tick, compiles *"The Mosaic Chronicle"* newspaper and auto-generates Wikipedia-style markdown entity dossiers.
- **Modern Observer Telemetry Portal**: Interactive living workbench featuring:
  - Real-time auto-stepping controls (`1x`, `2x`, `4x` speed intervals) and manual month stepping.
  - Live HTML5 Canvas sparklines for GDP trajectory and population growth curves.
  - Interactive regional city grid for Solaria's 5 cities.
  - Searchable agent directory with inspectable side-dossier drawer (Big-5 personality radar, family trees, and memory stream).
  - Sim-social feed ("Echo") with hashtag sentiment tracking.
  - Editorial Gazette newspaper reader and causal provenance timeline graph.

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- `pip`

### 2. Installation
```bash
git clone https://github.com/YOUR_USERNAME/Mosaic.git
cd Mosaic
pip install -r requirements.txt
```

### 3. Run via Web Observer Portal
Start the live observer web platform on `http://127.0.0.1:8000`:
```bash
python main.py --server --port 8000
```
Open `http://127.0.0.1:8000` in your web browser to observe the civilization, advance months, auto-play ticks, explore agent dossiers, browse gazettes, and trace causal graphs.

### 4. Run via CLI Simulation Ticks
To advance the simulation by 12 discrete months (1 full year) in CLI mode:
```bash
python main.py --ticks 12
```

---

## 📁 Repository Structure

```
Mosaic/
├── main.py                     # Entry point CLI and Web Server launcher
├── requirements.txt            # Python dependencies
├── mosaic/
│   ├── core/
│   │   ├── tick_engine.py      # Discrete monthly tick simulation manager & history tracking
│   │   ├── prng.py             # Seeded deterministic random number generator
│   │   ├── persistence.py      # Versioned state snapshot save/load engine
│   │   └── causal_graph.py     # Causal DAG tracker ("Why did this happen?")
│   ├── agents/
│   │   ├── identity.py         # Demographics, Big-5 personality traits & values
│   │   ├── memory.py           # Ebbinghaus decay curve memory stream
│   │   ├── cognition.py        # Hybrid fast-path rules & LLM Deliberation Gateway
│   │   └── kinship.py          # Family tree, marriage, divorce, inheritance
│   ├── world/
│   │   ├── city.py             # 4 heterogeneous city profiles
│   │   ├── economy.py          # Corporate lifecycles, payrolls, taxation, GDP
│   │   ├── politics.py         # Parties, elections, voting, parliamentary seats
│   │   └── media.py            # Sim-Social network ("Echo") feed & hashtags
│   ├── historian/
│   │   ├── newspaper.py        # "The Mosaic Chronicle" automated gazette generator
│   │   └── wiki.py             # Living Encyclopedia Wikipedia generator
│   ├── generator/
│   │   └── world_builder.py    # Population & initial world state generator
│   ├── server/
│   │   └── app.py              # FastAPI REST API & telemetry endpoints (/api/history)
│   └── web/
│       ├── index.html          # Revamped Observer Web Portal workbench UI
│       ├── style.css           # Glassmorphism cyber-telemetry design tokens & layout
│       └── app.js              # Real-time state manager & Canvas sparkline renderer
├── saves/                      # Serialized deterministic world snapshot files
├── gazettes/                   # Generated monthly newspapers
└── wiki_data/                  # Auto-generated Living Encyclopedia pages
```

---

## 📜 License
MIT License. Free to use, modify, and extend for persistent civilization research.
