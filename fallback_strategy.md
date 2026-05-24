# 🛡️ DUGOUT Battle OS v3.7 — Contingency & Fallback Protocol

### Codename: SHIELD_SAFEGUARD | Auth: STARK ENGINEERING | Venue: Amoeba Sports Bar

This protocol outlines the mitigation paths for physical presentation failures. Because DUGOUT is a broadcast-grade war room operating system running complex telemetry animations and audio logic, failures must be resolved in milliseconds without breaking presentation flow.

---

## ⚡ Emergency Diagnostics Matrix

### Scenario 1: Web Audio Context / Speech Synthesis Blocked
**Symptom**: The boot sequence runs, but no synthetic voice greeting or synthesizer arpeggio plays.
- **Root Cause**: Modern browser security policies prevent audio playback without a direct user interaction gesture.
- **Immediate Resolution**:
  1. The **ENGAGE COGNITIVE GRID** button on the boot loader is designed to register the first click and activate `audioSynth.init()`.
  2. If audio is still missing, **click anywhere on the blank UI space**. A global backup listener is attached to `document` to activate the Audio Context on any user tap.
  3. If SpeechSynthesis queue hangs (no voice output for subsequent overs), open developer console and run:
     ```javascript
     window.speechSynthesis.cancel();
     ```
     This flushes the browser's speech buffer queue.

---

### Scenario 2: WebSocket Fails (Backend Offline)
**Symptom**: "Waiting for match data..." persists, or connection logs show connection retries.
- **Root Cause**: The WebSocket server on port `3001` is not running or crashed.
- **Immediate Resolution**:
  - Check the backend process in Terminal A. If stopped, restart it:
    ```bash
    npm run server
    ```
- **Automated Fallback**:
  - The client [App.jsx](file:///C:/Users/Sarika%20Srivastava/.gemini/antigravity/scratch/dugout/client/src/App.jsx) is equipped with a **Seamless Offline Simulator**.
  - If the WebSocket server is unreachable, the UI operates in **Local Simulation Mode**. The simulation and agents will use local rules engines (`LocalLiveMatchEngine`) and template commentary arrays. It functions **100% offline** without any network requirement.

---

### Scenario 3: Venue Wifi / Internet Drops
**Symptom**: Gemini AI API calls fail, or the page fails to fetch external assets.
- **Root Cause**: No active connection to the public internet.
- **Immediate Resolution**:
  1. **API Key Fallback**: If internet is down, DUGOUT automatically bypasses the Gemini API requests and utilizes high-fidelity local rules and commentary structures. The dashboard remains fully interactive.
  2. **Hotspot Action**:
     - Connect presentation laptop to a mobile hotspot.
     - Access `http://localhost:3000`. (Localhost connections do not consume hotspot bandwidth; only Gemini API requests will use it).

---

### Scenario 4: Interface Lag / Graphics Stuttering
**Symptom**: Telemetry curves jitter, or Wicket chromatic glitch shakes drop frames.
- **Root Cause**: High GPU/CPU overhead from heavy CSS filters (`.wicket-event` glitch overlays, radial gradients, or canvas rendering) on older presentation hardware.
- **Immediate Resolution**:
  1. Increase the simulation speed interval (change from `Turbo` back to `1x` or `1.5x` in the speed selectors to give the render loop more room to breathe).
  2. Close any heavy background apps (Slack, Chrome tabs, Discord).
  3. Mute client-side audio processing if speech processing overhead is high.

---

## 📋 Pre-Flight Diagnostics Checklist (1 Hour Before Demo)

- [ ] **Port Clearance**: Ensure ports `3000` and `3001` are not being hijacked by other ghost processes.
  - *Windows Command*: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force`
- [ ] **Audio Validation**: Click anywhere on the browser window to confirm the synthesized ambient synthesizer hum starts.
- [ ] **Local Mode Validation**: Stop the backend server and ensure click-deploying the match still generates live events and rotates strike.
- [ ] **Dual Screen Check**: Open dev tools console to check for any unhandled JavaScript syntax errors or uncaught promises.
- [ ] **Fallback Video**: Keep a recording of the v3.7 interface running IND vs PAK in the background as a local `.mp4` file.
- [ ] **Bypass Boot URL Param**: If you need to skip the boot interface during rapid troubleshooting, reload the client page. (The boot page is lightweight, but the manual tap is required to initialize audio).

---

## 🚫 What NOT to Do Under Pressure

* ❌ **Do not search the internet in front of the judges**. Switch to local simulation instantly and say: *"Operating in offline tactical fallback mode."*
* ❌ **Do not blame WiFi**. Mention that Stark OS is designed with local failover protocols to run even in high-jamming environments.
* ❌ **Do not try to input an API key in a rush**. The offline template commentary has been enhanced to sound incredibly rich and realistic without it.
