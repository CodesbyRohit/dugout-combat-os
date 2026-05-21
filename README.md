# DUGOUT — Experimental Multi-Agent Cricket Intelligence Platform

DUGOUT is a broadcast-grade cricket analytics and replay intelligence prototype. It reacts dynamically to ball-by-ball matches, interpreting momentum changes, predicting tactical matchups, and crafting dramatic cinematic commentary.

---

## ⚡ Tech Stack & Architecture

- **Frontend**: React (Vite) + Custom HSL design system + HTML5 Canvas Telemetry Graph
- **Backend**: Node.js + Express + WebSockets (`ws`)
- **Agent Orchestration**: Unified Match Shared Memory Context (Analyst ➔ Scout ➔ Narrator)
- **Model Layer**: Gemini 2.5 Flash API (with automated high-fidelity local rule fallback)

---

## 🚀 Getting Started

Ensure you have Node.js installed on your machine.

### 1. Installation
To install dependencies for both the server and client:
```bash
# Run from the root 'dugout' folder
npm run install:all
```

### 2. Launching the App
Start the backend WebSocket server and the Vite frontend server in separate terminals:

#### Terminal A (Backend Server)
```bash
npm run server
```
*The server will start on [http://localhost:3001](http://localhost:3001).*

#### Terminal B (Frontend Client)
```bash
npm run client
```
*The client will boot on [http://localhost:3000](http://localhost:3000).*

---

## 🎮 Presentation & Demo Strategy

1. Open [http://localhost:3000](http://localhost:3000).
2. By default, the application runs in **High-Fidelity Offline Sim Mode** using preloaded iconic matches (e.g. *IND vs PAK T20 WC 2022* or *MI vs CSK IPL 2019 Final*).
3. If you want to use the live LLM model generation, click the **Settings** gear at the top right, paste your **Gemini API Key**, and click **Save Key**.
4. Select a scenario from the dropdown (e.g. `IND vs PAK (T20 World Cup 2022)`).
5. Click **Deploy Engine Feed**.
6. Watch the system come alive:
   - **Scoreboard**: Updates ball-by-ball.
   - **Analyst Panel**: Calculates win probabilities, pressure indexes, and explains statistical shifts.
   - **Scout Panel**: Suggests bowling changes, field adjustments, and batting angles.
   - **Narrator Panel**: Generates high-tension cinematic voiceover subtitles.
   - **Momentum Pulse**: Heartbeat-pulses faster and glows orange/red during critical wickets or tense final-over balls.
   - **Win Probability Graph**: Renders a glowing neon line chart plotting probability trends in real-time.
   - **Intelligence Log**: Shows the shared timeline log of all agents.

---

## 💡 Key Design Lines
* *The pitch line:* **“The match isn't being watched. It's being interpreted.”**
* *The presentation line:* **“Every franchise has a dugout. This is the one that never sleeps, never panics, and never misses a pattern. DUGOUT is AI thinking at match speed.”**
