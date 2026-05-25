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
import WagonWheel from './components/WagonWheel';
import SatelliteFeed from './components/SatelliteFeed';
import { useMatchTelemetry } from './hooks/useMatchTelemetry';
import { sessionDb } from './utils/sessionDb';

export default function App() {
  // Stark OS Boot Sequence State
  const [bootState, setBootState] = useState('locked'); // 'locked' | 'booting' | 'ready'
  const [bootLogs, setBootLogs] = useState([]);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPitchPlaybook, setShowPitchPlaybook] = useState(false);
  const [flash, setFlash] = useState({ active: false, color: '', key: 0 });
  const [showSatelliteFeed, setShowSatelliteFeed] = useState(true);

  // Hook into the Telemetry State Manager Data Pipeline
  const {
    connected,
    scenarios,
    selectedScenario,
    setSelectedScenario,
    hasApiKey,
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
    speed,
    simulationMode,
    commentarySync,
    setCommentarySync,
    coachOverrideBowler,
    setCoachOverrideBowler,
    hasSavedSession,
    activeHistoryIndex,
    highlightedAgent,
    isShaking,

    handleStart,
    handlePause,
    handleReset,
    handleSetMode,
    handleSetSpeed,
    handleSetApiKey: setApiKeyOnHook,
    handleReplayEvent,
    handleExitReplay,
    handleDemoTrigger: triggerDemoOnHook,
    handleRestoreSession,
    handleExportSession
  } = useMatchTelemetry();

  // Setup click listener for audio context initialization
  useEffect(() => {
    const resumeAudio = () => {
      audioSynth.init();
      document.removeEventListener('click', resumeAudio);
    };
    document.addEventListener('click', resumeAudio);
    return () => {
      document.removeEventListener('click', resumeAudio);
      audioSynth.stop();
    };
  }, []);

  // Text-To-Speech engine call wrapping callback for Stark OS Boot
  const speakAgent = (agentId, text, onStart, onEnd) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (agentId === 'narrator') {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }
    utterance.onstart = () => { if (onStart) onStart(); };
    utterance.onend = () => { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utterance);
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

  const handleSetApiKey = () => {
    setApiKeyOnHook(apiKeyInput);
    setShowSettings(false);
  };

  const handleDemoTrigger = (scenarioId, over, event, triggerId, flashColor) => {
    triggerDemoOnHook(scenarioId, over, event, triggerId, flashColor, setFlash);
  };

  // Derive replayState dynamically based on hook values
  const replayState = {
    active: activeHistoryIndex !== -1,
    over: activeHistoryIndex !== -1 && history[activeHistoryIndex] ? history[activeHistoryIndex].over : 0
  };

  // Derive matchState dynamically based on hook values
  const matchState = {
    battingTeam: matchInfo?.battingTeam || 'RR',
    bowlingTeam: matchInfo?.bowlingTeam || 'MI',
    runs: scoreboard ? parseInt(scoreboard.score.split('/')[0]) : 119,
    wickets: scoreboard ? scoreboard.wickets : 5,
    over: scoreboard ? scoreboard.over : 12.3,
    target: matchInfo ? matchInfo.target : null,
    striker: scoreboard ? scoreboard.batsman : 'Samson',
    nonStriker: scoreboard ? (scoreboard.batsman === 'Samson' ? 'Parag' : 'Samson') : 'Parag',
    bowler: scoreboard ? scoreboard.bowler : 'Bumrah',
    pressureIndex: telemetry ? telemetry.pressureIndex : 0,
    momentum: telemetry ? telemetry.winProbability : 50,
    recentBalls: [],
    winProbability: telemetry ? telemetry.winProbability : 50
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

  // Psychologist dynamic calculations
  const psyData = agents?.psychologist;
  const strikerSt = psyData && typeof psyData === 'object' ? psyData.batterPressure : 50;
  const bowlerSt = psyData && typeof psyData === 'object' ? psyData.bowlerPressure : 50;
  const psychologistMetric = scoreboard ? `Pressure: ${strikerSt}%` : "Pressure: Stable";
  const psychologistDetail = scoreboard ? `Bowler: ${bowlerSt}% stress` : "Diagnostics Core";

  // Extract texts from agents
  const analystText = agents?.analyst ? (typeof agents.analyst === 'object' ? agents.analyst.text : agents.analyst) : 'Awaiting simulation data...';
  const scoutText = agents?.scout ? (typeof agents.scout === 'object' ? agents.scout.text : agents.scout) : 'Awaiting simulation data...';
  const narratorText = agents?.narrator ? (typeof agents.narrator === 'object' ? agents.narrator.text : agents.narrator) : 'Awaiting simulation data...';
  const psychologistText = agents?.psychologist ? (typeof agents.psychologist === 'object' ? agents.psychologist.text : agents.psychologist) : 'Awaiting psychological diagnostics flow...';

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
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | Wankhede Stadium | Probabilistic Simulation Engine
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

      {/* 🔴 SATELLITE BROADCAST INTEL (LIVE MATCH MONITOR) */}
      <div className="panel-card" style={{ marginTop: '8px', borderLeft: '4px solid var(--alert-critical)' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="panel-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: 'var(--alert-critical)' }} />
            <h3 className="panel-title" style={{ color: '#fff', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📡 LIVE SATELLITE BROADCAST FEED // SOURCE: STARK-SAT-04
            </h3>
          </div>
          <button 
            className="control-btn" 
            onClick={() => setShowSatelliteFeed(!showSatelliteFeed)}
            style={{ padding: '0.2rem 0.5rem', fontSize: '11px', textTransform: 'uppercase' }}
          >
            {showSatelliteFeed ? "Mute Feed Video" : "Lock Feed Video"}
          </button>
        </div>

        {showSatelliteFeed && (
          <SatelliteFeed
            scoreboard={scoreboard}
            telemetry={telemetry}
            agents={agents}
            shot={history[history.length - 1]?.shot}
            fielders={history[history.length - 1]?.fielders || []}
            highlightedAgent={highlightedAgent}
            historyLength={history.length}
            selectedScenario={selectedScenario}
            speed={speed}
          />
        )}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '8px' }}>
              <input 
                type="checkbox" 
                id="commentary-sync-checkbox"
                checked={commentarySync} 
                onChange={(e) => setCommentarySync(e.target.checked)}
                disabled={speed === 350}
              />
              <label htmlFor="commentary-sync-checkbox" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                Enable Commentary Sync Mode (Sequential Speech pacing)
              </label>
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

            {hasSavedSession && (
              <button className="control-btn active" onClick={handleRestoreSession} style={{ borderColor: 'var(--accent-psychologist)', color: '#fff' }}>
                <RotateCw size={14} />
                Restore Grid
              </button>
            )}

            <button className="control-btn" onClick={handleExportSession} disabled={history.length === 0} style={{ marginLeft: '8px' }}>
              Export Replay
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Speed:</span>
            <button className={`control-btn ${speed === 2000 ? 'active' : ''}`} onClick={() => handleSetSpeed(2000)}>1.5x</button>
            <button className={`control-btn ${speed === 1000 ? 'active' : ''}`} onClick={() => handleSetSpeed(1000)}>2x</button>
            <button className={`control-btn ${speed === 350 ? 'active' : ''}`} onClick={() => handleSetSpeed(350)}>Turbo</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Coach Override:</span>
            <select
              className="dropdown-select"
              value={coachOverrideBowler}
              onChange={(e) => {
                setCoachOverrideBowler(e.target.value);
                if (localLiveEngineRef.current) {
                  localLiveEngineRef.current.coachOverrideBowler = e.target.value || null;
                }
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'SET_COACH_OVERRIDE',
                    bowler: e.target.value || null
                  }));
                }
              }}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '12px', padding: '4px 8px' }}
            >
              <option value="">Auto Rotation</option>
              {(SCENARIOS[selectedScenario]?.balls
                ? [...new Set(SCENARIOS[selectedScenario].balls.map(b => b.bowler))]
                : (selectedScenario === 'mi_vs_rr_2026' ? ["Sandeep Sharma", "Yuzvendra Chahal", "Avesh Khan"] :
                   selectedScenario === 'mi_vs_csk_2019' ? ["Lasith Malinga", "Jasprit Bumrah", "Krunal Pandya"] :
                   ["Shaheen Afridi", "Haris Rauf", "Mohammad Nawaz"])
              ).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
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

          {/* Psychologist Card */}
          <AgentRow 
            name="psychologist"
            title="Psychologist"
            metric={psychologistMetric}
            detail={psychologistDetail}
            color="var(--accent-psychologist)"
            icon={Cpu}
            text={psychologistText}
            isActive={highlightedAgent === 'psychologist'}
            isDissent={scoreboard && (agents.psychologist?.dissent || (strikerSt > 75 && telemetry.winProbability > 70))}
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
              selectedHistoryIndex={activeHistoryIndex}
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
              {(() => {
                const currentBowlerStamina = scoreboard ? (bowlerStamina[scoreboard.bowler] !== undefined ? bowlerStamina[scoreboard.bowler] : 100) : 100;
                const isBowlerFatigued = currentBowlerStamina < 40;
                return (
                  <div 
                    className={`pressure-gauge ${getPressureLevel(telemetry.pressureIndex)} ${isBowlerFatigued ? 'reactor-fatigued' : ''}`}
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
                );
              })()}
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
                  Active Duel & Fatigue
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

                {/* Bowler stamina bar */}
                {(() => {
                  const currentBowlerStamina = bowlerStamina[scoreboard.bowler] !== undefined ? bowlerStamina[scoreboard.bowler] : 100;
                  return (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>Bowler Stamina</span>
                        <span style={{ color: currentBowlerStamina < 40 ? 'var(--alert-critical)' : 'var(--accent-scout)', fontWeight: 'bold' }}>
                          {Math.round(currentBowlerStamina)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${currentBowlerStamina}%`,
                          height: '100%',
                          background: currentBowlerStamina < 40 ? 'var(--alert-critical)' : 'var(--accent-scout)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Wagon Wheel card */}
            {scoreboard && (
              <div className="panel-card" style={{ marginTop: '24px', background: 'rgba(15,21,53,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', width: '100%' }}>
                <WagonWheel 
                  shots={history.filter(h => h.batsman === scoreboard.batsman).map(h => h.shot).filter(Boolean)} 
                  fielders={history[history.length - 1]?.fielders || []}
                  batsmanName={scoreboard.batsman} 
                />
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


