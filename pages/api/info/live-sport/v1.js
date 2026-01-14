import axios from "axios";
import crypto from "crypto";
import https from "https";
class SportsApi {
  constructor() {
    this.configMap = {
      ftb: {
        key: "football",
        apiPath: "ftb",
        quizType: 101,
        name: "Football"
      },
      bsk: {
        key: "basketball",
        apiPath: "bsk",
        quizType: 201,
        name: "Basketball"
      },
      oth: {
        key: "others",
        apiPath: "others",
        quizType: 0,
        name: "Others"
      }
    };
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://idn259.livesports055.com",
      priority: "u=1, i",
      referer: "https://idn259.livesports055.com/football.html",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.baseUrl = "https://dapiab.dimg85fkj.cfd";
    this.gateUrl = "https://cfapi.dimg85fkj.cfd";
    this.k = "a46popc8-392b-lold-a7k0-e7ydsuej";
    this.v = "sportsopsdcomdfc";
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
  }
  log(type, msg) {
    const t = new Date().toLocaleTimeString("id-ID", {
      hour12: false
    });
    console.log(`[${t}] [${type}] ${msg}`);
  }
  val(type, category) {
    const validTypes = Object.keys(this.configMap);
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid Type: '${type}'. Valid: ${validTypes.join(", ")}`);
    }
    if (isNaN(category) || category < 1) {
      throw new Error(`Invalid Category: '${category}'. Must be number >= 1`);
    }
    return this.configMap[type];
  }
  dec(text) {
    try {
      if (!text || typeof text !== "string") return null;
      const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(this.k), Buffer.from(this.v));
      let res = decipher.update(text, "hex", "utf8");
      res += decipher.final("utf8");
      return res;
    } catch (e) {
      return null;
    }
  }
  async req(method, url, params = {}, headers = {}) {
    const ts = Date.now();
    const p = {
      ...params,
      _t: ts
    };
    try {
      this.log("REQ", `${method.toUpperCase()} ${url}`);
      const res = await axios({
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...headers
        },
        params: p,
        httpsAgent: this.agent,
        paramsSerializer: obj => {
          const sp = new URLSearchParams();
          for (const [k, v] of Object.entries(obj)) {
            if (Array.isArray(v)) v.forEach(val => sp.append(k, val));
            else sp.append(k, v);
          }
          return sp.toString();
        }
      });
      const d = res?.data;
      const typeInfo = Array.isArray(d) ? `Array[${d.length}]` : d ? "Object" : "Empty";
      this.log("RES", `Status: ${res.status} | Data: ${typeInfo}`);
      return d || {};
    } catch (e) {
      const m = e?.response?.data?.msg || e.message;
      this.log("ERR", m);
      return {
        error: true,
        msg: m
      };
    }
  }
  async vc(reqs = [102, 301, 303], cat = 1) {
    return await this.req("get", `${this.baseUrl}/api/vc`, {
      reqs: reqs,
      category: cat,
      d: "idn259.livesports055.com"
    });
  }
  async sched(apiPath, lang = 4) {
    return await this.req("get", `${this.baseUrl}/api/${apiPath}/schedules`, {
      lang: lang,
      d: "idn259.livesports055.com"
    });
  }
  async chan(cat = 1) {
    return await this.req("get", `${this.baseUrl}/api/getMatchChannels`, {
      category: cat,
      d: "idn259.livesports055.com"
    });
  }
  async det(apiPath, id, lang = 1) {
    const gate = "gateb526b9a7f6bce6bf75da006c7bd959829ebe7698031b4f4df4740043c0";
    return await this.req("get", `${this.gateUrl}/${gate}/api/${apiPath}/detail`, {
      d: "play33.tigoals218.com",
      lang: lang,
      id: id
    }, {
      referer: `https://play33.tigoals218.com`
    });
  }
  async anal(id, lang = 1) {
    return await this.req("get", `${this.baseUrl}/api/score/analysis`, {
      lang: lang,
      matchId: id
    }, {
      origin: "https://play33.tigoals218.com"
    });
  }
  async h2h(apiPath, id, lang = 1) {
    return await this.req("get", `${this.baseUrl}/api/${apiPath}/battletwodata`, {
      lang: lang,
      id: id
    }, {
      origin: "https://play33.tigoals218.com"
    });
  }
  async live({
    type = "ftb",
    detail = false,
    category = 1,
    ...rest
  }) {
    this.log("PROCESS", `Init Live Fetch...`);
    let out = {
      meta: {
        ts: Date.now(),
        type: type,
        category: category
      },
      data: {}
    };
    try {
      const config = this.val(type, category);
      this.log("INFO", `Mode: ${config.name} (API: /${config.apiPath})`);
      await this.vc([102, 301, 303], category);
      const sRes = await this.sched(config.apiPath, rest.lang || 4);
      const matches = sRes?.matchList || sRes?.data?.matches || [];
      this.log("INFO", `Matches Found: ${matches.length}`);
      out.data.matches = matches;
      const targetId = rest.id || matches?.[0]?.matchId;
      if (detail && targetId) {
        this.log("PROCESS", `Fetching Detail ID: ${targetId}`);
        const d = await this.det(config.apiPath, targetId, rest.lang);
        const a = await this.anal(targetId, rest.lang);
        const h = await this.h2h(config.apiPath, targetId, rest.lang);
        const c = await this.chan(category);
        const info = d?.match || {};
        const teamMap = {};
        [...a?.teams ?? [], ...h?.teams ?? []].forEach(t => teamMap[t.id] = t.name);
        const channels = (d?.channels || []).map(ch => ({
          name: ch.name || "Stream",
          url: ch.url && ch.url.length > 40 && !ch.url.startsWith("http") ? this.dec(ch.url) : ch.url
        }));
        out.data.detail = {
          info: {
            match: `${info.homeName} vs ${info.awayName}`,
            score: `${info.homeScore}-${info.awayScore}`,
            time: info.matchTime_t,
            league: info.leagueEn,
            weather: info.weather
          },
          stats: {
            standings: (a?.leagueStandings || []).slice(0, 6).map(s => ({
              rank: s.rank,
              team: teamMap[s.teamId] || s.teamId,
              pts: s.integral
            })),
            h2h: (a?.headToHead || []).slice(0, 5).map(m => this._fmt(m, teamMap)),
            recent: (h?.matchs || []).slice(0, 5).map(m => this._fmt(m, teamMap))
          },
          media: {
            streams: channels,
            config: Array.isArray(c) ? c.find(x => x.matchId == targetId) : null
          }
        };
      }
    } catch (err) {
      this.log("FATAL", err.message);
      out.error = err.message;
    }
    return out;
  }
  _fmt(m, map) {
    return {
      date: new Date(m.matchTime_t).toLocaleDateString(),
      duel: `${map[m.homeId] || m.homeName || "H"} vs ${map[m.awayId] || m.awayName || "A"}`,
      score: `${m.homeScore}-${m.awayScore}`
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new SportsApi();
  try {
    const data = await api.live(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}