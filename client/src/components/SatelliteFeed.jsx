import React, { useRef, useEffect, useState } from 'react';
import { Compass, Shield, Flame, Cpu, Radio, Maximize2, Zap } from 'lucide-react';

export default function SatelliteFeed({ 
  scoreboard, 
  telemetry, 
  agents, 
  shot, 
  fielders = [], 
  highlightedAgent, 
  historyLength = 0, 
  selectedScenario,
  speed = 3000 
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Refs to decouple state from RAF loop
  const telemetryRef = useRef({ 
    scoreboard, 
    telemetry, 
    agents, 
    shot, 
    fielders, 
    highlightedAgent, 
    historyLength, 
    selectedScenario,
    speed 
  });

  // Keep ref data updated on prop changes
  useEffect(() => {
    telemetryRef.current = { 
      scoreboard, 
      telemetry, 
      agents, 
      shot, 
      fielders, 
      highlightedAgent, 
      historyLength, 
      selectedScenario,
      speed 
    };
  }, [scoreboard, telemetry, agents, shot, fielders, highlightedAgent, historyLength, selectedScenario, speed]);

  // SVG Line Refs
  const analystLineRef = useRef(null);
  const scoutLineRef = useRef(null);
  const narratorLineRef = useRef(null);
  const psychologistLineRef = useRef(null);

  // DOM node position refs to calculate SVG connections
  const analystNodeRef = useRef(null);
  const scoutNodeRef = useRef(null);
  const narratorNodeRef = useRef(null);
  const psychologistNodeRef = useRef(null);

  // Component local UI state (high-level settings and text tickers only)
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [satelliteCoords, setSatelliteCoords] = useState({ lat: "18.9388° N", lng: "72.8258° E", alt: "284.5 KM" });
  const [activeSubtitle, setActiveSubtitle] = useState("SATELLITE LINK ESTABLISHED // AWAITING COM GRID...");

  // Generate dynamic sub-coordinates for Wankhede (MI vs RR), MCG (IND vs PAK), or Lord's (CSK vs MI)
  useEffect(() => {
    if (selectedScenario === 'mi_vs_rr_2026') {
      setSatelliteCoords({ lat: "18.9388° N", lng: "72.8258° E", alt: "284.2 KM" });
    } else if (selectedScenario === 'ind_vs_pak_2022') {
      setSatelliteCoords({ lat: "37.8136° S", lng: "144.9631° E", alt: "286.9 KM" });
    } else {
      setSatelliteCoords({ lat: "19.0176° N", lng: "72.8478° E", alt: "285.1 KM" });
    }
  }, [selectedScenario]);

  // Update subtitle when active agent text changes
  useEffect(() => {
    if (!highlightedAgent) {
      setActiveSubtitle("SATELLITE FEED MONITORED // STANDBY SCAN...");
      return;
    }
    const currentText = agents?.[highlightedAgent];
    const textStr = typeof currentText === 'object' ? currentText.text : currentText;
    if (textStr) {
      setActiveSubtitle(`[${highlightedAgent.toUpperCase()}] ${textStr}`);
    }
  }, [highlightedAgent, agents]);

  // Track the history length to trigger animation cycles
  const prevHistoryLengthRef = useRef(0);

  useEffect(() => {
    // Detect new ball event
    if (historyLength > prevHistoryLengthRef.current) {
      triggerNewDelivery();
    }
    prevHistoryLengthRef.current = historyLength;
  }, [historyLength]);

  // Animation controller variables stored in Refs (prevent React rendering)
  const animState = useRef({
    phase: 'idle', // 'idle' | 'runup' | 'flight' | 'hit' | 'chase' | 'return'
    phaseStart: 0,
    bowler: { x: 0, y: 0, homeX: 0, homeY: 0 },
    striker: { x: 0, y: 0, homeX: 0, homeY: 0 },
    ball: { x: 0, y: 0, startX: 0, startY: 0, targetX: 0, targetY: 0, size: 4, trail: [] },
    fielders: [],
    batRotation: 0,
    impactParticles: [],
    wicketParticles: [],
    boundaryPulse: 0,
    radarAngle: 0,
    isWicket: false,
    isBoundary: false,
    runs: 0
  });

  // Call this to trigger a new delivery cycle
  const triggerNewDelivery = () => {
    const state = animState.current;
    const data = telemetryRef.current;
    
    state.phase = 'runup';
    state.phaseStart = Date.now();
    
    // Clear particles
    state.impactParticles = [];
    state.wicketParticles = [];
    state.boundaryPulse = 0;
    state.ball.trail = [];
    
    // Determine play outcomes
    const event = data.scoreboard?.lastBallEvent || '';
    state.isWicket = event === 'wicket';
    state.runs = data.shot?.runs || 0;
    state.isBoundary = state.runs >= 4;

    // Reset fielder targets
    state.fielders.forEach(f => {
      f.targetX = f.homeX;
      f.targetY = f.homeY;
      f.isChasing = false;
    });
  };

  // Main canvas and SVG renderer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Default fielder coordinates
    const defaultFielders = [
      { angle: 30, distance: 75, label: "Deep Cover" },
      { angle: 75, distance: 80, label: "Deep Point" },
      { angle: 120, distance: 45, label: "Point" },
      { angle: 150, distance: 75, label: "Third Man" },
      { angle: 210, distance: 80, label: "Fine Leg" },
      { angle: 250, distance: 75, label: "Deep Mid-Wkt" },
      { angle: 285, distance: 80, label: "Long-on" },
      { angle: 330, distance: 85, label: "Long-off" },
      { angle: 0, distance: 35, label: "Cover" },
      { angle: 180, distance: 25, label: "Square Leg" },
      { angle: 90, distance: 15, label: "Keeper" }
    ];

    // Scale helper
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let maxRadius = 0;

    // Handle high-DPI sizing and ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const rect = entry.contentRect;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        width = rect.width;
        height = rect.height;
        centerX = width / 2;
        centerY = height / 2;
        maxRadius = Math.min(width, height) / 2 - 25;

        // Initialize positions relative to canvas size
        const state = animState.current;
        state.bowler.homeX = centerX;
        state.bowler.homeY = centerY - maxRadius * 0.18;
        state.bowler.x = state.bowler.homeX;
        state.bowler.y = state.bowler.homeY - 20;

        state.striker.homeX = centerX;
        state.striker.homeY = centerY + maxRadius * 0.18;
        state.striker.x = state.striker.homeX;
        state.striker.y = state.striker.homeY;

        state.ball.x = state.bowler.x;
        state.ball.y = state.bowler.y;

        // Set up fielders
        state.fielders = defaultFielders.map(f => {
          const rad = (f.angle - 90) * Math.PI / 180;
          const dist = maxRadius * (f.distance / 100);
          const homeX = centerX + Math.cos(rad) * dist;
          const homeY = centerY + Math.sin(rad) * dist;
          return {
            ...f,
            homeX,
            homeY,
            x: homeX,
            y: homeY,
            targetX: homeX,
            targetY: homeY,
            isChasing: false
          };
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    // Frame-by-frame animation update loop
    const updateFrame = () => {
      const state = animState.current;
      const data = telemetryRef.current;
      const now = Date.now();
      const delta = now - state.phaseStart;

      // Adjust animation speeds dynamically based on current simulation speed
      let scale = 1.0;
      if (data.speed === 2000) scale = 0.7;
      if (data.speed === 1000) scale = 0.35;
      if (data.speed === 350) scale = 0.12; // Fast skip in Turbo

      const DURATION = {
        runup: 1000 * scale,
        flight: 500 * scale,
        hit: 200 * scale,
        chase: 1500 * scale,
        return: 1000 * scale
      };

      // 1. PHASE STATE MACHINE & PHYSICS
      if (state.phase === 'runup') {
        const t = Math.min(1, delta / DURATION.runup);
        // Bowler runs up from slightly behind crease to release point
        state.bowler.x = state.bowler.homeX;
        state.bowler.y = (state.bowler.homeY - 25) + t * 25;
        // Ball stays in bowler hand
        state.ball.x = state.bowler.x;
        state.ball.y = state.bowler.y;

        if (t >= 1) {
          state.phase = 'flight';
          state.phaseStart = now;
          state.ball.startX = state.bowler.x;
          state.ball.startY = state.bowler.y;
        }
      } 
      else if (state.phase === 'flight') {
        const t = Math.min(1, delta / DURATION.flight);
        // Ball travels bowler to batsman crease
        state.ball.x = state.ball.startX;
        state.ball.y = state.ball.startY + t * (state.striker.homeY - state.ball.startY);

        if (t >= 1) {
          state.phase = 'hit';
          state.phaseStart = now;
          state.batRotation = -Math.PI / 4;
        }
      } 
      else if (state.phase === 'hit') {
        const t = Math.min(1, delta / DURATION.hit);
        // Bat swing rotation
        state.batRotation = -Math.PI / 4 + t * (Math.PI / 2);
        
        if (t >= 1) {
          state.phase = 'chase';
          state.phaseStart = now;
          state.ball.startX = state.striker.homeX;
          state.ball.startY = state.striker.homeY;

          // Calculate ball landing spot from shot polar coordinates
          const angle = data.shot?.angle !== undefined ? data.shot.angle : Math.floor(Math.random() * 360);
          const distance = data.shot?.distance !== undefined ? data.shot.distance : 60;
          const rad = (angle - 90) * Math.PI / 180;
          const dist = maxRadius * (Math.min(distance, 110) / 100);

          state.ball.targetX = centerX + Math.cos(rad) * dist;
          state.ball.targetY = centerY + Math.sin(rad) * dist;

          // Generate impact particles
          for (let i = 0; i < 15; i++) {
            state.impactParticles.push({
              x: state.striker.homeX,
              y: state.striker.homeY,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1.0,
              decay: 0.05 + Math.random() * 0.05,
              color: state.isBoundary ? '#FF4560' : 'rgba(0, 229, 255, 0.8)'
            });
          }

          // Locate closest fielder to chase
          let closestIdx = -1;
          let minDist = 99999;
          state.fielders.forEach((f, idx) => {
            const d = Math.hypot(f.x - state.ball.targetX, f.y - state.ball.targetY);
            if (d < minDist) {
              minDist = d;
              closestIdx = idx;
            }
          });

          if (closestIdx !== -1) {
            state.fielders[closestIdx].isChasing = true;
            state.fielders[closestIdx].targetX = state.ball.targetX;
            state.fielders[closestIdx].targetY = state.ball.targetY;
          }
        }
      } 
      else if (state.phase === 'chase') {
        const t = Math.min(1, delta / DURATION.chase);
        // Ball moves towards boundary/landing spot
        state.ball.x = state.ball.startX + t * (state.ball.targetX - state.ball.startX);
        state.ball.y = state.ball.startY + t * (state.ball.targetY - state.ball.startY);

        // Add to ball trail
        if (delta % 30 < 10) {
          state.ball.trail.push({ x: state.ball.x, y: state.ball.y, life: 1.0 });
        }

        // LERP fielder positions smoothly
        state.fielders.forEach(f => {
          const lerpSpeed = f.isChasing ? 0.08 : 0.01; // Chase runs faster
          f.x += (f.targetX - f.x) * lerpSpeed;
          f.y += (f.targetY - f.y) * lerpSpeed;
        });

        // Wicket explosion particles at stumps
        if (state.isWicket && t > 0.85 && state.wicketParticles.length === 0) {
          for (let i = 0; i < 20; i++) {
            state.wicketParticles.push({
              x: state.striker.homeX,
              y: state.striker.homeY,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 6 - 1,
              life: 1.0,
              decay: 0.03 + Math.random() * 0.04
            });
          }
        }

        // Boundary pulses
        if (state.isBoundary) {
          state.boundaryPulse = Math.sin(now * 0.01) * 0.5 + 0.5;
        }

        if (t >= 1) {
          state.phase = 'return';
          state.phaseStart = now;
          // Set all fielders to return home
          state.fielders.forEach(f => {
            f.targetX = f.homeX;
            f.targetY = f.homeY;
            f.isChasing = false;
          });
        }
      } 
      else if (state.phase === 'return') {
        const t = Math.min(1, delta / DURATION.return);
        // Ball and bowler glide back to default spots
        state.ball.x += (state.bowler.homeX - state.ball.x) * 0.1;
        state.ball.y += ((state.bowler.homeY - 20) - state.ball.y) * 0.1;
        state.bowler.y += ((state.bowler.homeY - 20) - state.bowler.y) * 0.1;

        // Fielder return LERP
        state.fielders.forEach(f => {
          f.x += (f.homeX - f.x) * 0.1;
          f.y += (f.homeY - f.y) * 0.1;
        });

        // Decay boundary/wicket overlays
        state.boundaryPulse = Math.max(0, state.boundaryPulse - 0.05);

        if (t >= 1) {
          state.phase = 'idle';
        }
      } 
      else {
        // IDLE STATE: keep fielders at home and draw a slow pulse/drift
        state.fielders.forEach(f => {
          f.x += (f.homeX - f.x) * 0.1;
          f.y += (f.homeY - f.y) * 0.1;
        });
        state.bowler.x = state.bowler.homeX;
        state.bowler.y = state.bowler.homeY - 20;
        state.ball.x = state.bowler.x;
        state.ball.y = state.bowler.y;
      }

      // 2. PARTICLE PHYSICS
      state.impactParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
      });
      state.impactParticles = state.impactParticles.filter(p => p.life > 0);

      state.wicketParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
      });
      state.wicketParticles = state.wicketParticles.filter(p => p.life > 0);

      state.ball.trail.forEach(t => {
        t.life -= 0.04;
      });
      state.ball.trail = state.ball.trail.filter(t => t.life > 0);

      // Radar sweeps
      state.radarAngle = (state.radarAngle + 0.015) % (2 * Math.PI);

      // 3. CANVAS DRAW OPERATIONS
      ctx.clearRect(0, 0, width, height);

      // Draw Grid Mesh (Satellite Vibe)
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Field Boundary Circle
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(15, 21, 53, 0.6)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // 30-yard Circle
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.09)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * 0.5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw pitch (center rectangle)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(centerX - 5, centerY - maxRadius * 0.2, 10, maxRadius * 0.4);

      // Pitch Crease markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      // Bowler crease
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY - maxRadius * 0.18);
      ctx.lineTo(centerX + 10, centerY - maxRadius * 0.18);
      ctx.stroke();
      // Batsman crease
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY + maxRadius * 0.18);
      ctx.lineTo(centerX + 10, centerY + maxRadius * 0.18);
      ctx.stroke();

      // Draw Stumps
      ctx.fillStyle = '#ffb800';
      // Bowler Stumps
      ctx.fillRect(centerX - 2, centerY - maxRadius * 0.18 - 1, 4, 2);
      // Batsman Stumps
      ctx.fillRect(centerX - 2, centerY + maxRadius * 0.18 - 1, 4, 2);

      // Draw Radar Sweep lines
      const sweepLen = maxRadius;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.07)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(state.radarAngle) * sweepLen, centerY + Math.sin(state.radarAngle) * sweepLen);
      ctx.stroke();

      // Draw Fielder Dots
      state.fielders.forEach(f => {
        ctx.fillStyle = f.isChasing ? '#ffb800' : 'rgba(0, 162, 255, 0.85)';
        ctx.shadowColor = f.isChasing ? 'rgba(255, 184, 0, 0.6)' : 'rgba(0, 162, 255, 0.4)';
        ctx.shadowBlur = f.isChasing ? 8 : 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw labeling text
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(f.label, f.x, f.y - 7);
      });

      // Draw Bowler Dot
      ctx.fillStyle = '#a855f7'; // Purple bowler dot
      ctx.beginPath();
      ctx.arc(state.bowler.x, state.bowler.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px monospace';
      ctx.fillText(data.scoreboard?.bowler?.split(' ')[0] || "Bowler", state.bowler.x, state.bowler.y - 9);

      // Draw Batsman (Striker) Dot
      ctx.fillStyle = '#ff7b00'; // Orange batsman
      ctx.beginPath();
      ctx.arc(state.striker.x, state.striker.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px monospace';
      ctx.fillText(data.scoreboard?.batsman?.split(' ')[0] || "Striker", state.striker.x, state.striker.y + 14);

      // Draw Batsman Bat Swing (represented as a vector line)
      if (state.phase === 'hit') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(state.striker.x, state.striker.y);
        ctx.lineTo(
          state.striker.x + Math.sin(state.batRotation) * 12,
          state.striker.y - Math.cos(state.batRotation) * 12
        );
        ctx.stroke();
      }

      // Draw Ball particles and trail
      state.ball.trail.forEach(pt => {
        ctx.fillStyle = `rgba(255, 235, 59, ${pt.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Active Ball
      if (state.phase !== 'idle') {
        ctx.fillStyle = '#ffeb3b'; // Neon Yellow ball dot
        ctx.shadowColor = 'rgba(255, 235, 59, 0.9)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw hit/wicket particles
      state.impactParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.life, 0, 2 * Math.PI);
        ctx.fill();
      });

      state.wicketParticles.forEach(p => {
        ctx.fillStyle = '#ff2a5f';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, 2 * Math.PI);
        ctx.fill();
      });

      // 4. OVERLAY GRAPHICS (Wickets / Boundaries)
      if (state.isWicket && state.phase === 'chase') {
        ctx.fillStyle = 'rgba(255, 42, 95, 0.1)';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(255, 42, 95, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        ctx.fillStyle = '#ff2a5f';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("⚠️ TARGET OUT // WICKET", centerX, centerY - 40);
      }

      if (state.isBoundary && state.phase === 'chase') {
        ctx.fillStyle = `rgba(255, 184, 0, ${state.boundaryPulse * 0.1})`;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = `rgba(255, 184, 0, ${state.boundaryPulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#ffb800';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${state.runs} RUNS // BOUNDARY`, centerX, centerY - 45);
      }

      // 5. UPDATE SVG NEURAL LINES (Direct DOM Attribute updates)
      // Grab agent relative positions and update SVG nodes
      const updateNeuralLink = (lineEl, nodeEl, targetPoint) => {
        if (!lineEl || !nodeEl || !containerRef.current) return;
        const rect = nodeEl.getBoundingClientRect();
        const wrapperRect = containerRef.current.getBoundingClientRect();

        // Calculate absolute center coords of the agent box
        const x = rect.left - wrapperRect.left + rect.width / 2;
        const y = rect.top - wrapperRect.top + rect.height / 2;

        lineEl.setAttribute('x1', x);
        lineEl.setAttribute('y1', y);
        lineEl.setAttribute('x2', targetPoint.x);
        lineEl.setAttribute('y2', targetPoint.y);
      };

      // Set connections based on agent priorities
      const currentHighlighted = data.highlightedAgent;
      
      // Reset all SVG lines visibility
      [analystLineRef, scoutLineRef, narratorLineRef, psychologistLineRef].forEach(lRef => {
        if (lRef.current) lRef.current.style.display = 'none';
      });

      if (currentHighlighted === 'analyst') {
        updateNeuralLink(analystLineRef.current, analystNodeRef.current, state.striker);
        if (analystLineRef.current) analystLineRef.current.style.display = 'block';
      } 
      else if (currentHighlighted === 'scout') {
        // Find nearest fielder or bowler
        const target = state.fielders.find(f => f.isChasing) || state.bowler;
        updateNeuralLink(scoutLineRef.current, scoutNodeRef.current, target);
        if (scoutLineRef.current) scoutLineRef.current.style.display = 'block';
      } 
      else if (currentHighlighted === 'narrator') {
        updateNeuralLink(narratorLineRef.current, narratorNodeRef.current, state.ball);
        if (narratorLineRef.current) narratorLineRef.current.style.display = 'block';
      } 
      else if (currentHighlighted === 'psychologist') {
        // Target Bowler or Batsman based on higher pressure
        const target = (data.telemetry?.pressureIndex > 60) ? state.striker : state.bowler;
        updateNeuralLink(psychologistLineRef.current, psychologistNodeRef.current, target);
        if (psychologistLineRef.current) psychologistLineRef.current.style.display = 'block';
      }

      animationFrameId = requestAnimationFrame(updateFrame);
    };

    animationFrameId = requestAnimationFrame(updateFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [selectedScenario]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '380px', 
        background: 'radial-gradient(circle at center, #070d23 0%, #030612 100%)', 
        borderRadius: '8px', 
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
    >
      {/* 1. ANIMATION CANVAS */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: 'block', 
          width: '100%', 
          height: '100%' 
        }} 
      />

      {/* 2. SVG LAYER FOR NEURAL STREAMING PATHS */}
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          zIndex: 10 
        }}
      >
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Neural Link Lines */}
        <line 
          ref={analystLineRef} 
          stroke="var(--accent-analyst)" 
          strokeWidth="2" 
          strokeDasharray="4,4"
          filter="url(#glow-cyan)"
          style={{ display: 'none' }}
        />
        <line 
          ref={scoutLineRef} 
          stroke="var(--accent-scout)" 
          strokeWidth="2" 
          strokeDasharray="5,3"
          filter="url(#glow-emerald)"
          style={{ display: 'none' }}
        />
        <line 
          ref={narratorLineRef} 
          stroke="var(--accent-narrator)" 
          strokeWidth="2.5" 
          filter="url(#glow-orange)"
          style={{ display: 'none' }}
        />
        <line 
          ref={psychologistLineRef} 
          stroke="var(--accent-psychologist)" 
          strokeWidth="2" 
          strokeDasharray="2,6"
          filter="url(#glow-purple)"
          style={{ display: 'none' }}
        />
      </svg>

      {/* 3. MULTI-AGENT OVERLAYS (DOM nodes placed absolutely at HUD corners) */}
      
      {/* Top Left: Analyst HUD */}
      <div 
        ref={analystNodeRef}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(15, 21, 53, 0.85)',
          border: `1px solid ${highlightedAgent === 'analyst' ? 'var(--accent-analyst)' : 'rgba(0, 229, 255, 0.2)'}`,
          boxShadow: highlightedAgent === 'analyst' ? '0 0 15px rgba(0, 229, 255, 0.4)' : 'none',
          padding: '6px 10px',
          borderRadius: '4px',
          zIndex: 20,
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fff',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Compass size={12} style={{ color: 'var(--accent-analyst)' }} />
        <span>ANALYST: {highlightedAgent === 'analyst' ? 'LINKING...' : 'IDLE'}</span>
      </div>

      {/* Bottom Left: Scout HUD */}
      <div 
        ref={scoutNodeRef}
        style={{
          position: 'absolute',
          bottom: '50px', // Raised to clear subtitles
          left: '12px',
          background: 'rgba(15, 21, 53, 0.85)',
          border: `1px solid ${highlightedAgent === 'scout' ? 'var(--accent-scout)' : 'rgba(0, 255, 102, 0.2)'}`,
          boxShadow: highlightedAgent === 'scout' ? '0 0 15px rgba(0, 255, 102, 0.4)' : 'none',
          padding: '6px 10px',
          borderRadius: '4px',
          zIndex: 20,
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fff',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Shield size={12} style={{ color: 'var(--accent-scout)' }} />
        <span>SCOUT: {highlightedAgent === 'scout' ? 'LINKING...' : 'IDLE'}</span>
      </div>

      {/* Top Right: Psychologist HUD */}
      <div 
        ref={psychologistNodeRef}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(15, 21, 53, 0.85)',
          border: `1px solid ${highlightedAgent === 'psychologist' ? 'var(--accent-psychologist)' : 'rgba(168, 85, 247, 0.2)'}`,
          boxShadow: highlightedAgent === 'psychologist' ? '0 0 15px rgba(168, 85, 247, 0.4)' : 'none',
          padding: '6px 10px',
          borderRadius: '4px',
          zIndex: 20,
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fff',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Cpu size={12} style={{ color: 'var(--accent-psychologist)' }} />
        <span>PSYCHOLOGIST: {highlightedAgent === 'psychologist' ? 'LINKING...' : 'IDLE'}</span>
      </div>

      {/* Bottom Right: Narrator HUD */}
      <div 
        ref={narratorNodeRef}
        style={{
          position: 'absolute',
          bottom: '50px', // Raised to clear subtitles
          right: '12px',
          background: 'rgba(15, 21, 53, 0.85)',
          border: `1px solid ${highlightedAgent === 'narrator' ? 'var(--accent-narrator)' : 'rgba(255, 42, 95, 0.2)'}`,
          boxShadow: highlightedAgent === 'narrator' ? '0 0 15px rgba(255, 42, 95, 0.4)' : 'none',
          padding: '6px 10px',
          borderRadius: '4px',
          zIndex: 20,
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fff',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Flame size={12} style={{ color: 'var(--accent-narrator)' }} />
        <span>NARRATOR: {highlightedAgent === 'narrator' ? 'LINKING...' : 'IDLE'}</span>
      </div>

      {/* 4. SATELLITE HUD DATA INFO BARS */}
      <div 
        style={{
          position: 'absolute',
          top: '45px',
          left: '12px',
          color: 'rgba(0, 229, 255, 0.5)',
          fontFamily: 'monospace',
          fontSize: '9px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          pointerEvents: 'none',
          zIndex: 20
        }}
      >
        <div>SAT_NAME: STARK-SAT-04</div>
        <div>ALTITUDE: {satelliteCoords.alt}</div>
        <div>COORDS: {satelliteCoords.lat}, {satelliteCoords.lng}</div>
      </div>

      <div 
        style={{
          position: 'absolute',
          top: '45px',
          right: '12px',
          color: 'rgba(0, 229, 255, 0.5)',
          fontFamily: 'monospace',
          fontSize: '9px',
          textAlign: 'right',
          pointerEvents: 'none',
          zIndex: 20
        }}
      >
        <div>RES: 4K TELESCOPIC FEED</div>
        <div>ZOOM: {zoomLevel.toFixed(1)}X</div>
        <div>FPS: 60 // SYNCED</div>
      </div>

      {/* Center Target Crosshairs overlay */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '40px',
          border: '1px solid rgba(0, 229, 255, 0.08)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 5
        }}
      />
      
      {/* 5. SUBTITLE TEXT TICKER DISPLAY */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          background: 'rgba(3, 6, 18, 0.9)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '8px 16px',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={14} style={{ color: highlightedAgent ? 'var(--alert-critical)' : 'var(--accent-scout)', animation: highlightedAgent ? 'pulse 1s infinite' : 'none' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {highlightedAgent ? 'TTS_STREAM' : 'COM_STANDBY'}
          </span>
        </div>
        <div 
          style={{ 
            flexGrow: 1, 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            color: highlightedAgent === 'analyst' ? 'var(--accent-analyst)' :
                   highlightedAgent === 'scout' ? 'var(--accent-scout)' :
                   highlightedAgent === 'narrator' ? 'var(--accent-narrator)' :
                   highlightedAgent === 'psychologist' ? 'var(--accent-psychologist)' :
                   'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '0.5px'
          }}
        >
          {activeSubtitle}
        </div>
      </div>
    </div>
  );
}
