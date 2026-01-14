import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class SportsApi {
  constructor() {
    this.baseUrl = "https://connect-id.beinsports.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseUrl,
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "text/plain;charset=UTF-8",
        origin: this.baseUrl,
        priority: "u=1, i",
        referer: `${this.baseUrl}/id`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  log(type, msg) {
    const t = new Date().toLocaleTimeString("id-ID", {
      hour12: false
    });
    console.log(`[${t}] [${type}] ${msg}`);
  }
  async init() {
    this.log("PROCESS", "Initializing Session (Visiting Homepage)...");
    try {
      const res = await this.client.get("/id", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "content-type": "text/html"
        }
      });
      const cookies = await this.jar.getCookies(this.baseUrl);
      if (cookies.length > 0) {
        this.log("INFO", `Session Initialized. ${cookies.length} cookies stored.`);
        return true;
      } else {
        this.log("WARN", "Session Init completed but no cookies received.");
        return false;
      }
    } catch (e) {
      this.log("ERR", `Init Failed: ${e.message}`);
      return false;
    }
  }
  async req(payload) {
    try {
      this.log("REQ", `POST /api/service [Path: ${payload.path}]`);
      const res = await this.client.post("/api/service", payload);
      const d = res.data;
      if (d?.Success === false) {
        this.log("WARN", `API Response Success: false. Msg: ${d.Message || "Unknown"}`);
      }
      const itemCount = d?.Data?.Data?.length || d?.Data?.Items?.length || 0;
      this.log("RES", `Status: ${res.status} | Data Items: ${itemCount}`);
      return d || {};
    } catch (e) {
      this.log("ERR", `Request Error: ${e.message}`);
      return {
        error: true,
        msg: e.message
      };
    }
  }
  async live({
    genre = "",
    search = null,
    parse = true
  }) {
    this.log("PROCESS", `Starting Fetch Routine...`);
    let out = {
      meta: {
        ts: Date.now(),
        mode: search ? "SEARCH" : "MENU"
      },
      data: {}
    };
    try {
      const currentCookies = await this.jar.getCookies(this.baseUrl);
      if (currentCookies.length === 0) {
        await this.init();
      }
      if (search) {
        this.log("PROCESS", `Performing Search for: "${search}"`);
        const sRes = await this.req({
          path: "/api/layout/search",
          body: {
            SearchText: search,
            Page: 0,
            PageSize: 0
          }
        });
        if (parse) {
          this.log("PROCESS", "Parsing Search Results...");
          out.data.sections = this._parseSearchResponse(sRes);
        } else {
          out.data.raw = sRes;
        }
      } else {
        this.log("PROCESS", `Fetching Menu Genre: "${genre || "ALL"}"`);
        const mRes = await this.req({
          path: "/api/layout/menu",
          body: {
            Genre: genre
          }
        });
        if (parse) {
          this.log("PROCESS", "Parsing Menu Layout...");
          out.data.sections = this._parseMenuResponse(mRes);
        } else {
          out.data.raw = mRes;
        }
      }
    } catch (err) {
      this.log("FATAL", `Main Process Failed: ${err.message}`);
      out.error = err.message;
    }
    return out;
  }
  _parseSearchResponse(res) {
    try {
      const groups = res?.Data?.Data || [];
      return groups.map(group => {
        const type = group.Type;
        const rawItems = group.Items || [];
        let content = [];
        if (type === 4 || type === 6) {
          content = rawItems.map(i => this._fmt(i, type));
        } else if (type === 2) {
          rawItems.forEach(c => {
            const channelInfo = {
              ...c.Channel
            };
            const epgs = c.EpgList || [];
            epgs.forEach(e => {
              content.push(this._fmt({
                ...e,
                _channelInfo: channelInfo
              }, type));
            });
          });
        }
        if (content.length === 0) return null;
        return {
          sectionTitle: group.Name || `Search Type ${type}`,
          sectionType: type,
          count: group.Count || content.length,
          items: content
        };
      }).filter(Boolean);
    } catch (e) {
      this.log("ERR", `Parse Search Error: ${e.message}`);
      return [];
    }
  }
  _parseMenuResponse(res) {
    try {
      const sections = res?.Data?.Items || [];
      return sections.map(section => {
        const type = section.Type;
        const rawItems = section.Data?.Items || [];
        let content = [];
        if ([2, 4, 5, 6].includes(type)) {
          if (type === 2) {
            content = rawItems.flatMap(c => {
              const progs = c.Program || [];
              return progs.map(p => this._fmt({
                ...p,
                _channelInfo: c
              }, type));
            });
          } else {
            content = rawItems.map(i => this._fmt(i, type));
          }
        }
        if (content.length === 0) return null;
        return {
          sectionTitle: section.Name,
          sectionType: type,
          items: content
        };
      }).filter(Boolean);
    } catch (e) {
      this.log("ERR", `Parse Menu Error: ${e.message}`);
      return [];
    }
  }
  _fmt(i, type) {
    let baseData = {
      ...i
    };
    const isLive = baseData.IsLive;
    const start = baseData.EventStartTime || baseData.StartTime;
    let title = baseData.EventName || baseData.Title || baseData.Name;
    if (baseData.HomeTeamName && baseData.AwayTeamName) {
      title = `${baseData.HomeTeamName} vs ${baseData.AwayTeamName}`;
    }
    const channelName = baseData._channelInfo?.Name || baseData.ChannelName || null;
    delete baseData._channelInfo;
    return {
      ...baseData,
      _formatted: {
        title: title,
        league: baseData.ProgramName || baseData.Subtitle || "Unknown",
        status: isLive ? "LIVE" : type === 6 ? "VOD" : "UPCOMING",
        startTimeLocal: start ? new Date(start).toLocaleString("id-ID") : "-",
        channelName: channelName,
        typeLabel: this._getTypeLabel(type)
      }
    };
  }
  _getTypeLabel(type) {
    switch (type) {
      case 2:
        return "TV_GUIDE";
      case 4:
        return "UPCOMING";
      case 5:
        return "CATCHUP";
      case 6:
        return "VOD_RAIL";
      default:
        return "UNKNOWN";
    }
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