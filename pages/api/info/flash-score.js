import axios from "axios";
class SportsDataFetcher {
  constructor() {
    this.baseUrl = "https://global.flashscore.ninja/76/x/feed/";
    this.headers = {
      accept: "*/*",
      origin: "https://www.livescore.in",
      referer: "https://www.livescore.in/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Mobile Safari/537.36",
      "x-fsign": "SW9D1eZo",
      "x-geoip": "1"
    };
    this.sportList = {
      soccer: 1,
      tennis: 2,
      basketball: 3,
      hockey: 4,
      "american-football": 5,
      baseball: 6,
      handball: 7,
      "rugby-union": 8,
      floorball: 9,
      bandy: 10,
      futsal: 11,
      volleyball: 12,
      cricket: 13,
      darts: 14,
      snooker: 15,
      boxing: 16,
      "beach-volleyball": 17,
      "aussie-rules": 18,
      "rugby-league": 19,
      badminton: 21,
      "water-polo": 22,
      golf: 23,
      "field-hockey": 24,
      "table-tennis": 25,
      "beach-soccer": 26,
      mma: 28,
      netball: 29
    };
    this.keyMappings = {
      AA: "event_id",
      AC: "stage_id",
      AB: "stage_type",
      SA: "sport_id",
      AD: "start_uts",
      A1: "feed_signature",
      A2: "refresh_uts",
      AR: "period_update_uts",
      ND: "match_time",
      ZA: "tournament_name",
      ZC: "tournament_stage_id",
      AG: "home_current_score",
      AT: "home_final_score",
      AJ: "home_red_cards",
      BA: "home_score_p1",
      BC: "home_score_p2",
      BE: "home_score_p3",
      BG: "home_score_p4",
      BI: "home_score_p5",
      BS: "home_score_px",
      AH: "away_current_score",
      AU: "away_final_score",
      AK: "away_red_cards",
      BB: "away_score_p1",
      BD: "away_score_p2",
      BF: "away_score_p3",
      BH: "away_score_p4",
      BJ: "away_score_p5",
      BT: "away_score_px",
      GDA: "home_goal_disallowed",
      GDB: "away_goal_disallowed",
      SCA: "home_score_changed",
      SCB: "away_score_changed",
      EA: "home_penalty_shot",
      EB: "away_penalty_shot",
      EC: "home_penalty_missed",
      ED: "away_penalty_missed"
    };
  }
  parseSection(sectionString) {
    const obj = {};
    if (!sectionString) return obj;
    const keyValuePairs = sectionString.split("¬");
    keyValuePairs.forEach(pair => {
      const parts = pair.split("÷");
      const originalKey = parts[0].trim();
      let value = parts.length > 1 ? parts.slice(1).join("÷").trim() : "";
      if (originalKey) {
        if (value.startsWith("{") && value.endsWith("}") || value.startsWith("[") && value.endsWith("]")) {
          try {
            value = JSON.parse(value);
          } catch (e) {}
        }
        const finalKey = this.keyMappings[originalKey] || originalKey;
        obj[finalKey] = value;
      }
    });
    return obj;
  }
  parseFlashscoreData(dataString) {
    const result = {
      sport_info: {},
      leagues: []
    };
    const blocks = dataString.split("~").filter(block => block);
    let currentLeague = null;
    blocks.forEach(block => {
      if (block.startsWith("SA÷")) {
        Object.assign(result.sport_info, this.parseSection(block));
      } else if (block.startsWith("ZA÷")) {
        currentLeague = {
          info: {},
          matches: []
        };
        Object.assign(currentLeague.info, this.parseSection(block));
        result.leagues.push(currentLeague);
      } else if (block.startsWith("AA÷")) {
        if (currentLeague) {
          const match = this.parseSection(block);
          currentLeague.matches.push(match);
        }
      }
    });
    return result;
  }
  async detail({
    id
  }) {
    if (!id) throw new Error("Match ID is required");
    try {
      const url = `${this.baseUrl}df_sui_4_${id}`;
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 1e4
      });
      return this.parseFlashscoreData(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch match details: ${error.message}`);
    }
  }
  async feed(options = {}) {
    const {
      sport = "soccer"
    } = options;
    const sportId = typeof sport === "string" ? this.sportList[sport] : sport;
    if (!sportId) throw new Error(`Invalid sport: ${sport}`);
    const url = `${this.baseUrl}f_${sportId}_0_8_in_4`;
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 1e4
      });
      return this.parseFlashscoreData(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch feed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "feed | detail"
      }
    });
  }
  const dataFetcher = new SportsDataFetcher();
  try {
    let result;
    switch (action) {
      case "feed":
        result = await dataFetcher.feed(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await dataFetcher.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: feed | detail`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}