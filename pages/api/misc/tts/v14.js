import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
class TTSMp3 {
  constructor() {
    this.baseURL = "https://ttsmp3.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: this.baseURL,
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async create({
    ai = true,
    text = "hello",
    lang = "alloy",
    speed = "1.00"
  }) {
    const endpoint = ai ? "/makemp3_ai.php" : "/makemp3_new.php";
    const referer = ai ? `${this.baseURL}/ai` : `${this.baseURL}/`;
    const data = {
      msg: text,
      lang: lang,
      source: "ttsmp3"
    };
    if (ai) data.speed = speed;
    try {
      const res = await axios.post(this.baseURL + endpoint, qs.stringify(data), {
        headers: {
          ...this.headers,
          referer: referer
        }
      });
      return res.data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async list({
    ai = false
  }) {
    const url = ai ? `${this.baseURL}/ai` : this.baseURL;
    try {
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: url
        }
      });
      const $ = cheerio.load(res.data);
      const voices = [];
      $("#sprachwahl option").each((_, el) => {
        const value = $(el).attr("value");
        const label = $(el).text().trim();
        if (value) voices.push({
          value: value,
          label: label
        });
      });
      return voices;
    } catch (err) {
      return {
        error: err.message
      };
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
        action: "list | create"
      }
    });
  }
  const mic = new TTSMp3();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action](params);
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}