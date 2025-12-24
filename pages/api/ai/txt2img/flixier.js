import axios from "axios";
import * as https from "https";
class FlixierAI {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://flixier.com",
      pragma: "no-cache",
      referer: "https://flixier.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      cookie: "",
      "x-xsrf-token": ""
    };
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
  }
  _parseCookieString(cookieString) {
    return cookieString.split(";").reduce((cookies, cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      if (name) {
        cookies[name] = valueParts.join("=").trim();
      }
      return cookies;
    }, {});
  }
  _serializeCookies(cookies) {
    return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  _updateCookie(setCookies) {
    if (!setCookies || setCookies.length === 0) return;
    const currentCookies = this._parseCookieString(this.headers.cookie);
    setCookies.map(cookie => cookie.split(";")[0]).forEach(newCookie => {
      const [name, value] = newCookie.trim().split("=");
      if (name) currentCookies[name] = value;
    });
    this.headers.cookie = this._serializeCookies(currentCookies);
    try {
      this.headers["x-xsrf-token"] = decodeURIComponent(currentCookies["XSRF-TOKEN"] || this.headers["x-xsrf-token"]);
    } catch (error) {
      console.error("Error decoding XSRF-TOKEN:", error);
    }
  }
  async fetchCookie() {
    try {
      const res = await axios.get("https://flixier.com/ai/ai-image-generator/ai-cartoon-generator", {
        headers: {
          ...this.headers,
          accept: "application/json, text/plain, */*"
        },
        httpsAgent: this.agent
      });
      this._updateCookie(res.headers["set-cookie"]);
    } catch (error) {
      console.error("Error fetching initial cookie:", error);
    }
  }
  async registerAnonymous() {
    try {
      const res = await axios.post("https://api.flixier.com/api/register/anonymous", {
        remember: true
      }, {
        headers: {
          ...this.headers,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json"
        },
        httpsAgent: this.agent
      });
      this._updateCookie(res.headers["set-cookie"]);
    } catch (error) {
      console.error("Error registering anonymously:", error);
    }
  }
  async generateImage({
    prompt = "anime girl",
    negative = "blur",
    style = "anime",
    ratio = "2:3"
  }) {
    await this.fetchCookie();
    await this.registerAnonymous();
    try {
      const payload = {
        prompt: prompt,
        negative_prompt: negative,
        service: "stability",
        style_preset: style,
        aspect_ratio: ratio
      };
      const res = await axios.post("https://api.flixier.com/api/predictions/text-to-image", payload, {
        headers: {
          ...this.headers,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json"
        },
        httpsAgent: this.agent
      });
      this._updateCookie(res.headers["set-cookie"]);
      const {
        id
      } = res.data || {};
      if (id) {
        let taskDetails = await this.getTaskByPredictionId(id);
        while (taskDetails && taskDetails.status !== "COMPLETED" && taskDetails.status !== "FAILED") {
          await new Promise(resolve => setTimeout(resolve, 3e3));
          taskDetails = await this.getTaskByPredictionId(id);
        }
        if (taskDetails?.status === "COMPLETED") {
          return taskDetails;
        } else if (taskDetails?.status === "FAILED") {
          console.error("Image generation failed:", taskDetails.error);
        }
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  }
  async getTaskByPredictionId(predictionId) {
    if (!predictionId) {
      console.warn("Prediction ID is required to get task details.");
      return null;
    }
    const url = `https://api.flixier.com/api/predictions/${predictionId}`;
    try {
      const res = await axios.get(url, {
        headers: this.headers,
        httpsAgent: this.agent
      });
      this._updateCookie(res.headers["set-cookie"]);
      return res.data;
    } catch (error) {
      console.error(`Error fetching task details for prediction ID ${predictionId}:`, error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ai = new FlixierAI();
  try {
    const data = await ai.generateImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}