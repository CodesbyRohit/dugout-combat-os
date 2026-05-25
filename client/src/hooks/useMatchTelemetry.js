import { useState, useEffect, useRef, useCallback } from 'react';
import audioSynth from '../utils/audioSynth';
import { SCENARIOS } from '../utils/scenarios';
import { processBallEvent, LocalLiveMatchEngine } from '../utils/localSimulator';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';
import { sessionDb } from '../utils/sessionDb';

export function useMatchTelemetry() {
  // Stark OS Connection & Config States
  const [connected, setConnected] = useState(false);
  const [scenarios, setScenarios] = useState(
    Object.keys(SCENARIOS).map(key => ({
      id: key,
      name: SCENARIOS[key].name,
      venue: SCENARIOS[key].venue
    }))
  );
  const [selectedScenario, setSelectedScenario] = useState('mi_vs_rr_2026');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Active Paced Match States (Driven by the Pacing Queue)
  const [matchInfo, setMatchInfo] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [telemetry, setTelemetry] = useState({
    winProbability: 50,
    pressureIndex: 10,
    momentumState: 'Calm',
    disagreementActive: false
  });
  const [agents, setAgents] = useState({
    analyst: 'Awaiting match launch. Initiate live match telemetry to invoke the Franchise analyst.',
    scout: 'Dugout communications standby. Awaiting first ball data to build matchup recommendations.',
    narrator: 'Melbourne night. Hyderabad heat. Select a scenario and witness the AI experience the match.'
  });
  const [timeline, setTimeline] = useState([]);
  const [history, setHistory] = useState([]);
  const [bowlerStamina, setBowlerStamina] = useState({});
  const [activeLatency, setActiveLatency] = useState(0);
  const [activeTimestamp, setActiveTimestamp] = useState(null);

  // Engine Control States
  const [simulationStatus, setSimulationStatus] = useState('idle'); // idle | running | paused | complete
  const [speed, setSpeed] = useState(3000); // ms per ball
  const [simulationMode, setSimulationMode] = useState('live'); // live | historical
  const [commentarySync, setCommentarySync] = useState(false);
  const [coachOverrideBowler, setCoachOverrideBowler] = useState("");
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(-1);
  const [highlightedAgent, setHighlightedAgent] = useState(null);
  const [isShaking, setIsShaking] = useState(false);

  // Refs for background calculations & Event queueing
  const wsRef = useRef(null);
  const localBallIndexRef = useRef(-1);
  const localHistoryRef = useRef([]);
  const localTimelineRef = useRef([]);
  const localIntervalRef = useRef(null);
  const localLiveEngineRef = useRef(null);
  const orchestratorRef = useRef(new AgentOrchestrator());

  // --- THE TELEMETRY EVENT QUEUE & PACING PIPELINE ---
  const eventQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const speedRef = useRef(speed);
  const commentarySyncRef = useRef(commentarySync);

  // Sync refs to prevent stale values in async loop
  useEffect(() => {
    speedRef.current = speed;
    commentarySyncRef.current = commentarySync;
  }, [speed, commentarySync]);

  // Set visual mood skins on body element
  useEffect(() => {
    const p = telemetry.pressureIndex;
    let moodClass = 'mood-stable';
    if (p > 90) moodClass = 'mood-clutch';
    else if (p > 80) moodClass = 'mood-critical';
    else if (p > 60) moodClass = 'mood-volatile';
    else if (p > 35) moodClass = 'mood-alert';
    
    document.body.className = moodClass;
    return () => { document.body.className = ''; };
  }, [telemetry.pressureIndex]);

  // Procedural audio and DOM vibration overlays
  const applyVFX = useCallback((eventType, pressureIndex = 0) => {
    const body = document.body;
    const scoreboardEl = document.querySelector('.scoreboard');
    const agentCards = [...document.querySelectorAll('.agent-card')];
    const graph = document.querySelector('.graph-container');

    const flash = (els, cls, ms) => {
      els.forEach(el => el?.classList.add(cls));
      setTimeout(() => els.forEach(el => el?.classList.remove(cls)), ms);
    };

    if (eventType === 'boundary') {
      flash([body, scoreboardEl], 'boundary-event', 1600);
    }
    if (eventType === 'wicket') {
      flash([body, scoreboardEl, ...agentCards], 'wicket-event', 2200);
    }
    if (eventType === 'probShift') {
      flash([graph], 'probability-shift', 1400);
    }

    const hot = pressureIndex > 75;
    body.classList.toggle('pressure-critical', hot);
    agentCards.forEach(c => c.classList.toggle('pressure-critical', hot));
  }, []);

  const setSpeakerSpotlight = useCallback((agentId) => {
    setHighlightedAgent(agentId);
    document.querySelectorAll('.agent-row').forEach(r => r.classList.remove('speaker-row'));
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('speaker-active'));
    if (!agentId) return;
    document.querySelector(`[data-agent-id="${agentId}"]`)?.classList.add('speaker-row');
    document.querySelector(`[data-agent-id="${agentId}"] .agent-card`)?.classList.add('speaker-active');
  }, []);

  // Text-To-Speech engine call wrapping callback
  const speakAgent = useCallback((agentId, text, onStart, onEnd) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (agentId === 'analyst') { utterance.pitch = 0.8; utterance.rate = 0.9; }
    else if (agentId === 'scout') { utterance.pitch = 1.2; utterance.rate = 1.1; }
    else if (agentId === 'narrator') { utterance.pitch = 1.0; utterance.rate = 1.0; }
    else if (agentId === 'psychologist') { utterance.pitch = 0.9; utterance.rate = 0.75; }

    utterance.onstart = () => {
      setSpeakerSpotlight(agentId);
      if (onStart) onStart();
    };
    utterance.onend = () => {
      setSpeakerSpotlight(null);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setSpeakerSpotlight(null);
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  }, [setSpeakerSpotlight]);

  // Processes raw match data frame in sequential, non-blocking pipeline
  const processMatchTelemetryFrame = useCallback(async (data) => {
    // 1. Telemetry metadata
    if (data.timestamp) setActiveTimestamp(data.timestamp);
    if (data.telemetryLatency) setActiveLatency(data.telemetryLatency);
    
    // 2. Play game audio effects
    audioSynth.setPressure(data.telemetry.pressureIndex);
    if (data.scoreboard?.lastBallEvent === 'wicket') {
      audioSynth.playWicketGlitch();
    } else if (data.scoreboard?.lastBallEvent === 'six' || data.scoreboard?.lastBallEvent === 'six_noball') {
      audioSynth.playStadiumCheer();
    }

    if (data.shake || data.isDemoMoment) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }

    // 3. Update active states
    setMatchInfo(data.matchInfo);
    setScoreboard(data.scoreboard);
    setTelemetry(data.telemetry);
    setAgents(data.agents);
    setTimeline([...data.timeline]);
    setHistory([...data.history]);
    if (data.bowlerStamina) setBowlerStamina(data.bowlerStamina);

    // 4. Pacing and Queueing: Calculate animation duration based on speed
    const speedVal = speedRef.current;
    let animScale = 1.0;
    if (speedVal === 2000) animScale = 0.7;
    else if (speedVal === 1000) animScale = 0.35;
    else if (speedVal === 350) animScale = 0.12;
    else animScale = speedVal / 3000;

    const animationDuration = 4200 * animScale;
    const animationPromise = new Promise(resolve => setTimeout(resolve, animationDuration));

    // 5. Trigger audio speech pacing queues
    const hasSpeech = typeof window !== 'undefined' && window.speechSynthesis;

    let speechPromise;
    if (data.agents && hasSpeech && speedVal > 350) {
      const narratorText = typeof data.agents.narrator === 'object' ? data.agents.narrator.text : data.agents.narrator;
      const analystText = typeof data.agents.analyst === 'object' ? data.agents.analyst.text : data.agents.analyst;
      const psychologistText = typeof data.agents.psychologist === 'object' ? data.agents.psychologist.text : data.agents.psychologist;
      const scoutText = typeof data.agents.scout === 'object' ? data.agents.scout.text : data.agents.scout;
      const hasDissent = data.agents.scout?.dissent || data.telemetry?.disagreementActive;

      window.speechSynthesis.cancel();
      setSpeakerSpotlight(null);

      speechPromise = new Promise((speechResolve) => {
        if (commentarySyncRef.current) {
          // Sequential speech execution
          const speakChain = (agentId, text, next) => {
            if (!text) { next ? next() : speechResolve(); return; }
            speakAgent(agentId, text, null, () => {
              setTimeout(() => {
                if (next) next();
                else speechResolve();
              }, agentId === 'narrator' ? 800 : 500);
            });
          };

          speakChain('narrator', narratorText, () => {
            speakChain('analyst', analystText, () => {
              speakChain('psychologist', psychologistText, () => {
                if (hasDissent) {
                  speakChain('scout', scoutText, null);
                } else {
                  speechResolve();
                }
              });
            });
          });
        } else {
          // Speak simultaneously (or standard queue)
          let activeSpeechesCount = 0;
          const handleSpeechEnd = () => {
            activeSpeechesCount--;
            if (activeSpeechesCount <= 0) {
              speechResolve();
            }
          };

          if (narratorText) activeSpeechesCount++;
          if (analystText) activeSpeechesCount++;
          if (psychologistText) activeSpeechesCount++;
          if (hasDissent && scoutText) activeSpeechesCount++;

          if (activeSpeechesCount === 0) {
            speechResolve();
          } else {
            if (narratorText) speakAgent('narrator', narratorText, null, handleSpeechEnd);
            if (analystText) speakAgent('analyst', analystText, null, handleSpeechEnd);
            if (psychologistText) speakAgent('psychologist', psychologistText, null, handleSpeechEnd);
            if (hasDissent && scoutText) speakAgent('scout', scoutText, null, handleSpeechEnd);
          }
        }
      });
    } else {
      speechPromise = Promise.resolve();
    }

    // Wait for BOTH the canvas animation and active speech to complete fully
    await Promise.all([animationPromise, speechPromise]);
  }, [speakAgent, setSpeakerSpotlight]);

  // Queue polling loop
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (eventQueueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const nextEvent = eventQueueRef.current.shift();

    try {
      // Processes the telemetry frame, holding queue until LERP and TTS resolves
      await processMatchTelemetryFrame(nextEvent);
    } catch (err) {
      console.error("Failed to process telemetry event frame:", err);
    } finally {
      isProcessingRef.current = false;
      // Triggers immediate check for next item
      setTimeout(processQueue, 50);
    }
  }, [processMatchTelemetryFrame]);

  // Enqueue incoming events
  const enqueueMatchUpdate = useCallback((eventPayload) => {
    eventQueueRef.current.push(eventPayload);
    processQueue();
  }, [processQueue]);

  // WebSocket Server listener setup
  const connectWS = useCallback(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'SET_MODE', mode: simulationMode }));
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection error:', err);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'SYSTEM_READY':
            setScenarios(data.scenarios);
            setHasApiKey(data.hasApiKey);
            break;

          case 'API_KEY_CONFIRMED':
            setHasApiKey(data.hasApiKey);
            alert('Gemini API key registered successfully on server.');
            break;

          case 'MATCH_UPDATE':
            enqueueMatchUpdate(data);
            break;

          case 'MODE_CHANGED':
            setSimulationMode(data.mode);
            handleReset();
            break;

          case 'SIMULATION_PAUSED':
            setSimulationStatus('paused');
            break;

          case 'SIMULATION_RESET':
            setSimulationStatus('idle');
            break;

          case 'SIMULATION_COMPLETE':
            setSimulationStatus('complete');
            audioSynth.setPressure(0);
            break;

          case 'ERROR':
            alert(`Error: ${data.message}`);
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message packet:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connectWS, 3000);
    };
  }, [simulationMode, enqueueMatchUpdate]);

  // Local Offline Simulation Actions
  const localStartSimulation = (scenarioId, overrideSpeed) => {
    if (localIntervalRef.current) clearTimeout(localIntervalRef.current);
    
    const currentSpeed = overrideSpeed !== undefined ? overrideSpeed : speed;
    const currentScenario = SCENARIOS[scenarioId];
    if (!currentScenario) return;

    if (localBallIndexRef.current === -1 || simulationStatus === 'complete' || simulationStatus === 'idle') {
      localBallIndexRef.current = 0;
      localHistoryRef.current = [];
      localTimelineRef.current = [];
      if (simulationMode === 'live') {
        localLiveEngineRef.current = new LocalLiveMatchEngine();
        localLiveEngineRef.current.initialize(scenarioId, currentScenario);
      }
    }

    const runNextOfflineBall = () => {
      if (simulationMode === 'live') {
        const liveEngine = localLiveEngineRef.current;
        if (!liveEngine) return;

        const nextBall = liveEngine.generateNextBall();
        if (!nextBall) {
          setSimulationStatus('complete');
          audioSynth.setPressure(0);
          return;
        }

        const update = processBallEvent(nextBall, scenarioId, localHistoryRef.current, { timeline: localTimelineRef.current }, 'live');
        if (update) {
          update.timestamp = new Date().toISOString();
          update.telemetryLatency = Math.round(50 + Math.random() * 150);
          update.activeMode = 'live';
          enqueueMatchUpdate(update);
        }

        if (liveEngine.currentRuns >= liveEngine.target || liveEngine.wickets >= 10 || liveEngine.ballsBowled >= 120) {
          setSimulationStatus('complete');
          audioSynth.setPressure(0);
        } else {
          const jitterFactor = 0.85 + Math.random() * 0.3;
          const delay = currentSpeed * jitterFactor;
          localIntervalRef.current = setTimeout(runNextOfflineBall, delay);
        }
      } else {
        if (localBallIndexRef.current >= currentScenario.balls.length) {
          setSimulationStatus('complete');
          audioSynth.setPressure(0);
          return;
        }

        const ball = currentScenario.balls[localBallIndexRef.current];
        const update = processBallEvent(ball, scenarioId, localHistoryRef.current, { timeline: localTimelineRef.current }, 'historical');
        if (update) {
          update.timestamp = new Date().toISOString();
          update.telemetryLatency = Math.round(10 + Math.random() * 40);
          update.activeMode = 'historical';
          enqueueMatchUpdate(update);
        }

        localBallIndexRef.current++;
        if (localBallIndexRef.current < currentScenario.balls.length) {
          const jitterFactor = 0.85 + Math.random() * 0.3;
          const delay = currentSpeed * jitterFactor;
          localIntervalRef.current = setTimeout(runNextOfflineBall, delay);
        } else {
          setSimulationStatus('complete');
          audioSynth.setPressure(0);
        }
      }
    };

    runNextOfflineBall();
  };

  const handleStart = () => {
    audioSynth.init();
    
    if (simulationStatus === 'complete' || simulationStatus === 'idle') {
      eventQueueRef.current = [];
    }

    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'START_SIMULATION',
        scenarioId: selectedScenario
      }));
    } else {
      setSimulationStatus('running');
      localStartSimulation(selectedScenario);
    }
  };

  const handlePause = () => {
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PAUSE_SIMULATION' }));
    } else {
      if (localIntervalRef.current) {
        clearTimeout(localIntervalRef.current);
        localIntervalRef.current = null;
      }
      setSimulationStatus('paused');
    }
  };

  const handleReset = () => {
    eventQueueRef.current = [];
    isProcessingRef.current = false;
    setBowlerStamina({});
    setCoachOverrideBowler("");
    setActiveHistoryIndex(-1);
    sessionDb.clearSession("dugout_save");
    setHasSavedSession(false);

    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RESET_SIMULATION' }));
    } else {
      if (localIntervalRef.current) {
        clearTimeout(localIntervalRef.current);
        localIntervalRef.current = null;
      }
      localBallIndexRef.current = -1;
      localHistoryRef.current = [];
      localTimelineRef.current = [];
      localLiveEngineRef.current = null;
      
      setSimulationStatus('idle');
      setScoreboard(null);
      setMatchInfo(null);
      setTelemetry({ winProbability: 50, pressureIndex: 10, momentumState: 'Calm', disagreementActive: false });
      setHighlightedAgent(null);
      setAgents({
        analyst: 'Awaiting match launch. Initiate live match telemetry to invoke the Franchise analyst.',
        scout: 'Dugout communications standby. Awaiting first ball data to build matchup recommendations.',
        narrator: 'Melbourne night. Hyderabad heat. Select a scenario and witness the AI experience the match.'
      });
      setTimeline([]);
      setHistory([]);
      setActiveTimestamp(null);
      setActiveLatency(0);
      audioSynth.setPressure(0);
    }
  };

  const handleSetMode = (mode) => {
    handleReset();
    setSimulationMode(mode);
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_MODE', mode }));
    }
  };

  const handleSetSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    if (newSpeed === 350) {
      setCommentarySync(false);
    }
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_SPEED', speed: newSpeed }));
    } else {
      if (simulationStatus === 'running') {
        localStartSimulation(selectedScenario, newSpeed);
      }
    }
  };

  const handleSetApiKey = (keyVal) => {
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_API_KEY', apiKey: keyVal }));
    } else {
      alert('Offline mode: API Key cached locally.');
    }
  };

  const handleReplayEvent = (over) => {
    const matchState = history.find(item => item.over === over);
    if (!matchState) return;

    handlePause();
    audioSynth.playWicketGlitch();

    setScoreboard({
      over: matchState.over,
      score: matchState.score,
      wickets: matchState.wickets,
      target: matchInfo?.target || 160,
      batsman: matchState.batsman,
      bowler: matchState.bowler,
      runsNeeded: Math.max(0, (matchInfo?.target || 160) - matchState.runs),
      ballsRemaining: 120 - (Math.floor(matchState.over) * 6 + Math.round((matchState.over % 1) * 10)),
      requiredRR: ((Math.max(0, (matchInfo?.target || 160) - matchState.runs) / Math.max(1, 120 - (Math.floor(matchState.over) * 6 + Math.round((matchState.over % 1) * 10)))) * 6).toFixed(2),
      lastBallEvent: matchState.event,
      lastBallCommentary: matchState.commentary
    });

    setTelemetry({
      winProbability: matchState.winProbability,
      pressureIndex: matchState.pressureIndex,
      momentumState: matchState.pressureIndex >= 90 ? 'Clutch Moment' : matchState.event === 'wicket' ? 'Chaos' : 'Calm',
      disagreementActive: matchState.agents.scout?.dissent || false
    });

    setAgents(matchState.agents);
    audioSynth.setPressure(matchState.pressureIndex);
  };

  const handleExitReplay = () => {
    if (history.length === 0) return;
    const latestState = history[history.length - 1];

    setScoreboard({
      over: latestState.over,
      score: latestState.score,
      wickets: latestState.wickets,
      target: matchInfo?.target || 160,
      batsman: latestState.batsman,
      bowler: latestState.bowler,
      runsNeeded: Math.max(0, (matchInfo?.target || 160) - latestState.runs),
      ballsRemaining: 120 - (Math.floor(latestState.over) * 6 + Math.round((latestState.over % 1) * 10)),
      requiredRR: ((Math.max(0, (matchInfo?.target || 160) - latestState.runs) / Math.max(1, 120 - (Math.floor(latestState.over) * 6 + Math.round((latestState.over % 1) * 10)))) * 6).toFixed(2),
      lastBallEvent: latestState.event,
      lastBallCommentary: latestState.commentary
    });

    setTelemetry({
      winProbability: latestState.winProbability,
      pressureIndex: latestState.pressureIndex,
      momentumState: latestState.pressureIndex >= 90 ? 'Clutch Moment' : latestState.event === 'wicket' ? 'Chaos' : 'Calm',
      disagreementActive: latestState.agents.scout?.dissent || false
    });

    setAgents(latestState.agents);
    audioSynth.setPressure(latestState.pressureIndex);
  };

  const handleDemoTrigger = (scenarioId, over, event, triggerId, flashColor, setFlash) => {
    audioSynth.init();
    setSelectedScenario(scenarioId);
    if (setFlash) {
      setFlash({ active: true, color: flashColor, key: Date.now() });
    }

    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'JUMP_TO_BALL',
        scenarioId,
        over,
        event,
        demoTriggerId: triggerId
      }));
    } else {
      localJumpToBall(scenarioId, over, event, triggerId);
    }
  };

  const localJumpToBall = (scenarioId, targetOver, event, triggerId) => {
    if (localIntervalRef.current) {
      clearTimeout(localIntervalRef.current);
      localIntervalRef.current = null;
    }

    const currentScenario = SCENARIOS[scenarioId];
    if (!currentScenario) return;

    localHistoryRef.current = [];
    localTimelineRef.current = [];
    eventQueueRef.current = [];

    let targetIndex = -1;
    for (let i = 0; i < currentScenario.balls.length; i++) {
      const ballData = currentScenario.balls[i];
      const isMatch = Math.abs(ballData.over - targetOver) < 0.01 && 
                      (!event || ballData.event === event);
      
      if (isMatch) {
        targetIndex = i;
        break;
      } else {
        processBallEvent(ballData, scenarioId, localHistoryRef.current, { timeline: localTimelineRef.current });
      }
    }

    if (targetIndex >= 0) {
      localBallIndexRef.current = targetIndex;
      const ballData = currentScenario.balls[targetIndex];
      const update = processBallEvent(ballData, scenarioId, localHistoryRef.current, { timeline: localTimelineRef.current });
      if (update) {
        update.isDemoMoment = true;
        update.demoTriggerId = triggerId;
        enqueueMatchUpdate(update);
        setSimulationStatus('paused');
      }
    }
  };

  const handleRestoreSession = async () => {
    const saved = await sessionDb.loadSession("dugout_save");
    if (saved) {
      setSelectedScenario(saved.selectedScenario || 'mi_vs_rr_2026');
      setSimulationMode(saved.simulationMode || 'live');
      setSpeed(saved.speed || 3000);
      setMatchInfo(saved.matchInfo);
      setScoreboard(saved.scoreboard);
      setTelemetry(saved.telemetry);
      setAgents(saved.agents);
      setTimeline(saved.timeline || []);
      setHistory(saved.history || []);
      setBowlerStamina(saved.bowlerStamina || {});
      setHasSavedSession(false);
      
      localBallIndexRef.current = saved.history.length;
      localHistoryRef.current = saved.history;
      localTimelineRef.current = saved.timeline;
      
      audioSynth.init();
      speakAgent('narrator', "Tactical grid restored. Welcome back, Boss.");
    }
  };

  const handleExportSession = () => {
    const highlights = history.filter(h => 
      h.event === 'wicket' || 
      h.event === 'six' || 
      h.event === 'boundary' || 
      h.event === 'six_noball' || 
      h.psychologist?.dissent || 
      h.agents.scout.dissent
    ).map(h => ({
      over: h.over,
      event: h.event,
      score: h.score,
      batsman: h.batsman,
      bowler: h.bowler,
      commentary: h.commentary,
      isDissent: !!(h.psychologist?.dissent || h.agents.scout.dissent)
    }));

    const payload = {
      matchInfo,
      selectedScenario,
      dialogueLogs: history.map(h => ({
        over: h.over,
        analyst: h.agents.analyst.text,
        scout: h.agents.scout.text,
        narrator: h.agents.narrator.text,
        psychologist: h.agents.psychologist?.text
      })),
      timeline,
      history,
      highlightReel: highlights
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dugout_replay_${selectedScenario}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Trigger WebSocket connection setup
  useEffect(() => {
    connectWS();
    
    // Check IndexedDB
    sessionDb.loadSession("dugout_save").then(saved => {
      if (saved && saved.history && saved.history.length > 0) {
        setHasSavedSession(true);
      }
    });

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (localIntervalRef.current) clearTimeout(localIntervalRef.current);
    };
  }, [connectWS]);

  // IndexedDB Auto-Save state hook
  useEffect(() => {
    if (history && history.length > 0) {
      sessionDb.saveSession("dugout_save", {
        selectedScenario,
        simulationMode,
        speed,
        matchInfo,
        scoreboard,
        telemetry,
        agents,
        timeline,
        history,
        bowlerStamina
      });
    }
  }, [history, timeline, bowlerStamina, selectedScenario, simulationMode, speed, matchInfo, scoreboard, telemetry, agents]);

  return {
    // states
    connected,
    scenarios,
    selectedScenario,
    setSelectedScenario,
    hasApiKey,
    setHasApiKey,
    matchInfo,
    scoreboard,
    telemetry,
    agents,
    timeline,
    history,
    bowlerStamina,
    activeLatency,
    activeTimestamp,
    simulationStatus,
    setSimulationStatus,
    speed,
    simulationMode,
    commentarySync,
    setCommentarySync,
    coachOverrideBowler,
    setCoachOverrideBowler,
    hasSavedSession,
    setHasSavedSession,
    activeHistoryIndex,
    setActiveHistoryIndex,
    highlightedAgent,
    isShaking,

    // handlers
    handleStart,
    handlePause,
    handleReset,
    handleSetMode,
    handleSetSpeed,
    handleSetApiKey,
    handleReplayEvent,
    handleExitReplay,
    handleDemoTrigger,
    handleRestoreSession,
    handleExportSession
  };
}
