/**
 * DUGOUT Live Match Engine
 * 
 * Probabilistic ball-by-ball cricket simulator.
 * Dynamically adjusts probabilities based on required run rate, death overs,
 * and recent wickets to simulate realistic cricket pacing, volatility, and tension.
 * Upgraded to v4.0 with Bowler Fatigue Stamina, Polar Shot mapping, and Parallel Branches.
 */

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

export class LiveMatchEngine {
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
    const copy = new LiveMatchEngine();
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
        probs.six += 0.10;
        probs.boundary += 0.08;
        probs.wicket += 0.06;
        probs.dot = Math.max(0.05, probs.dot - 0.12);
        probs.single = Math.max(0.05, probs.single - 0.05);
      } else if (strategy === "beta") {
        probs.single += 0.15;
        probs.dot += 0.05;
        probs.boundary = Math.max(0.02, probs.boundary - 0.10);
        probs.six = Math.max(0.01, probs.six - 0.05);
        probs.wicket = Math.max(0.01, probs.wicket - 0.03);
      } else if (strategy === "gamma") {
        probs.six += 0.15;
        probs.wicket += 0.08;
        probs.single = Math.max(0.05, probs.single - 0.10);
        probs.dot = Math.max(0.05, probs.dot - 0.05);
        probs.double = Math.max(0.02, probs.double - 0.04);
        probs.boundary = Math.max(0.02, probs.boundary - 0.04);
      }

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

    // Bowler fatigue stamina curve depletion
    const pressure = this.lastPressureIndex || 50;
    const activeDrain = pressure > 75 ? 3.0 : 2.0;
    this.bowlerStamina[bowler] = Math.max(0, this.bowlerStamina[bowler] - activeDrain);

    // Resting bowlers recover stamina
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

    // Psychologist state updates
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

    // Generate Wagon Wheel Shot using realistic polar coordinates
    let shot = null;
    if (runsScored > 0 || outcome === "dot" || outcome === "wicket") {
      const name = striker ? striker.name : "Batsman";
      if (!this.batsmanShots[name]) this.batsmanShots[name] = [];

      const coords = generateRealisticPolarCoordinates(outcome, runsScored);
      shot = { angle: coords.angle, distance: coords.distance, runs: runsScored };
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
      
      // v4.0 properties
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
