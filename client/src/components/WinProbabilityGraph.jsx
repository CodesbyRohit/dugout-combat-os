import React, { useRef, useEffect } from 'react';

export default function WinProbabilityGraph({ history, matchInfo }) {
  const canvasRef = useRef(null);

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
    // Let's map X indices from 0 to total expected points or history.length.
    const maxPoints = Math.max(10, history.length);
    
    // Draw probability curve
    ctx.strokeStyle = 'var(--neon-cyan)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    
    // Draw coordinates
    const points = history.map((item, idx) => {
      const x = paddingLeft + (idx / (maxPoints - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (item.winProbability / 100) * chartHeight;
      return { x, y, val: item.winProbability, over: item.over };
    });

    points.forEach((pt, idx) => {
      if (idx === 0) {
        ctx.moveTo(pt.x, pt.y);
      } else {
        // Curve interpolation (bezier)
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
    ctx.shadowBlur = 0; // Reset shadow

    // Fill under the curve
    if (points.length > 0) {
      const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.04)');
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

    const active = points[points.length - 1];
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(active.x, active.y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Draw Over Markers on X-axis
    ctx.fillStyle = '#8c96ac';
    ctx.textAlign = 'center';
    
    // Label first and last overs
    const firstOver = history[0].over;
    const lastOver = history[history.length - 1].over;
    ctx.fillText(`Over ${firstOver.toFixed(1)}`, paddingLeft + 15, height - 10);
    ctx.fillText(`Over ${lastOver.toFixed(1)}`, width - paddingRight - 15, height - 10);

  }, [history]);

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          Probability Trend Curve
        </span>
        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>
          {matchInfo ? `${matchInfo.battingTeam} Win %` : 'Live Forecast'}
        </span>
      </div>
      <div style={{ flexGrow: 1, position: 'relative', minHeight: '140px' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
