export class SimulationEngine {
  constructor() {
    this.matchId = "2026_ipl_mi_rr";
    this.target = 184;
    this.runs = 0;
    this.wickets = 0;
    this.overs = 0;
    this.balls = 0;
    this.striker = "Suryakumar Yadav";
    this.nonStriker = "Hardik Pandya";
    this.bowler = "Trent Boult";
  }

  getTeamContext() {
    return {
      matchId: this.matchId,
      batting: "MI",
      bowling: "RR",
      batsmen: {
        "Suryakumar Yadav": { aggression: 0.85, form: 0.9 },
        "Hardik Pandya": { aggression: 0.75, form: 0.8 },
        "Tim David": { aggression: 0.9, form: 0.7 }
      },
      bowlers: {
        "Trent Boult": { control: 0.85, wickets: 0.8 },
        "Yuzvendra Chahal": { control: 0.8, wickets: 0.85 },
        "Avesh Khan": { control: 0.75, wickets: 0.75 }
      }
    };
  }

  generateNextBall() {
    const probs = { dot: 0.3, single: 0.4, boundary: 0.2, wicket: 0.1 };
    const roll = Math.random();
    let outcome = "dot";
    if (roll < 0.3) outcome = "dot";
    else if (roll < 0.7) outcome = "single";
    else if (roll < 0.9) outcome = "boundary";
    else outcome = "wicket";

    this.balls++;
    this.overs = Math.floor(this.balls / 6) + (this.balls % 6) / 10;
    
    let runsScored = 0;
    if (outcome === "single") runsScored = 1;
    else if (outcome === "boundary") runsScored = 4;
    else if (outcome === "wicket") this.wickets++;

    this.runs += runsScored;

    return {
      outcome,
      runs: runsScored,
      score: `${this.runs}/${this.wickets}`,
      overs: this.overs,
      striker: this.striker,
      bowler: this.bowler
    };
  }
}
