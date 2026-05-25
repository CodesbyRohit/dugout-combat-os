import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { SCENARIOS as STATIC_SCENARIOS, DISAGREEMENTS } from "./scenarios.js";
const SCENARIOS = { ...STATIC_SCENARIOS };
import { LiveMatchEngine } from "./liveEngine.js";
import { CricbuzzAdapter } from "./cricbuzzAdapter.js";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

// Global settings
let activeApiKey = process.env.GEMINI_API_KEY || "";
let activeMode = "live"; // "historical" or "live"

const liveEngine = new LiveMatchEngine();
const cricbuzzAdapter = new CricbuzzAdapter();

// Simulation State
let currentScenario = null;
let currentScenarioId = "";
let currentBallIndex = -1;
let simulationTimeout = null; // Replaced simulationInterval for jitter support
let simulationSpeed = 3000; // ms per ball
let matchHistory = [];
let sharedMemory = {
  timeline: [],
  analystLast: "",
  scoutLast: "",
  narratorLast: ""
};

function parseMatchTitle(title) {
  const parts = title.split(/\s+v\s+/i);
  if (parts.length < 2) return null;
  const part1 = parts[0].trim();
  const part2 = parts[1].trim();

  const isTeam2Batting = part2.includes("*");
  const battingPart = isTeam2Batting ? part2 : part1;
  const bowlingPart = isTeam2Batting ? part1 : part2;

  const extractScore = (text) => {
    const cleanText = text.replace("*", "").trim();
    const scoreMatch = cleanText.match(/(.*?)\s+(\d+(?:\/\d+)?)$/);
    if (scoreMatch) {
      return {
        name: scoreMatch[1].trim(),
        scoreText: scoreMatch[2].trim()
      };
    }
    return { name: cleanText, scoreText: "" };
  };

  const battingInfo = extractScore(battingPart);
  const bowlingInfo = extractScore(bowlingPart);

  let runs = 0;
  let wickets = 0;
  if (battingInfo.scoreText) {
    if (battingInfo.scoreText.includes("/")) {
      const sp = battingInfo.scoreText.split("/");
      runs = parseInt(sp[0]) || 0;
      wickets = parseInt(sp[1]) || 0;
    } else {
      runs = parseInt(battingInfo.scoreText) || 0;
      wickets = 0;
    }
  }
  
  let target = 0;
  if (bowlingInfo.scoreText) {
    let bowlingRuns = 0;
    if (bowlingInfo.scoreText.includes("/")) {
      bowlingRuns = parseInt(bowlingInfo.scoreText.split("/")[0]) || 0;
    } else {
      bowlingRuns = parseInt(bowlingInfo.scoreText) || 0;
    }
    target = bowlingRuns + 1;
  } else {
    target = runs + 50;
  }

  return {
    battingTeam: battingInfo.name,
    bowlingTeam: bowlingInfo.name,
    runs: runs,
    wickets: wickets,
    target: target
  };
}

async function updateLiveScenarios() {
  try {
    const res = await fetch("https://static.cricinfo.com/rss/livescores.xml");
    const xml = await res.text();
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    let index = 0;
    
    // Clear old live matches from SCENARIOS to prevent clutter
    Object.keys(SCENARIOS).forEach(k => {
      if (k.startsWith("live_match_")) delete SCENARIOS[k];
    });

    for (const m of matches) {
      const itemContent = m[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      if (titleMatch) {
        let title = titleMatch[1].trim();
        title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const parsed = parseMatchTitle(title);
        if (parsed) {
          const id = `live_match_${index}`;
          const estimatedOvers = Math.min(19, Math.floor(parsed.runs / 8.0));
          
          SCENARIOS[id] = {
            name: `🔴 LIVE: ${parsed.battingTeam} vs ${parsed.bowlingTeam}`,
            venue: "Live Telemetry Feed (ESPN)",
            battingTeam: parsed.battingTeam,
            bowlingTeam: parsed.bowlingTeam,
            target: parsed.target,
            startingScore: parsed.runs,
            startingWickets: parsed.wickets,
            startingOvers: estimatedOvers,
            balls: []
          };
          index++;
        }
      }
    }
    console.log(`Live scenarios updated: ${index} matches imported from ESPN.`);
  } catch (err) {
    console.error("Failed to fetch live scenarios from ESPN:", err);
  }
}

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

const liveAgentCounters = { analyst: 0, scout: 0, narrator: 0, psychologist: 0 };

const LIVE_INSIGHTS_DATABASE = {
  analyst: {
    highRate: [
      "The required run rate has climbed to {requiredRR} RPO. Chasing team's win probability sits at {winProbability}% due to escalating pressure.",
      "Chasing team must operate at {requiredRR} RPO to secure victory. Analytics models place their current success probability at {winProbability}%.",
      "Statistical trajectory is deteriorating. Win probability dips to {winProbability}% under the weight of a {requiredRR} required run rate."
    ],
    wicketFell: [
      "Wicket fall degrades batting stability. Win probability recalibrated to {winProbability}% with a pressure spike to {pressureIndex}.",
      "A critical breakthrough for the bowling unit. The chasing team drops to {winProbability}% win probability as the batting order is exposed.",
      "The loss of a crucial wicket has restricted the chase strategy. Chasing team holds a {winProbability}% chance of victory under climbing pressure."
    ],
    general: [
      "Current match state shows score at {score} chasing {target}. Required rate is {requiredRR}. Win probability stabilized at {winProbability}%.",
      "Chasing team win probability is tracked at {winProbability}%, with the pressure index holding steady at {pressureIndex}/100.",
      "Telemetry updates: Chasing side is {runsNeeded} runs away from victory. Win probability calculates at {winProbability}%."
    ]
  },
  scout: {
    highRate: [
      "Slight adjustment: Scout recommends targeting {bowler}'s slower off-cutters or seeking boundary opportunities over mid-on.",
      "Aggression coefficient must rise. Scout advises batsmen to target the short boundary and look to clear the front leg.",
      "Field settings indicate deep protection on the leg-side. Scout recommends batsmen punch straight down the ground."
    ],
    wicketFell: [
      "New batsman needs to rotate strike immediately. Scout advises bowler {bowler} to target the top of off-stump to maintain pressure.",
      "Consolidation required. Scout advises playing out the remainder of the over before initiating further boundary attempts.",
      "Wicket cluster risk is high. Scout advises the batsman to establish a solid defense against {bowler}'s moving deliveries."
    ],
    general: [
      "Matchup telemetry: {batsman} vs {bowler}. Scout recommends bowling hard back-of-a-length deliveries to squeeze the batsman.",
      "Defensive field set with deep midwicket and long-off back. Scout recommends hitting the gaps to secure quick doubles.",
      "Bowler {bowler} is testing the pitch. Scout suggests the batsman utilize the pace and play late to third-man."
    ]
  },
  narrator: {
    highRate: [
      "High drama under the floodlights! One delivery here could shift the entire mood of the championship.",
      "A battle of pure nerves. The required rate is climbing, and the crowd is screaming in anticipation.",
      "Absolute tension. Chasing team is running out of time, and the bowler feels the energy of the crowd."
    ],
    wicketFell: [
      "Stunning! The stadium falls into absolute silence as the bails fly. The bowler celebrates a match-defining wicket!",
      "A massive wicket! Crucial breakthrough that alters the narrative completely. The bowling team erupts in joy.",
      "The striker is sent back! Chaos on the field as the chasing team's plans are thrown into disarray."
    ],
    general: [
      "A test of absolute character. {batsman} and {bowler} are locked in a high-stakes duel in the middle.",
      "Every run is a step closer to victory, every dot a tightening of the vise. The drama is building ball by ball.",
      "{batsman} takes a deep breath. {bowler} runs in. The story of this championship is written one ball at a time."
    ]
  }
};

const MI_VS_RR_INSIGHTS = {
  analyst: {
    highRate: [
      "MI is chasing {target} at Wankhede. The required rate of {requiredRR} RPO puts MI's success probability at {winProbability}% in this projected simulation.",
      "With Parag injured and Jaiswal leading RR, our projection model prices MI's chase probability at {winProbability}% against this target.",
      "Statistical curve for Wankhede: Win probability dips to {winProbability}% under the weight of a {requiredRR} required run rate."
    ],
    wicketFell: [
      "Wicket fall shatters MI's middle order. Win probability drops to {winProbability}% with a pressure spike to {pressureIndex}/100.",
      "RR gets a vital breakthrough. Jaiswal's defensive field adjustments successfully restrict MI. Win probability at {winProbability}%.",
      "Loss of {batsman} restricts MI's chase. The models recalculate success to {winProbability}% under rising pressure."
    ],
    general: [
      "Match 69 Live Projection: MI is {score} chasing RR's {target}. Required run rate is {requiredRR}. MI Win Probability: {winProbability}%.",
      "MI win probability tracks at {winProbability}% in this 2026 IPL clash, with the pressure index holding steady at {pressureIndex}/100.",
      "Telemetry checks: Chasing side is {runsNeeded} runs away from victory. Win probability calculates at {winProbability}%."
    ]
  },
  scout: {
    highRate: [
      "Scout recommendation: target Avesh Khan's full-tosses. Pandya and Suryakumar must clear the front leg to utilize Wankhede's short boundaries.",
      "Aggression coefficient must rise. Jaiswal has pulled Sandeep Sharma deep; look to hit straight down the ground.",
      "Field settings indicate deep protection on the leg-side. Scout recommends batsmen punch straight through extra cover."
    ],
    wicketFell: [
      "New batsman needs to consolidate. Scout advises bowler {bowler} to target the top of off-stump to maintain RR's leverage.",
      "Consolidation required. Scout advises playing out the remainder of the over before initiating further boundary attempts.",
      "Wicket cluster risk is high. Scout advises the batsman to establish a solid defense against Boult's swinging deliveries."
    ],
    general: [
      "Matchup telemetry: {batsman} vs {bowler}. Scout recommends bowling hard back-of-a-length deliveries to squeeze the batsman.",
      "Jaiswal has placed a deep square leg. Scout recommends hitting the gaps to secure quick doubles.",
      "Bowler {bowler} is testing Wankhede's pitch. Scout suggests the batsman utilize the pace and play late to third-man."
    ]
  },
  narrator: {
    highRate: [
      "High drama under the Wankhede lights! Jaiswal marshalling his RR troops as Suryakumar prepares to strike.",
      "A battle of pure nerves for the RR playoffs spot. The required rate is climbing, and the Mumbai crowd is screaming.",
      "Absolute tension. MI is running out of time, and the bowler feels the energy of the vocal Wankhede crowd."
    ],
    wicketFell: [
      "Stunning! Wankhede falls into absolute silence as the bails fly. RR celebrates a massive wicket!",
      "A massive wicket! Crucial breakthrough for RR's playoff hopes. Yashasvi Jaiswal erupts in joy.",
      "The striker {batsman} is sent back! Trent Boult delivers the breakthrough and RR's plans are running smooth."
    ],
    general: [
      "A test of absolute character. {batsman} and {bowler} are locked in a high-stakes duel in the middle.",
      "Every run brings MI closer, every dot tightens the vise for RR's playoff berth. The story is building ball by ball.",
      "{batsman} takes a deep breath. {bowler} runs in. The story of this 2026 IPL clash is written one ball at a time."
    ]
  }
};

function generateLiveAgentFallbackInsights(ball, winProbability, pressureIndex, scoreboard, scenarioId) {
  const isWicket = ball.event === "wicket";
  const requiredRR = parseFloat(scoreboard.requiredRR);
  const runsNeeded = scoreboard.runsNeeded;
  const score = scoreboard.score;
  const target = scoreboard.target;
  const batsman = ball.batsman;
  const bowler = ball.bowler;
  const ballsRemaining = scoreboard.ballsRemaining;

  let category = "general";
  if (isWicket) {
    category = "wicketFell";
  } else if (requiredRR > 11.5) {
    category = "highRate";
  }

  const database = (scenarioId === "mi_vs_rr_2026") ? MI_VS_RR_INSIGHTS : LIVE_INSIGHTS_DATABASE;

  const analystList = database.analyst[category];
  const scoutList = database.scout[category];
  const narratorList = database.narrator[category];

  const analystCounter = liveAgentCounters.analyst % analystList.length;
  const scoutCounter = liveAgentCounters.scout % scoutList.length;
  const narratorCounter = liveAgentCounters.narrator % narratorList.length;

  liveAgentCounters.analyst++;
  liveAgentCounters.scout++;
  liveAgentCounters.narrator++;

  const replacePlaceholders = (text) => {
    return text
      .replace(/{requiredRR}/g, requiredRR.toFixed(2))
      .replace(/{winProbability}/g, winProbability)
      .replace(/{pressureIndex}/g, pressureIndex)
      .replace(/{score}/g, score)
      .replace(/{target}/g, target)
      .replace(/{batsman}/g, batsman)
      .replace(/{bowler}/g, bowler)
      .replace(/{ballsRemaining}/g, ballsRemaining)
      .replace(/{runsNeeded}/g, runsNeeded);
  };

  return {
    analyst: replacePlaceholders(analystList[analystCounter]),
    scout: replacePlaceholders(scoutList[scoutCounter]),
    narrator: replacePlaceholders(narratorList[narratorCounter])
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

// Realistic Polar Coordinate Generator for Wagon Wheel & Canvas Animations
function generateRealisticPolarCoordinates(event, runs) {
  let angle = 0;
  let distance = 0;

  if (event === "wicket") {
    const isCaughtDeep = Math.random() > 0.5;
    if (isCaughtDeep) {
      angle = [30, 75, 210, 250, 285, 330][Math.floor(Math.random() * 6)] + (Math.random() * 20 - 10);
      distance = 60 + Math.random() * 25;
    } else {
      angle = 90 + (Math.random() * 10 - 5);
      distance = 12 + Math.random() * 8;
    }
  } else if (runs === 0) {
    const sectors = [
      { min: 0, max: 45 },
      { min: 160, max: 200 },
      { min: 75, max: 105 }
    ];
    const s = sectors[Math.floor(Math.random() * sectors.length)];
    angle = Math.floor(s.min + Math.random() * (s.max - s.min));
    distance = 12 + Math.random() * 20;
  } else if (runs === 1) {
    const sectors = [
      { min: 30, max: 60 },
      { min: 130, max: 160 },
      { min: 200, max: 230 },
      { min: 250, max: 280 }
    ];
    const s = sectors[Math.floor(Math.random() * sectors.length)];
    angle = Math.floor(s.min + Math.random() * (s.max - s.min));
    distance = 45 + Math.random() * 20;
  } else if (runs === 2 || runs === 3) {
    angle = [30, 75, 210, 250, 285, 330][Math.floor(Math.random() * 6)] + (Math.random() * 16 - 8);
    distance = 65 + Math.random() * 15;
  } else if (runs === 4) {
    const sectors = [
      { min: 15, max: 40 },
      { min: 65, max: 85 },
      { min: 200, max: 225 },
      { min: 240, max: 270 }
    ];
    const s = sectors[Math.floor(Math.random() * sectors.length)];
    angle = Math.floor(s.min + Math.random() * (s.max - s.min));
    distance = 82 + Math.random() * 6;
  } else if (runs >= 6) {
    const sectors = [
      { min: 235, max: 265 },
      { min: 275, max: 295 },
      { min: 320, max: 340 },
      { min: 190, max: 220 }
    ];
    const s = sectors[Math.floor(Math.random() * sectors.length)];
    angle = Math.floor(s.min + Math.random() * (s.max - s.min));
    distance = 95 + Math.random() * 20;
  }

  angle = (angle + 360) % 360;
  return { angle, distance: Math.round(distance) };
}

// Core function to process each ball, update state, run agents, and broadcast
const FIELDER_POSITIONS = [
  { angle: 30, distance: 75, label: "Deep Extra Cover" },
  { angle: 75, distance: 80, label: "Deep Point" },
  { angle: 120, distance: 45, label: "Backward Point" },
  { angle: 150, distance: 75, label: "Third Man" },
  { angle: 210, distance: 80, label: "Deep Fine Leg" },
  { angle: 250, distance: 75, label: "Deep Mid-Wicket" },
  { angle: 285, distance: 80, label: "Long-on" },
  { angle: 330, distance: 85, label: "Long-off" },
  { angle: 0, distance: 35, label: "Cover" },
  { angle: 180, distance: 25, label: "Square Leg" },
  { angle: 90, distance: 15, label: "Wicketkeeper" }
];

function generatePsychologistInsight(strikerName, bowlerName, batterPressure, bowlerPressure) {
  const zoneText = batterPressure < 30 ? "is in absolute psychological flow, reading the bowler with perfect clarity." : (batterPressure > 75 ? "is showing acute cognitive overload, grip tightening, footwork freezing." : "maintains stable mental homeostasis.");
  const bowlerText = bowlerPressure > 70 ? `${bowlerName} is experiencing significant stress, losing command of release mechanics.` : `${bowlerName} is breathing calm, executing tactical plans with high focus.`;
  return `Psychological Telemetry: ${strikerName} (${batterPressure}/100 pressure) ${zoneText} ${bowlerName} (${bowlerPressure}/100) ${bowlerText}`;
}

function getScoutWagonWheelAdvice(batsmanName, shots = []) {
  if (!shots || shots.length === 0) return "";
  const boundaryShots = shots.filter(s => s.runs >= 4);
  if (boundaryShots.length > 0) {
    const lastAngle = boundaryShots[boundaryShots.length - 1].angle;
    const gapAngle = (lastAngle + 180) % 360;
    return ` Scout note: Wagon wheel shows high boundary density towards ${lastAngle}°. Bowler should target the gap at ${gapAngle}° to restrict scoring.`;
  }
  return "";
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
  if (activeMode === "live") {
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
  } else if (scenarioId === "ind_vs_pak_2022") {
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

  // Calculate batsman dot streak and boundary drought from matchHistory for Psychologist
  let dotStreak = 0;
  let boundaryDrought = 0;
  let recentRuns = [];
  const strikerName = ball.batsman || "Batsman";
  const bowlerName = ball.bowler || "Bowler";

  // Scan matchHistory for stats
  let strikerHistory = matchHistory.filter(h => h.batsman === strikerName);
  strikerHistory.forEach(h => {
    if (h.event === 'dot' || h.runs === 0) {
      dotStreak++;
    } else {
      dotStreak = 0;
    }
    recentRuns.push(h.runs);
    if (recentRuns.length > 5) recentRuns.shift();

    if (h.runs >= 4) {
      boundaryDrought = 0;
    } else {
      boundaryDrought++;
    }
  });

  // Calculate current ball
  const runsScored = ball.runs;
  if (runsScored === 0 && ball.event !== 'wicket') {
    dotStreak++;
  } else {
    dotStreak = 0;
  }
  recentRuns.push(runsScored);
  if (recentRuns.length > 5) recentRuns.shift();
  if (runsScored >= 4) {
    boundaryDrought = 0;
  } else {
    boundaryDrought++;
  }

  let batterPressure = 35 + (dotStreak * 10) + (boundaryDrought * 2.5);
  const recentSum = recentRuns.reduce((a,b)=>a+b, 0);
  batterPressure += (5 - recentSum) * 3;
  batterPressure = Math.max(10, Math.min(95, Math.round(batterPressure)));

  // Bowler pressure
  const bowlerRequiredRR = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6) : 0;
  let bowlerPressure = 45;
  const rrrDiff = 10 - bowlerRequiredRR;
  bowlerPressure += rrrDiff * 4;
  if (ball.event === 'six' || ball.event === 'boundary') bowlerPressure += 18;
  if (ball.event === 'dot') bowlerPressure -= 5;
  bowlerPressure = Math.max(10, Math.min(98, Math.round(bowlerPressure)));

  // 6. Run Coordinated Agents (Gemini vs Fallback)
  let analystInsight = "";
  let scoutInsight = "";
  let narratorInsight = "";
  let psychologistInsight = "";

  // Dynamic Confidence Values
  const ballConfidence = ball.confidence || {
    analyst: { value: Math.round(85 - (pressureIndex / 4)), stability: pressureIndex > 80 ? "VOLATILE" : "HIGH", certainty: "CONFIDENT" },
    scout: { value: Math.round(80 - (pressureIndex / 5)), stability: "STABLE", certainty: "ALIGNED" }
  };

  const currentScoreboard = {
    requiredRR: ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6) : 0,
    runsNeeded: runsNeeded,
    score: score,
    target: target,
    ballsRemaining: ballsRemaining
  };

  if (activeApiKey) {
    console.log("Calling Gemini API for live match experience in parallel...");
    const sharedText = `
      Match: ${currentScenario ? currentScenario.name : "Live Simulation Match"} at ${currentScenario ? currentScenario.venue : "Live Stadium"}
      Batting Team: ${currentScenario ? currentScenario.battingTeam : "Batting Team"}, Bowling Team: ${currentScenario ? currentScenario.bowlingTeam : "Bowling Team"}
      Score: ${score}, Overs: ${over}, Batsman: ${strikerName}, Bowler: ${bowlerName}
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

    const scoutSystemPrompt = `You are the SCOUT agent for DUGOUT, a franchise dugout strategist.
Role: Tactical recommendation engine.
Tone: Tactical, coaching-oriented, predictive, and concise.
Task: Recommend matchups, bowling strategies, or fielding changes based on the score and the Analyst's previous insight: "${sharedMemory.analystLast || 'None'}". Challenge or expand on the Analyst's statistical viewpoint if you see a tactical matchup opportunity. Max 2 sentences.`;

    const narratorSystemPrompt = `You are the NARRATOR agent for DUGOUT.
Role: Cinematic storytelling engine.
Tone: Dramatic, cinematic, emotionally-charged, Netflix sports documentary style.
Task: Craft a dramatic voiceover/commentary on the emotional gravity of this ball. Interconnect with Analyst ("${sharedMemory.analystLast || 'None'}") and Scout ("${sharedMemory.scoutLast || 'None'}"). Max 2 sentences.`;

    const psychologistSystemPrompt = `You are the PSYCHOLOGIST agent for DUGOUT, a professional sports psychology diagnostics voice.
Role: Mental pressure analysis.
Tone: Clinical, analytical, focused on athlete stress levels, and concise.
Task: Explain the psychological state and pressure of the batsman (${batterPressure}/100) and bowler (${bowlerPressure}/100). Narrate if they are in the zone, cracking, or under control. Max 2 sentences.`;

    // Fault-Tolerant Parallel Orchestration
    const promises = [
      callGeminiAgent(activeApiKey, "Analyst", analystSystemPrompt, sharedText).catch(e => { console.error("Analyst API failed:", e); return null; }),
      callGeminiAgent(activeApiKey, "Scout", scoutSystemPrompt, sharedText).catch(e => { console.error("Scout API failed:", e); return null; }),
      callGeminiAgent(activeApiKey, "Narrator", narratorSystemPrompt, sharedText).catch(e => { console.error("Narrator API failed:", e); return null; }),
      callGeminiAgent(activeApiKey, "Psychologist", psychologistSystemPrompt, sharedText).catch(e => { console.error("Psychologist API failed:", e); return null; })
    ];

    const [analystRes, scoutRes, narratorRes, psychologistRes] = await Promise.all(promises);

    // Resolve Analyst Insight
    if (analystRes) {
      analystInsight = analystRes;
      sharedMemory.analystLast = analystInsight;
    } else {
      if (activeMode === "live") {
        const liveFallback = generateLiveAgentFallbackInsights(ball, winProbability, pressureIndex, currentScoreboard, scenarioId);
        analystInsight = liveFallback.analyst;
      } else {
        const key = over.toFixed(1);
        const scenarioDisagreements = DISAGREEMENTS[scenarioId];
        if (scenarioDisagreements && scenarioDisagreements[key]) {
          analystInsight = scenarioDisagreements[key].analyst;
        } else {
          analystInsight = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState).analyst;
        }
      }
    }

    // Resolve Scout Insight
    if (scoutRes) {
      scoutInsight = scoutRes;
      sharedMemory.scoutLast = scoutInsight;
    } else {
      if (activeMode === "live") {
        const liveFallback = generateLiveAgentFallbackInsights(ball, winProbability, pressureIndex, currentScoreboard, scenarioId);
        scoutInsight = liveFallback.scout;
      } else {
        const key = over.toFixed(1);
        const scenarioDisagreements = DISAGREEMENTS[scenarioId];
        if (scenarioDisagreements && scenarioDisagreements[key]) {
          scoutInsight = scenarioDisagreements[key].scout;
        } else {
          scoutInsight = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState).scout;
        }
      }
    }

    // Resolve Narrator Insight
    if (narratorRes) {
      narratorInsight = narratorRes;
      sharedMemory.narratorLast = narratorInsight;
    } else {
      if (activeMode === "live") {
        const liveFallback = generateLiveAgentFallbackInsights(ball, winProbability, pressureIndex, currentScoreboard, scenarioId);
        narratorInsight = liveFallback.narrator;
      } else {
        narratorInsight = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState).narrator;
      }
    }

    // Resolve Psychologist Insight
    if (psychologistRes) {
      psychologistInsight = psychologistRes;
    } else {
      psychologistInsight = generatePsychologistInsight(strikerName, bowlerName, batterPressure, bowlerPressure);
    }
  } else {
    if (activeMode === "live") {
      const liveFallback = generateLiveAgentFallbackInsights(ball, winProbability, pressureIndex, currentScoreboard, scenarioId);
      analystInsight = liveFallback.analyst;
      scoutInsight = liveFallback.scout;
      narratorInsight = liveFallback.narrator;
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
    psychologistInsight = generatePsychologistInsight(strikerName, bowlerName, batterPressure, bowlerPressure);
  }

  // Inject Wagon Wheel Advice into scout comment dynamically
  const batterShots = [];
  matchHistory.forEach(h => {
    if (h.batsman === strikerName && h.shot) {
      batterShots.push(h.shot);
    }
  });
  if (ball.shot) batterShots.push(ball.shot);
  const scoutWagonAdvice = getScoutWagonWheelAdvice(strikerName, batterShots);
  if (scoutWagonAdvice) {
    scoutInsight += " " + scoutWagonAdvice;
  }

  // Calculate if a tactical disagreement/dissent is occurring on this ball
  const key = over.toFixed(1);
  const psychologistConflict = batterPressure > 75 && winProbability > 70;
  const disagreementActive = !!(DISAGREEMENTS[scenarioId] && DISAGREEMENTS[scenarioId][key]) || 
    (scoutInsight && /disagree|dissent|contrary|challenge|dissenting|models fail|incorrect|objection/i.test(scoutInsight)) ||
    psychologistConflict;

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
    batsman: strikerName,
    bowler: bowlerName,
    commentary: ball.commentary,
    shot: ball.shot,
    branches: ball.branches,
    bowlerStamina: ball.bowlerStamina,
    psychologist: {
      batterPressure,
      bowlerPressure,
      striker: strikerName,
      bowler: bowlerName,
      dissent: psychologistConflict
    },
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
      },
      psychologist: {
        text: psychologistInsight,
        confidence: 90,
        stability: batterPressure > 75 ? "VOLATILE" : "STABLE",
        certainty: psychologistConflict ? "DIVERGENT" : "ALIGNED"
      }
    }
  };

  // Generate fallback v4.0 properties if missing (e.g. historical match data format)
  let finalBranches = ball.branches;
  if (!finalBranches) {
    finalBranches = {
      alpha: Array.from({length: 6}, (_,i) => Math.max(1, Math.min(99, Math.round(winProbability + (i + 1) * (Math.random() * 6 - 2.5))))),
      beta: Array.from({length: 6}, (_,i) => Math.max(1, Math.min(99, Math.round(winProbability + (i + 1) * (Math.random() * 4 - 2.0))))),
      gamma: Array.from({length: 6}, (_,i) => Math.max(1, Math.min(99, Math.round(winProbability + (i + 1) * (Math.random() * 8 - 4.0)))))
    };
    currentHistoryItem.branches = finalBranches;
  }

  let finalBowlerStamina = ball.bowlerStamina;
  if (!finalBowlerStamina) {
    finalBowlerStamina = {};
    const bowlersList = currentScenario.balls ? [...new Set(currentScenario.balls.map(b => b.bowler))] : [bowlerName];
    bowlersList.forEach(b => {
      finalBowlerStamina[b] = 100;
    });
    currentHistoryItem.bowlerStamina = finalBowlerStamina;
  }

  let finalShot = ball.shot;
  if (!finalShot && (runsScored > 0 || ball.event === "dot" || ball.event === "wicket")) {
    const coords = generateRealisticPolarCoordinates(ball.event, runsScored);
    finalShot = { angle: coords.angle, distance: coords.distance, runs: runsScored };
    currentHistoryItem.shot = finalShot;
  }

  matchHistory.push(currentHistoryItem);

  // Write match history log to file (Analyst file write access requirement)
  try {
    fs.writeFileSync("match_history_log.json", JSON.stringify(matchHistory, null, 2));
  } catch (err) {
    console.error("Failed to write match history log to file:", err);
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
      batsman: strikerName,
      bowler: bowlerName,
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
    history: matchHistory,
    
    // v4.0 props
    shot: finalShot,
    branches: finalBranches,
    bowlerStamina: finalBowlerStamina,
    fielders: FIELDER_POSITIONS
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

async function scheduleNextBall() {
  if (simulationTimeout) {
    clearTimeout(simulationTimeout);
    simulationTimeout = null;
  }

  // Jitter variation: 85% to 115% of simulation speed
  const jitterFactor = 0.85 + Math.random() * 0.3;
  const delay = simulationSpeed * jitterFactor;

  simulationTimeout = setTimeout(async () => {
    if (activeMode === "live") {
      const nextBall = liveEngine.generateNextBall();
      if (!nextBall) {
        console.log("Live simulation complete.");
        broadcast({ type: "SIMULATION_COMPLETE" });
        return;
      }
      
      const updatePayload = await processBallEvent(nextBall, currentScenarioId);
      liveEngine.lastPressureIndex = updatePayload.telemetry.pressureIndex;
      updatePayload.timestamp = new Date().toISOString();
      updatePayload.telemetryLatency = Math.round(50 + Math.random() * 150); // Live latency jitter: 50-200ms
      updatePayload.activeMode = "live";
      broadcast(updatePayload);
      
      if (liveEngine.currentRuns >= liveEngine.target || liveEngine.wickets >= 10 || liveEngine.ballsBowled >= 120) {
        console.log("Live match concluded.");
        broadcast({ type: "SIMULATION_COMPLETE" });
      } else {
        scheduleNextBall();
      }
    } else {
      currentBallIndex++;
      if (currentBallIndex >= currentScenario.balls.length) {
        console.log("Historical simulation complete.");
        broadcast({ type: "SIMULATION_COMPLETE" });
        return;
      }
      
      const ballData = currentScenario.balls[currentBallIndex];
      const updatePayload = await processBallEvent(ballData, currentScenarioId);
      updatePayload.timestamp = new Date().toISOString();
      updatePayload.telemetryLatency = Math.round(10 + Math.random() * 40); // Replay latency: 10-50ms
      updatePayload.activeMode = "historical";
      broadcast(updatePayload);
      
      if (currentBallIndex < currentScenario.balls.length - 1) {
        scheduleNextBall();
      } else {
        console.log("Historical match concluded.");
        broadcast({ type: "SIMULATION_COMPLETE" });
      }
    }
  }, delay);
}

// WebSocket connections
wss.on("connection", async (ws) => {
  console.log("Client connected to DUGOUT Platform WebSocket");
  
  // Dynamically fetch and append active live matches from ESPN RSS
  await updateLiveScenarios();
  
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

        case "SET_MODE":
          activeMode = message.mode; // "live" or "historical"
          console.log(`Active mode changed to: ${activeMode}`);
          if (simulationTimeout) {
            clearTimeout(simulationTimeout);
            simulationTimeout = null;
          }
          currentBallIndex = -1;
          matchHistory = [];
          sharedMemory = {
            timeline: [],
            analystLast: "",
            scoutLast: "",
            narratorLast: ""
          };
          broadcast({ type: "MODE_CHANGED", mode: activeMode });
          break;

        case "SET_COACH_OVERRIDE":
          liveEngine.coachOverrideBowler = message.bowler;
          console.log(`Coach override bowler set to: ${message.bowler}`);
          break;

        case "START_SIMULATION": {
          const scenarioId = message.scenarioId;
          if (!SCENARIOS[scenarioId]) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Scenario not found" }));
            break;
          }

          // Reset Simulation state
          if (simulationTimeout) {
            clearTimeout(simulationTimeout);
            simulationTimeout = null;
          }
          
          currentScenarioId = scenarioId;
          currentScenario = SCENARIOS[scenarioId];
          matchHistory = [];
          sharedMemory = {
            timeline: [],
            analystLast: "",
            scoutLast: "",
            narratorLast: ""
          };

          console.log(`Starting simulation for scenario: ${currentScenario.name} in mode: ${activeMode}`);

          if (activeMode === "live") {
            liveEngine.initialize(scenarioId, currentScenario);
            const initialBall = {
              over: currentScenario.startingOvers || 0,
              batsman: liveEngine.strikerName,
              bowler: liveEngine.getBowler(),
              runs: 0,
              event: "dot",
              score: `${liveEngine.currentRuns}/${liveEngine.wickets}`,
              wickets: liveEngine.wickets,
              shake: false,
              commentary: `Match ready. Target: ${liveEngine.target} in 20 overs. Starting Live Match Simulation.`,
              confidence: {
                analyst: { value: 50, stability: "STABLE", certainty: "CONFIDENT" },
                scout: { value: 50, stability: "STABLE", certainty: "ALIGNED" }
              }
            };
            const initialPayload = await processBallEvent(initialBall, currentScenarioId);
            initialPayload.timestamp = new Date().toISOString();
            initialPayload.telemetryLatency = Math.round(50 + Math.random() * 150);
            initialPayload.activeMode = "live";
            broadcast(initialPayload);
            scheduleNextBall();
          } else {
            currentBallIndex = 0;
            const initialPayload = await processBallEvent(currentScenario.balls[0], currentScenarioId);
            initialPayload.timestamp = new Date().toISOString();
            initialPayload.telemetryLatency = Math.round(10 + Math.random() * 40);
            initialPayload.activeMode = "historical";
            broadcast(initialPayload);
            scheduleNextBall();
          }
          break;
        }

        case "JUMP_TO_BALL": {
          // If we receive a timeline jump in live mode, switch to historical replay cleanly
          if (activeMode === "live") {
            activeMode = "historical";
            console.log("JUMP_TO_BALL triggered in live mode. Switching to historical replay.");
            broadcast({ type: "MODE_CHANGED", mode: "historical" });
          }

          const sId = message.scenarioId;
          const targetOver = parseFloat(message.over);
          if (!SCENARIOS[sId]) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Scenario not found" }));
            break;
          }

          // Reset and pre-populate simulation history up to target over
          if (simulationTimeout) {
            clearTimeout(simulationTimeout);
            simulationTimeout = null;
          }
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
          if (simulationTimeout) {
            clearTimeout(simulationTimeout);
            simulationTimeout = null;
          }
          console.log("Simulation paused.");
          broadcast({ type: "SIMULATION_PAUSED" });
          break;

        case "SET_SPEED":
          simulationSpeed = message.speed;
          console.log(`Speed updated to ${simulationSpeed}ms`);
          if (simulationTimeout) {
            // Re-schedule immediately with new speed
            scheduleNextBall();
          }
          break;

        case "RESET_SIMULATION":
          if (simulationTimeout) {
            clearTimeout(simulationTimeout);
            simulationTimeout = null;
          }
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
