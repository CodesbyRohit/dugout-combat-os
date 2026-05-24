# DUGOUT — Broadcast-Grade Cricket Analytics & Replay Intelligence Platform

> **“The match isn't being watched. It's being interpreted.”**  
> DUGOUT transitions from a simple analytics tool to a sports war-room operations OS. It interprets match pressure, tactical shift, team momentum, and agentic disagreement in real time.

---

## ⚡ Tech Stack & Architecture

- **Frontend**: React (Vite) + Custom HSL design system (Bloomberg/F1 styled) + HTML5 Canvas Telemetry Graph
- **Backend**: Node.js + Express + WebSockets (`ws` orchestration)
- **Agentic Engine**: Unified Match Shared Memory Context (Analyst ➔ Scout ➔ Narrator)
- **Model Layer**: Gemini 2.5 Flash API (with high-fidelity local rules/rotating template fallbacks)
- **Ingestion Abstraction**: Extensible Cricbuzz/CricAPI adapter abstraction layer to support real API feeds in production

---

## 🌟 Core Features

### 1. Live Match Simulation Engine
A lightweight, probabilistic cricket event generator replacing fixed scripting with dynamic match evolution:
- **Weighted Probabilities**: Generates runs (dots, singles, doubles, boundaries, sixes) and wickets based on live match contexts.
- **Adaptive Intent**: Batsmen aggression shifts dynamically based on required run rate, wicket count, death overs (high volatility), and quiet overs (lower event intensity).
- **Strike Rotation**: Accurately tracks strike rotation (odd runs, end of overs) and batsman/bowler matchups.

### 2. Hybrid Replay Architecture
Seamless transition between two primary presentation modes:
- **LIVE SIMULATION**: Fully dynamic, unscripted live feed with real-time probabilistic event generation.
- **HISTORICAL REPLAY**: Deterministic playback of iconic matches (*IND vs PAK T20 WC 2022* or *MI vs CSK IPL 2019 Final*).
- **Temporal Memory**: Jump to any past milestone in the historical timeline to rewind states (scores, win probabilities, agent insights) and return to the live feed safely.

### 3. Real-Time Agent Reactions & Tactical Dissent
Three coordinated AI agents analyze the telemetry stream:
- **Franchise Analyst**: Calculates mathematical success probability and interprets structural shifts.
- **Tactical Scout**: Formulates matchups and field placements.
- **Cinematic Narrator**: Synthesizes the emotional story of the match.
- *Rotating commentary templates guarantee variation so that insights remain engaging without repetitive phrasing.*
- *Active tactical dissent badges highlight moments when the Scout challenges the Analyst’s models.*

### 4. Real-Time Telemetry & Pacing
- **Latency Jitter**: Simulates realistic telemetry lag (10–50ms in Replay, 50–200ms in Live Mode) to mimic live cricket data feeds.
- **Live Feed Indicator**: Pulsing F1-style live telemetry state badges.
- **Emotional Pacing**: Grids shift color coordinates (Clutch, Critical, Volatile, Alert, Stable) and the UI shakes on critical match events.

---

## 🚀 Getting Started

### 1. Installation
Install dependencies for both the server and client in one step:
```bash
# Run from the root 'dugout' folder
npm run install:all
```

### 2. Launching the Platform
Start the backend WebSocket server and the Vite frontend server in separate terminals:

#### Terminal A (Backend WebSocket Server)
```bash
npm run server
```
*Runs on [http://localhost:3001](http://localhost:3001).*

#### Terminal B (Frontend Client)
```bash
npm run client
```
*Vite dev server hosts the app on [http://localhost:3000](http://localhost:3000).*

---

## 🎮 Presentation & Demo Strategy (3-Min Guide)

1. **Setup Mode**:
   - Open [http://localhost:3000](http://localhost:3000). By default, it launches in **Live Simulation Mode**.
   - Use the **Settings** panel to paste a Gemini API Key to enable live GenAI commentary (falls back to local rules/templates if empty).
2. **Step 1: The Live Simulation**:
   - Select a scenario (e.g. *IND vs PAK*) and click **Deploy Engine Feed**.
   - Explain: *"Unlike scripted displays, DUGOUT generates a live probabilistic match state where batsmen rotate strike, aggression shifts, and every run is unscripted."*
3. **Step 2: Coordinated Dissent**:
   - Call attention to the Agent Panels. Show how the **Scout** sometimes disagrees with the **Analyst**, flag-marked with the **amber dissent border**.
4. **Step 3: Temporal Rewind**:
   - Switch the Mode Tab to **Historical Replay** or click any milestone on the **Event Timeline**.
   - Explain: *"With replay intelligence, we can instantly pause, rewind, and analyze critical overs, and then return to the live feed without leaking state."*
5. **Step 4: Cinematic Telemetry**:
   - Adjust the speed (1.5x, 2x, Turbo) and watch the win probability graph plot dynamically. Point out the real-time telemetry timestamps and jitter latency indicators.
