import React, { useState } from 'react';

export default function MatchTabs() {
  const [activeTab, setActiveTab] = useState('live');

  const tabs = [
    { id: 'live', label: 'Live Simulation 2026' },
    { id: 'context', label: 'Match Context' },
    { id: 'agents', label: 'Agent Analysis' },
    { id: 'telemetry', label: 'Telemetry' }
  ];

  return (
    <div className="mode-switcher-container" style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`mode-switch-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          style={{ cursor: 'pointer' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
