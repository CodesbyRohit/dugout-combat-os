import React, { useState, useEffect, useRef } from 'react';

export default function AgentPanel({ 
  title, 
  role, 
  agentData, 
  status = 'ACTIVE', 
  color = 'var(--neon-green)', 
  icon: Icon,
  dissent = false,
  isHighlighted = false,
  anyHighlighted = false,
  hoverZ = '6px',
  style = {}
}) {
  const [displayText, setDisplayText] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  // Extract text and meta-information depending on whether agentData is a string or structured object
  const isObject = typeof agentData === 'object' && agentData !== null;
  const text = isObject ? agentData.text : agentData;
  const confidence = isObject ? agentData.confidence : null;
  const stability = isObject ? agentData.stability : null;
  const certainty = isObject ? agentData.certainty : null;

  useEffect(() => {
    if (!text) {
      setDisplayText('');
      return;
    }

    let currentIndex = 0;
    setDisplayText(''); // Reset text on new input

    // High speed typing effect: 10ms per character
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText((prev) => prev + (text[currentIndex] || ''));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [text]);

  const getStabilityColor = (stab) => {
    if (!stab) return 'var(--text-secondary)';
    if (stab === 'HIGH' || stab === 'STABLE') return 'var(--neon-green)';
    if (stab === 'MODERATE') return 'var(--neon-orange)';
    return 'var(--neon-red)'; // VOLATILE, CRITICAL
  };

  const getCertaintyColor = (cert) => {
    if (!cert) return 'var(--text-secondary)';
    if (cert === 'STABLE' || cert === 'ALIGNED' || cert === 'CONFIDENT') return 'var(--neon-green)';
    if (cert === 'DEBATED') return 'var(--neon-orange)';
    return 'var(--neon-red)'; // DIVERGENT, VOLATILE
  };

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    // Percentages for holographic gradient glare
    const mouseXPercent = (x / box.width) * 100;
    const mouseYPercent = (y / box.height) * 100;
    
    // Tilt angle (max 4 degrees for subtle, premium spatial response)
    const maxTilt = 2;
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
  let cardClass = "panel-card";
  if (dissent) cardClass += " dissent-active";
  if (isHighlighted) cardClass += " priority-focus";
  else if (anyHighlighted) cardClass += " focus-dimmed";

  const activeColor = dissent ? 'var(--neon-orange)' : color;

  return (
    <div 
      ref={cardRef}
      className={cardClass} 
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ 
        borderLeft: `4px solid ${activeColor}`, 
        minHeight: '220px',
        transformStyle: 'preserve-3d',
        willChange: 'transform, box-shadow',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translate3d(0, 0, ${isHovered ? hoverZ : '0px'})`,
        '--theme-color': activeColor,
        boxShadow: isHovered 
          ? `0 20px 45px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)` 
          : `0 10px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.03)`,
        ...style
      }}
    >
      {/* Holographic dynamic glare overlay */}
      <div 
        className="holo-glare" 
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.03) 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }} 
      />

      <div className="panel-header" style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
        <div className="panel-title-wrapper">
          {Icon && <Icon className="panel-icon" style={{ color: activeColor }} />}
          <div>
            <h3 className="panel-title" style={{ color: dissent ? 'var(--neon-orange)' : 'var(--text-primary)' }}>{title}</h3>
            <div className="panel-role">{role}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {dissent && (
            <div className="dissent-badge-glow">
              TACTICAL DISSENT
            </div>
          )}
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: activeColor,
            display: 'inline-block'
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
            {dissent ? 'DEBATING' : status}
          </span>
        </div>
      </div>

      <div className="agent-body" style={{ flexGrow: 1, transform: 'translateZ(15px)' }}>
        <div style={{ width: '100%' }}>
          {dissent && (
            <div className="dissent-warning-strip">
              ⚠️ TACTICAL DISSENT REGISTERED: COUNTER-ARGUMENT IN PROGRESS
            </div>
          )}
          <p className="typing-text" style={{ fontStyle: role.includes('narrator') ? 'italic' : 'normal', color: role.includes('narrator') ? '#e5e7eb' : '#f3f4f6' }}>
            {displayText}
          </p>
        </div>
      </div>

      {/* Confidence Indicators & Reasoning Stability Meters */}
      {confidence !== null && (
        <div className="confidence-container" style={{ animation: 'fadeIn 0.5s', transform: 'translateZ(18px)' }}>
          <div className="confidence-meta">
            <span>CONFIDENCE: <strong style={{ color: activeColor }}>{confidence}%</strong></span>
            <span>STABILITY: <strong style={{ color: getStabilityColor(stability) }}>{stability}</strong></span>
          </div>
          <div className="confidence-bar-bg">
            <div 
              className="confidence-bar-fill" 
              style={{ 
                width: `${confidence}%`, 
                backgroundColor: activeColor
              }} 
            />
          </div>
          <div className="confidence-meta" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            <span>CERTAINTY: <strong style={{ color: getCertaintyColor(certainty) }}>{certainty}</strong></span>
            <span>REF_VAR_ACTIVE</span>
          </div>
        </div>
      )}

      {/* Technical reference number */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.55rem',
        color: 'var(--text-muted)',
        transform: 'translateZ(10px)'
      }}>
        {confidence !== null ? `MTR_STABILITY_${stability}` : 'SYS_REF_2.0'}
      </div>
    </div>
  );
}

