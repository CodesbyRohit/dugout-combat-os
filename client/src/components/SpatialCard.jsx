import React, { useState, useRef } from 'react';

export default function SpatialCard({
  children,
  className = '',
  style = {},
  themeColor = 'var(--neon-cyan)',
  hoverZ = '8px',
  dissent = false,
  isHighlighted = false,
  anyHighlighted = false,
  maxTilt = 2 // Restrained cinematic tilt angle: 2 degrees max
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    // Percentages for holographic gradient glare
    const mouseXPercent = (x / box.width) * 100;
    const mouseYPercent = (y / box.height) * 100;
    
    // Tilt calculations
    const tiltX = ((y / box.height) - 0.5) * -maxTilt; // rotateX based on Y axis
    const tiltY = ((x / box.width) - 0.5) * maxTilt;  // rotateY based on X axis
    
    setTilt({ x: tiltX, y: tiltY });
    setMousePos({ x: mouseXPercent, y: mouseYPercent });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Determine card styles based on highlight and dissent states
  let cardClass = `panel-card ${className}`;
  if (dissent) cardClass += " dissent-active";
  if (isHighlighted) cardClass += " priority-focus";
  else if (anyHighlighted) cardClass += " focus-dimmed";

  return (
    <div
      ref={cardRef}
      className={cardClass}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        position: 'relative',
        transformStyle: 'preserve-3d',
        willChange: 'transform, box-shadow',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translate3d(0, 0, ${isHovered ? hoverZ : '0px'})`,
        '--theme-color': themeColor
      }}
    >
      {/* Holographic dynamic glare overlay */}
      <div 
        className="holo-glare" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 5,
          borderRadius: 'inherit',
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.03) 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          willChange: 'opacity'
        }} 
      />

      {/* Card Content (Preserves 3D rendering so children can float using translateZ) */}
      <div style={{ transform: 'translateZ(0px)', transformStyle: 'preserve-3d', height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
