# ⚡ DUGOUT — Broadcast-Grade Cricket Analytics & Battle OS v3.7

> **“The match isn't being watched. It's being interpreted.”**  
> DUGOUT transitions from a simple analytics tool to a sports war-room operations OS. It interprets match pressure, tactical shifts, team momentum, and agentic disagreement in real time under the design styling of Stark Industries FRIDAY interface.

---

## 🚀 Tech Stack & Architecture

- **Frontend**: React (Vite) + Custom HSL design system (Stark Battle HUD styled) + HTML5 Canvas Telemetry Graph
  - Core component: [App.jsx](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/client/src/App.jsx)
  - Style sheet: [index.css](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/client/src/index.css)
- **Backend**: Node.js + Express + WebSockets (`ws` orchestration) on `localhost:3001`
- **Agentic Engine**: Unified Match Shared Memory Context (Analyst ➔ Scout ➔ Narrator)
- **Model Layer**: Gemini 2.5 Flash API (with high-fidelity local rules/rotating template fallbacks)
- **Ingestion Abstraction**: Extensible Cricbuzz/CricAPI adapter abstraction layer to support real API feeds in production

---

## 🌟 Stark Industries Battle OS (v3.7) Features

### 1. Jarvis Boot Diagnostics Overlay
DUGOUT loads behind a locked secure diagnostic grid to prevent browser autoplay blockages. 
- **Engage Cognitive Grid**: Clicking the button unlocks the browser Web Audio context.
- **Boot Telemetry Logs**: A 3.4-second sequential console readout prints system diagnostics (WebSocket checks, agent caches, Arc Reactor checks) matching precise delays.
- **Speech Synthesis Welcome**: Once booted, the system speaks: *"Dugout systems are fully operational. FRIDAY is online. Welcome back, Boss."*

### 2. Arc Reactor Momentum Core
A heavy circular gauge visualizer positioned at the core of the telemetry interface.
- **Dynamic Rotation**: The ring elements (`reactor-ring-outer`, `reactor-ring-middle`, `reactor-ring-inner`) rotate in alternating directions (`reactorRotate`) at speeds proportional to match tempo.
- **Breathing Pulse**: The central reactor core (`reactor-core-glow`) breathes dynamically (`reactorBreathe`), changing color and intensity as the Match Pressure Index rises.
- **Mood Skins**: The layout dynamically toggles mood themes (`mood-stable`, `mood-alert`, `mood-volatile`, `mood-critical`, `mood-clutch`) shifting HSL glow values across the entire screen.

### 3. God-Mode Event Visual Effects (VFX)
- **Wicket Apocalypse (.wicket-event)**: Triggering a wicket causes a 2.2-second chromatic aberration split and shake across all cards (`wicketGlitch`), reflecting a catastrophic event.
- **Boundary Plasma Shockwave (.boundary-event)**: Fours and Sixes flash a 1.6-second golden high-energy border pulse.
- **Win Probability Shifts (.probability-shift)**: Major changes ($> 5\%$) trigger a 1.4-second canvas plasma glow on the win probability telemetry chart.

### 4. Advanced Multi-Agent Text-to-Speech (TTS)
Three distinct coordinated agent personalities speak their findings sequentially:
- **Franchise Analyst**: Speaks with a low, calculating voice (pitch `0.8`, rate `0.9`).
- **Tactical Scout**: Speaks with a fast, high-pitched matchup voice (pitch `1.2`, rate `1.1`).
- **Cinematic Narrator**: Speaks with a balanced, dramatic voice (pitch `1.0`, rate `1.0`).
- *Dissent flags draw amber diagnostic borders when the Scout challenges the Analyst's forecast.*

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

## 🎮 Presentation & Demo Strategy (God-Mode Walkthrough)

1. **Step 1: The Initial Hook (Stark Boot)**:
   - Open [http://localhost:3000](http://localhost:3000) on the presentation screen.
   - Point out the locked diagnostic terminal and the rotating blueprint vector.
   - Click **ENGAGE COGNITIVE GRID**. Watch the logs stream in and let the crowd hear FRIDAY's voice welcome you back.
2. **Step 2: Deploy Scenario**:
   - Choose a scenario (e.g. *IND vs PAK*) and click **Deploy Engine Feed**.
   - Point out the rotating Arc Reactor and explain: *"Every delivery is generated in real-time by a probabilistic simulation engine tracking batting aggression, strike rotation, and bowler matchups."*
3. **Step 3: Multi-Agent Dissent & TTS**:
   - Listen as the agents speak sequentially. Point out the highlighted borders flashing as each agent speaks.
   - Show the **Tactical Dissent Badge** when the Scout disagrees with the Analyst's mathematical prediction.
4. **Step 4: Doom Events (Wickets & Boundaries)**:
   - Wait for a boundary or trigger a demo moment. Watch the screen glow gold.
   - When a wicket falls, point out the chromatic glitch aberration shaking the UI.
5. **Step 5: Temporal Rewind**:
   - Switch to **Historical Replay** or click any marker on the timeline. Show that we can travel back in time, analyze critical moments, and resume the live simulation safely.

---
*For backup measures and venue WiFi troubleshooting, consult the [fallback_strategy.md](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/fallback_strategy.md) protocol.*
