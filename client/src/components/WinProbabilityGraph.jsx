import React, { useRef, useEffect, useState } from 'react';

export default function WinProbabilityGraph({ history, matchInfo, selectedHistoryIndex = -1 }) {
  const canvasRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const prevProbRef = useRef(50);

  useEffect(() => {
    if (history && history.length > 0) {
      const currProb = history[history.length - 1].winProbability;
      const shift = Math.abs(currProb - prevProbRef.current);
      if (shift > 5) {
        setIsUpdating(true);
        const timer = setTimeout(() => setIsUpdating(false), 1400);
        prevProbRef.current = currProb;
        return () => clearTimeout(timer);
      }
      prevProbRef.current = currProb;
    }
  }, [history]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Margins
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Draw Grid Background
    ctx.strokeStyle = '#1b1f32';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#525c74';

    // Horizontal grid lines (0%, 25%, 50%, 75%, 100%)
    const gridLines = [0, 25, 50, 75, 100];
    gridLines.forEach((val) => {
      const y = paddingTop + chartHeight - (val / 100) * chartHeight;
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Draw label
      ctx.fillText(`${val}%`, 8, y + 4);
    });

    // 50% Equilibrium Line (dramatic dashed line)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    const y50 = paddingTop + chartHeight / 2;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y50);
    ctx.lineTo(width - paddingRight, y50);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    if (!history || history.length === 0) {
      // Draw placeholder
      ctx.font = '12px Outfit';
      ctx.fillStyle = '#8c96ac';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for match data...', width / 2, height / 2);
      return;
    }

    // Parse data points
    // X axis represents progress through the balls.
    const maxPoints = Math.max(20, history.length + 6);
    
    // Draw coordinates
    const points = history.map((item, idx) => {
      const x = paddingLeft + (idx / (maxPoints - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (item.winProbability / 100) * chartHeight;
      return { x, y, val: item.winProbability, over: item.over };
    });

    // Draw main probability curve
    ctx.strokeStyle = 'var(--neon-cyan)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    
    points.forEach((pt, idx) => {
      if (idx === 0) {
        ctx.moveTo(pt.x, pt.y);
      } else {
        const prev = points[idx - 1];
        const xc = (prev.x + pt.x) / 2;
        const yc = (prev.y + pt.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
      }
    });

    // Connect to the final point
    if (points.length > 1) {
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();

    // Fill under the curve
    if (points.length > 0) {
      const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.05)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop + chartHeight);
      points.forEach((pt) => {
        ctx.lineTo(pt.x, pt.y);
      });
      ctx.lineTo(points[points.length - 1].x, paddingTop + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    // ──────────────────────── v4.0 GHOST BRANCHES DRAWING ────────────────────────
    // Find active starting index for parallel universes
    const activeIdx = selectedHistoryIndex >= 0 && selectedHistoryIndex < history.length
      ? selectedHistoryIndex
      : history.length - 1;

    const activeNode = history[activeIdx];
    if (activeNode && activeNode.branches) {
      const branchColors = {
        alpha: { stroke: 'rgba(255, 120, 0, 0.65)', fill: 'rgba(255, 120, 0, 0.08)', collapsed: 'rgba(255, 120, 0, 0.08)' }, // Aggressive (Orange)
        beta: { stroke: 'rgba(0, 208, 132, 0.65)', fill: 'rgba(0, 208, 132, 0.08)', collapsed: 'rgba(0, 208, 132, 0.08)' },   // Conservative (Green)
        gamma: { stroke: 'rgba(168, 85, 247, 0.65)', fill: 'rgba(168, 85, 247, 0.08)', collapsed: 'rgba(168, 85, 247, 0.08)' }  // Volatile (Purple)
      };

      Object.entries(activeNode.branches).forEach(([branchName, curve]) => {
        const config = branchColors[branchName] || branchColors.alpha;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);

        ctx.beginPath();
        // Start from the active history node's point
        const startPt = points[activeIdx];
        if (startPt) {
          ctx.moveTo(startPt.x, startPt.y);

          curve.forEach((val, i) => {
            const nextIdx = activeIdx + i + 1;
            const bx = paddingLeft + (nextIdx / (maxPoints - 1)) * chartWidth;
            const by = paddingTop + chartHeight - (val / 100) * chartHeight;

            // Divergence calculation
            let isCollapsed = false;
            if (history[nextIdx]) {
              const divergence = Math.abs(history[nextIdx].winProbability - val);
              if (divergence > 25) {
                isCollapsed = true;
              }
            }

            ctx.strokeStyle = isCollapsed ? config.collapsed : config.stroke;
            ctx.lineTo(bx, by);
          });
          ctx.stroke();
        }

        ctx.setLineDash([]); // Reset line dash
      });
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // Draw markers for special events (e.g. wickets, boundaries)
    history.forEach((item, idx) => {
      const pt = points[idx];
      if (item.event === 'wicket' || item.event === 'six' || item.event === 'boundary' || item.event === 'six_noball') {
        ctx.fillStyle = item.event === 'wicket' ? 'var(--neon-red)' : 'var(--neon-green)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    // Draw selection highlight ring if in Replay/Historical Mode
    if (activeIdx < history.length) {
      const selectedPt = points[activeIdx];
      if (selectedPt) {
        ctx.strokeStyle = 'var(--neon-orange)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(selectedPt.x, selectedPt.y, 8, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    const active = points[points.length - 1];
    if (active) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(active.x, active.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw Over Markers on X-axis
    ctx.fillStyle = '#8c96ac';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    
    // Label first and last overs
    const firstOver = history[0].over;
    const lastOver = history[history.length - 1].over;
    ctx.fillText(`Over ${firstOver.toFixed(1)}`, paddingLeft + 15, height - 10);
    ctx.fillText(`Over ${lastOver.toFixed(1)}`, width - paddingRight - 15, height - 10);

  }, [history, selectedHistoryIndex]);

  return (
    <div className={`graph-container probability-graph-container ${isUpdating ? 'probability-shift' : ''}`} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          Probability Trend Curve + Branches
        </span>
        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>
          {matchInfo ? `${matchInfo.battingTeam} Win %` : 'Live Forecast'}
        </span>
      </div>
      <div style={{ flexGrow: 1, position: 'relative', minHeight: '140px' }}>
        <canvas ref={canvasRef} className={`probability-canvas ${isUpdating ? 'updating' : ''}`} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
