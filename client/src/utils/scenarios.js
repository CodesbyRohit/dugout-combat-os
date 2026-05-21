export const SCENARIOS = {
  ind_vs_pak_2022: {
    name: "IND vs PAK (T20 World Cup 2022)",
    venue: "Melbourne Cricket Ground (MCG)",
    battingTeam: "India",
    bowlingTeam: "Pakistan",
    target: 160,
    startingScore: 112,
    startingWickets: 4,
    startingOvers: 17,
    balls: [
      // Over 18 (Shaheen Shah Afridi bowling) - 48 needed off 18
      {
        over: 17.1,
        batsman: "Virat Kohli",
        bowler: "Shaheen Afridi",
        runs: 1,
        event: "single",
        score: "113/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 88, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 80, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "Afridi starts with a full length delivery on pads, Kohli flicks it to deep square leg for a single."
      },
      {
        over: 17.2,
        batsman: "Hardik Pandya",
        bowler: "Shaheen Afridi",
        runs: 1,
        event: "single",
        score: "114/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 87, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 78, stability: "MODERATE", certainty: "DIVERGENT" }
        },
        commentary: "Slower short ball, Pandya pulls it to deep midwicket to rotate strike."
      },
      {
        over: 17.3,
        batsman: "Virat Kohli",
        bowler: "Shaheen Afridi",
        runs: 4,
        event: "boundary",
        score: "118/4",
        wickets: 4,
        shake: true,
        confidence: {
          analyst: { value: 82, stability: "MODERATE", certainty: "STABLE" },
          scout: { value: 85, stability: "HIGH", certainty: "ALIGNED" }
        },
        commentary: "FOUR! What a shot! Short of a length outside off, Kohli stands tall and punches it beautifully through extra cover!"
      },
      {
        over: 17.4,
        batsman: "Virat Kohli",
        bowler: "Shaheen Afridi",
        runs: 4,
        event: "boundary",
        score: "122/4",
        wickets: 4,
        shake: true,
        confidence: {
          analyst: { value: 80, stability: "MODERATE", certainty: "STABLE" },
          scout: { value: 74, stability: "VOLATILE", certainty: "DIVERGENT" }
        },
        commentary: "FOUR MORE! Short ball on hips, Kohli clears his front leg and pulls it past short fine leg! The crowd goes wild!"
      },
      {
        over: 17.5,
        batsman: "Virat Kohli",
        bowler: "Shaheen Afridi",
        runs: 2,
        event: "double",
        score: "124/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 85, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 82, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "Excellent running! Cut away past point, Kohli pushes hard for the second and beats the throw."
      },
      {
        over: 17.6,
        batsman: "Virat Kohli",
        bowler: "Shaheen Afridi",
        runs: 5,
        event: "boundary",
        score: "129/4",
        wickets: 4,
        shake: true,
        confidence: {
          analyst: { value: 78, stability: "VOLATILE", certainty: "DEBATED" },
          scout: { value: 68, stability: "VOLATILE", certainty: "DIVERGENT" }
        },
        commentary: "Incredible! Smashed down to long-on for a single, but a wild throw results in 4 overthrows! 5 runs gifted!"
      },
      // Over 19 (Haris Rauf bowling) - 31 needed off 12
      {
        over: 18.1,
        batsman: "Hardik Pandya",
        bowler: "Haris Rauf",
        runs: 1,
        event: "single",
        score: "130/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 82, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 80, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "Rauf fires a 145kph delivery on a good length. Pandya taps it to long-on for a single."
      },
      {
        over: 18.2,
        batsman: "Virat Kohli",
        bowler: "Haris Rauf",
        runs: 1,
        event: "single",
        score: "131/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 80, stability: "MODERATE", certainty: "STABLE" },
          scout: { value: 76, stability: "MODERATE", certainty: "ALIGNED" }
        },
        commentary: "Kohli backs away and punches a hard length delivery to deep cover for one."
      },
      {
        over: 18.3,
        batsman: "Hardik Pandya",
        bowler: "Haris Rauf",
        runs: 0,
        event: "dot",
        score: "131/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 72, stability: "VOLATILE", certainty: "DIVERGENT" },
          scout: { value: 64, stability: "VOLATILE", certainty: "DEBATED" }
        },
        commentary: "DOT BALL! Searing bounce! Hardik looks to pull but gets beaten by sheer pace. Critical dot!"
      },
      {
        over: 18.4,
        batsman: "Hardik Pandya",
        bowler: "Haris Rauf",
        runs: 1,
        event: "single",
        score: "132/4",
        wickets: 4,
        shake: false,
        confidence: {
          analyst: { value: 68, stability: "CRITICAL", certainty: "DIVERGENT" },
          scout: { value: 58, stability: "VOLATILE", certainty: "DEBATED" }
        },
        commentary: "Hardik top-edges a pull shot, it falls safely short of deep square leg. Only a single. 28 needed off 8 balls."
      },
      {
        over: 18.5,
        batsman: "Virat Kohli",
        bowler: "Haris Rauf",
        runs: 6,
        event: "six",
        score: "138/4",
        wickets: 4,
        shake: true,
        confidence: {
          analyst: { value: 76, stability: "VOLATILE", certainty: "DEBATED" },
          scout: { value: 60, stability: "VOLATILE", certainty: "DIVERGENT" }
        },
        commentary: "SIX!!! IMPOSSIBLE SHOT! Haris Rauf bowls a slower back-of-a-length delivery, and Kohli punches it straight back over the bowler's head, flat and into the sight-screen! Absolute genius!"
      },
      {
        over: 18.6,
        batsman: "Virat Kohli",
        bowler: "Haris Rauf",
        runs: 6,
        event: "six",
        score: "144/4",
        wickets: 4,
        shake: true,
        confidence: {
          analyst: { value: 82, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 78, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "SIX MORE!!! HE HAS DONE IT AGAIN! Short, on fine leg, Kohli just uses the pace and flicks it over fine leg for six! The MCG has erupted!"
      },
      // Over 20 (Mohammad Nawaz bowling) - 16 needed off 6
      {
        over: 19.1,
        batsman: "Hardik Pandya",
        bowler: "Mohammad Nawaz",
        runs: 0,
        event: "wicket",
        score: "144/5",
        wickets: 5,
        shake: true,
        confidence: {
          analyst: { value: 70, stability: "CRITICAL", certainty: "DIVERGENT" },
          scout: { value: 85, stability: "HIGH", certainty: "DEBATED" }
        },
        commentary: "WICKET! Pandya goes! Slices it high in the air, caught at short third-man. A massive blow for India! Nawaz strikes first ball!"
      },
      {
        over: 19.2,
        batsman: "Dinesh Karthik",
        bowler: "Mohammad Nawaz",
        runs: 1,
        event: "single",
        score: "145/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 68, stability: "CRITICAL", certainty: "DIVERGENT" },
          scout: { value: 80, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "Karthik sweep shot, gets off strike with a single to deep square leg. 15 needed off 4 balls."
      },
      {
        over: 19.3,
        batsman: "Virat Kohli",
        bowler: "Mohammad Nawaz",
        runs: 2,
        event: "double",
        score: "147/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 74, stability: "VOLATILE", certainty: "STABLE" },
          scout: { value: 78, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "Superb running again! Driven down to long-on, they sprint back for the second run. 13 needed off 3."
      },
      {
        over: 19.4,
        batsman: "Virat Kohli",
        bowler: "Mohammad Nawaz",
        runs: 7,
        event: "six_noball",
        score: "154/5",
        wickets: 5,
        shake: true,
        confidence: {
          analyst: { value: 65, stability: "CRITICAL", certainty: "DEBATED" },
          scout: { value: 60, stability: "CRITICAL", certainty: "DIVERGENT" }
        },
        commentary: "SIX AND A NO-BALL!!! HIGH DRAMA! High full toss, Kohli launches it over deep square leg for six! The umpire signals a no-ball for height! Pakistan protests but it stands! Free hit coming up!"
      },
      {
        over: 19.4,
        batsman: "Virat Kohli",
        bowler: "Mohammad Nawaz",
        runs: 1,
        event: "wide",
        score: "155/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 78, stability: "VOLATILE", certainty: "STABLE" },
          scout: { value: 72, stability: "MODERATE", certainty: "ALIGNED" }
        },
        commentary: "WIDE! Nawaz bowls it way outside off, Kohli leaves it. The pressure is getting to Nawaz! Free hit stays."
      },
      {
        over: 19.4,
        batsman: "Virat Kohli",
        bowler: "Mohammad Nawaz",
        runs: 3,
        event: "byes",
        score: "158/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 75, stability: "VOLATILE", certainty: "DIVERGENT" },
          scout: { value: 68, stability: "VOLATILE", certainty: "DEBATED" }
        },
        commentary: "BOWLED BUT IT'S A FREE HIT! Nawaz bowls Kohli, but they can run! The ball ricochets off the stumps to third-man, Kohli and Karthik run 3 byes! Unbelievable chaos!"
      },
      {
        over: 19.5,
        batsman: "Dinesh Karthik",
        bowler: "Mohammad Nawaz",
        runs: 0,
        event: "wicket",
        score: "158/6",
        wickets: 6,
        shake: true,
        confidence: {
          analyst: { value: 60, stability: "CRITICAL", certainty: "DIVERGENT" },
          scout: { value: 70, stability: "VOLATILE", certainty: "DEBATED" }
        },
        commentary: "OUT! Karthik is stumped! He goes down the track, misses the sweep, and Rizwan whips the bails off! 2 needed off 1 ball! Ashwin walks in!"
      },
      {
        over: 19.5,
        batsman: "Ravichandran Ashwin",
        bowler: "Mohammad Nawaz",
        runs: 1,
        event: "wide",
        score: "159/6",
        wickets: 6,
        shake: false,
        confidence: {
          analyst: { value: 80, stability: "VOLATILE", certainty: "STABLE" },
          scout: { value: 92, stability: "HIGH", certainty: "ALIGNED" }
        },
        commentary: "WIDE! Ashwin stands completely still, Nawaz tries to bowl down leg side, and it drifts wide! Genius awareness from Ashwin! Scores level!"
      },
      {
        over: 19.6,
        batsman: "Ravichandran Ashwin",
        bowler: "Mohammad Nawaz",
        runs: 1,
        event: "single",
        score: "160/6",
        wickets: 6,
        shake: true,
        confidence: {
          analyst: { value: 99, stability: "STABLE", certainty: "STABLE" },
          scout: { value: 99, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "INDIA WINS! Ashwin chips it over mid-off, sprints for a single, and raises his arms in triumph! One of the greatest chases in cricket history is complete!"
      }
    ]
  },
  mi_vs_csk_2019: {
    name: "MI vs CSK (IPL 2019 Final)",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    battingTeam: "Chennai Super Kings",
    bowlingTeam: "Mumbai Indians",
    target: 150,
    startingScore: 141,
    startingWickets: 5,
    startingOvers: 19,
    balls: [
      // Over 20 (Lasith Malinga bowling) - 9 needed off 6
      {
        over: 19.1,
        batsman: "Shane Watson",
        bowler: "Lasith Malinga",
        runs: 2,
        event: "double",
        score: "143/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 85, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 82, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "Malinga bowls a yorker, Watson digs it out to deep midwicket and sprints back for two."
      },
      {
        over: 19.2,
        batsman: "Shane Watson",
        bowler: "Lasith Malinga",
        runs: 1,
        event: "single",
        score: "144/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 82, stability: "HIGH", certainty: "STABLE" },
          scout: { value: 76, stability: "MODERATE", certainty: "ALIGNED" }
        },
        commentary: "Low full toss, Watson drives it to long-on for a single. Watson gets to 80 runs."
      },
      {
        over: 19.3,
        batsman: "Ravindra Jadeja",
        bowler: "Lasith Malinga",
        runs: 2,
        event: "double",
        score: "146/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 74, stability: "MODERATE", certainty: "DIVERGENT" },
          scout: { value: 82, stability: "STABLE", certainty: "DEBATED" }
        },
        commentary: "Jadeja flicks a full delivery to deep midwicket, they run hard and get two. 4 needed off 3."
      },
      {
        over: 19.4,
        batsman: "Ravindra Jadeja",
        bowler: "Lasith Malinga",
        runs: 1,
        event: "single",
        score: "147/5",
        wickets: 5,
        shake: false,
        confidence: {
          analyst: { value: 76, stability: "MODERATE", certainty: "STABLE" },
          scout: { value: 70, stability: "VOLATILE", certainty: "ALIGNED" }
        },
        commentary: "Slower delivery outside off, Jadeja steers it to deep cover for a single to put Watson back on strike."
      },
      {
        over: 19.5,
        batsman: "Shane Watson",
        bowler: "Lasith Malinga",
        runs: 0,
        event: "wicket",
        score: "148/6",
        wickets: 6,
        shake: true,
        confidence: {
          analyst: { value: 60, stability: "CRITICAL", certainty: "DIVERGENT" },
          scout: { value: 86, stability: "HIGH", certainty: "DEBATED" }
        },
        commentary: "RUN OUT! Shane Watson is gone! He taps it to deep point, runs for one, wants the second, but Krunal Pandya fires a perfect throw and de Kock whips the bails off! Watson falls on 80! Shardul Thakur comes in. 2 needed off 1!"
      },
      {
        over: 19.6,
        batsman: "Shardul Thakur",
        bowler: "Lasith Malinga",
        runs: 0,
        event: "wicket",
        score: "148/7",
        wickets: 7,
        shake: true,
        confidence: {
          analyst: { value: 99, stability: "STABLE", certainty: "STABLE" },
          scout: { value: 99, stability: "STABLE", certainty: "ALIGNED" }
        },
        commentary: "WICKET! MUMBAI INDIANS ARE IPL 2019 CHAMPIONS! Malinga bowls a legendary slower yorker, Thakur misses the flick, hit on the pad, massive appeal, and the umpire raises the finger! LBW! MI wins by 1 run!"
      }
    ]
  }
};

export const DISAGREEMENTS = {
  ind_vs_pak_2022: {
    "17.1": {
      analyst: "Win probability stands at 21%. India has a high statistical hurdle; the required run rate is 16.36.",
      scout: "Tactically, statistics ignore Shaheen's match fitness tonight. His foot landing is slightly off. Kohli can target the legs if Shaheen tries to swing."
    },
    "17.2": {
      analyst: "Pressure has surged to 78%. India required 46 off 16. The win pathway has narrowed to just 19%.",
      scout: "I disagree with the Analyst's focus on boundaries. The tactical victory lies in running. Pakistan's boundary sweepers are deep; doubles are easily available."
    },
    "17.4": {
      analyst: "Required runs drop to 38. Win probability has scaled up to 32% after back-to-back boundaries.",
      scout: "Caution: Afridi is adjusting. The Scout advises Kohli to watch for the slow cutter; swinging early at this speed carries high edge risks."
    },
    "17.6": {
      analyst: "Five runs gifted on overthrows. Statistical models project this as the defining turning point of the innings. India at 41%.",
      scout: "Dissent: The tactical fault lies in Pakistan's backing up. This is a mental breakdown, not just overthrows. Bowlers will spray wide now."
    },
    "18.3": {
      analyst: "Pressure index hits 88% after Rauf's dot ball. India's win probability dips back to 24%.",
      scout: "Analyst focuses on the dot, but tactically Rauf is predictable now. He is forcing the batsman back. Kohli must walk down the crease to counter."
    },
    "18.4": {
      analyst: "Required rate has crossed 21 runs per over. The models forecast an India defeat. Win probability drops to 15%.",
      scout: "I disagree with the model's defeatism. Kohli is deliberately conserving energy. Rauf is bowling his final deliveries; Kohli is timing his launch."
    },
    "18.5": {
      analyst: "An incredible six! Required runs drop to 22. Win probability climbs to 38%.",
      scout: "The Analyst notes the score, but Rauf's length was actually decent. Kohli's shot was high risk. If Pakistan keeps bowling full yorkers, they hold the edge."
    },
    "19.1": {
      analyst: "Pandya caught! Win probability slips to 32%. Pressure index: 92%. COLLAPSE ALERT.",
      scout: "This is not a collapse. Pandya's wicket gets Karthik on strike, which is a tactical upgrade against Nawaz's left-arm spin match-up."
    },
    "19.4": {
      analyst: "NO-BALL SIX! Required runs drop to 6. India win probability rises to 72%.",
      scout: "High volatility. Nawaz is cracking under pressure, but India must not get ahead. A single mistake on the free-hit could result in a run-out."
    },
    "19.5": {
      analyst: "Karthik stumped! Required 2 off 1. Win probability: 60%. Pressure index: 98%.",
      scout: "I disagree with the panic. Nawaz is forced to bowl to Ashwin who is a calm batsman. Nawaz has lost his length; look for a wide down leg."
    }
  },
  mi_vs_csk_2019: {
    "19.3": {
      analyst: "CSK requires 4 off 3. Win probability rises to 78% for Chennai. MI is fading.",
      scout: "I disagree. Rohit Sharma is instructing Malinga to bowl slower balls. Jadeja is eager to sweep; Malinga is baiting a leading edge."
    },
    "19.5": {
      analyst: "Shane Watson run out on 80! Score: 148/6. Win probability swings to a dead heat: 50-50.",
      scout: "CSK has the tactical disadvantage now. Shardul Thakur is vulnerable to yorkers. MI has fielders in the ring; no boundaries will be allowed."
    }
  }
};
