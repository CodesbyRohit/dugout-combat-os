import React from 'react';

export default function MomentumPulse({ pressureIndex, momentumState }) {
  // Determine color and pulse class based on state
  let pulseClass = 'pulse-green';
  let badgeStyle = {
    background: 'rgba(0, 255, 102, 0.1)',
    color: 'var(--neon-green)',
    border: '1px solid rgba(0, 255, 102, 0.3)'
  };
  let circleStyle = {
    borderColor: 'var(--neon-green)'
  };

  switch (momentumState) {
    case 'Clutch Moment':
      pulseClass = 'pulse-red';
      badgeStyle = {
        background: 'rgba(255, 42, 95, 0.15)',
        color: 'var(--neon-red)',
        border: '1px solid rgba(255, 42, 95, 0.4)'
      };
      circleStyle = {
        borderColor: 'var(--neon-red)',
        background: 'rgba(255, 42, 95, 0.05)'
      };
      break;

    case 'Collapse Imminent':
    case 'Chaos':
      pulseClass = 'pulse-orange';
      badgeStyle = {
        background: 'rgba(255, 170, 0, 0.15)',
        color: 'var(--neon-orange)',
        border: '1px solid rgba(255, 170, 0, 0.4)'
      };
      circleStyle = {
        borderColor: 'var(--neon-orange)',
        background: 'rgba(255, 170, 0, 0.05)'
      };
      break;

    case 'Dominant Control':
      pulseClass = 'pulse-cyan';
      badgeStyle = {
        background: 'rgba(0, 229, 255, 0.15)',
        color: 'var(--neon-cyan)',
        border: '1px solid rgba(0, 229, 255, 0.4)'
      };
      circleStyle = {
        borderColor: 'var(--neon-cyan)',
        background: 'rgba(0, 229, 255, 0.05)'
      };
      break;

    case 'Building Pressure':
      pulseClass = 'pulse-orange';
      badgeStyle = {
        background: 'rgba(255, 170, 0, 0.1)',
        color: 'var(--neon-orange)',
        border: '1px solid rgba(255, 170, 0, 0.2)'
      };
      circleStyle = {
        borderColor: 'var(--neon-orange)',
        background: 'rgba(255, 170, 0, 0.02)'
      };
      break;

    default:
      pulseClass = 'pulse-green';
      badgeStyle = {
        background: 'rgba(0, 255, 102, 0.1)',
        color: 'var(--neon-green)',
        border: '1px solid rgba(0, 255, 102, 0.2)'
      };
      circleStyle = {
        borderColor: 'var(--neon-green)',
        background: 'rgba(0, 255, 102, 0.02)'
      };
  }

  return (
    <div className="momentum-wrapper">
      <div className={`pulse-circle ${pulseClass}`} style={{ ...circleStyle, borderWidth: '1.5px' }}>
        <div className="pulse-label">Pressure Index</div>
        <div className="pulse-value">{pressureIndex}%</div>
        
        {/* Concentric thin circles */}
        <div style={{
          position: 'absolute',
          width: '112%',
          height: '112%',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          width: '124%',
          height: '124%',
          border: '1px dashed rgba(255, 255, 255, 0.03)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
      </div>

      <div className="momentum-state-badge" style={badgeStyle}>
        {momentumState}
      </div>
    </div>
  );
}
