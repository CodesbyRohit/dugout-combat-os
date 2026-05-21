import React from 'react';
import SpatialCard from './SpatialCard';

export default function EventTimeline({ timeline, onReplayEvent, activeReplayOver }) {
  // Severity colors
  const getBadgeStyle = (type, severity) => {
    switch (type) {
      case 'WICKET':
        return {
          backgroundColor: 'rgba(255, 42, 95, 0.15)',
          color: 'var(--neon-red)',
          border: '1px solid rgba(255, 42, 95, 0.4)'
        };
      case 'MOMENTUM_SHIFT':
        return {
          backgroundColor: 'rgba(0, 255, 102, 0.15)',
          color: 'var(--neon-green)',
          border: '1px solid rgba(0, 255, 102, 0.4)'
        };
      case 'CHAOS':
      case 'NO_BALL':
        return {
          backgroundColor: 'rgba(255, 170, 0, 0.15)',
          color: 'var(--neon-orange)',
          border: '1px solid rgba(255, 170, 0, 0.4)'
        };
      default:
        return {
          backgroundColor: 'rgba(0, 229, 255, 0.15)',
          color: 'var(--neon-cyan)',
          border: '1px solid rgba(0, 229, 255, 0.4)'
        };
    }
  };

  return (
    <SpatialCard 
      className="timeline-card" 
      themeColor="var(--neon-cyan)" 
      hoverZ="8px"
      maxTilt={2}
      style={{ flexGrow: 1 }}
    >
      <div className="panel-header">
        <div className="panel-title-wrapper">
          <h3 className="panel-title">War Room Log</h3>
          <div className="panel-role">Shared Agent memory & replay coordinates</div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          🔍 Click event to Replay AI Memory
        </span>
      </div>

      <div className="timeline-list">
        {timeline.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            fontSize: '0.9rem'
          }}>
            Waiting for match event signals...
          </div>
        ) : (
          timeline.map((event, idx) => {
            const isReplaying = activeReplayOver === event.over;
            return (
              <div 
                key={idx} 
                className={`timeline-item timeline-item-interactive ${isReplaying ? 'timeline-item-active' : ''}`}
                onClick={() => onReplayEvent && onReplayEvent(event.over)}
                title="Click to freeze and replay AI thoughts at this over"
              >
                <span className="timeline-time">Over {event.over.toFixed(1)}</span>
                <span 
                  className="timeline-tag" 
                  style={getBadgeStyle(event.type, event.severity)}
                >
                  {event.type}
                </span>
                <div className="timeline-desc">
                  <strong style={{ color: '#fff', marginRight: '0.5rem' }}>{event.title}</strong>
                  <span>{event.description}</span>
                  <span style={{ 
                    color: 'var(--text-muted)', 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.75rem',
                    marginLeft: '0.75rem' 
                  }}>
                    [{event.score}]
                  </span>
                </div>
                {isReplaying && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: 'var(--neon-cyan)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    animation: 'blink 0.8s infinite'
                  }}>
                    ● replaying
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </SpatialCard>
  );
}
