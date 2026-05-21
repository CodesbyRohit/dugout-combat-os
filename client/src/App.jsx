import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Cpu, Compass, Flame, Key, Settings, Zap, RotateCw } from 'lucide-react';
import AgentPanel from './components/AgentPanel';
import MomentumPulse from './components/MomentumPulse';
import WinProbabilityGraph from './components/WinProbabilityGraph';
import EventTimeline from './components/EventTimeline';
import SpatialCard from './components/SpatialCard';
import audioSynth from './utils/audioSynth';
import { SCENARIOS } from './utils/scenarios';
import { processBallEvent } from './utils/localSimulator';

export default function App() {
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
  const [selectedScenario, setSelectedScenario] = useState('ind_vs_pak_2022');
  
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
  const [agents, setAgents] = useState({
    analyst: 'Awaiting match launch. Initiate live match telemetry to invoke the Franchise analyst.',
    scout: 'Dugout communications standby. Awaiting first ball data to build matchup recommendations.',
    narrator: 'Melbourne night. Hyderabad heat. Select a scenario and witness the AI experience the match.'
  });
  const [timeline, setTimeline] = useState([]);
  const [history, setHistory] = useState([]);
  const [simulationStatus, setSimulationStatus] = useState('idle'); // idle | running | paused | complete
  const [speed, setSpeed] = useState(3000); // ms per ball

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

    // Broadcast priority focus logic
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

    setMatchInfo(data.matchInfo);
    setScoreboard(data.scoreboard);
    setTelemetry(data.telemetry);
    setAgents(data.agents);
    setTimeline([...data.timeline]);
    setHistory([...data.history]);
    
    if (data.isDemoMoment) {
      setSimulationStatus('paused');
    } else {
      setSimulationStatus('running');
    }
    
    // If update arrives and we are replaying, automatically exit replay mode
    setReplayState({ active: false, over: null });
  };

  // Local Offline Simulation Actions
  const localStartSimulation = (scenarioId) => {
    if (localIntervalRef.current) clearInterval(localIntervalRef.current);
    
    if (localBallIndexRef.current === -1 || simulationStatus === 'complete' || simulationStatus === 'idle') {
      localBallIndexRef.current = 0;
      localHistoryRef.current = [];
      localTimelineRef.current = [];
    }

    const currentScenario = SCENARIOS[scenarioId];
    if (!currentScenario) return;

    // Process current ball index immediately
    const firstBall = currentScenario.balls[localBallIndexRef.current];
    const update = processBallEvent(firstBall, scenarioId, localHistoryRef.current, { timeline: localTimelineRef.current });
    if (update) {
      applyMatchUpdate(update);
    }

    localIntervalRef.current = setInterval(() => {
      localBallIndexRef.current++;
      if (localBallIndexRef.current >= currentScenario.balls.length) {
        clearInterval(localIntervalRef.current);
        setSimulationStatus('complete');
        audioSynth.setPressure(0);
        return;
      }

      const ball = currentScenario.balls[localBallIndexRef.current];
      const nextUpdate = processBallEvent(ball, scenarioId, localHistoryRef.current, { timeline: localTimelineRef.current });
      if (nextUpdate) {
        applyMatchUpdate(nextUpdate);
      }
    }, speed);
  };

  const localPauseSimulation = () => {
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
      localIntervalRef.current = null;
    }
    setSimulationStatus('paused');
  };

  const localResetSimulation = () => {
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
      localIntervalRef.current = null;
    }
    localBallIndexRef.current = -1;
    localHistoryRef.current = [];
    localTimelineRef.current = [];
    
    setSimulationStatus('idle');
    setScoreboard(null);
    setMatchInfo(null);
    setTelemetry({ winProbability: 50, pressureIndex: 10, momentumState: 'Calm', disagreementActive: false });
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
  };

  const localJumpToBall = (scenarioId, targetOver, event, triggerId) => {
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
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

          case 'SIMULATION_PAUSED':
            setSimulationStatus('paused');
            break;

          case 'SIMULATION_RESET':
            setSimulationStatus('idle');
            setScoreboard(null);
            setMatchInfo(null);
            setTelemetry({ winProbability: 50, pressureIndex: 10, momentumState: 'Calm', disagreementActive: false });
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

  // Action Handlers
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
      // If offline and currently running, restart interval with new speed
      if (simulationStatus === 'running') {
        if (localIntervalRef.current) {
          clearInterval(localIntervalRef.current);
          const currentScenario = SCENARIOS[selectedScenario];
          localIntervalRef.current = setInterval(() => {
            localBallIndexRef.current++;
            if (localBallIndexRef.current >= currentScenario.balls.length) {
              clearInterval(localIntervalRef.current);
              setSimulationStatus('complete');
              audioSynth.setPressure(0);
              return;
            }

            const ball = currentScenario.balls[localBallIndexRef.current];
            const nextUpdate = processBallEvent(ball, selectedScenario, localHistoryRef.current, { timeline: localTimelineRef.current });
            if (nextUpdate) {
              applyMatchUpdate(nextUpdate);
            }
          }, newSpeed);
        }
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

  return (
    <div className={`dugout-container ${isShaking ? 'screen-shake-active' : ''}`}>
      {/* Esports Flash Screen Overlay */}
      {flash.active && (
        <div 
          key={flash.key}
          className="flash-overlay flash-active" 
          style={{ backgroundColor: flash.color }} 
        />
      )}

      {/* Header Bar */}
      <header className="top-bar">
        <div className="brand-section">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="brand-logo">DUGOUT</h1>
              <span className="brand-badge">ANALYTICS PROTOTYPE</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontStyle: 'italic', fontWeight: 600, letterSpacing: '0.5px', marginTop: '2px' }}>
              "The match isn't being watched. It's being interpreted."
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* SYSTEM STRESS (Aesthetic Vibe) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '0.3rem 0.7rem', 
            borderRadius: '6px', 
            border: '1px solid var(--border-color)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            lineHeight: '1.3',
            color: 'var(--text-secondary)'
          }}>
            <div>
              DUGOUT CORE LOAD: <span style={{ color: coreLoad > 85 ? 'var(--neon-red)' : coreLoad > 60 ? 'var(--neon-orange)' : 'var(--neon-green)', fontWeight: 'bold' }}>{coreLoad}%</span>
            </div>
            <div>
              PREDICTIVE VOLATILITY: <span style={{ color: predictiveVolatility === 'HIGH' ? 'var(--neon-red)' : predictiveVolatility === 'MEDIUM' ? 'var(--neon-orange)' : 'var(--neon-green)', fontWeight: 'bold' }}>{predictiveVolatility}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? 'var(--neon-green)' : 'var(--neon-orange)',
              display: 'inline-block'
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', color: connected ? 'var(--text-primary)' : 'var(--neon-orange)' }}>
              {connected ? 'ROOM_HUM_ACTIVE' : 'OFFLINE_FALLBACK'}
            </span>
          </div>

          <button 
            className={`control-btn ${showPitchPlaybook ? 'active' : ''}`}
            onClick={() => setShowPitchPlaybook(!showPitchPlaybook)}
          >
            Pitch Playbook
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
        borderLeft: '4px solid var(--neon-cyan)',
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

      {/* Pitch Playbook collapsible console */}
      {showPitchPlaybook && (
        <div className="panel-card pitch-guide-card" style={{ animation: 'fadeIn 0.2s' }}>
          <div className="panel-header">
            <div className="panel-title-wrapper">
              <Compass size={18} style={{ color: 'var(--neon-cyan)' }} />
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
          <div className="pitch-steps-grid">
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
        <div className="panel-card" style={{ borderLeft: '4px solid var(--neon-cyan)', animation: 'fadeIn 0.2s' }}>
          <div className="panel-header">
            <div className="panel-title-wrapper">
              <Key size={18} style={{ color: 'var(--neon-cyan)' }} />
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
              />
              <button className="control-btn active" onClick={handleSetApiKey}>
                Save Key
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: hasApiKey ? 'var(--neon-green)' : 'var(--text-muted)' }}>
                {hasApiKey ? '● Live Gemini Model Mode Enabled' : '○ Offline Sim Mode Enabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Top Controls & Live Scoreboard */}
      <SpatialCard 
        themeColor="var(--neon-cyan)" 
        hoverZ="14px" 
        maxTilt={2} 
        style={{ padding: '1.25rem' }}
        anyHighlighted={highlightedAgent !== null}
      >
        <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          {/* Controls Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <select 
              className="dropdown-select"
              value={selectedScenario}
              onChange={(e) => {
                setSelectedScenario(e.target.value);
                handleReset();
              }}
              disabled={simulationStatus === 'running' || simulationStatus === 'paused'}
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
              <button className={`control-btn ${speed === 4000 ? 'active' : ''}`} onClick={() => handleSetSpeed(4000)}>1.5x</button>
              <button className={`control-btn ${speed === 2500 ? 'active' : ''}`} onClick={() => handleSetSpeed(2500)}>2x</button>
              <button className={`control-btn ${speed === 1200 ? 'active' : ''}`} onClick={() => handleSetSpeed(1200)}>Turbo</button>
            </div>
          </div>

          {/* Live Match Info Summary */}
          {matchInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0, 229, 255, 0.03)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Stadium</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{matchInfo.venue}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', height: '24px' }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Chasing Target</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-orange)' }}>{matchInfo.target} Runs</div>
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
            border: '1px solid var(--neon-cyan)',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'fadeIn 0.3s'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', fontWeight: 600 }}>
              ⚠️ REPLAY MODE ACTIVE: Rewound to Over {replayState.over.toFixed(1)} match memory.
            </span>
            <button className="control-btn active" onClick={handleExitReplay}>
              <RotateCw size={14} />
              Return to Live Feed
            </button>
          </div>
        )}

        {/* Big Telemetry Scoreboard */}
        {scoreboard ? (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
            <div className="telemetry-item" style={{ borderLeft: '2px solid var(--neon-cyan)' }}>
              <div className="telemetry-label">Batting Team</div>
              <div className="telemetry-value" style={{ color: '#fff' }}>{matchInfo?.battingTeam.toUpperCase()}</div>
            </div>
            
            <div className="telemetry-item">
              <div className="telemetry-label">Score</div>
              <div className="telemetry-value" style={{ color: 'var(--neon-green)' }}>{scoreboard.score}</div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-label">Overs</div>
              <div className="telemetry-value">{scoreboard.over.toFixed(1)}</div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-label">Required</div>
              <div className="telemetry-value" style={{ color: 'var(--neon-orange)' }}>{scoreboard.runsNeeded} off {scoreboard.ballsRemaining} b</div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-label">Req. Run Rate</div>
              <div className="telemetry-value">{scoreboard.requiredRR}</div>
            </div>

            <div className="telemetry-item" style={{ gridColumn: 'span 2', textAlign: 'left', background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="telemetry-label">Active Duel</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', justifyItems: 'center', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>🏏 {scoreboard.batsman}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0.5rem' }}>vs</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>⚾ {scoreboard.bowler}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem 0', color: 'var(--text-secondary)' }}>
            🏏 Deploy the platform to start real-time telemetry feed.
          </div>
        )}
      </SpatialCard>

      {/* Collapsible Demo Mode Triggers Console */}
      <SpatialCard 
        className="demo-trigger-panel" 
        themeColor="var(--neon-red)" 
        hoverZ="8px" 
        maxTilt={2}
        anyHighlighted={highlightedAgent !== null}
      >
        <div className="panel-header">
          <div className="panel-title-wrapper">
            <Zap size={18} style={{ color: 'var(--neon-red)' }} />
            <h3 className="panel-title">Demo Orchestrator Console</h3>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--neon-red)', fontWeight: 'bold' }}>
            CHOREOGRAPHED MATCH MOMENTS
          </span>
        </div>
        <div className="demo-buttons-grid">
          <button 
            className={`demo-btn ${activeDemoTrigger === 'kohli_six_18_5' ? 'active' : ''}`}
            onClick={() => handleDemoTrigger('ind_vs_pak_2022', 18.5, 'six', 'kohli_six_18_5', 'rgba(0, 229, 255, 0.4)')}
          >
            <span className="demo-btn-label">Kohli's Straight Six</span>
            <span className="demo-btn-sub">18.5 Over • Indo-Pak 2022</span>
          </button>
          <button 
            className={`demo-btn ${activeDemoTrigger === 'kohli_six_18_6' ? 'active' : ''}`}
            onClick={() => handleDemoTrigger('ind_vs_pak_2022', 18.6, 'six', 'kohli_six_18_6', 'rgba(0, 255, 102, 0.4)')}
          >
            <span className="demo-btn-label">Kohli's Flick Six</span>
            <span className="demo-btn-sub">18.6 Over • Indo-Pak 2022</span>
          </button>
          <button 
            className={`demo-btn ${activeDemoTrigger === 'byes_chaos_19_4' ? 'active' : ''}`}
            onClick={() => handleDemoTrigger('ind_vs_pak_2022', 19.4, 'byes', 'byes_chaos_19_4', 'rgba(255, 170, 0, 0.4)')}
          >
            <span className="demo-btn-label">Free Hit Bye Chaos</span>
            <span className="demo-btn-sub">19.4 Over • Indo-Pak 2022</span>
          </button>
          <button 
            className={`demo-btn ${activeDemoTrigger === 'watson_runout_19_5' ? 'active' : ''}`}
            onClick={() => handleDemoTrigger('mi_vs_csk_2019', 19.5, 'wicket', 'watson_runout_19_5', 'rgba(255, 170, 0, 0.4)')}
          >
            <span className="demo-btn-label">Shane Watson Runout</span>
            <span className="demo-btn-sub">19.5 Over • IPL Final 2019</span>
          </button>
          <button 
            className={`demo-btn ${activeDemoTrigger === 'malinga_yorker_19_6' ? 'active' : ''}`}
            onClick={() => handleDemoTrigger('mi_vs_csk_2019', 19.6, 'wicket', 'malinga_yorker_19_6', 'rgba(255, 42, 95, 0.4)')}
          >
            <span className="demo-btn-label">Malinga's Yorker Win</span>
            <span className="demo-btn-sub">19.6 Over • IPL Final 2019</span>
          </button>
        </div>
      </SpatialCard>

      {/* Main Grid: 4 synchronized panels */}
      <div className="dashboard-grid">
        
        {/* Panel 3: Narrator Agent */}
        <AgentPanel 
          title="The Narrator"
          role="cinematic storytelling engine"
          agentData={scoreboard ? agents.narrator : 'Awaiting stadium noise. Standing by to render the emotional pulse of the arena.'}
          color="var(--neon-red)"
          icon={Flame}
          status={simulationStatus === 'running' ? 'NARRATING' : 'IDLE'}
          isHighlighted={highlightedAgent === 'narrator'}
          anyHighlighted={highlightedAgent !== null}
          hoverZ="10px"
          style={{ gridColumn: '1 / -1' }}
        />

        {/* Panel 1: Analyst Agent */}
        <AgentPanel 
          title="The Analyst"
          role="real-time probabilistic engine"
          agentData={scoreboard ? agents.analyst : 'Telemetry standby. Standing by to estimate match probability pathways.'}
          color="var(--neon-green)"
          icon={Cpu}
          status={simulationStatus === 'running' ? 'COMPUTING' : 'IDLE'}
          isHighlighted={highlightedAgent === 'analyst'}
          anyHighlighted={highlightedAgent !== null}
          hoverZ="6px"
        />

        {/* Panel 2: Scout Agent */}
        <AgentPanel 
          title="The Scout"
          role="tactical matchups & suggestions"
          agentData={scoreboard ? agents.scout : 'Scouting algorithms offline. Select scenario and start simulation to map matchups.'}
          color="var(--neon-cyan)"
          icon={Compass}
          status={simulationStatus === 'running' ? 'STRATEGIZING' : 'IDLE'}
          dissent={scoreboard && (agents.scout?.dissent || telemetry.disagreementActive)}
          isHighlighted={highlightedAgent === 'scout'}
          anyHighlighted={highlightedAgent !== null}
          hoverZ="6px"
        />

        {/* Panel 4: Momentum Pulse & Win Probability Graph */}
        <SpatialCard 
          themeColor="var(--neon-orange)" 
          style={{ borderLeft: '4px solid var(--neon-orange)', gridColumn: '1 / -1' }}
          hoverZ="6px" 
          maxTilt={2}
          anyHighlighted={highlightedAgent !== null}
        >
          <div className="panel-header">
            <div className="panel-title-wrapper">
              <Zap size={18} style={{ color: 'var(--neon-orange)' }} />
              <h3 className="panel-title">Match Momentum & Prob</h3>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              DUAL TELEMETRY
            </span>
          </div>

          <div className="visuals-container">
            <MomentumPulse 
              pressureIndex={telemetry.pressureIndex}
              momentumState={telemetry.momentumState}
            />

            <WinProbabilityGraph 
              history={history}
              matchInfo={matchInfo}
            />
          </div>
        </SpatialCard>

        {/* Event log / Shared memory timeline with replay connection */}
        <EventTimeline 
          timeline={timeline} 
          onReplayEvent={handleReplayEvent}
          activeReplayOver={replayState.active ? replayState.over : null}
        />
      </div>

      {/* Footer Presentation Pitch Line */}
      <footer style={{
        marginTop: 'auto',
        padding: '1.5rem 0 0.5rem',
        borderTop: '1px solid var(--border-color)',
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
          color: 'var(--neon-cyan)',
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
