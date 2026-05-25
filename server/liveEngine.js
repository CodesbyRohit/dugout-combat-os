/**
 * DUGOUT Live Match Engine (Generative State Manager Upgrade)
 * 
 * In-memory matchState tracker for DUGOUT.
 * Maintains runs, wickets, overs, striker/non-striker state, bowler stamina,
 * and handles strike rotation and over transitions cleanly.
 */

// Realistic Polar Coordinate Generator for Wagon Wheel & Canvas Animations
export function generateRealisticPolarCoordinates(event, runs) {
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
      if (overNum === 17) return this.bowlers[0]; 
      if (overNum === 18) return this.bowlers[1]; 
      return this.bowlers[2]; 
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
    
    copy.batsmanDotStreak = { ...this.batsmanDotStreak };
    copy.batsmanBoundaryDrought = { ...this.batsmanBoundaryDrought };
    copy.batsmanRecentRuns = {};
    Object.keys(this.batsmanRecentRuns).forEach(k => {
      copy.batsmanRecentRuns[k] = [...this.batsmanRecentRuns[k]];
    });

    return copy;
  }

  /**
   * Applies the Generative Umpire's ball outcome to the active matchState memory.
   * Increments scores, handles wickets, batsman replacement, bowler stamina curves,
   * and strike rotation/over changes.
   */
  applyUmpireBall(outcome) {
    const runsScored = parseInt(outcome.runs) || 0;
    const isWicket = !!outcome.isWicket;
    const shotAngle = parseInt(outcome.shotAngle) || 0;
    const shotDistance = parseInt(outcome.shotDistance) || 0;
    const eventDescription = outcome.eventDescription || "";

    const bowler = this.getBowler();
    if (!this.bowlerStamina) this.bowlerStamina = {};
    if (this.bowlerStamina[bowler] === undefined) this.bowlerStamina[bowler] = 100;

    // Bowler fatigue curve
    const pressure = this.lastPressureIndex || 50;
    const activeDrain = pressure > 75 ? 3.0 : 2.0;
    this.bowlerStamina[bowler] = Math.max(0, this.bowlerStamina[bowler] - activeDrain);

    // Resting recovery
    this.bowlers.forEach(b => {
      if (b !== bowler) {
        if (this.bowlerStamina[b] === undefined) this.bowlerStamina[b] = 100;
        this.bowlerStamina[b] = Math.min(100, this.bowlerStamina[b] + 0.83);
      }
    });

    this.ballsBowled++;
    this.ballsSinceWicket++;

    const striker = this.getStriker();
    if (striker) {
      striker.balls++;
      if (!isWicket) {
        striker.runs += runsScored;
      }
    }

    this.currentRuns = Math.min(this.target, this.currentRuns + runsScored);

    // Psychologist state variables
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

    // Shot generation
    const shot = { angle: shotAngle, distance: shotDistance, runs: runsScored };
    const strikerName = striker ? striker.name : "Batsman";
    if (!this.batsmanShots[strikerName]) this.batsmanShots[strikerName] = [];
    this.batsmanShots[strikerName].push(shot);

    let outBatsmanName = "";
    if (isWicket) {
      outBatsmanName = this.strikerName;
      this.wickets++;
      this.ballsSinceWicket = 0;
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

    // Strike Rotation
    if (runsScored === 1 || runsScored === 3 || runsScored === 5) {
      this.swapStrike();
    }

    const isOverEnd = this.ballsBowled % 6 === 0;
    if (isOverEnd && !this.allOut && this.wickets < 10) {
      this.swapStrike();
    }

    const overNumber = Math.floor(this.ballsBowled / 6);
    const ballInOver = this.ballsBowled % 6;
    const overDecimal = ballInOver === 0 ? overNumber : parseFloat(`${overNumber - 1}.${ballInOver}`);

    return {
      over: overDecimal,
      batsman: striker ? striker.name : "Batsman",
      bowler: bowler,
      runs: runsScored,
      event: isWicket ? "wicket" : (runsScored === 0 ? "dot" : (runsScored === 4 ? "boundary" : (runsScored === 6 ? "six" : "single"))),
      score: `${this.currentRuns}/${this.wickets}`,
      wickets: this.wickets,
      shake: isWicket || runsScored === 4 || runsScored === 6,
      commentary: eventDescription,
      batsmenStatus: this.batsmen.map(b => ({
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        strike: b.name === this.strikerName && b.active,
        out: b.out
      })),
      isOverEnd: isOverEnd,
      bowlerStamina: { ...this.bowlerStamina },
      shot: shot
    };
  }
}
