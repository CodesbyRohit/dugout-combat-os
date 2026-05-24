import React from 'react';

export default function MatchHeader() {
  return (
    <div className="match-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
      <h1 className="brand-logo" style={{ fontSize: '1.8rem', fontWeight: 900 }}>🔴 LIVE MI vs RR - IPL 2026, May 24</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontWeight: 600 }}>
        Probabilistic Simulation (Real-time, May 24, 2026)
      </p>
    </div>
  );
}
