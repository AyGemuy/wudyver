import axios from "axios";
import crypto from "crypto";
import qs from "querystring";
class AssistantClient {
  constructor() {
    this.base = "https://res.oiihub.com";
    this.chatBase = "https://res.oiihub.com:8090";
    this.uid = crypto.randomBytes(8).toString("hex");
    this.ftToken = crypto.randomBytes(64).toString("base64").replace(/\W/g, "");
    this.ftHash = this.md5(this.ftToken);
    this.appId = "uq9W6LkUZt";
    this.log(`Init Oii | UUID: ${this.uid}`, "INIT");
  }
  log(msg, type = "PROC") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  date() {
    const d = new Date();
    const parts = d.toString().split(" ");
    const tz = parts[5].slice(0, 6) + ":" + parts[5].slice(6);
    return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[4]} ${tz} ${parts[3]}`;
  }
  enc(str) {
    if (!str) return "";
    return encodeURIComponent(str).replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\*/g, "%2A");
  }
  sign(path, params = {}, body = {}, headers = {}) {
    const map = new Map();
    Object.keys(headers).forEach(k => k.startsWith("oii-") && map.set(k, this.enc(headers[k])));
    Object.keys(params).forEach(k => map.set(k, this.enc(params[k])));
    Object.keys(body).forEach(k => {
      const val = typeof body[k] === "object" ? JSON.stringify(body[k]) : String(body[k]);
      map.set(k, this.enc(val));
    });
    const str = Array.from(map.keys()).sort().reduce((acc, k) => acc + `|${k}:${map.get(k)}`, "");
    return this.md5(path + str);
  }
  async req(method, path, data = null, params = {}, isStream = false) {
    const url = isStream ? `${this.chatBase}${path}` : `${this.base}${path}`;
    const ts = this.date();
    const h = {
      "User-Agent": "okhttp/4.11.0",
      "Accept-Encoding": "gzip",
      "oii-appid": this.appId,
      "oii-v": "37",
      "oii-ft": this.ftHash,
      "oii-ts": ts,
      "oii-code": "ID",
      "oii-lang": "id",
      "oii-platform": "android",
      "oii-phone": "RMX3890",
      "oii-uuid": this.uid
    };
    if (isStream) {
      h["Content-Type"] = "application/x-www-form-urlencoded";
      h["Connection"] = "close";
      h["Accept"] = "text/event-stream";
    }
    h["sign"] = this.sign(path, params, method === "POST" ? data : {}, h);
    try {
      this.log(`${method} ${url}`);
      const res = await axios({
        method: method,
        url: url,
        headers: h,
        params: params,
        data: isStream ? qs.stringify(data) : data,
        responseType: isStream ? "text" : "json"
      });
      return res.data;
    } catch (e) {
      this.log(`Req Err: ${e.message}`, "ERR");
      return null;
    }
  }
  async bots() {
    try {
      this.log("Fetching bots list...");
      const res = await this.req("GET", "/groupBots");
      return res?.data || [];
    } catch (error) {
      this.log("Bots Fetch Failed", "ERR");
      return [];
    }
  }
  async chat({
    prompt,
    list,
    ...rest
  }) {
    try {
      const msg = prompt || "Hello";
      const botId = rest?.bot || 28;
      const gpt = rest?.gpt || 3;
      this.log(`Start Chat: "${msg}" (ID: ${botId})`);
      const botListData = list ? await this.bots() : undefined;
      const body = {
        format: "markdown",
        message: msg,
        gpt: gpt,
        bot: botId,
        param: JSON.stringify({
          1: "Default",
          2: "Default",
          4: "Default"
        })
      };
      const raw = await this.req("POST", "/gpt/stream", body, {}, true);
      const text = (raw || "").split("\n").filter(l => l.startsWith("data:o:")).map(l => l.slice(7)).join("");
      const success = (raw || "").includes("event:stop");
      this.log(`Chat Finished. Success: ${success}`);
      return {
        result: text || "No Response",
        success: success,
        botId: botId,
        ...list && {
          availableBots: botListData
        }
      };
    } catch (e) {
      this.log(`Chat Exception: ${e.message}`, "ERR");
      return {
        result: null,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AssistantClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan sistem."
    });
  }
}