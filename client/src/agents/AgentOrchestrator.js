export class AgentOrchestrator {
  constructor() {
    this.matchId = "2026_ipl_mi_rr";
    this.matchDate = "2026-05-24";
  }

  getAgentResponses(scoreState) {
    return {
      analyst: {
        win_prob_mi: scoreState.runs > 100 ? 0.65 : 0.45,
        win_prob_rr: scoreState.runs > 100 ? 0.35 : 0.55,
        confidence: 0.8,
        reasoning: "Dynamic chase profile mapped on Wankhede bounce characteristics.",
        momentum_shift: "positive"
      },
      scout: {
        field_rating: 0.75,
        risk_level: "stable",
        matchup_advantage: "mi",
        tactical_note: "Bowl hard back-of-a-length to restrict Suryakumar Yadav."
      },
      narrator: {
        commentary: `IPL 2026 Live: Wankhede is buzzing. Suryakumar Yadav holds the key for MI.`,
        emotional_beat: "tense",
        shareability_score: 0.85,
        hashtag_moment: false
      }
    };
  }

  speakAgent(agentName, text, onStart, onEnd) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice profiles matching the specific Pitch & Rate settings
    if (agentName === 'analyst') {
      utterance.pitch = 0.8;
      utterance.rate = 0.9; // Slow, clinical
    } else if (agentName === 'scout') {
      utterance.pitch = 1.2;
      utterance.rate = 1.1; // Assertive, quick
    } else if (agentName === 'narrator') {
      utterance.pitch = 1.0;
      utterance.rate = 1.0; // Natural, dramatic
    }

    if (onStart) {
      utterance.onstart = onStart;
    }
    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }
}

