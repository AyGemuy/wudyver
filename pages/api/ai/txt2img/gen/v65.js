import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class Nano {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://www.nanobananapro.fun",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.nanobananapro.fun",
        priority: "u=1, i",
        referer: "https://www.nanobananapro.fun/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.cred = {};
  }
  rnd() {
    const uuid = crypto.randomUUID();
    return {
      email: `${uuid}@emailhook.site`,
      password: uuid,
      name: uuid
    };
  }
  lg(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  async req(method, url, data) {
    try {
      this.lg(`Requesting ${url}...`);
      const res = await this.client({
        method: method,
        url: url,
        data: data
      });
      return res?.data || {};
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message;
      this.lg(`Error: ${errMsg}`, "FAIL");
      return null;
    }
  }
  async reg() {
    this.cred = this.rnd();
    this.lg(`Generated creds: ${this.cred.email.substring(0, 10)}...`);
    const payload = {
      email: this.cred.email,
      password: this.cred.password,
      name: this.cred.name
    };
    await this.req("POST", "/api/auth/sign-up/email", payload);
    const cookies = await this.jar.getCookies("https://www.nanobananapro.fun");
    return cookies.some(c => c.key.includes("session_token"));
  }
  async generate({
    prompt,
    ...rest
  }) {
    const cookies = await this.jar.getCookies("https://www.nanobananapro.fun");
    if (!cookies.length) {
      this.lg("No session. Auto sign-up...");
      await this.reg();
    }
    const payload = {
      mediaType: rest.mediaType || "image",
      scene: rest.scene || "text-to-image",
      provider: rest.provider || "gemini",
      model: rest.model || "gemini-3-pro-image-preview",
      prompt: prompt,
      options: rest.options || {}
    };
    this.lg(`Generating: "${prompt.substring(0, 15)}..."`);
    const res = await this.req("POST", "/api/ai/generate", payload);
    const rawData = res?.data || {};
    let parsedTaskInfo = {};
    try {
      parsedTaskInfo = rawData.taskInfo ? JSON.parse(rawData.taskInfo) : {};
    } catch (e) {
      this.lg("Error parsing taskInfo JSON", "WARN");
    }
    const imageUrl = parsedTaskInfo?.images?.[0]?.imageUrl || null;
    const output = {
      result: imageUrl,
      ...rawData,
      taskInfo: parsedTaskInfo
    };
    return res?.code === 0 && imageUrl ? (this.lg("Generation completed."), output) : (this.lg("Generation incomplete or failed.", "WARN"), output);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Nano();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}