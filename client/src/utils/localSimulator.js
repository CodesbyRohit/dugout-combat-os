import { SCENARIOS, DISAGREEMENTS } from "./scenarios.js";

// Commentary templates for the local live match engine
const COMMENTARY_TEMPLATES = {
  dot: [
    "{batsman} searches for a run but is sent back. Excellent line by {bowler}.",
    "Solid front-foot defense from {batsman} off a good length delivery by {bowler}.",
    "No run. {bowler} fires a quick delivery, tucked towards cover by {batsman}.",
    "A dot ball! The pressure mounts as {batsman} is unable to pierce the field.",
    "Beaten! {bowler} gets some movement off the seam and whistles past {batsman}'s outside edge."
  ],
  single: [
    "{batsman} tucks {bowler}'s delivery to deep square leg to rotate the strike.",
    "Guided down to third man. {batsman} moves to the non-striker's end.",
    "Slower ball on off stump, tapped to mid-off by {batsman} for a quick single.",
    "Easy single. {batsman} nudges it into the gap, keeping the scoreboard ticking.",
    "{batsman} drives it down to long-on and takes a comfortable single."
  ],
  double: [
    "Excellent running! {batsman} clips it past point and they sprint back for two.",
    "Two runs! Tapped into the deep, {batsman} pushes hard and comfortably beats the throw.",
    "Driven wide of long-off. A strong throw from the boundary, but {batsman} completes the double.",
    "Flicked fine of fine leg. Superb awareness by {batsman} to hustle back for the second run."
  ],
  boundary: [
    "FOUR! Spectacular shot! {batsman} stands tall and punches it beautifully through extra cover!",
    "FOUR! {batsman} uses the pace of {bowler} and guides it past short fine leg to the boundary!",
    "FOUR MORE! Smashed away! {batsman} lofts {bowler} over mid-off for a clean, bouncing boundary.",
    "FOUR! Cracking shot! A short delivery dispatched through the covers by {batsman}."
  ],
  six: [
    "SIX!!! Clears the rope! {batsman} launches {bowler} deep into the stands!",
    "SIX MORE! A colossal hit! {batsman} slog-sweeps it over deep midwicket with authority!",
    "SIX! Absolute power! {batsman} clears the front leg and lofts it straight down the ground.",
    "SIX!!! What a strike! {batsman} picks up the slower ball early and hits it over long-on!"
  ],
  wicket: [
    "WICKET! {batsman} is OUT! Caught in the deep off {bowler}'s delivery! A massive blow!",
    "OUT! Clean bowled! {bowler} beats the defense of {batsman} and shatters the stumps!",
    "WICKET! Trapped LBW! {bowler} screams in celebration as {batsman} is sent packing!",
    "OUT! Caught behind! {batsman} edges {bowler}'s short delivery and the keeper makes no mistake!"
  ]
};

const TEMPLATE_COUNTERS = { dot: 0, single: 0, double: 0, boundary: 0, six: 0, wicket: 0 };

export const FIELDER_POSITIONS = [
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

export class LocalLiveMatchEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.target = 160;
    this.currentRuns = 112;
    this.wickets = 4;
    this.ballsBowled = 102; // Start after 17 overs (102 balls)
    this.strikerName = "Virat Kohli";
    this.nonStrikerName = "Hardik Pandya";
    
    this.batsmen = [
      { name: "Virat Kohli", runs: 42, balls: 31, active: true, out: false },
      { name: "Hardik Pandya", runs: 28, balls: 24, active: true, out: false }
    ];

    this.remainingBatsmen = [
      "Dinesh Karthik",
      "Ravichandran Ashwin",
      "Bhuvneshwar Kumar",
      "Mohammed Shami",
      "Arshdeep Singh"
    ];

    this.bowlers = ["Shaheen Afridi", "Haris Rauf", "Mohammad Nawaz"];
    this.currentBowlerIndex = 0;
    this.ballsSinceWicket = 0;
    this.allOut = false;

    // v4.0 variables
    this.bowlerStamina = {
      "Shaheen Afridi": 100, "Haris Rauf": 100, "Mohammad Nawaz": 100,
      "Lasith Malinga": 100, "Jasprit Bumrah": 100, "Krunal Pandya": 100,
      "Sandeep Sharma": 100, "Yuzvendra Chahal": 100, "Avesh Khan": 100
    };
    this.batsmanDotStreak = {};
    this.batsmanRecentRuns = {};
    this.batsmanBoundaryDrought = {};
    this.batsmanShots = {};
    this.coachOverrideBowler = null;
    this.lastPressureIndex = 50;
  }

  initialize(scenarioId, scenario) {
    this.target = scenario.target;
    this.currentRuns = scenario.startingScore || 0;
    this.wickets = scenario.startingWickets || 0;
    this.ballsBowled = (scenario.startingOvers || 0) * 6;
    this.allOut = false;
    this.ballsSinceWicket = 0;
    this.coachOverrideBowler = null;
    this.lastPressureIndex = 50;

    // Reset psychologist and wagon wheel
    this.batsmanDotStreak = {};
    this.batsmanRecentRuns = {};
    this.batsmanBoundaryDrought = {};
    this.batsmanShots = {};

    if (scenarioId === "mi_vs_csk_2019") {
      this.strikerName = "Shane Watson";
      this.nonStrikerName = "Ravindra Jadeja";
      this.batsmen = [
        { name: "Shane Watson", runs: 80, balls: 58, active: true, out: false },
        { name: "Ravindra Jadeja", runs: 5, balls: 4, active: true, out: false }
      ];
      this.remainingBatsmen = [
        "Shardul Thakur",
        "Deepak Chahar",
        "Harbhajan Singh",
        "Imran Tahir"
      ];
      this.bowlers = ["Lasith Malinga", "Jasprit Bumrah", "Krunal Pandya"];
    } else if (scenarioId === "mi_vs_rr_2026") {
      this.strikerName = "Suryakumar Yadav";
      this.nonStrikerName = "Hardik Pandya";
      this.batsmen = [
        { name: "Suryakumar Yadav", runs: 54, balls: 32, active: true, out: false },
        { name: "Hardik Pandya", runs: 18, balls: 11, active: true, out: false }
      ];
      this.remainingBatsmen = [
        "Tim David",
        "Tilak Varma",
        "Naman Dhir",
        "Gerald Coetzee",
        "Jasprit Bumrah"
      ];
      this.bowlers = ["Sandeep Sharma", "Yuzvendra Chahal", "Avesh Khan"];
    } else {
      // Default to IND vs PAK 2022
      this.strikerName = "Virat Kohli";
      this.nonStrikerName = "Hardik Pandya";
      this.batsmen = [
        { name: "Virat Kohli", runs: 42, balls: 31, active: true, out: false },
        { name: "Hardik Pandya", runs: 28, balls: 24, active: true, out: false }
      ];
      this.remainingBatsmen = [
        "Dinesh Karthik",
        "Ravichandran Ashwin",
        "Bhuvneshwar Kumar",
        "Mohammed Shami",
        "Arshdeep Singh"
      ];
      this.bowlers = ["Shaheen Afridi", "Haris Rauf", "Mohammad Nawaz"];
    }
    this.currentBowlerIndex = 0;

    // Reset stamina for scenario bowlers to 100
    this.bowlerStamina = {};
    this.bowlers.forEach(b => {
      this.bowlerStamina[b] = 100;
    });
  }

  getStriker() {
    return this.batsmen.find(b => b.name === this.strikerName);
  }

  getNonStriker() {
    return this.batsmen.find(b => b.name === this.nonStrikerName);
  }

  swapStrike() {
    const temp = this.strikerName;
    this.strikerName = this.nonStrikerName;
    this.nonStrikerName = temp;
  }

  getBowler() {
    if (this.coachOverrideBowler) return this.coachOverrideBowler;
    const overNum = Math.floor(this.ballsBowled / 6);
    if (this.bowlers.length === 3) {
      if (overNum === 17) return this.bowlers[0]; // Shaheen Afridi / Sandeep / Malinga
      if (overNum === 18) return this.bowlers[1]; // Haris Rauf / Chahal / Bumrah
      return this.bowlers[2]; // Mohammad Nawaz / Avesh / Krunal
    }
    const idx = overNum % this.bowlers.length;
    return this.bowlers[idx];
  }

  clone() {
    const copy = new LocalLiveMatchEngine();
    copy.target = this.target;
    copy.currentRuns = this.currentRuns;
    copy.wickets = this.wickets;
    copy.ballsBowled = this.ballsBowled;
    copy.strikerName = this.strikerName;
    copy.nonStrikerName = this.nonStrikerName;
    copy.ballsSinceWicket = this.ballsSinceWicket;
    copy.allOut = this.allOut;
    copy.bowlerStamina = { ...this.bowlerStamina };
    copy.lastPressureIndex = this.lastPressureIndex;

    copy.batsmen = this.batsmen.map(b => ({ ...b }));
    copy.remainingBatsmen = [...this.remainingBatsmen];
    copy.bowlers = [...this.bowlers];
    
    // Copy psychologist states
    copy.batsmanDotStreak = { ...this.batsmanDotStreak };
    copy.batsmanBoundaryDrought = { ...this.batsmanBoundaryDrought };
    copy.batsmanRecentRuns = {};
    Object.keys(this.batsmanRecentRuns).forEach(k => {
      copy.batsmanRecentRuns[k] = [...this.batsmanRecentRuns[k]];
    });

    return copy;
  }

  simulateBranch(strategy, ballsAhead = 6) {
    const tempEngine = this.clone();
    const probabilitiesList = [];

    for (let i = 0; i < ballsAhead; i++) {
      if (tempEngine.ballsBowled >= 120 || tempEngine.wickets >= 10 || tempEngine.currentRuns >= tempEngine.target) {
        // Match ended, push final win probability
        probabilitiesList.push(tempEngine.currentRuns >= tempEngine.target ? 100 : 0);
        continue;
      }

      // Base Probabilities modified by strategy
      let probs = {
        dot: 0.28,
        single: 0.38,
        double: 0.12,
        boundary: 0.12,
        six: 0.06,
        wicket: 0.04
      };

      if (strategy === "alpha") {
        // Aggressive
        probs.six += 0.10;
        probs.boundary += 0.08;
        probs.wicket += 0.06;
        probs.dot = Math.max(0.05, probs.dot - 0.12);
        probs.single = Math.max(0.05, probs.single - 0.05);
      } else if (strategy === "beta") {
        // Conservative
        probs.single += 0.15;
        probs.dot += 0.05;
        probs.boundary = Math.max(0.02, probs.boundary - 0.10);
        probs.six = Math.max(0.01, probs.six - 0.05);
        probs.wicket = Math.max(0.01, probs.wicket - 0.03);
      } else if (strategy === "gamma") {
        // Volatile
        probs.six += 0.15;
        probs.wicket += 0.08;
        probs.single = Math.max(0.05, probs.single - 0.10);
        probs.dot = Math.max(0.05, probs.dot - 0.05);
        probs.double = Math.max(0.02, probs.double - 0.04);
        probs.boundary = Math.max(0.02, probs.boundary - 0.04);
      }

      // Normalization
      const sum = Object.values(probs).reduce((a, b) => a + b, 0);
      Object.keys(probs).forEach(k => { probs[k] = probs[k] / sum; });

      const roll = Math.random();
      let accumulated = 0;
      let outcome = "dot";
      for (const [event, prob] of Object.entries(probs)) {
        accumulated += prob;
        if (roll <= accumulated) {
          outcome = event;
          break;
        }
      }

      tempEngine.ballsBowled++;
      let runsScored = 0;
      let isWicket = false;
      if (outcome === "single") runsScored = 1;
      else if (outcome === "double") runsScored = 2;
      else if (outcome === "boundary") runsScored = 4;
      else if (outcome === "six") runsScored = 6;
      else if (outcome === "wicket") isWicket = true;

      tempEngine.currentRuns = Math.min(tempEngine.target, tempEngine.currentRuns + runsScored);
      if (isWicket) {
        tempEngine.wickets++;
        if (tempEngine.wickets >= 10) tempEngine.allOut = true;
      }

      // Calculate future win probability heuristic
      let winProbability = 50;
      const futureRunsNeeded = Math.max(0, tempEngine.target - tempEngine.currentRuns);
      const futureBallsRemaining = Math.max(0, 120 - tempEngine.ballsBowled);

      if (futureRunsNeeded <= 0) winProbability = 100;
      else if (futureBallsRemaining <= 0 || tempEngine.wickets >= 10) winProbability = 0;
      else {
        const requiredRR = (futureRunsNeeded / futureBallsRemaining) * 6;
        const wicketsLeft = 10 - tempEngine.wickets;
        if (requiredRR > 36) winProbability = 1;
        else {
          const rDiff = requiredRR - 8;
          winProbability = 50 - (rDiff * 4) + (wicketsLeft - 5) * 8;
          winProbability = Math.max(1, Math.min(99, Math.round(winProbability)));
        }
      }

      probabilitiesList.push(winProbability);
    }

    return probabilitiesList;
  }

  generateNextBall() {
    if (this.ballsBowled >= 120 || this.wickets >= 10 || this.currentRuns >= this.target) {
      return null;
    }

    const bowler = this.getBowler();
    if (!this.bowlerStamina) this.bowlerStamina = {};
    if (this.bowlerStamina[bowler] === undefined) this.bowlerStamina[bowler] = 100;

    // Bowler fatigue active stamina drain
    const pressure = this.lastPressureIndex || 50;
    const activeDrain = pressure > 75 ? 3.0 : 2.0;
    this.bowlerStamina[bowler] = Math.max(0, this.bowlerStamina[bowler] - activeDrain);

    // Resting bowlers regain stamina
    this.bowlers.forEach(b => {
      if (b !== bowler) {
        if (this.bowlerStamina[b] === undefined) this.bowlerStamina[b] = 100;
        this.bowlerStamina[b] = Math.min(100, this.bowlerStamina[b] + 0.83);
      }
    });

    const stamina = this.bowlerStamina[bowler];
    const ballsRemaining = 120 - this.ballsBowled;
    const runsNeeded = Math.max(0, this.target - this.currentRuns);
    const requiredRR = (runsNeeded / ballsRemaining) * 6;
    
    const isDeathOver = this.ballsBowled >= 114;
    const isQuietOver = this.ballsBowled >= 108 && this.ballsBowled < 114;

    // Base Probabilities
    let probs = {
      dot: 0.28,
      single: 0.38,
      double: 0.12,
      boundary: 0.12,
      six: 0.06,
      wicket: 0.04
    };

    // Bowler fatigue adjustments
    if (stamina < 50) {
      const fatigueFactor = (100 - stamina) / 100;
      probs.wicket = probs.wicket * (1.0 - fatigueFactor * 0.5);
      const economyDegrade = 1.0 + fatigueFactor * 0.4;
      probs.six = probs.six * economyDegrade;
      probs.boundary = probs.boundary * economyDegrade;
      probs.double = probs.double * economyDegrade;
      probs.single = probs.single * economyDegrade;
      probs.dot = Math.max(0.05, probs.dot / economyDegrade);
    }

    // State adjustments
    if (requiredRR > 12) {
      probs.six += 0.06;
      probs.boundary += 0.04;
      probs.wicket += 0.03;
      probs.single -= 0.05;
      probs.dot -= 0.08;
    } else if (requiredRR > 8) {
      probs.six += 0.03;
      probs.boundary += 0.02;
      probs.wicket += 0.01;
      probs.dot -= 0.06;
    } else if (requiredRR < 5) {
      probs.dot += 0.08;
      probs.single += 0.04;
      probs.boundary -= 0.04;
      probs.six -= 0.05;
      probs.wicket -= 0.02;
    }

    if (isQuietOver) {
      probs.dot += 0.10;
      probs.single += 0.05;
      probs.boundary -= 0.07;
      probs.six -= 0.04;
      probs.wicket -= 0.02;
    }

    if (this.ballsSinceWicket > 0 && this.ballsSinceWicket <= 3) {
      probs.six -= 0.04;
      probs.boundary -= 0.04;
      probs.wicket -= 0.01;
      probs.single += 0.04;
      probs.dot += 0.05;
    }

    if (isDeathOver) {
      probs.six += 0.06;
      probs.boundary += 0.02;
      probs.wicket += 0.03;
      probs.dot -= 0.07;
      probs.single -= 0.04;
    }

    Object.keys(probs).forEach(k => {
      if (probs[k] < 0.01) probs[k] = 0.01;
    });

    const sum = Object.values(probs).reduce((a, b) => a + b, 0);
    Object.keys(probs).forEach(k => {
      probs[k] = probs[k] / sum;
    });

    const roll = Math.random();
    let accumulated = 0;
    let outcome = "dot";

    for (const [event, prob] of Object.entries(probs)) {
      accumulated += prob;
      if (roll <= accumulated) {
        outcome = event;
        break;
      }
    }

    this.ballsBowled++;
    this.ballsSinceWicket++;
    
    let runsScored = 0;
    let isWicket = false;

    if (outcome === "single") runsScored = 1;
    else if (outcome === "double") runsScored = 2;
    else if (outcome === "boundary") runsScored = 4;
    else if (outcome === "six") runsScored = 6;
    else if (outcome === "wicket") {
      isWicket = true;
      this.ballsSinceWicket = 0;
    }

    const striker = this.getStriker();
    if (striker) {
      striker.balls++;
      if (!isWicket) {
        striker.runs += runsScored;
      }
    }

    this.currentRuns = Math.min(this.target, this.currentRuns + runsScored);

    // Psychologist state updates for the striker
    if (striker) {
      const name = striker.name;
      if (this.batsmanDotStreak[name] === undefined) this.batsmanDotStreak[name] = 0;
      if (this.batsmanRecentRuns[name] === undefined) this.batsmanRecentRuns[name] = [];
      if (this.batsmanBoundaryDrought[name] === undefined) this.batsmanBoundaryDrought[name] = 0;

      if (runsScored === 0 && !isWicket) {
        this.batsmanDotStreak[name]++;
      } else {
        this.batsmanDotStreak[name] = 0;
      }

      this.batsmanRecentRuns[name].push(runsScored);
      if (this.batsmanRecentRuns[name].length > 5) {
        this.batsmanRecentRuns[name].shift();
      }

      if (runsScored >= 4) {
        this.batsmanBoundaryDrought[name] = 0;
      } else {
        this.batsmanBoundaryDrought[name]++;
      }
    }

    // Generate Wagon Wheel Shot
    let shot = null;
    if (runsScored > 0 || outcome === "dot") {
      const name = striker ? striker.name : "Batsman";
      if (!this.batsmanShots[name]) this.batsmanShots[name] = [];

      const angle = Math.floor(Math.random() * 360);
      let distance = 0;
      if (runsScored === 0) {
        distance = 15 + Math.random() * 15; // Block defense
      } else if (runsScored === 1) {
        distance = 45 + Math.random() * 15;
      } else if (runsScored === 2) {
        distance = 55 + Math.random() * 15;
      } else if (runsScored === 4) {
        distance = 82 + Math.random() * 8;
      } else if (runsScored === 6) {
        distance = 95 + Math.random() * 15;
      }

      shot = { angle, distance, runs: runsScored };
      this.batsmanShots[name].push(shot);
    }

    let outBatsmanName = "";
    if (isWicket) {
      outBatsmanName = this.strikerName;
      this.wickets++;
      if (striker) {
        striker.out = true;
        striker.active = false;
      }

      if (this.wickets < 10 && this.remainingBatsmen.length > 0) {
        const nextBatsmanName = this.remainingBatsmen.shift();
        this.batsmen.push({ name: nextBatsmanName, runs: 0, balls: 0, active: true, out: false });
        this.strikerName = nextBatsmanName;
      } else {
        this.allOut = true;
      }
    }

    if (runsScored === 1 || runsScored === 3) {
      this.swapStrike();
    }

    const isOverEnd = this.ballsBowled % 6 === 0;
    if (isOverEnd && !this.allOut && this.wickets < 10) {
      this.swapStrike();
    }

    const overNumber = Math.floor(this.ballsBowled / 6);
    const ballInOver = this.ballsBowled % 6;
    const overDecimal = ballInOver === 0 ? overNumber : parseFloat(`${overNumber - 1}.${ballInOver}`);

    const batsmanText = isWicket ? outBatsmanName : this.strikerName;
    const bowlerText = this.getBowler();
    const commentary = this._generateCommentary(outcome, batsmanText, bowlerText);

    // Simulate parallel branches
    const branches = {
      alpha: this.simulateBranch("alpha"),
      beta: this.simulateBranch("beta"),
      gamma: this.simulateBranch("gamma")
    };

    return {
      over: overDecimal,
      batsman: striker ? striker.name : "Batsman",
      bowler: bowlerText,
      runs: runsScored,
      event: outcome,
      score: `${this.currentRuns}/${this.wickets}`,
      wickets: this.wickets,
      shake: isWicket || outcome === "boundary" || outcome === "six",
      commentary: commentary,
      batsmenStatus: this.batsmen.map(b => ({
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        strike: b.name === this.strikerName && b.active,
        out: b.out
      })),
      isOverEnd: isOverEnd,
      
      // v4.0 metrics
      bowlerStamina: { ...this.bowlerStamina },
      shot: shot,
      branches: branches
    };
  }

  _generateCommentary(outcome, batsman, bowler) {
    const list = COMMENTARY_TEMPLATES[outcome] || ["No description available."];
    const index = TEMPLATE_COUNTERS[outcome] % list.length;
    TEMPLATE_COUNTERS[outcome]++;
    
    return list[index]
      .replace(/{batsman}/g, batsman)
      .replace(/{bowler}/g, bowler);
  }
}

// Live commentary template database for offline mode
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

// Dynamic clinical fallback insights for Psychologist
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

// Heuristic fallback text generator for client-side offline mode (historical matches)
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
        analyst: `Haris Rauf enters the attack. 30 off 11. Required rate is high. India's probability slides to 38%.`,
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

export function processBallEvent(ball, scenarioId, matchHistory = [], sharedMemory = { timeline: [] }, activeMode = "historical") {
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
      description: "Bowled a height no-ball, Kohli dispatches it for six! Free hit awarded.",
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

  if (activeMode === "live") {
    const liveFallback = generateLiveAgentFallbackInsights(ball, winProbability, pressureIndex, currentScoreboard, scenarioId);
    analystInsight = liveFallback.analyst;
    scoutInsight = liveFallback.scout;
    narratorInsight = liveFallback.narrator;
  } else {
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
    const fallback = generateFallbackInsights(scenarioId, ball, winProbability, pressureIndex, momentumState);
    narratorInsight = fallback.narrator;
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

  // Generate Psychologist commentary fallback text
  const psychologistInsight = generatePsychologistInsight(strikerName, bowlerName, batterPressure, bowlerPressure);

  // Inject Wagon Wheel Advice into scout comment dynamically
  // Search history for all shots by this batter
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

  const isDuplicateHistory = matchHistory.some(h => Math.abs(h.over - ball.over) < 0.01 && h.event === ball.event);
  if (!isDuplicateHistory) {
    matchHistory.push(currentHistoryItem);
  }

  // If branches don't exist (e.g. historical data or older format), generate fallback branches
  let finalBranches = ball.branches;
  if (!finalBranches) {
    // Generate dummy branches extending from current winProbability
    finalBranches = {
      alpha: Array.from({length: 6}, (_,i) => Math.max(1, Math.min(99, Math.round(winProbability + (i + 1) * (Math.random() * 6 - 2.5))))),
      beta: Array.from({length: 6}, (_,i) => Math.max(1, Math.min(99, Math.round(winProbability + (i + 1) * (Math.random() * 4 - 2.0))))),
      gamma: Array.from({length: 6}, (_,i) => Math.max(1, Math.min(99, Math.round(winProbability + (i + 1) * (Math.random() * 8 - 4.0)))))
    };
    currentHistoryItem.branches = finalBranches;
  }

  // Same for bowler stamina fallback
  let finalBowlerStamina = ball.bowlerStamina;
  if (!finalBowlerStamina) {
    finalBowlerStamina = {};
    const bowlersList = currentScenario.balls ? [...new Set(currentScenario.balls.map(b => b.bowler))] : [bowlerName];
    bowlersList.forEach(b => {
      finalBowlerStamina[b] = 100;
    });
    currentHistoryItem.bowlerStamina = finalBowlerStamina;
  }

  // Same for shot fallback
  let finalShot = ball.shot;
  if (!finalShot && (runsScored > 0 || ball.event === "dot")) {
    const angle = Math.floor(Math.random() * 360);
    const dist = runsScored === 0 ? 20 : (runsScored < 4 ? 50 : 90);
    finalShot = { angle, distance: dist, runs: runsScored };
    currentHistoryItem.shot = finalShot;
  }

  return {
    type: "MATCH_UPDATE",
    scenarioId: scenarioId,
    shake: !!ball.shake,
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
