/**
 * Cricbuzz / CricAPI Ingestion Adapter Abstraction Layer
 * 
 * This module abstracts the ingestion of real-time cricket data feeds.
 * For this prototype/hackathon presentation, it provides a mock ingestion mode 
 * that generates realistic live raw payload structures, but it is structured
 * to easily plug in active Cricbuzz or CricAPI REST/WebSocket API endpoints.
 */
export class CricbuzzAdapter {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.CRIC_API_KEY || "";
    this.apiBaseUrl = config.apiBaseUrl || "https://api.cricapi.com/v1";
    this.useMock = config.useMock !== undefined ? config.useMock : true;
  }

  /**
   * Fetches real-time score updates for a specific match ID.
   * If useMock is true, returns realistic raw API JSON payloads mimicking Cricbuzz structure.
   */
  async getLiveMatchFeed(matchId) {
    if (this.useMock) {
      return this._generateMockLiveFeed(matchId);
    }

    try {
      // Example of actual API Integration:
      // const response = await fetch(`${this.apiBaseUrl}/match_info?apikey=${this.apiKey}&id=${matchId}`);
      // if (!response.ok) throw new Error("CricAPI request failed");
      // const rawData = await response.json();
      // return this._normalizePayload(rawData);
      throw new Error("API keys not configured. Falling back to Mock feed.");
    } catch (error) {
      console.warn("CricbuzzAdapter: Real endpoint failed, using mock data.", error.message);
      return this._generateMockLiveFeed(matchId);
    }
  }

  /**
   * Normalizes raw Cricbuzz/CricAPI JSON formats into the internal DUGOUT telemetry schema.
   */
  normalize(rawFeed) {
    // Normalization logic: maps Cricbuzz JSON fields to DUGOUT properties
    return {
      matchId: rawFeed.id,
      matchName: rawFeed.matchTitle,
      venue: rawFeed.venue,
      overs: parseFloat(rawFeed.liveScore.overs),
      runs: parseInt(rawFeed.liveScore.runs),
      wickets: parseInt(rawFeed.liveScore.wickets),
      target: rawFeed.target,
      batsmanStriker: rawFeed.liveScore.batsmen.find(b => b.strike)?.name || "Batsman A",
      batsmanNonStriker: rawFeed.liveScore.batsmen.find(b => !b.strike)?.name || "Batsman B",
      bowler: rawFeed.liveScore.bowler?.name || "Bowler X",
      lastBallOutcome: rawFeed.liveScore.lastBall,
      commentary: rawFeed.liveScore.commentaryText
    };
  }

  /**
   * Mock generator representing CricAPI / Cricbuzz JSON layout
   */
  _generateMockLiveFeed(matchId) {
    if (matchId === "mi_vs_rr_2026") {
      return {
        id: matchId,
        matchTitle: "MI vs RR (IPL 2026 Live Match)",
        venue: "Wankhede Stadium, Mumbai",
        target: 184,
        status: "In Progress",
        liveScore: {
          overs: "16.0",
          runs: "142",
          wickets: "4",
          batsmen: [
            { name: "Suryakumar Yadav", runs: 54, balls: 32, strike: true },
            { name: "Hardik Pandya", runs: 18, balls: 11, strike: false }
          ],
          bowler: { name: "Trent Boult", overs: "3.0", wickets: "1", runs: 28 },
          lastBall: "1",
          commentaryText: "Trent Boult finishes the 16th over. Rajasthan Royals are squeezing the runs, but Mumbai Indians have firepower remaining."
        }
      };
    }
    // Mimic the actual schema returned by sports APIs
    return {
      id: matchId,
      matchTitle: "IND vs PAK (Live Match Engine)",
      venue: "Melbourne Cricket Ground (MCG)",
      target: 160,
      status: "In Progress",
      liveScore: {
        overs: "17.0",
        runs: "112",
        wickets: "4",
        batsmen: [
          { name: "Virat Kohli", runs: 42, balls: 31, strike: true },
          { name: "Hardik Pandya", runs: 28, balls: 24, strike: false }
        ],
        bowler: { name: "Shaheen Afridi", overs: "3.0", wickets: "1", runs: 24 },
        lastBall: "1",
        commentaryText: "Shaheen Afridi finishes the over. Time for the death-overs strategic battle."
      }
    };
  }
}
