# 🛡️ DUGOUT Battle OS v4.0 — Contingency & Fallback Protocol

### Codename: SHIELD_SAFEGUARD | Auth: STARK ENGINEERING | Venue: Amoeba Sports Bar

This protocol outlines the mitigation paths for physical presentation failures. Because DUGOUT is a broadcast-grade war room operating system running complex telemetry animations, parallel future simulations, polar canvases, and multi-agent audio logic, failures must be resolved in milliseconds without breaking presentation flow.

---

## ⚡ Emergency Diagnostics Matrix

### Scenario 1: Web Audio Context / Speech Synthesis Blocked
**Symptom**: The boot sequence runs, but no synthetic voice greeting or synthesizer arpeggio plays.
- **Root Cause**: Modern browser security policies prevent audio playback without a direct user interaction gesture.
- **Immediate Resolution**:
  1. The **ENGAGE COGNITIVE GRID** button on the boot loader is designed to register the first click and activate `audioSynth.init()`.
  2. If audio is still missing, **click anywhere on the blank UI space**. A global backup listener is attached to `document` to activate the Audio Context on any user tap.
  3. If SpeechSynthesis queue hangs (no voice output for subsequent overs), double-click the main scoreboard or settings button to trigger:
     ```javascript
     window.speechSynthesis.cancel();
     ```
     This flushes the browser's speech buffer queue instantly and resets active speaker spotlights.

---

### Scenario 2: WebSocket Fails (Backend Offline)
**Symptom**: "Waiting for match data..." persists, or connection logs show connection retrying.
- **Root Cause**: The WebSocket server on port `3001` is not running or crashed.
- **Immediate Resolution**:
  - Check the backend process in Terminal A. If stopped, restart it:
     ```bash
     npm run server
     ```
- **Automated Fallback**:
  - The client is equipped with a **Seamless Offline Simulator**.
  - If the WebSocket server is unreachable, the UI operates in **Local Simulation Mode**. The simulation and agents will use local rules engines (`LocalLiveMatchEngine`) and template commentary arrays. It functions **100% offline** with stamina, shots, branches, and psychologist pressure computed client-side.

---

### Scenario 3: Venue Wifi / Internet Drops
**Symptom**: Gemini AI API calls fail, or the page fails to fetch external assets.
- **Root Cause**: No active connection to the public internet.
- **Immediate Resolution**:
  1. **API Key Fallback**: If internet is down, DUGOUT automatically bypasses the Gemini API requests and utilizes high-fidelity local rules, psychologist diagnostics, and commentary structures. The dashboard remains fully interactive.
  2. **Umpire API Fallback**: If the Gemini Umpire API call fails or receives malformed JSON, the server-side engine automatically redirects to a local physics-based fallback generator, producing realistic runs, wicket sequences, and polar coordinates. This prevents the 15-second simulation loop from freezing.
  3. **Hotspot Action**:
     - Connect presentation laptop to a mobile hotspot.
     - Access `http://localhost:3000`. (Localhost connections do not consume hotspot bandwidth; only Gemini API requests will use it).

---

### Scenario 4: IndexedDB Session Restore Fails
**Symptom**: Page is refreshed but clicking "Restore Grid" doesn't load history, or throws an error.
- **Root Cause**: Browser storage limits or private browsing mode blocks IndexedDB writes.
- **Immediate Resolution**:
  1. Verify the browser is not in Incognito/Private mode, which disables IndexedDB persistence.
  2. If persistence is corrupted, click the **Reset** button to wipe IndexedDB cache clean.
  3. For absolute safety, use the **Export Replay** button before closing the tab. If the session fails to restore, the JSON replay log can be inspected or imported.

---

### Scenario 5: Interface Lag / Graphics Stuttering
**Symptom**: Telemetry curves jitter, Wagon Wheel canvas doesn't draw lines smoothly, or Wicket chromatic glitch shakes drop frames.
- **Root Cause**: High GPU/CPU overhead from heavy CSS filters (`.wicket-event` glitch overlays, radial gradients, or canvas rendering) on older presentation hardware.
- **Immediate Resolution**:
  1. Increase the simulation speed interval (change from `Turbo` back to `1.5x` or `1.5x` in the speed selectors).
  2. Disable **Commentary Sync Mode** in settings to prevent background speech synthesis queues from consuming CPU cycles.
  3. Close any heavy background apps (Slack, Chrome tabs, Discord).

---

## 📋 Pre-Flight Diagnostics Checklist (1 Hour Before Demo)

- [ ] **Port Clearance**: Ensure ports `3000` and `3001` are not being hijacked by other ghost processes.
  - *Windows Command*: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force`
- [ ] **Audio Validation**: Click anywhere on the browser window to confirm the synthesized ambient synthesizer hum starts.
- [ ] **IndexedDB Validation**: Run the simulation for 3 balls, refresh the browser, click the lock bypass button, and verify that the "Restore Grid" button appears and recovers the full 3-ball history.
- [ ] **Replay Export Verification**: Click **Export Replay** and verify that a `.json` file containing match history, dialogue logs, highlight reels, and branches successfully downloads.
- [ ] **Local Mode Validation**: Stop the backend server and ensure click-deploying the match still generates live events, stamina drain, and polar shots.
- [ ] **Dual Screen Check**: Open dev tools console to check for any unhandled JavaScript syntax errors or uncaught promises.
- [ ] **Fallback Video**: Keep a recording of the v4.0 interface running in the background as a local `.mp4` file.

---

## 🚫 What NOT to Do Under Pressure

* ❌ **Do not search the internet in front of the judges**. Switch to local simulation instantly and say: *"Operating in offline tactical fallback mode."*
* ❌ **Do not blame WiFi**. Mention that Stark OS is designed with local failover protocols to run even in high-jamming environments.
* ❌ **Do not try to input an API key in a rush**. The offline template commentary has been enhanced to sound incredibly rich and realistic without it.
