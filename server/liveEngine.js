/**
 * DUGOUT Live Match Engine
 * 
 * Probabilistic ball-by-ball cricket simulator.
 * Dynamically adjusts probabilities based on required run rate, death overs,
 * and recent wickets to simulate realistic cricket pacing, volatility, and tension.
 */

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
    this.currentBowlerIndex = 0; // Starts with Shaheen Afridi for over 18 (balls 103-108)
    this.ballsSinceWicket = 0;
    this.allOut = false;
  }

  initialize(scenarioId, scenario) {
    this.target = scenario.target;
    this.currentRuns = scenario.startingScore || 0;
    this.wickets = scenario.startingWickets || 0;
    this.ballsBowled = (scenario.startingOvers || 0) * 6;
    this.allOut = false;
    this.ballsSinceWicket = 0;

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
    // Shaheen Afridi (18th over, balls 103-108)
    // Haris Rauf (19th over, balls 109-114)
    // Mohammad Nawaz (20th over, balls 115-120)
    const overNum = Math.floor(this.ballsBowled / 6);
    if (overNum === 17) return this.bowlers[0]; // Shaheen Afridi
    if (overNum === 18) return this.bowlers[1]; // Haris Rauf
    return this.bowlers[2]; // Mohammad Nawaz or default fallback
  }

  generateNextBall() {
    if (this.ballsBowled >= 120 || this.wickets >= 10 || this.currentRuns >= this.target) {
      return null;
    }

    const ballsRemaining = 120 - this.ballsBowled;
    const runsNeeded = Math.max(0, this.target - this.currentRuns);
    const requiredRR = (runsNeeded / ballsRemaining) * 6;
    
    // Death Over (20th over, ballsBowled >= 114) increases volatility
    const isDeathOver = this.ballsBowled >= 114;
    // Quiet Over (19th over, balls 109 to 114) reduces intensity
    const isQuietOver = this.ballsBowled >= 108 && this.ballsBowled < 114;

    // 1. Calculate Base Probabilities
    let probs = {
      dot: 0.28,
      single: 0.38,
      double: 0.12,
      boundary: 0.12,
      six: 0.06,
      wicket: 0.04
    };

    // 2. Adjust probabilities based on state (Intent / Pressure)
    if (requiredRR > 12) {
      // High required rate: High Risk aggression
      probs.six += 0.06;
      probs.boundary += 0.04;
      probs.wicket += 0.03;
      probs.single -= 0.05;
      probs.dot -= 0.08;
    } else if (requiredRR > 8) {
      // Moderate required rate: Tense build-up
      probs.six += 0.03;
      probs.boundary += 0.02;
      probs.wicket += 0.01;
      probs.dot -= 0.06;
    } else if (requiredRR < 5) {
      // Low required rate: Keep it safe
      probs.dot += 0.08;
      probs.single += 0.04;
      probs.boundary -= 0.04;
      probs.six -= 0.05;
      probs.wicket -= 0.02;
    }

    // Quiet over adjustment (builds a realistic pacing gap)
    if (isQuietOver) {
      probs.dot += 0.10;
      probs.single += 0.05;
      probs.boundary -= 0.07;
      probs.six -= 0.04;
      probs.wicket -= 0.02;
    }

    // Wicket consolidation: lower aggression if wicket fell very recently
    if (this.ballsSinceWicket > 0 && this.ballsSinceWicket <= 3) {
      probs.six -= 0.04;
      probs.boundary -= 0.04;
      probs.wicket -= 0.01;
      probs.single += 0.04;
      probs.dot += 0.05;
    }

    // Death over volatility booster
    if (isDeathOver) {
      probs.six += 0.06;
      probs.boundary += 0.02;
      probs.wicket += 0.03;
      probs.dot -= 0.07;
      probs.single -= 0.04;
    }

    // Ensure no negative probabilities
    Object.keys(probs).forEach(k => {
      if (probs[k] < 0.01) probs[k] = 0.01;
    });

    // Normalize probabilities to sum up to 1.0
    const sum = Object.values(probs).reduce((a, b) => a + b, 0);
    Object.keys(probs).forEach(k => {
      probs[k] = probs[k] / sum;
    });

    // 3. Roll outcome
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

    // 4. Update state variables
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

    // Update batsman stats
    const striker = this.getStriker();
    if (striker) {
      striker.balls++;
      if (!isWicket) {
        striker.runs += runsScored;
      }
    }

    this.currentRuns = Math.min(this.target, this.currentRuns + runsScored);

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

    // Strike Rotation logic:
    // Rotate strike on odd runs (1 or 3 runs)
    if (runsScored === 1 || runsScored === 3) {
      this.swapStrike();
    }

    // Rotate strike at the end of the over (6 balls)
    const isOverEnd = this.ballsBowled % 6 === 0;
    if (isOverEnd && !this.allOut && this.wickets < 10) {
      this.swapStrike();
    }

    // Generate over decimal format
    const overNumber = Math.floor(this.ballsBowled / 6);
    const ballInOver = this.ballsBowled % 6;
    const overDecimal = ballInOver === 0 ? overNumber : parseFloat(`${overNumber - 1}.${ballInOver}`);

    // Generate commentary
    const batsmanText = isWicket ? outBatsmanName : this.strikerName;
    const bowlerText = this.getBowler();
    const commentary = this._generateCommentary(outcome, batsmanText, bowlerText);

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
      isOverEnd: isOverEnd
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
