# DUGOUT Fallback Strategy

## Venue: Amoeba Sports Bar, May 24, 2026

### Scenario 1: WebSocket Fails (Backend Offline)
**Symptom**: "Waiting for match data..." message persists

**Immediate Action**:
1. Check if backend is running: `curl http://localhost:3001`
2. If not: `npm run server` in Terminal A
3. If WebSocket still fails: Restart backend completely
4. Last resort: Use pre-recorded demo video (see below)

**Fallback Mode**:
- Switch to static HTML snapshot (pre-rendered match state)
- Display message: "Live Simulation Paused — Technical Adjustment"
- Play 2-minute demo video on loop

### Scenario 2: Frontend Browser Crashes
**Symptom**: Page goes blank or error screen

**Immediate Action**:
1. Hard refresh: Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows)
2. If persists: Close browser, reopen http://localhost:3000
3. Check console for errors: Cmd+Option+J (DevTools)

**Fallback Mode**:
- Have a second laptop with DUGOUT already running (standby)
- Switch to standby laptop if primary fails

### Scenario 3: Venue WiFi Fails
**Symptom**: Network timeout, "Cannot reach localhost:3000"

**Immediate Action**:
1. Enable mobile hotspot on your phone
2. Connect laptop to hotspot
3. Access http://localhost:3000 via hotspot (works locally)
4. Inform organizers: "Using personal hotspot, still operational"

**Fallback Mode**:
- Demonstrate using pre-rendered screenshots/slides
- Show architecture diagram on presentation screen

### Scenario 4: Simulation Runs Too Fast or Too Slow
**Symptom**: Match events blur together or pause unexpectedly

**Immediate Action**:
1. Adjust Speed control: 1.5x, 2x, or Turbo
2. If agents timeout: Check Gemini API rate limits
3. If no API key: Switch to local template fallback

**Fallback Mode**:
- Disable agent voice/audio (WebSpeech can slow down rendering)
- Use text-only commentary (faster)

### Scenario 5: Agent Output Is Repetitive / Boring
**Symptom**: Narrator says same thing multiple times

**Immediate Action**:
1. This is expected (template rotation is limited)
2. Point out agent disagreement (Scout vs Analyst) instead
3. Show pressure index or win probability shift (visual is better than text)

**Fallback Mode**:
- Skip agent commentary, focus on telemetry graphs
- Ask judges: "Notice how the Pressure Index shifted when the Scout disagreed?"

### Pre-Event Checklist (1 Hour Before)
- [ ] Both terminals (server + client) are running locally
- [ ] http://localhost:3000 loads without errors
- [ ] All three agent panels show data
- [ ] Win probability graph animates smoothly
- [ ] Mobile hotspot is enabled and tested
- [ ] Demo video is saved and ready to play (backup)
- [ ] Screenshots of DUGOUT interface saved
- [ ] Backup laptop (if available) is charged and ready

### Offline Demo Video
**Record this BEFORE the event:**
1. Run DUGOUT locally for 2 minutes of match simulation
2. Capture screen: QuickTime (macOS) or ShareX (Windows)
3. Save as: `dugout_demo_2min.mp4`
4. Store on laptop + USB drive (redundancy)

**When to use**: If both backend AND WiFi fail simultaneously (catastrophic scenario)

### What NOT to Do
❌ Do not troubleshoot in front of judges (kills momentum)
❌ Do not restart servers during demo (kills credibility)
❌ Do not blame WiFi/tech (own it, pivot gracefully)
✅ Do switch to fallback mode, explain what you're doing, keep confidence high

---

**Remember**: You're not demoing perfect tech. You're demoing intelligent agentic design. 
If the tech blinks, the architecture stays strong.
