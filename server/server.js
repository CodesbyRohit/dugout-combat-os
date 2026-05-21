import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { SCENARIOS, DISAGREEMENTS } from "./scenarios.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

// Global settings
let activeApiKey = process.env.GEMINI_API_KEY || "";

// Simulation State
let currentScenario = null;
let currentScenarioId = "";
let currentBallIndex = -1;
let simulationInterval = null;
let simulationSpeed = 3000; // ms per ball
let matchHistory = [];
let sharedMemory = {
  timeline: [],
  analystLast: "",
  scoutLast: "",
  narratorLast: ""
};

// Heuristic fallback text generator for when there is no API key (extremely realistic)
function generateFallbackInsights(scenarioId, ball, prob, pressure, state) {
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

// Function to call the Gemini API via standard HTTP request
async function callGeminiAgent(apiKey, agentRole, systemPrompt, userMessage) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\nContext and match details:\n${userMessage}\n\nGenerate your response (max 2 sentences):` }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error for ${agentRole}:`, errorText);
      return null;
    }

    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output ? output.trim() : null;
  } catch (error) {
    console.error(`Network error calling Gemini API for ${agentRole}:`, error);
    return null;
  }
}

// Core function to process each ball, update state, run agents, and broadcast
async function processBallEvent(ball, scenarioId) {
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
    sharedMemory.timeline.unshift({
      over: ball.over,
      score: ball.score,
      ...criticalEvent
    });
  }

  // 6. Run Coordinated Agents (Gemini vs Fallback)
  let analystInsight = "";
  let scoutInsight = "";
  let narratorInsight = "";

  // Dynamic Confidence Values
  const ballConfidence = ball.confidence || {
    analyst: { value: Math.round(85 - (pressureIndex / 4)), stability: pressureIndex > 80 ? "VOLATILE" : "HIGH", certainty: "CONFIDENT" },
    scout: { value: Math.round(80 - (pressureIndex / 5)), stability: "STABLE", certainty: "ALIGNED" }
  };

  if (activeApiKey) {
    console.log("Calling Gemini API for live match experience...");
    const sharedText = `
      Match: ${currentScenario.name} at ${currentScenario.venue}
      Batting Team: ${currentScenario.battingTeam}, Bowling Team: ${currentScenario.bowlingTeam}
      Score: ${score}, Overs: ${over}, Batsman: ${ball.batsman}, Bowler: ${ball.bowler}
      Last ball event: ${ball.event} (runs scored: ${runs})
      Raw Ball Commentary: ${ball.commentary}
      Current Win Probability: ${winProbability}% (chasing team)
      Current Pressure Index: ${pressureIndex}/100
      Momentum State: ${momentumState}
    `;

    const analystSystemPrompt = `You are the ANALYST agent for DUGOUT, a professional sports analytics engine.
Role: Real-time cricket intelligence.
Tone: Concise, sharp, TV-broadcast sports-analytics style. Never be robotic. Do not explain the math, explain the meaning.
Task: Explain the statistical changes and win probability shift. Make it punchy. Max 2 sentences.`;
    
    analystInsight = await callGeminiAgent(activeApiKey, "Analyst", analystSystemPrompt, sharedText);
    if (analystInsight) {
      sharedMemory.analystLast = analystInsight;
    } else {
      const key = over.toFixed(1);
      const scenarioDisagreements = DISAGREEMENTS[scenarioId];
      if (scenarioDisagreements && scenarioDisagreements[key]) {
        analystInsight = scenarioDisagreements[key].analyst;
      } else {
        analystInsight = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState).analyst;
      }
    }

    const scoutSystemPrompt = `You are the SCOUT agent for DUGOUT, a franchise dugout strategist.
Role: Tactical recommendation engine.
Tone: Tactical, coaching-oriented, predictive, and concise.
Task: Recommend matchups, bowling strategies, or fielding changes based on the score and the Analyst's insight: "${analystInsight}". Challenge or expand on the Analyst's statistical viewpoint if you see a tactical matchup opportunity. Max 2 sentences.`;

    scoutInsight = await callGeminiAgent(activeApiKey, "Scout", scoutSystemPrompt, sharedText);
    if (scoutInsight) {
      sharedMemory.scoutLast = scoutInsight;
    } else {
      const key = over.toFixed(1);
      const scenarioDisagreements = DISAGREEMENTS[scenarioId];
      if (scenarioDisagreements && scenarioDisagreements[key]) {
        scoutInsight = scenarioDisagreements[key].scout;
      } else {
        scoutInsight = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState).scout;
      }
    }

    const narratorSystemPrompt = `You are the NARRATOR agent for DUGOUT.
Role: Cinematic storytelling engine.
Tone: Dramatic, cinematic, emotionally-charged, Netflix sports documentary style.
Task: Craft a dramatic voiceover/commentary on the emotional gravity of this ball. Interconnect with Analyst ("${analystInsight}") and Scout ("${scoutInsight}"). Max 2 sentences.`;

    narratorInsight = await callGeminiAgent(activeApiKey, "Narrator", narratorSystemPrompt, sharedText);
    if (narratorInsight) {
      sharedMemory.narratorLast = narratorInsight;
    } else {
      narratorInsight = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState).narrator;
    }

  } else {
    // Heuristic offline mode with explicit debate/disagreement mapping
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
  }

  // Calculate if a tactical disagreement/dissent is occurring on this ball
  const key = over.toFixed(1);
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

  matchHistory.push(currentHistoryItem);

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

// WebSocket broadcast helper
function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client connected to DUGOUT Platform WebSocket");
  
  ws.send(JSON.stringify({
    type: "SYSTEM_READY",
    hasApiKey: !!activeApiKey,
    scenarios: Object.keys(SCENARIOS).map(key => ({
      id: key,
      name: SCENARIOS[key].name,
      venue: SCENARIOS[key].venue
    }))
  }));

  ws.on("message", async (messageStr) => {
    try {
      const message = JSON.parse(messageStr);
      console.log("Received action:", message.type);

      switch (message.type) {
        case "SET_API_KEY":
          activeApiKey = message.apiKey;
          console.log("Gemini API key updated.");
          ws.send(JSON.stringify({ type: "API_KEY_CONFIRMED", hasApiKey: !!activeApiKey }));
          break;

        case "START_SIMULATION":
          const scenarioId = message.scenarioId;
          if (!SCENARIOS[scenarioId]) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Scenario not found" }));
            break;
          }

          // Reset Simulation state
          clearInterval(simulationInterval);
          currentScenarioId = scenarioId;
          currentScenario = SCENARIOS[scenarioId];
          currentBallIndex = 0;
          matchHistory = [];
          sharedMemory = {
            timeline: [],
            analystLast: "",
            scoutLast: "",
            narratorLast: ""
          };

          console.log(`Starting simulation for scenario: ${currentScenario.name}`);
          
          const initialPayload = await processBallEvent(currentScenario.balls[0], currentScenarioId);
          broadcast(initialPayload);

          simulationInterval = setInterval(async () => {
            currentBallIndex++;
            if (currentBallIndex >= currentScenario.balls.length) {
              clearInterval(simulationInterval);
              console.log("Simulation complete.");
              broadcast({ type: "SIMULATION_COMPLETE" });
              return;
            }

            const ballData = currentScenario.balls[currentBallIndex];
            const updatePayload = await processBallEvent(ballData, currentScenarioId);
            broadcast(updatePayload);

          }, simulationSpeed);

          break;

        case "JUMP_TO_BALL": {
          const sId = message.scenarioId;
          const targetOver = parseFloat(message.over);
          if (!SCENARIOS[sId]) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Scenario not found" }));
            break;
          }

          // Reset and pre-populate simulation history up to target over
          clearInterval(simulationInterval);
          currentScenarioId = sId;
          currentScenario = SCENARIOS[sId];
          matchHistory = [];
          sharedMemory = {
            timeline: [],
            analystLast: "",
            scoutLast: "",
            narratorLast: ""
          };

          console.log(`Jumping to over ${targetOver} in scenario: ${currentScenario.name}`);
          
          let targetIndex = -1;
          for (let i = 0; i < currentScenario.balls.length; i++) {
            const ballData = currentScenario.balls[i];
            
            // Match over and event
            const isMatch = Math.abs(ballData.over - targetOver) < 0.01 && 
                            (!message.event || ballData.event === message.event);
            
            if (isMatch) {
              targetIndex = i;
              break;
            } else {
              // Pre-process balls before the target index
              await processBallEvent(ballData, currentScenarioId);
            }
          }

          if (targetIndex >= 0) {
            currentBallIndex = targetIndex;
            const ballData = currentScenario.balls[targetIndex];
            const updatePayload = await processBallEvent(ballData, currentScenarioId);
            
            // Add special demoMoment metadata
            updatePayload.isDemoMoment = true;
            updatePayload.demoTriggerId = message.demoTriggerId;

            broadcast(updatePayload);
            broadcast({ type: "SIMULATION_PAUSED" });
          } else {
            ws.send(JSON.stringify({ type: "ERROR", message: "Ball not found in scenario" }));
          }
          break;
        }

        case "PAUSE_SIMULATION":
          clearInterval(simulationInterval);
          console.log("Simulation paused.");
          broadcast({ type: "SIMULATION_PAUSED" });
          break;

        case "SET_SPEED":
          simulationSpeed = message.speed;
          console.log(`Speed updated to ${simulationSpeed}ms`);
          if (simulationInterval && currentScenario && currentBallIndex < currentScenario.balls.length) {
            clearInterval(simulationInterval);
            simulationInterval = setInterval(async () => {
              currentBallIndex++;
              if (currentBallIndex >= currentScenario.balls.length) {
                clearInterval(simulationInterval);
                broadcast({ type: "SIMULATION_COMPLETE" });
                return;
              }
              const ballData = currentScenario.balls[currentBallIndex];
              const updatePayload = await processBallEvent(ballData, currentScenarioId);
              broadcast(updatePayload);
            }, simulationSpeed);
          }
          break;

        case "RESET_SIMULATION":
          clearInterval(simulationInterval);
          currentBallIndex = -1;
          matchHistory = [];
          sharedMemory = {
            timeline: [],
            analystLast: "",
            scoutLast: "",
            narratorLast: ""
          };
          console.log("Simulation reset.");
          broadcast({ type: "SIMULATION_RESET" });
          break;

        default:
          console.warn("Unknown message type:", message.type);
      }
    } catch (err) {
      console.error("Error processing websocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`DUGOUT Server running on http://localhost:${PORT}`);
});
