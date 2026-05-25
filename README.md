# ⚡ DUGOUT — Broadcast-Grade Cricket Analytics & Battle OS v4.0

> **“The match isn't being watched. It's being interpreted.”**  
> DUGOUT transitions from a simple analytics tool to a sports war-room operations OS. It interprets match pressure, tactical shifts, team momentum, and agentic disagreement in real time under the design styling of Stark Industries FRIDAY interface. Upgraded to v4.0 with Bowler Fatigue Stamina, Polar Wagon Wheel Shot mapping, Parallel Universe Branching, Psychologist agent diagnostics, and Session state persistence.

---

## 🚀 Tech Stack & Architecture

- **Frontend**: React (Vite) + Custom HSL design system (Stark Battle HUD styled) + HTML5 Canvas Telemetry Graph + HTML5 Polar Coordinate Canvas
  - Core component: [App.jsx](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/client/src/App.jsx)
  - Style sheet: [index.css](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/client/src/index.css)
  - Wagon Wheel Shot Heatmap: [WagonWheel.jsx](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/client/src/components/WagonWheel.jsx)
- **Backend**: Node.js + Express + WebSockets (`ws` orchestration) on `localhost:3001`
- **Agentic Engine**: Unified Match Shared Memory Context (Analyst ➔ Scout ➔ Narrator ➔ Psychologist)
- **Model Layer**: Gemini 2.5 Flash API (with high-fidelity local rules/rotating template fallbacks)
- **Ingestion Abstraction**: Extensible Cricbuzz/CricAPI adapter abstraction layer to support real API feeds in production
- **Persistence**: Local IndexedDB wrapper API for state auto-recovery

---

## 🌟 Stark Industries Battle OS (v4.0) Features

### 1. Jarvis Boot Diagnostics Overlay
DUGOUT loads behind a locked secure diagnostic grid to prevent browser autoplay blockages. 
- **Engage Cognitive Grid**: Clicking the button unlocks the browser Web Audio context.
- **Boot Telemetry Logs**: A 3.4-second sequential console readout prints system diagnostics (WebSocket checks, agent caches, Arc Reactor checks) matching precise delays.
- **Speech Synthesis Welcome**: Once booted, the system speaks: *"Dugout systems are fully operational. FRIDAY is online. Welcome back, Boss."*

### 2. Arc Reactor Momentum & Fatigue Core
A heavy circular gauge visualizer positioned at the core of the telemetry interface.
- **Dynamic Rotation**: The ring elements rotate in alternating directions (`reactorRotate`) at speeds proportional to match tempo.
- **Breathing Pulse**: The central reactor core breathes dynamically, changing color and intensity as the Match Pressure Index rises.
- **Bowler Fatigue Indication**: When the active bowler's stamina drops below 40%, the Arc Reactor core pulses orange with a `.reactor-fatigued` breathing animation.

### 3. God-Mode Event Visual Effects (VFX)
- **Wicket Apocalypse (.wicket-event)**: Triggering a wicket causes a 2.2-second chromatic aberration split and shake across all cards (`wicketGlitch`), reflecting a catastrophic event.
- **Boundary Plasma Shockwave (.boundary-event)**: Fours and Sixes flash a 1.6-second golden high-energy border pulse.
- **Win Probability Shifts (.probability-shift)**: Major changes ($> 5\%$) trigger a 1.4-second canvas plasma glow on the win probability telemetry chart.

### 4. Parallel Universe Branching
At any live simulation moment, the platform forks the engine into 3 divergent probability paths:
- **Alpha (Aggressive)**: High six rate, elevated wicket probability.
- **Beta (Conservative)**: Focused on strike rotation, boundary suppression.
- **Gamma (Volatile)**: Wildly fluctuating outcomes.
- *Rendered as ghost dashed curves on the telemetry graph. Segments automatically fade out if they diverge by more than 25% from the main timeline.*

### 5. Psychologist Agent (4th Diagnostics Voice)
A fourth multi-agent voice joins the war room:
- **Pacing**: Clinical, sports-diagnostics pacing (pitch `0.9`, rate `0.75`).
- **Telemetry**: Tracks mental pressure index (0-100) for active batter (using dot streaks and droughts) and bowler (usingRequired Run Rate and runs conceded).
- **Tactical Dissent Badge**: Triggered (flashing amber badge) when batter pressure is above 75% AND win probability is above 70%, exposing tactical system tension.

### 6. Wagon Wheel Shot Heatmap
A polar canvas overlay showing:
- Field boundaries, 11 interactive fielder markers.
- Live-drawn shot trajectories color-coded by runs (amber `#FFB800` vs coral `#FF4560`).
- **Scout Matching**: The Scout agent queries the wagon wheel shot density dynamically to suggest bowling line adjustments (e.g. targeting the gap 180° away from the last boundary).

### 7. Commentary Sync Mode
Enables sequential speech pacing: `Narrator ➔ Analyst ➔ Psychologist ➔ Scout` with timed voice pacing and dead-ball silence. Automatically disables in Turbo mode.

### 8. Session Persistence & Replay Export
IndexedDB auto-saves simulation progress on every ball. A "Restore Grid" action recovers full state history. The "Export Replay" option downloads a JSON packet containing match trees, branches, dialog logs, and a highlight reel.

### 9. Generative Umpire Agent (Autonomous Engine)
The simulation is driven by **The Umpire Agent** powered by Gemini 2.5 Flash. The agent processes current match context (runs, wickets, overs, striker's score, bowler stamina) to generate the next ball outcome in structured JSON. Implements strict JSON schema enforcement, try/catch parsing safety, and an instant offline fallback engine.

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
   - Click **ENGAGE COGNITIVE GRID**. Watch the logs stream in and let the crowd hear FRIDAY's voice.
2. **Step 2: Deploy Scenario & Visuals**:
   - Choose a scenario (e.g. *mi_vs_rr_2026*) and click **Deploy Engine Feed**.
   - Show the rotating Arc Reactor and the live polar Wagon Wheel.
3. **Step 3: Multi-Agent Pacing & Dissent**:
   - Enable **Commentary Sync Mode** in settings to show sequential timed voice pacing.
   - Point out the flashing **Tactical Dissent Badge** when a batsman cracks under pressure (pressure > 75%) despite high win probability (> 70%).
4. **Step 4: Parallel Branches**:
   - Trace the dashed Alpha, Beta, Gamma curves on the win probability graph showing "possible future worlds" calculated 6 balls ahead.
5. **Step 5: Temporal Replay**:
   - Click any ball on the graph/timeline. Replay mode activates. Show how the wagon wheel, stamina, and branches are restored back to that exact delivery. Click "Return to Live Feed" to restore live telemetry.
6. **Step 6: Session Save & Export**:
   - Close the tab, reopen, and click **Restore Grid** to demonstrate session recovery. Click **Export Replay** to download the complete JSON diagnostic telemetry.
