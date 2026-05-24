import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Cpu, Compass, Shield, Flame, Key, Settings, Zap, RotateCw } from 'lucide-react';
import AgentPanel from './components/AgentPanel';
import MomentumPulse from './components/MomentumPulse';
import WinProbabilityGraph from './components/WinProbabilityGraph';
import EventTimeline from './components/EventTimeline';
import SpatialCard from './components/SpatialCard';
import audioSynth from './utils/audioSynth';
import { SCENARIOS } from './utils/scenarios';
import { processBallEvent, LocalLiveMatchEngine } from './utils/localSimulator';
import { AgentOrchestrator } from './agents/AgentOrchestrator';

export default function App() {
  // Stark OS Boot Sequence State
  const [bootState, setBootState] = useState('locked'); // 'locked' | 'booting' | 'ready'
  const [bootLogs, setBootLogs] = useState([]);

  // WebSocket
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  
  // Scenarios
  const [scenarios, setScenarios] = useState(
    Object.keys(SCENARIOS).map(key => ({
      id: key,
      name: SCENARIOS[key].name,
      venue: SCENARIOS[key].venue
    }))
  );
  const [selectedScenario, setSelectedScenario] = useState('mi_vs_rr_2026');
  
  // Gemini Settings
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Match State
  const [matchInfo, setMatchInfo] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [telemetry, setTelemetry] = useState({
    winProbability: 50,
    pressureIndex: 10,
    momentumState: 'Calm',
    disagreementActive: false
  });
  const [matchState, setMatchState] = useState({
    battingTeam: 'RR',
    bowlingTeam: 'MI',
    runs: 119,
    wickets: 5,
    over: 12.3,
    target: null,
    striker: 'Samson',
    nonStriker: 'Parag',
    bowler: 'Bumrah',
    pressureIndex: 0,
    momentum: 50,
    recentBalls: [],
    winProbability: 50
  });
  const [agents, setAgents] = useState({
    analyst: 'Awaiting match launch. Initiate live match telemetry to invoke the Franchise analyst.',
    scout: 'Dugout communications standby. Awaiting first ball data to build matchup recommendations.',
    narrator: 'Melbourne night. Hyderabad heat. Select a scenario and witness the AI experience the match.'
  });
  const [timeline, setTimeline] = useState([]);
  const [history, setHistory] = useState([]);
  const [simulationStatus, setSimulationStatus] = useState('idle'); // idle | running | paused | complete
  const [speed, setSpeed] = useState(3000); // ms per ball
  const [simulationMode, setSimulationMode] = useState('live'); // live | historical
  const [activeLatency, setActiveLatency] = useState(0);
  const [activeTimestamp, setActiveTimestamp] = useState(null);

  // Advanced Visual / Audio Effects
  const [isShaking, setIsShaking] = useState(false);
  const [replayState, setReplayState] = useState({
    active: false,
    over: null
  });

  // Demo Trigger & Broadcast Focus States
  const [activeDemoTrigger, setActiveDemoTrigger] = useState(null);
  const [highlightedAgent, setHighlightedAgent] = useState(null);
  const [flash, setFlash] = useState({ active: false, color: '', key: 0 });
  const [showPitchPlaybook, setShowPitchPlaybook] = useState(false);

  // Local (Offline) Simulator State
  const localBallIndexRef = useRef(-1);
  const localHistoryRef = useRef([]);
  const localTimelineRef = useRef([]);
  const localIntervalRef = useRef(null);
  const localLiveEngineRef = useRef(null);
  const orchestratorRef = useRef(new AgentOrchestrator());

  // Setup WebSocket connection and click listener for audio context
  useEffect(() => {
    connectWS();

    const resumeAudio = () => {
      audioSynth.init();
      document.removeEventListener('click', resumeAudio);
    };
    document.addEventListener('click', resumeAudio);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
      document.removeEventListener('click', resumeAudio);
      audioSynth.stop();
    };
  }, []);

  // Update body class mood skin tints based on match pressure index
  useEffect(() => {
    const p = telemetry.pressureIndex;
    let moodClass = 'mood-stable';
    if (p > 90) moodClass = 'mood-clutch';
    else if (p > 80) moodClass = 'mood-critical';
    else if (p > 60) moodClass = 'mood-volatile';
    else if (p > 35) moodClass = 'mood-alert';
    
    document.body.className = moodClass;
    
    return () => {
      document.body.className = '';
    };
  }, [telemetry.pressureIndex]);

  const VFX_MS = { boundary: 1600, wicket: 2200, probShift: 1400 };

  const setSpeakerSpotlight = (agentId) => {
    setHighlightedAgent(agentId);
    document.querySelectorAll('.agent-row').forEach(r => r.classList.remove('speaker-row'));
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('speaker-active'));
    if (!agentId) return;
    document.querySelector(`[data-agent-id="${agentId}"]`)?.classList.add('speaker-row');
    document.querySelector(`[data-agent-id="${agentId}"] .agent-card`)?.classList.add('speaker-active');
  };

  const speakAgent = (agentId, text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (agentId === 'analyst') {
      utterance.pitch = 0.8;
      utterance.rate = 0.9;
    } else if (agentId === 'scout') {
      utterance.pitch = 1.2;
      utterance.rate = 1.1;
    } else if (agentId === 'narrator') {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }
    utterance.onstart  = () => setSpeakerSpotlight(agentId);
    utterance.onend    = () => setSpeakerSpotlight(null);
    utterance.onerror  = () => setSpeakerSpotlight(null);
    window.speechSynthesis.speak(utterance);
  };

  const applyVFX = (eventType, pressureIndex = 0) => {
    const body = document.body;
    const scoreboard = document.querySelector('.scoreboard');
    const agentCards = [...document.querySelectorAll('.agent-card')];
    const graph = document.querySelector('.graph-container');

    const flash = (els, cls, ms) => {
      els.forEach(el => el?.classList.add(cls));
      setTimeout(() => els.forEach(el => el?.classList.remove(cls)), ms);
    };

    if (eventType === 'boundary') {
      flash([body], 'boundary-event', VFX_MS.boundary);
      flash([scoreboard], 'boundary-event', VFX_MS.boundary);
    }

    if (eventType === 'wicket') {
      flash([body, scoreboard, ...agentCards], 'wicket-event', VFX_MS.wicket);
    }

    if (eventType === 'probShift') {
      flash([graph], 'probability-shift', VFX_MS.probShift);
    }

    // Pressure: persistent, not transient
    const hot = pressureIndex > 75;
    body.classList.toggle('pressure-critical', hot);
    agentCards.forEach(c => c.classList.toggle('pressure-critical', hot));
  };

  const applyMatchUpdate = (data) => {
    // Trigger visual shake if flagged or on demo moment
    if (data.shake || data.isDemoMoment) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }

    // Play procedural audio based on event & demo moment
    audioSynth.setPressure(data.telemetry.pressureIndex);
    
    if (data.isDemoMoment) {
      setActiveDemoTrigger(data.demoTriggerId);
      
      if (data.demoTriggerId === 'kohli_six_18_5' || data.demoTriggerId === 'kohli_six_18_6') {
        audioSynth.playSixSwell();
      } else if (data.demoTriggerId === 'watson_runout_19_5' || data.demoTriggerId === 'malinga_yorker_19_6') {
        audioSynth.playGlitchImpact();
      } else if (data.demoTriggerId === 'byes_chaos_19_4') {
        audioSynth.playWicketGlitch();
      } else {
        audioSynth.playWicketGlitch();
      }
    } else {
      setActiveDemoTrigger(null);
      if (data.scoreboard.lastBallEvent === 'wicket') {
        audioSynth.playWicketGlitch();
      } else if (data.scoreboard.lastBallEvent === 'six' || data.scoreboard.lastBallEvent === 'six_noball') {
        audioSynth.playStadiumCheer();
      }
    }

    // Play Victory audio if final ball
    if (data.scoreboard.over === 19.6) {
      if (selectedScenario === 'ind_vs_pak_2022' && data.scoreboard.lastBallEvent !== 'wicket') {
        audioSynth.playVictoryCheer();
      } else if (selectedScenario === 'mi_vs_csk_2019' && data.scoreboard.lastBallEvent === 'wicket') {
        audioSynth.playVictoryCheer();
      }
    }

    const hasSpeech = typeof window !== 'undefined' && window.speechSynthesis;

    // Broadcast priority focus logic (Fallback if no speech support)
    if (!hasSpeech) {
      if (data.scoreboard.lastBallEvent === 'wicket') {
        setHighlightedAgent('narrator');
        setTimeout(() => setHighlightedAgent(null), 5000);
      } else if (data.scoreboard.lastBallEvent === 'six' || data.scoreboard.lastBallEvent === 'six_noball') {
        setHighlightedAgent('narrator');
        setTimeout(() => setHighlightedAgent(null), 5000);
      } else if (data.telemetry.disagreementActive) {
        setHighlightedAgent('scout');
        setTimeout(() => setHighlightedAgent(null), 6000);
      }
    }

    setMatchInfo(data.matchInfo);
    setScoreboard(data.scoreboard);
    setTelemetry(data.telemetry);
    setAgents(data.agents);
    setTimeline([...data.timeline]);
    setHistory([...data.history]);

    setMatchState(prev => {
      const scoreRuns = data.scoreboard ? parseInt(data.scoreboard.score.split('/')[0]) : prev.runs;
      const wickets = data.scoreboard ? data.scoreboard.wickets : prev.wickets;
      const over = data.scoreboard ? data.scoreboard.over : prev.over;
      const battingTeam = data.matchInfo ? data.matchInfo.battingTeam : prev.battingTeam;
      const bowlingTeam = data.matchInfo ? data.matchInfo.bowlingTeam : prev.bowlingTeam;
      const target = data.matchInfo ? data.matchInfo.target : prev.target;
      const striker = data.scoreboard ? data.scoreboard.batsman : prev.striker;
      const bowler = data.scoreboard ? data.scoreboard.bowler : prev.bowler;
      const pressureIndex = data.telemetry ? data.telemetry.pressureIndex : prev.pressureIndex;
      const momentum = data.telemetry ? data.telemetry.winProbability : prev.momentum;

      return {
        ...prev,
        battingTeam,
        bowlingTeam,
        runs: scoreRuns,
        wickets,
        over,
        target,
        striker,
        bowler,
        pressureIndex,
        momentum
      };
    });

    // Trigger agent voice text-to-speech personalities
    if (data.agents && hasSpeech) {
      const narratorText = typeof data.agents.narrator === 'object' ? data.agents.narrator.text : data.agents.narrator;
      const analystText = typeof data.agents.analyst === 'object' ? data.agents.analyst.text : data.agents.analyst;
      const scoutText = typeof data.agents.scout === 'object' ? data.agents.scout.text : data.agents.scout;
      
      window.speechSynthesis.cancel(); // Stop current speech on new ball arrival
      setSpeakerSpotlight(null);
      
      // Queue the voices sequentially: Narrator -> Analyst -> Scout
      if (narratorText) speakAgent('narrator', narratorText);
      if (analystText) speakAgent('analyst', analystText);
      if (scoutText) speakAgent('scout', scoutText);
    }

    // Dynamic cinematic VFX triggers (DOM updates)
    setTimeout(() => {
      const lastEvent = data.scoreboard?.lastBallEvent;
      const isBoundaryEvent = lastEvent === 'six' || lastEvent === 'six_noball' || lastEvent === 'boundary' || lastEvent === 'four';
      const isWicketEvent = lastEvent === 'wicket';
      const pressureVal = data.telemetry?.pressureIndex || 0;

      if (isBoundaryEvent) {
        applyVFX('boundary', pressureVal);
      } else if (isWicketEvent) {
        applyVFX('wicket', pressureVal);
      } else {
        applyVFX(null, pressureVal);
      }

      if (data.history && data.history.length >= 2) {
        const current = data.history[data.history.length - 1].winProbability;
        const prev = data.history[data.history.length - 2].winProbability;
        if (Math.abs(current - prev) > 5) {
          applyVFX('probShift', pressureVal);
        }
      }
    }, 50);

    if (data.timestamp) {
      setActiveTimestamp(data.timestamp);
    }
    if (data.telemetryLatency) {
      setActiveLatency(data.telemetryLatency);
    }
    if (data.activeMode) {
      setSimulationMode(data.activeMode);
    }
    
    if (data.isDemoMoment) {
      setSimulationStatus('paused');
    } else {
      setSimulationStatus('running');
    }
    
    // If update arrives and we are replaying, automatically exit replay mode
    setReplayState({ active: false, over: null });
  };

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
          applyMatchUpdate(update);
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
          applyMatchUpdate(update);
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

  const localPauseSimulation = () => {
    if (localIntervalRef.current) {
      clearTimeout(localIntervalRef.current);
      localIntervalRef.current = null;
    }
    setSimulationStatus('paused');
  };

  const localResetSimulation = () => {
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
    setMatchState({
      battingTeam: 'RR',
      bowlingTeam: 'MI',
      runs: 119,
      wickets: 5,
      over: 12.3,
      target: null,
      striker: 'Samson',
      nonStriker: 'Parag',
      bowler: 'Bumrah',
      pressureIndex: 0,
      momentum: 50,
      recentBalls: [],
      winProbability: 50
    });
    setAgents({
      analyst: 'Awaiting match launch. Initiate live match telemetry to invoke the Franchise analyst.',
      scout: 'Dugout communications standby. Awaiting first ball data to build matchup recommendations.',
      narrator: 'Melbourne night. Hyderabad heat. Select a scenario and witness the AI experience the match.'
    });
    setTimeline([]);
    setHistory([]);
    setReplayState({ active: false, over: null });
    setActiveDemoTrigger(null);
    setActiveTimestamp(null);
    setActiveLatency(0);
    audioSynth.setPressure(0);
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
        applyMatchUpdate(update);
        setSimulationStatus('paused');
      }
    } else {
      console.warn("Ball not found in local scenario:", targetOver);
    }
  };

  const connectWS = () => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to DUGOUT Platform WebSocket');
      setConnected(true);
      ws.send(JSON.stringify({
        type: 'SET_MODE',
        mode: simulationMode
      }));
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error encountered:', err);
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
            setShowSettings(false);
            break;

          case 'MATCH_UPDATE':
            applyMatchUpdate(data);
            break;

          case 'MODE_CHANGED':
            setSimulationMode(data.mode);
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
            setReplayState({ active: false, over: null });
            setActiveDemoTrigger(null);
            setActiveTimestamp(null);
            setActiveLatency(0);
            audioSynth.setPressure(0);
            break;

          case 'SIMULATION_PAUSED':
            setSimulationStatus('paused');
            break;

          case 'SIMULATION_RESET':
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
            setReplayState({ active: false, over: null });
            setActiveDemoTrigger(null);
            audioSynth.setPressure(0);
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
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WS Connection closed. Reconnecting...');
      setConnected(false);
      setTimeout(connectWS, 3000);
    };
  };

  const handleEngageOS = () => {
    setBootState('booting');
    audioSynth.init();
    audioSynth.playVictoryCheer();

    const logs = [
      { text: "INITIALIZING STARK INDUSTRIES SECURE OS BOOT...", delay: 0, status: "active" },
      { text: "CONNECTING WEBSOCKET PROTOCOLS (PORT: 3001)...", delay: 300, status: "active" },
      { text: "SUCCESS: HANDSHAKE CONNECTED TO LOCALHOST // TELEMETRY SUBSCRIBED", delay: 650, status: "active" },
      { text: "ESTABLISHING SYNERGISTIC MULTI-AGENT CONTEXT...", delay: 1000, status: "active" },
      { text: "ANALYST LOGIC LAYER LOADED (CONFIDENCE INTERVAL SET TO DYNAMIC)", delay: 1300, status: "active" },
      { text: "SCOUT DECISION MATCH-UP MATRIX CACHED IN MEMORY", delay: 1600, status: "active" },
      { text: "WARNING: TACTICAL DISSENT DETECTOR STATUS CLASSIFIED AS ACTIVE", delay: 1900, status: "warning" },
      { text: "NARRATOR STORYTELLING CONTEXT ENGINE MOUNTED (STADIUM HUM ONLINE)", delay: 2200, status: "active" },
      { text: "ARC REACTOR SYNC COMPLETED // MAIN BATTERY AT 100% CAPACITY", delay: 2500, status: "active" },
      { text: "FRIDAY OS BOOT SEQUENCING NOMINAL. LAUNCHING WAR-ROOM INTERFACE.", delay: 2800, status: "active" }
    ];

    logs.forEach(log => {
      setTimeout(() => {
        setBootLogs(prev => [...prev, log]);
      }, log.delay);
    });

    setTimeout(() => {
      speakAgent('narrator', "Dugout systems are fully operational. FRIDAY is online. Welcome back, Boss.");
      setBootState('ready');
    }, 3400);
  };

  // Action Handlers
  const handleSetMode = (mode) => {
    if (simulationStatus === 'running' || simulationStatus === 'paused') {
      handleReset();
    }
    setSimulationMode(mode);
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'SET_MODE',
        mode: mode
      }));
    } else {
      localResetSimulation();
    }
  };

  const handleStart = () => {
    // Resume audio context on first click
    audioSynth.init();
    setActiveDemoTrigger(null);
    
    // Exit replay if active on resume
    if (replayState.active) {
      handleExitReplay();
    }

    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'START_SIMULATION',
        scenarioId: selectedScenario
      }));
    } else {
      localStartSimulation(selectedScenario);
    }
  };

  const handlePause = () => {
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PAUSE_SIMULATION' }));
    } else {
      localPauseSimulation();
    }
  };

  const handleReset = () => {
    setActiveDemoTrigger(null);
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RESET_SIMULATION' }));
    } else {
      localResetSimulation();
    }
  };

  const handleSetSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'SET_SPEED',
        speed: newSpeed
      }));
    } else {
      // If offline and currently running, restart timeout loop with new speed
      if (simulationStatus === 'running') {
        if (localIntervalRef.current) {
          clearTimeout(localIntervalRef.current);
          localIntervalRef.current = null;
        }
        localStartSimulation(selectedScenario, newSpeed);
      }
    }
  };

  const handleSetApiKey = () => {
    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'SET_API_KEY',
        apiKey: apiKeyInput
      }));
    } else {
      alert('Offline mode: API Key cannot be synced to server right now. Simulating with high-fidelity telemetry fallbacks.');
    }
  };

  // Replay Intelligence Logic
  const handleReplayEvent = (over) => {
    // Find matching state in history
    const matchState = history.find(item => item.over === over);
    if (!matchState) return;

    // 1. Pause active simulation
    handlePause();

    // 2. Play transition glitch sound
    audioSynth.playWicketGlitch();

    // 3. Set display state to historical coordinate
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
    setReplayState({
      active: true,
      over: over
    });

    // Update audio hum pacing
    audioSynth.setPressure(matchState.pressureIndex);
  };

  const handleExitReplay = () => {
    if (history.length === 0) return;
    
    // Restore state to last live ball in history
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
    setReplayState({
      active: false,
      over: null
    });

    audioSynth.setPressure(latestState.pressureIndex);
  };

  const handleDemoTrigger = (scenarioId, over, event, triggerId, flashColor) => {
    audioSynth.init();
    setSelectedScenario(scenarioId);
    setActiveDemoTrigger(triggerId);
    
    // Trigger local esports flash overlay
    setFlash({ active: true, color: flashColor, key: Date.now() });

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

  const coreLoad = Math.min(99, Math.max(30, 32 + Math.round(telemetry.pressureIndex * 0.6) + (history.length % 7)));
  const predictiveVolatility = telemetry.pressureIndex > 80 ? 'HIGH' : telemetry.pressureIndex > 50 ? 'MEDIUM' : 'LOW';

  const ballsBowled = scoreboard ? Math.floor(scoreboard.over) * 6 + Math.round((scoreboard.over % 1) * 10) : 0;
  const currentRR = scoreboard && ballsBowled > 0 ? (
    (parseInt(scoreboard.score.split('/')[0]) / ballsBowled) * 6
  ).toFixed(2) : "0.00";

  // Calculate dynamic metrics for Agent Cards
  const analystMetric = scoreboard ? `${telemetry.winProbability}% win prob` : "50.0% win prob";
  const analystDetail = scoreboard ? `${matchInfo?.battingTeam || 'MI'} momentum ${telemetry.winProbability >= 50 ? '+' : ''}${Math.round((telemetry.winProbability - 50) * 0.6)}%` : "MI momentum 0%";

  const scoutMetric = scoreboard ? `Field: ${telemetry.pressureIndex > 75 ? 'Aggressive' : telemetry.pressureIndex > 45 ? 'Balanced' : 'Defensive'}` : "Field: Standard";
  const scoutDetail = scoreboard ? `Risk: ${telemetry.pressureIndex > 80 ? 'CRITICAL' : telemetry.pressureIndex > 50 ? 'ALERT' : 'LOW'}` : "Risk: Low";

  const narratorMetric = scoreboard ? (telemetry.pressureIndex > 85 ? 'Clutch Volatility' : telemetry.pressureIndex > 65 ? 'The Tension Mounts' : 'Stable Narrative') : "Ready to Narrate";
  const narratorDetail = scoreboard ? `Shareability: ${Math.min(99, 78 + Math.round(telemetry.pressureIndex * 0.22))}%` : "Shareability: 0%";

  // Extract texts from agents
  const analystText = agents?.analyst ? (typeof agents.analyst === 'object' ? agents.analyst.text : agents.analyst) : 'Awaiting simulation data...';
  const scoutText = agents?.scout ? (typeof agents.scout === 'object' ? agents.scout.text : agents.scout) : 'Awaiting simulation data...';
  const narratorText = agents?.narrator ? (typeof agents.narrator === 'object' ? agents.narrator.text : agents.narrator) : 'Awaiting simulation data...';

  const isBoundary = scoreboard && (
    scoreboard.lastBallEvent === 'six' || 
    scoreboard.lastBallEvent === 'six_noball' || 
    scoreboard.lastBallEvent === 'boundary' || 
    scoreboard.lastBallEvent === 'four'
  );
  const isWicket = scoreboard && scoreboard.lastBallEvent === 'wicket';
  const isPressureCritical = telemetry.pressureIndex > 75;

  let containerClassList = `dugout-container`;
  if (isShaking) containerClassList += ' screen-shake-active';
  if (isWicket) containerClassList += ' critical-alert';
  if (isBoundary) containerClassList += ' crowd-energy';

  if (bootState !== 'ready') {
    return (
      <div className="stark-boot-container">
        <div className="reactor-container-large">
          <div className="reactor-ring-outer"></div>
          <div className="reactor-ring-middle"></div>
          <div className="reactor-ring-inner"></div>
          <div className="reactor-core-glow"></div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 100 }}>
          <h1 style={{ color: '#00e5ff', fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px', textShadow: '0 0 15px rgba(0, 229, 255, 0.6)', marginBottom: '8px' }}>
            ⚡ STARK INDUSTRIES BATTLE OS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
            Diagnostics Telemetry Core // Mark LXXXV
          </p>
          
          {bootState === 'locked' ? (
            <button className="boot-btn-hud" onClick={handleEngageOS}>
              Engage Cognitive Grid
            </button>
          ) : (
            <div className="boot-logs-console">
              {bootLogs.map((log, index) => (
                <div key={index} className={`boot-log-line ${log.status === 'warning' ? 'warning-log' : 'active-log'}`}>
                  {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassList}>
      {/* Esports Flash Screen Overlay */}
      {flash.active && (
        <div 
          key={flash.key}
          className="flash-overlay flash-active" 
          style={{ backgroundColor: flash.color }} 
        />
      )}

      {/* Redesigned Header Bar */}
      <header className="top-bar-redesign">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="top-bar-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="live-indicator"></div>
            <span>🔴 LIVE MI vs RR - IPL 2026</span>
          </div>
          <span className="body-text" style={{ marginTop: '4px', fontSize: '13px' }}>
            May 24 | Wankhede Stadium | Probabilistic Simulation Engine
          </span>
        </div>

        {/* Mode Switcher Tabs (Bloomberg / F1 style) */}
        <div className="mode-switcher-container">
          <button 
            className={`mode-switch-tab ${simulationMode === 'live' ? 'active' : ''}`}
            onClick={() => handleSetMode('live')}
          >
            Live Simulation 2026
          </button>
          <button 
            className={`mode-switch-tab ${simulationMode === 'historical' ? 'active' : ''}`}
            onClick={() => handleSetMode('historical')}
          >
            Match Context
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Live Telemetry Status Badge */}
          <div className="live-telemetry-badge">
            <span className={`live-telemetry-dot ${simulationMode === 'live' ? 'livePulse' : ''}`} />
            <span className="live-telemetry-text">
              {simulationMode === 'live' ? 'LIVE FEED' : 'REPLAY'}
            </span>
            <span className="live-telemetry-time">
              {activeTimestamp ? new Date(activeTimestamp).toLocaleTimeString() : '--:--:--'}
            </span>
            <span className="live-telemetry-latency">
              {activeLatency > 0 ? `${activeLatency}ms` : '-- ms'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? 'var(--accent-analyst)' : 'var(--accent-narrator)',
              display: 'inline-block'
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', color: connected ? 'var(--text-primary)' : 'var(--accent-narrator)' }}>
              {connected ? 'ROOM_HUM_ACTIVE' : 'OFFLINE_FALLBACK'}
            </span>
          </div>

          <button 
            className={`control-btn ${showPitchPlaybook ? 'active' : ''}`}
            onClick={() => setShowPitchPlaybook(!showPitchPlaybook)}
          >
            Playbook
          </button>

          <button 
            className={`control-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </button>
        </div>
      </header>

      {/* Pitch Presentation Hook Banner */}
      <div className="pitch-banner" style={{
        background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.08), transparent)',
        borderLeft: '4px solid var(--accent-scout)',
        padding: '0.8rem 1.2rem',
        borderRadius: '4px',
        fontSize: '0.95rem',
        lineHeight: '1.5',
        color: 'var(--text-primary)',
        fontWeight: '500',
        fontStyle: 'italic',
        marginTop: '-0.5rem'
      }}>
        “Most AI systems generate answers. DUGOUT generates interpretation. It understands pressure, momentum, collapse, tactical intent, and emotional turning points in real time.”
      </div>

      {/* Collapsible Pitch Playbook */}
      {showPitchPlaybook && (
        <div className="panel-card pitch-guide-card" style={{ animation: 'fadeIn 0.2s', marginTop: '8px' }}>
          <div className="panel-header">
            <div className="panel-title-wrapper">
              <Compass size={18} style={{ color: 'var(--accent-scout)' }} />
              <h3 className="panel-title">Pitch Assist Playbook (3-Min Hackathon Demo Guide)</h3>
            </div>
            <button 
              className="control-btn" 
              onClick={() => setShowPitchPlaybook(false)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              Hide
            </button>
          </div>
          <div className="pitch-steps-grid" style={{ marginTop: '12px' }}>
            <div className="pitch-step-box">
              <div className="pitch-step-num">Step 1: Hook the Judges</div>
              <div className="pitch-step-title">Beyond Dashboards</div>
              <div className="pitch-step-desc">
                State: "Most AI tracks scoreboard stats. DUGOUT tracks the emotional subtext and pressure of the match in real time."
              </div>
            </div>
            <div className="pitch-step-box">
              <div className="pitch-step-num">Step 2: Coordinated Dissent</div>
              <div className="pitch-step-title">Agentic Conflict</div>
              <div className="pitch-step-desc">
                Explain that Scout and Analyst actively debate tactical match decisions (e.g. over-relying on stats vs matchups).
              </div>
            </div>
            <div className="pitch-step-box">
              <div className="pitch-step-num">Step 3: Cinematic Telemetry</div>
              <div className="pitch-step-title">Realtime Adaptive Telemetry</div>
              <div className="pitch-step-desc">
                Showcase how room hum pitch modulates, grids shift color schemes (clutch/critical), and screen shakes on wickets.
              </div>
            </div>
            <div className="pitch-step-box">
              <div className="pitch-step-num">Step 4: Replay Intelligence</div>
              <div className="pitch-step-title">Temporal Memory</div>
              <div className="pitch-step-desc">
                Click any milestone in the event timeline to pause live feed and reverse the entire system state deterministically.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="panel-card" style={{ borderLeft: '4px solid var(--accent-scout)', animation: 'fadeIn 0.2s', marginTop: '8px' }}>
          <div className="panel-header">
            <div className="panel-title-wrapper">
              <Key size={18} style={{ color: 'var(--accent-scout)' }} />
              <h3 className="panel-title">Model Orchestration Config</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Add a Gemini API Key to enable live GenAI model orchestration. If empty, the system falls back to high-fidelity simulated outputs.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="password" 
                className="input-text" 
                placeholder="AIzaSy..." 
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: '#fff' }}
              />
              <button className="control-btn active" onClick={handleSetApiKey}>
                Save Key
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: hasApiKey ? 'var(--accent-analyst)' : 'var(--text-secondary)' }}>
                {hasApiKey ? '● Live Gemini Model Mode Enabled' : '○ Offline Sim Mode Enabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 32px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            className="dropdown-select"
            value={selectedScenario}
            onChange={(e) => {
              setSelectedScenario(e.target.value);
              handleReset();
            }}
            disabled={simulationStatus === 'running' || simulationStatus === 'paused'}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: '#fff' }}
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {simulationStatus !== 'running' ? (
              <button className="control-btn active" onClick={handleStart}>
                <Play size={16} />
                {simulationStatus === 'paused' ? 'Resume Engine Feed' : 'Deploy Engine Feed'}
              </button>
            ) : (
              <button className="control-btn" onClick={handlePause}>
                <Pause size={16} />
                Hold Telemetry
              </button>
            )}

            <button className="control-btn" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Speed:</span>
            <button className={`control-btn ${speed === 2000 ? 'active' : ''}`} onClick={() => handleSetSpeed(2000)}>1.5x</button>
            <button className={`control-btn ${speed === 1000 ? 'active' : ''}`} onClick={() => handleSetSpeed(1000)}>2x</button>
            <button className={`control-btn ${speed === 350 ? 'active' : ''}`} onClick={() => handleSetSpeed(350)}>Turbo</button>
          </div>
        </div>

        {/* Live Match Info Summary */}
        {matchInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Stadium</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{matchInfo.venue}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', height: '24px' }} />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Chasing Target</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-narrator)' }}>{matchInfo.target} Runs</div>
            </div>
          </div>
        )}
      </div>

      {/* Replay warning banner */}
      {replayState.active && (
        <div style={{
          marginTop: '1rem',
          padding: '0.6rem 1rem',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          border: '1px solid var(--accent-scout)',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.3s'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--accent-scout)', fontWeight: 600 }}>
            ⚠️ REPLAY MODE ACTIVE: Rewound to Over {replayState.over.toFixed(1)} match memory.
          </span>
          <button className="control-btn active" onClick={handleExitReplay}>
            <RotateCw size={14} />
            Return to Live Feed
          </button>
        </div>
      )}

      {/* Main 3-Column Grid */}
      <div className="grid-layout">
        
        {/* LEFT COLUMN: Agent Intel */}
        <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Analyst Card */}
          <AgentRow 
            name="analyst"
            title="Analyst"
            metric={analystMetric}
            detail={analystDetail}
            color="var(--accent-analyst)"
            icon={Compass}
            text={analystText}
            isActive={highlightedAgent === 'analyst'}
            isDissent={false}
            isBoundary={isBoundary}
            isWicket={isWicket}
            isAnySpeaking={highlightedAgent !== null}
          />

          {/* Scout Card */}
          <AgentRow 
            name="scout"
            title="Scout"
            metric={scoutMetric}
            detail={scoutDetail}
            color="var(--accent-scout)"
            icon={Shield}
            text={scoutText}
            isActive={highlightedAgent === 'scout'}
            isDissent={scoreboard && (agents.scout?.dissent || telemetry.disagreementActive)}
            isBoundary={isBoundary}
            isWicket={isWicket}
            isAnySpeaking={highlightedAgent !== null}
          />

          {/* Narrator Card */}
          <AgentRow 
            name="narrator"
            title="Narrator"
            metric={narratorMetric}
            detail={narratorDetail}
            color="var(--accent-narrator)"
            icon={Flame}
            text={narratorText}
            isActive={highlightedAgent === 'narrator'}
            isDissent={false}
            isBoundary={isBoundary}
            isWicket={isWicket}
            isAnySpeaking={highlightedAgent !== null}
          />
        </div>

        {/* CENTER COLUMN: Match Heart */}
        <div className="center-column" style={{ display: 'flex', flexDirection: 'column', justifyItems: 'stretch' }}>
          {/* Scoreboard Telemetry Container */}
          <div className="scoreboard match-card" style={{ textAlign: "center", marginBottom: "16px" }}>
            <div className="over" style={{ fontSize: '64px', fontWeight: '800', fontFamily: 'IBM Plex Mono, monospace', color: '#fff', letterSpacing: '-2px', lineHeight: '1.1' }}>
              Over {matchState.over.toFixed(1)}
            </div>
            <div style={{ fontSize: "18px", color: "var(--text-secondary)", marginTop: '4px', fontWeight: '500' }}>
              <span className="score">{matchState.runs}/{matchState.wickets}</span>
              <span className="bowling-label" style={{ marginLeft: '12px' }}>({matchState.bowlingTeam} Bowling)</span>
            </div>
          </div>

          {/* Win Probability Graph (70% height container) */}
          <div className={`graph-container ${isShaking ? 'screen-shake-active' : ''}`} style={{
            flex: 1,
            background: "var(--bg-secondary)",
            borderRadius: "12px",
            border: "1px solid var(--border-subtle)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            minHeight: "320px",
            marginBottom: "16px",
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <WinProbabilityGraph 
              history={history}
              matchInfo={matchInfo}
            />
          </div>

          {/* Required Run Rate vs Current Run Rate */}
          <div style={{ textAlign: "center", fontSize: "18px", fontWeight: '600' }}>
            <div>Required RR: {scoreboard ? parseFloat(scoreboard.requiredRR).toFixed(2) : "0.00"}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              Current RR: {currentRR}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Momentum */}
        <div className="right-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="momentum-gauge-container" style={{ width: '100%' }}>
            {/* Pressure Index Gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto 16px' }}>
              <div 
                className={`pressure-gauge ${getPressureLevel(telemetry.pressureIndex)}`}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  border: '3px solid var(--border-subtle)',
                  position: 'relative',
                  background: 'rgba(15, 21, 53, 0.5)'
                }}
              >
                <div className="pressure-value" style={{ fontSize: '28px', fontWeight: '800' }}>
                  {telemetry.pressureIndex}%
                </div>
                
                {/* Concentric thin circles for F1 telemetry vibe */}
                <div style={{
                  position: 'absolute',
                  width: '112%',
                  height: '112%',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: "700", textAlign: "center", textTransform: 'uppercase', letterSpacing: '1px', color: 
                getPressureLevel(telemetry.pressureIndex) === 'calm' ? 'var(--accent-analyst)' :
                getPressureLevel(telemetry.pressureIndex) === 'alert' ? '#FFB800' : 'var(--alert-critical)'
              }}>
                PRESSURE: {getPressureLevelLabel(telemetry.pressureIndex)}
              </div>
            </div>

            {/* Run Rate Comparison Bars */}
            {scoreboard && (
              <div style={{ marginTop: '24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Run Rate Comparison
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {/* Required RR Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--accent-scout)' }}>Required RR</span>
                      <span style={{ fontWeight: 'bold' }}>{scoreboard.requiredRR}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (parseFloat(scoreboard.requiredRR) / 15) * 100)}%`,
                        height: '100%',
                        background: 'var(--accent-scout)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>

                  {/* Current RR Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--accent-analyst)' }}>Current RR</span>
                      <span style={{ fontWeight: 'bold' }}>{currentRR}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (parseFloat(currentRR) / 15) * 100)}%`,
                        height: '100%',
                        background: 'var(--accent-analyst)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Active Duel widget */}
            {scoreboard && (
              <div style={{ marginTop: '24px', width: '100%', background: 'rgba(15,21,53,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Active Duel
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>🏏 {scoreboard.batsman}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Batting</span>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--border-subtle)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-scout)' }}>⚾ {scoreboard.bowler}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Bowling</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM: Intelligence Log (Minimal) */}
      <div className="timeline-log-minimal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#fff', letterSpacing: '1px' }}>
            Intelligence Log (Last 3 Events)
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            ⚠️ SCOUT DISAGREES WITH ANALYST highlights in amber border
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {timeline.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
              Ready to Deploy. Click 'Deploy Engine Feed' to start analysis.
            </div>
          ) : (
            timeline.slice(0, 3).map((event, idx) => {
              const isReplaying = replayState.active && Math.abs(replayState.over - event.over) < 0.01;
              return (
                <div 
                  key={idx} 
                  className={`timeline-event ${isReplaying ? 'timeline-item-active' : ''}`}
                  onClick={() => handleReplayEvent(event.over)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: isReplaying ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
                    border: isReplaying ? '1px solid var(--accent-scout)' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="timeline-badge" style={{
                    backgroundColor: 
                      event.type === 'WICKET' ? 'rgba(255, 42, 95, 0.15)' :
                      event.type === 'MOMENTUM_SHIFT' ? 'rgba(0, 255, 102, 0.15)' :
                      'rgba(0, 229, 255, 0.15)',
                    color: 
                      event.type === 'WICKET' ? 'var(--alert-critical)' :
                      event.type === 'MOMENTUM_SHIFT' ? 'var(--accent-analyst)' :
                      'var(--accent-scout)',
                    border: '1px solid currentColor'
                  }}>
                    {event.type}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)', minWidth: '60px' }}>
                    Over {event.over.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', flexGrow: 1 }}>
                    <strong>{event.title}</strong>: {event.description}
                  </span>
                  {isReplaying && (
                    <span style={{ fontSize: '10px', color: 'var(--accent-scout)', fontWeight: 'bold', textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>
                      ● replaying
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Presentation Pitch Line */}
      <footer style={{
        marginTop: 'auto',
        padding: '1.5rem 0 0.5rem',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem',
          color: 'var(--text-primary)',
          fontWeight: 600,
          letterSpacing: '0.5px'
        }}>
          “Every franchise has a dugout. This is the one that never sleeps, never panics, and never misses a pattern.”
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--accent-scout)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontWeight: 700
        }}>
          Experimental multi-agent cricket intelligence platform.
        </p>
      </footer>
    </div>
  );
}

/* AgentRow Component for Left Column */
const AgentRow = ({ name, title, metric, detail, color, icon: Icon, text, isActive, isDissent, isBoundary, isWicket, isAnySpeaking }) => {
  const [isHovered, setIsHovered] = useState(false);
  const showBubble = text && (isActive || isHovered);

  // Dynamic VFX classes
  let cardClassList = `agent-card ${name}`;
  if (isActive) cardClassList += ' active active-speaker speaker-active agent-sync-pulse';
  if (isBoundary) cardClassList += ' boundary-event';
  if (isWicket) cardClassList += ' wicket-event critical-alert';

  const rowClassList = `agent-row ${(!isAnySpeaking || isActive) ? 'speaker-row' : ''}`;

  return (
    <div 
      className={rowClassList}
      data-agent-id={name}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={cardClassList} 
        style={{ 
          borderColor: isDissent ? 'var(--accent-narrator)' : (isActive ? color : 'transparent'), 
          borderWidth: (isActive || isDissent) ? '3px' : '2px', 
          boxShadow: isDissent ? '0 0 15px rgba(255, 184, 0, 0.4)' : (isActive ? `0 0 15px ${color}` : '') 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {Icon && <Icon size={16} style={{ color: isDissent ? 'var(--accent-narrator)' : color }} />}
          <span style={{ fontSize: '10px', color: isDissent ? 'var(--accent-narrator)' : color, fontWeight: 'bold' }}>● {title.toUpperCase()}</span>
        </div>
        <div>
          <div className="agent-metric" style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff' }}>{metric}</div>
          <div className="agent-detail" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{detail}</div>
        </div>
        {isDissent && (
          <div style={{ fontSize: '9px', color: 'var(--accent-narrator)', fontWeight: 'bold', border: '1px solid var(--accent-narrator)', padding: '1px 4px', borderRadius: '3px', width: 'fit-content' }}>
            ⚠️ TACTICAL DISSENT
          </div>
        )}
      </div>

      {/* Side-Car Speech Bubble */}
      {showBubble && (
        <div style={{
          position: 'absolute',
          left: '216px',
          top: '0',
          width: '280px',
          minHeight: '120px',
          background: 'rgba(15, 21, 53, 0.95)',
          border: `1px solid ${isDissent ? 'var(--accent-narrator)' : 'var(--border-subtle)'}`,
          borderLeft: `4px solid ${isDissent ? 'var(--accent-narrator)' : color}`,
          borderRadius: '8px',
          padding: '12px',
          zIndex: 100,
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.4' }}>
            {text}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '8px', fontFamily: 'monospace' }}>
            {isActive ? '📢 SPEAKING' : '👁️ PREVIEW'}
          </div>
        </div>
      )}
    </div>
  );
};

function getPressureLevel(pressure) {
  if (pressure < 33) return "calm";
  if (pressure < 66) return "alert";
  return "critical";
}

function getPressureLevelLabel(pressure) {
  const level = getPressureLevel(pressure);
  return level.toUpperCase();
}


