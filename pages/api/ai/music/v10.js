import axios from "axios";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false
});
class MusicMuseAPI {
  constructor() {
    this.baseUrl = "https://www.musicmuse.ai/api";
  }
  bHeaders(extra = {}) {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      pragma: "no-cache",
      "cache-control": "no-cache",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua": '"Chromium";v="137", "Not_A Brand";v="24", "Google Chrome";v="137"',
      "sec-ch-ua-mobile": "?1",
      "sec-fetch-site": "none",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      priority: "u=1, i",
      Referer: "https://www.musicmuse.ai/id/dashboard/apps/muse",
      ...SpoofHead(),
      ...extra
    };
    console.log(`Headers dibangun:`, headers);
    return headers;
  }
  async postReq(ep, data) {
    try {
      const res = await axios.post(`${this.baseUrl}/${ep}`, data, {
        headers: this.bHeaders(),
        httpsAgent: httpsAgent
      });
      return res.data;
    } catch (error) {
      console.error(`Error during POST request to ${ep}:`, error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  }
  async getReq(ep, params) {
    try {
      const res = await axios.get(`${this.baseUrl}/${ep}`, {
        params: params,
        headers: this.bHeaders(),
        httpsAgent: httpsAgent
      });
      return res.data;
    } catch (error) {
      console.error(`Error during GET request to ${ep}:`, error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  }
  async genLyrics(prompt) {
    console.log(`Generating lyrics for prompt: "${prompt}"...`);
    const data = {
      0: {
        json: {
          prompt: prompt
        }
      }
    };
    const res = await this.postReq("music.anonymousGenerateLyrics?batch=1", data);
    return res?.["0"]?.json;
  }
  async genMusic(opts) {
    console.log(`Generating music for title: "${opts.title}"...`);
    const data = {
      0: {
        json: {
          mode: opts.mode,
          prompt: opts.prompt,
          instrumental: opts.instrumental,
          lyrics: opts.lyrics,
          style: opts.style,
          title: opts.title
        }
      }
    };
    const res = await this.postReq("music.anonymousGenerateMusic?batch=1", data);
    return res?.["0"]?.json;
  }
  async getMusicStat(musicId) {
    console.log(`Fetching status for music ID: ${musicId}...`);
    const params = {
      batch: 1,
      input: JSON.stringify({
        0: {
          json: {
            id: musicId
          }
        }
      })
    };
    const res = await this.getReq("music.getAnonymous", params);
    return res?.["0"]?.json;
  }
  async create({
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    style = "Pop, Acoustic",
    title = "Default Test Song",
    mode = "Advanced",
    prompt = "",
    instrumental = false
  } = {}) {
    const opts = {
      mode: mode,
      prompt: prompt,
      instrumental: instrumental,
      lyrics: lyrics,
      style: style,
      title: title
    };
    const response = await this.genMusic(opts);
    if (!response?.musicId) {
      console.error("Failed to initiate music generation:", response);
      throw new Error("Failed to retrieve music ID from response.");
    }
    return response;
  }
  async status({
    taskId = "cmcbq8rk4000fmcl11q9k5c0e"
  } = {}) {
    const response = await this.getMusicStat(taskId);
    if (!response) {
      throw new Error("Failed to retrieve music status from response.");
    }
    return response;
  }
  async getRandLyrics({
    prompt = "A reflective journey through a quiet forest"
  } = {}) {
    console.log(`Generating random lyrics with prompt: "${prompt}"`);
    const response = await this.genLyrics(prompt);
    if (!response?.lyrics) {
      console.error("Failed to generate lyrics:", response);
      throw new Error("Failed to retrieve lyrics from response.");
    }
    return response;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new MusicMuseAPI();
  try {
    let result;
    switch (action) {
      case "create":
        result = await api.create(params);
        break;
      case "status":
        result = await api.status(params);
        break;
      case "lyrics":
        result = await api.getRandLyrics(params);
        break;
      default:
        return res.status(400).json({
          error: "Action tidak valid. Gunakan ?action=create, ?action=status, atau ?action=lyrics"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}