import { SCENARIOS, DISAGREEMENTS } from "./scenarios.js";

// Heuristic fallback text generator for client-side offline mode
export function generateFallbackInsights(scenarioId, ball, prob, pressure, state) {
  if (scenarioId === "ind_vs_pak_2022") {
    const database = {
      "17.3": {
        narrator: `CRACK! Virat Kohli stands tall and punches Afridi through extra cover. A shot of pure class that sends a jolt through the crowd!`
      },
      "17.5": {
        analyst: `Excellent running keeps the pressure on Afridi. Required: 36 off 13. Win probability stable at 34%.`,
        scout: `Excellent placement by Kohli. They are pushing the fielders in the deep. Bowlers must avoid giving easy doubles.`,
        narrator: `Sprinting like their lives depend on it. Two runs completed. The energy is shifting.`
      },
      "18.1": {
        analyst: `Haris Rauf enters the attack. 30 off 11. Pressure Index climbs to 82. India's probability slides to 38%.`,
        scout: `Rauf's pace is 145kph+. Scout advises playing him straight down the ground; cross-bat shots carry high risk.`,
        narrator: `Haris Rauf. Raw pace, staring down Hardik Pandya. The penultimate over begins with a heavy thud.`
      },
      "18.2": {
        analyst: `29 off 10. Required runs per ball is 2.9. Win probability: 34%.`,
        scout: `Rauf is hitting the deck hard. Kohli is adjusting his stance. Scout recommends targeting the straight boundary.`,
        narrator: `A single to long-on. A moment of calculation. The tension is thick enough to cut with a knife.`
      },
      "18.6": {
        analyst: `ANOTHER SIX! Momentum swing complete! 16 needed off 6. Win probability climbs to 55%. Rauf is stunned.`,
        scout: `Kohli used Rauf's pace to flick it over fine leg. Rauf is visibly shaken. Nawaz will face immense pressure in the 20th.`,
        narrator: `HE'S DONE IT AGAIN! Kohli flicks it over fine leg for six! The MCG is a volcano of emotions!`
      },
      "19.2": {
        analyst: `15 off 4. Win probability: 28%. Karthik gets a single. Kohli returns to strike.`,
        scout: `Nawaz is bowling spinners. Kohli should look to target the short leg-side boundary.`,
        narrator: `A frantic sweep gets a single. The champion Kohli returns to face the music. 4 balls remain.`
      },
      "19.3": {
        analyst: `13 off 3. Excellent running. Win probability: 36%. The pressure is at absolute peak.`,
        scout: `Double taken. Slower ball expected. Kohli must prepare to clear the front leg.`,
        narrator: `They sprint back! Two runs. Kohli's eyes are locked on Nawaz. The crowd is screaming.`
      },
      "19.6": {
        analyst: `INDIA WINS! Win probability: 100%. One of the greatest chases in T20 history is complete.`,
        scout: `Ashwin chipped it over mid-off. A tactical masterpiece in finishing. Kohli ends on 82* in a legendary knock.`,
        narrator: `THE CHAMPIONS OF THE CHASE! Ashwin chips it, runs the single, and India pulls off the miracle of Melbourne!`
      }
    };

    const key = ball.over.toFixed(1);
    if (database[key]) return database[key];
    
    // Check if it's the wide/bye/stumping sequence of 19.4 / 19.5
    if (ball.event === "wide" && ball.over > 19.3 && ball.over < 19.5) {
      return {
        analyst: `Wide ball! India gets 1 extra run. Required: 6 off 3. Win probability: 75%.`,
        scout: `Nawaz is struggling to control his line under intense pressure. Free hit continues.`,
        narrator: `Nawaz sprays it wide! The pressure is crushing the bowler, and the crowd is deafening.`
      };
    }
    if (ball.event === "byes" && ball.over > 19.3 && ball.over < 19.5) {
      return {
        analyst: `3 Byes scored off the free hit! Stumps hit but it's a free hit! Required: 3 off 2. Win probability: 82%.`,
        scout: `Excellent awareness by Kohli to run on the deflection. Pakistan's fielders were slow to react.`,
        narrator: `Kohli is bowled, but it's a free hit! The ball deflecting off stumps allows them to steal three crucial byes!`
      };
    }
    if (ball.event === "wide" && ball.over > 19.4 && ball.over < 19.6) {
      return {
        analyst: `WIDE! Nawaz sprays it down leg! Scores are tied! 1 needed off 1 ball. Win probability rises to 80%.`,
        scout: `Ashwin didn't budge. Excellent leave. Now the field will be drawn in. A single field placement mistake will cost Pakistan.`,
        narrator: `Ashwin leaves it! Nawaz bowls a wide down leg. Scores are level, and the MCG stands in disbelief!`
      };
    }
  }

  if (scenarioId === "mi_vs_csk_2019") {
    const database = {
      "19.1": {
        analyst: `CSK requires 7 off 5. Malinga starts the final over. Shane Watson batting on 80. Win probability: CSK 65%.`,
        scout: `Malinga is targeting the yorker. Watson is deep in the crease. Scout advises fielders at deep square leg to be alert.`,
        narrator: `The grand master Lasith Malinga. The final over of the IPL. Shane Watson stands in his path.`
      },
      "19.2": {
        analyst: `6 off 4 needed. Scorecard: 144/5. Win probability: CSK 70%. Pressure index: 80.`,
        scout: `Watson drives to long-on. Malinga is varying his pace. Jadeja on strike must look for the gap.`,
        narrator: `A single. Watson jogs to the non-striker's end, exhausted but resolute. The championship is four balls away.`
      },
      "19.4": {
        analyst: `3 off 2. Jadeja singles. Watson returns to strike. Win probability: CSK 82%.`,
        scout: `Watson on 80. Malinga is likely to bowl a slower ball or yorker. Watson must clear his front leg to swing.`,
        narrator: `A single to cover. Watson takes strike. The crowd in Hyderabad is screaming. One hit to win.`
      },
      "19.6": {
        analyst: `WICKET! LBW! MUMBAI INDIANS WIN BY 1 RUN! Malinga strikes on the final ball. Win probability: MI 100%.`,
        scout: `Malinga's slower ball yorker was perfection. Shardul Thakur was trapped in front. Rohit Sharma's tactics succeed.`,
        narrator: `MUMBAI INDIANS ARE CHAMPIONS! Malinga traps Thakur LBW with a beautiful slower yorker! Joy and despair collide in Hyderabad!`
      }
    };

    const key = ball.over.toFixed(1);
    if (database[key]) return database[key];
  }

  // Generic fallback if not one of the preloaded scenarios or if it goes past bounds
  return {
    analyst: `Score is ${ball.score} after ${ball.over} overs. Target: ${ball.target}. Win probability calculated at ${prob}%.`,
    scout: `Current required rate is ${( (ball.target - ball.runs) / (ball.ballsRemaining || 6) * 6).toFixed(2)}. Recommend focusing on bowling matchups.`,
    narrator: `A crucial moment in the match. The crowd is tense as the bowler prepares for the next delivery.`
  };
}

export function processBallEvent(ball, scenarioId, matchHistory = [], sharedMemory = { timeline: [] }) {
  const currentScenario = SCENARIOS[scenarioId];
  if (!currentScenario) return null;

  // 1. Calculate Scoreboard Variables
  const target = currentScenario.target;
  const runs = ball.runs;
  const wickets = ball.wickets;
  const score = ball.score;
  const over = ball.over;

  const overNumber = Math.floor(over);
  const ballInOver = Math.round((over - overNumber) * 10);
  const totalBallsBowled = overNumber * 6 + ballInOver;
  const ballsRemaining = Math.max(0, 120 - totalBallsBowled);
  
  const currentScoreRuns = parseInt(score.split("/")[0]);
  const runsNeeded = Math.max(0, target - currentScoreRuns);

  // 2. Win Probability Heuristic (with scenario overrides for hyper-realism)
  let winProbability = 50;
  if (scenarioId === "ind_vs_pak_2022") {
    const probCurve = {
      "17.1": 21, "17.2": 19, "17.3": 26, "17.4": 32, "17.5": 34, "17.6": 41,
      "18.1": 38, "18.2": 34, "18.3": 24, "18.4": 15, "18.5": 38, "18.6": 55,
      "19.1": 32, "19.2": 28, "19.3": 36, "19.4": 72, "19.5": 80, "19.6": 100
    };
    const key = over.toFixed(1);
    winProbability = probCurve[key] !== undefined ? probCurve[key] : 50;

    if (ball.event === "wide") winProbability = over > 19.4 ? 80 : 75;
    if (ball.event === "byes") winProbability = 82;
    if (ball.event === "wicket" && over > 19.4) winProbability = 60;
  } else if (scenarioId === "mi_vs_csk_2019") {
    const probCurve = {
      "19.1": 65, "19.2": 70, "19.3": 78, "19.4": 82, "19.5": 50, "19.6": 0
    };
    const key = over.toFixed(1);
    winProbability = probCurve[key] !== undefined ? probCurve[key] : 50;
  } else {
    if (runsNeeded <= 0) winProbability = 100;
    else if (ballsRemaining <= 0 || wickets >= 10) winProbability = 0;
    else {
      const requiredRR = (runsNeeded / ballsRemaining) * 6;
      const wicketsLeft = 10 - wickets;
      if (requiredRR > 36) winProbability = 1;
      else {
        const rDiff = requiredRR - 8;
        winProbability = 50 - (rDiff * 4) + (wicketsLeft - 5) * 8;
        winProbability = Math.max(1, Math.min(99, Math.round(winProbability)));
      }
    }
  }

  // 3. Pressure Index Heuristic
  let pressureIndex = 50;
  if (ballsRemaining > 0) {
    const requiredRR = (runsNeeded / ballsRemaining) * 6;
    const wicketsLeft = 10 - wickets;
    let basePressure = (requiredRR * 5) + (10 - wicketsLeft) * 5 + (30 / Math.max(1, ballsRemaining)) * 10;
    pressureIndex = Math.min(98, Math.max(10, Math.round(basePressure)));
  } else {
    pressureIndex = 100;
  }

  if (over >= 19.0) {
    pressureIndex = Math.max(85, pressureIndex);
  }
  if (ball.event === "wicket") {
    pressureIndex = Math.min(99, pressureIndex + 15);
  }
  if (ball.event === "dot") {
    pressureIndex = Math.min(99, pressureIndex + 5);
  }
  if (ball.event === "six" || ball.event === "boundary" || ball.event === "six_noball") {
    pressureIndex = Math.max(30, pressureIndex - 10);
  }

  // 4. Momentum State Selection
  let momentumState = "Calm";
  if (pressureIndex >= 90) {
    momentumState = "Clutch Moment";
  } else if (ball.event === "wicket") {
    momentumState = wickets >= 6 ? "Collapse Imminent" : "Chaos";
  } else if (ball.event === "six" || ball.event === "boundary" || ball.event === "six_noball") {
    momentumState = "Dominant Control";
  } else if (pressureIndex >= 70) {
    momentumState = "Building Pressure";
  } else {
    momentumState = "Calm";
  }

  // 5. Event Detection Engine
  let criticalEvent = null;
  if (ball.event === "wicket") {
    criticalEvent = {
      type: "WICKET",
      title: "Game-Defining Wicket",
      description: `${ball.batsman} is out! Caught/Bowled off ${ball.bowler}. Win probability swings.`,
      severity: "high"
    };
  } else if (ball.event === "six" || ball.event === "six_noball") {
    criticalEvent = {
      type: "MOMENTUM_SHIFT",
      title: "Clutch Maximum!",
      description: `${ball.batsman} smashes a colossal six off ${ball.bowler}! Shift in belief.`,
      severity: "medium"
    };
  } else if (ball.event === "byes" && ball.runs >= 3) {
    criticalEvent = {
      type: "CHAOS",
      title: "Unbelievable Byes!",
      description: "Bowled off free hit, but they steal 3 runs! Tactical confusion on field.",
      severity: "high"
    };
  } else if (ball.event === "six_noball") {
    criticalEvent = {
      type: "NO_BALL",
      title: "High Drama: No-Ball Six!",
      description: "Nawaz bowls a height no-ball, Kohli dispatches it for six! Free hit awarded.",
      severity: "high"
    };
  } else if (ball.event === "dot" && pressureIndex > 85) {
    criticalEvent = {
      type: "PRESSURE_SPIKE",
      title: "Vise Tightens",
      description: `Dot ball. ${ball.batsman} is unable to rotate strike. RRR rises.`,
      severity: "medium"
    };
  }

  if (criticalEvent) {
    // Avoid duplicate timeline items by matching over and type
    const exists = sharedMemory.timeline.some(t => Math.abs(t.over - ball.over) < 0.01 && t.type === criticalEvent.type);
    if (!exists) {
      sharedMemory.timeline.unshift({
        over: ball.over,
        score: ball.score,
        ...criticalEvent
      });
    }
  }

  // 6. Run Coordinated Agents (Fallback offline mode)
  let analystInsight = "";
  let scoutInsight = "";
  let narratorInsight = "";

  // Dynamic Confidence Values
  const ballConfidence = ball.confidence || {
    analyst: { value: Math.round(85 - (pressureIndex / 4)), stability: pressureIndex > 80 ? "VOLATILE" : "HIGH", certainty: "CONFIDENT" },
    scout: { value: Math.round(80 - (pressureIndex / 5)), stability: "STABLE", certainty: "ALIGNED" }
  };

  const key = over.toFixed(1);
  const scenarioDisagreements = DISAGREEMENTS[scenarioId];
  if (scenarioDisagreements && scenarioDisagreements[key]) {
    analystInsight = scenarioDisagreements[key].analyst;
    scoutInsight = scenarioDisagreements[key].scout;
  } else {
    const fallback = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState);
    analystInsight = fallback.analyst;
    scoutInsight = fallback.scout;
  }
  
  // Narrator fallback
  const fallback = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState);
  narratorInsight = fallback.narrator;

  // Calculate if a tactical disagreement/dissent is occurring on this ball
  const disagreementActive = !!(DISAGREEMENTS[scenarioId] && DISAGREEMENTS[scenarioId][key]) || 
    (scoutInsight && /disagree|dissent|contrary|challenge|dissenting|models fail|incorrect|objection/i.test(scoutInsight));

  // Build the complete history object
  const currentHistoryItem = {
    index: matchHistory.length,
    over: ball.over,
    score: ball.score,
    runs: currentScoreRuns,
    wickets: wickets,
    winProbability: winProbability,
    pressureIndex: pressureIndex,
    event: ball.event,
    batsman: ball.batsman,
    bowler: ball.bowler,
    commentary: ball.commentary,
    agents: {
      analyst: {
        text: analystInsight,
        confidence: ballConfidence.analyst.value,
        stability: ballConfidence.analyst.stability,
        certainty: ballConfidence.analyst.certainty
      },
      scout: {
        text: scoutInsight,
        confidence: ballConfidence.scout.value,
        stability: ballConfidence.scout.stability,
        certainty: ballConfidence.scout.certainty,
        dissent: disagreementActive
      },
      narrator: {
        text: narratorInsight
      }
    }
  };

  // Only push if not already in history (by matching over & event type)
  const isDuplicateHistory = matchHistory.some(h => Math.abs(h.over - ball.over) < 0.01 && h.event === ball.event);
  if (!isDuplicateHistory) {
    matchHistory.push(currentHistoryItem);
  }

  // 7. Package and return full state update
  return {
    type: "MATCH_UPDATE",
    scenarioId: scenarioId,
    shake: !!ball.shake, // Choreographed UI shake triggers on wickets/boundaries
    matchInfo: {
      name: currentScenario.name,
      venue: currentScenario.venue,
      battingTeam: currentScenario.battingTeam,
      bowlingTeam: currentScenario.bowlingTeam,
      target: target
    },
    scoreboard: {
      over: ball.over,
      score: score,
      wickets: wickets,
      target: target,
      batsman: ball.batsman,
      bowler: ball.bowler,
      runsNeeded: runsNeeded,
      ballsRemaining: ballsRemaining,
      requiredRR: ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : "0.00",
      lastBallEvent: ball.event,
      lastBallCommentary: ball.commentary
    },
    telemetry: {
      winProbability: winProbability,
      pressureIndex: pressureIndex,
      momentumState: momentumState,
      disagreementActive: disagreementActive
    },
    agents: currentHistoryItem.agents,
    criticalEvent: criticalEvent,
    timeline: sharedMemory.timeline,
    history: matchHistory
  };
}
