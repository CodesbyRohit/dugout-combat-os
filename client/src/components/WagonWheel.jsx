import React, { useRef, useEffect } from 'react';

export default function WagonWheel({ shots = [], fielders = [], batsmanName = "Virat Kohli" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Scale for high DPI screens
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Cricket Boundary (Outer Circle)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(15, 21, 53, 0.4)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // 2. Draw 30-Yard Circle (Inner Ring)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 3. Draw Pitch (Center Rectangle)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(centerX - 4, centerY - 12, 8, 24);

    // 4. Draw Fielder Positions
    if (fielders && fielders.length > 0) {
      fielders.forEach(f => {
        // Convert polar to Cartesian coordinates
        // Angle 0 is straight up (12 o'clock)
        const rad = (f.angle - 90) * Math.PI / 180;
        const dist = maxRadius * (f.distance / 100);
        const x = centerX + Math.cos(rad) * dist;
        const y = centerY + Math.sin(rad) * dist;

        // Draw fielder dot
        ctx.fillStyle = 'rgba(0, 102, 255, 0.7)'; // Blue fielder dot
        ctx.shadowColor = 'rgba(0, 102, 255, 0.5)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(f.label, x, y - 6);
      });
    }

    // 5. Draw Shot Lines
    if (shots && shots.length > 0) {
      shots.forEach(s => {
        const rad = (s.angle - 90) * Math.PI / 180;
        // Distance is scale from 0 to 100
        const dist = maxRadius * (Math.min(s.distance, 100) / 100);
        const x = centerX + Math.cos(rad) * dist;
        const y = centerY + Math.sin(rad) * dist;

        // Colors: Amber for singles/doubles, Coral for boundaries
        const color = s.runs >= 4 ? '#FF4560' : '#FFB800'; 
        ctx.strokeStyle = color;
        ctx.lineWidth = s.runs >= 4 ? 2 : 1;

        // Draw Line from Pitch
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw Shot Endpoint marker
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, s.runs >= 6 ? 4.5 : 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw Compass headings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("OFF SIDE", centerX + maxRadius - 25, centerY + 3);
    ctx.fillText("LEG SIDE", centerX - maxRadius + 25, centerY + 3);
    ctx.fillText("ON DRIVE", centerX, centerY - maxRadius + 15);
    ctx.fillText("BEHIND", centerX, centerY + maxRadius - 10);

  }, [shots, fielders]);

  return (
    <div className="wagon-wheel-container" style={{ width: '100%', height: '100%', minHeight: '190px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          Tactical Shot Map
        </span>
        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-psychologist)' }}>
          {batsmanName || 'Batter'}
        </span>
      </div>
      <div style={{ flexGrow: 1, position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', maxWidth: '240px', maxHeight: '240px', display: 'block' }} />
      </div>
    </div>
  );
}
