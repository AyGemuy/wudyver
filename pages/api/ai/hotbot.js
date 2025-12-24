import WebSocket from "ws";
import {
  URL
} from "url";
import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class HotbotAssistant {
  constructor(url = "wss://assistant.hotbot.com/", baseUrl = "https://www.hotbot.com/") {
    this.url = url;
    this.baseUrl = baseUrl;
    this.ws = null;
    this.conId = null;
    this.newActId = null;
    this.pendingPromises = {};
    this.isInitialized = false;
    this.actor = "";
    this.key = "";
    this.auth = "";
    this.ip = "51.159.225.199";
    this.cinfo = {
      ip: this.ip,
      ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ref: null,
      xff: null
    };
    this.cookies = {};
    this.historyId = uuidv4();
    this.inProgress = false;
    this.chatResult = {};
    this.isChatting = false;
    this._chatPromise = null;
    this.allChatResults = [];
    this._connectPromise = null;
    this.jobs = {};
    this.timeout = 300;
  }
  _log = (m, p) => console.log(`\u001b[38;5;213m•\u001b[0m ${m}`, p ? `\u001b[38;5;117m${JSON.stringify(p)}\u001b[0m` : "");
  _handleJobUpdate = (id, u) => {
    if (!this.jobs[id]) this.jobs[id] = {};
    Object.assign(this.jobs[id], u);
  };
  async fetchInitialData() {
    try {
      const res = await axios.get(`${this.baseUrl}chat/${this.historyId}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          referer: "https://www.hotbot.com/",
          "user-agent": this.cinfo.ua
        }
      });
      this.extractCookies(res.headers);
      const match = (r, regex) => r?.match(regex)?.[1];
      const clientInfoMatch = res.data.match(/hbai\.setClientInfo\(\{\s*"ip":\s*"([^"]+)",\s*"ref":\s*"([^"]+)",\s*"xff":\s*null,\s*"ua":\s*"([^"]+)"\s*\}\)/);
      this.actor = match(res.data, /hbai\.actor\s*=\s*'([^']+)'/);
      if (clientInfoMatch) this.cinfo = {
        ip: clientInfoMatch[1],
        ref: clientInfoMatch[2],
        xff: null,
        ua: clientInfoMatch[3]
      }, this.ip = clientInfoMatch[1];
      this.auth = match(res.data, /hbai\.setAuth\('([^']+)'\)/);
      this.key = match(res.data, /hbai\.init\('([^']+)'\)/);
      console.log("Actor:", this.actor, "\nCinfo:", this.cinfo, "\nAuth:", this.auth, "\nKey:", this.key);
    } catch (e) {
      console.error("[31m[ERROR][0m Fetch initial data error:", e);
    }
  }
  extractCookies = h => {
    if (h?.["set-cookie"])(Array.isArray(h["set-cookie"]) ? h["set-cookie"] : [h["set-cookie"]]).forEach(c => {
      const [nv] = c.split(";");
      const [n, v] = nv.trim().split("=");
      if (n && v) this.cookies[n] = v;
    });
  };
  openSocket = () => (this._connectPromise = new Promise((res, rej) => {
    this.ws = new WebSocket(this.url, {
      origin: new URL(this.baseUrl).origin,
      headers: {
        upgrade: "websocket",
        connection: "Upgrade",
        "sec-websocket-key": "+jTZk+NUE672GRfglELSzA==",
        "user-agent": this.cinfo.ua,
        "sec-websocket-version": "13",
        cookie: Object.entries(this.cookies).map(([n, v]) => `${n}=${v}`).join("; ")
      }
    });
    this.ws.on("open", () => {
      this._log("[32m[CONNECT][0m WebSocket connected.");
      res();
      this.send({
        type: "init",
        k: this.key
      });
    });
    this.ws.on("error", e => {
      this._log(`\u001b[31m[ERROR]\u001b[0m WebSocket error: ${e}`);
      rej(e);
    });
    this.ws.on("close", () => {
      this._log("[33m[DISCONNECT][0m WebSocket closed.");
      this.isInitialized = false;
      if (typeof this._chatPromise === "function") this._chatPromise(this.chatResult),
        this._chatPromise = null;
    });
    this.ws.on("message", async msg => {
      try {
        const data = JSON.parse(msg.toString());
        this._log(`\u001b[36m[RECV]\u001b[0m Type \u001b[38;5;226m${data.type}\u001b[0m`, data);
        if (this.isChatting && data.type === "chat_full") {
          Object.assign(this.chatResult, data);
          if (typeof this._chatPromise === "function") {
            this._chatPromise(data);
            this._chatPromise = null;
          }
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.close();
          }
        } else switch (data.type) {
          case "init":
            this.newActId = data.new_act;
            this.conId = data.con;
            await this._initialize(data);
            break;
          case "ack_auth":
            this.pendingPromises["ack_auth"]?.resolve(data);
            delete this.pendingPromises["ack_auth"];
            break;
          case "ack_act":
            this.pendingPromises["ack_act"]?.resolve(data);
            delete this.pendingPromises["ack_act"];
            this.isInitialized = true;
            break;
          case "tti_prog":
            this._handleJobUpdate(data.job, {
              progress: data.prog
            });
            break;
          case "tti_complete":
            this._handleJobUpdate(data.job, {
              images: data.images,
              status: data.status,
              seed: data.seed
            });
            this.pendingPromises[data.job]?.resolve({
              type: "tti_complete",
              ...data
            });
            delete this.pendingPromises[data.job];
            break;
          case "tti_samplers":
            this.pendingPromises["tti_samplers"]?.resolve({
              type: "tti_samplers",
              samplers: data.samplers
            });
            delete this.pendingPromises["tti_samplers"];
            break;
          case "tti_models":
            this.pendingPromises["tti_models"]?.resolve({
              type: "tti_models",
              models: data.models
            });
            delete this.pendingPromises["tti_models"];
            break;
          case "stt_output":
            this.pendingPromises["stt_output"]?.resolve({
              type: "stt_output",
              text: data.txt
            });
            delete this.pendingPromises["stt_output"];
            break;
          case "tts_output":
            const ttsKey = data.index ? `tts_output_${data.index}` : "tts_output";
            this.pendingPromises[ttsKey]?.resolve({
              type: "tts_output",
              data: data.dat
            });
            delete this.pendingPromises[ttsKey];
            break;
          case "tts_output_start":
            this._handleJobUpdate(data.job, {
              status: "started"
            });
            break;
          case "tts_output_chunk":
            this._handleJobUpdate(data.job, {
              chunk: data.dat
            });
            break;
          case "tts_output_end":
            this.pendingPromises[data.job]?.resolve({
              type: "tts_output_end",
              job: data.job
            });
            delete this.pendingPromises[data.job];
            break;
        }
      } catch (e) {
        console.error("[31m[ERROR][0m Parse message error:", e);
      }
    });
  }), this._connectPromise);
  async init(k) {
    this.key = k;
    await this.fetchInitialData();
    return this.openSocket();
  }
  send = p => {
    this._log(`\u001b[35m[SEND]\u001b[0m Type \u001b[38;5;226m${p.type}\u001b[0m`, p);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(p));
  };
  waitFor = t => new Promise(res => this.pendingPromises[t] = {
    resolve: res
  });
  async _initialize(d) {
    if (!d?.con || !d?.new_act) return;
    this.conId = d.con;
    this.newActId = d.new_act;
    this.send({
      type: "set_ip",
      ip: this.ip,
      con_id: this.conId
    });
    this.send({
      type: "set_client_info",
      info: this.cinfo,
      con_id: this.conId
    });
    this.send({
      type: "check_auth",
      auth_key: this.auth,
      con_id: this.conId
    });
    this.send({
      type: "key",
      k: this.key,
      con_id: this.conId
    });
    this.send({
      type: "assert_act",
      replace: this.newActId,
      actor_id: this.actor,
      con_id: this.conId
    });
  }
  async sendChat({
    action = "chat",
    prompt,
    img,
    detail = "low",
    block_search,
    bot_id,
    model_id,
    sys,
    trim_num,
    trim_mode,
    extra,
    text,
    index,
    voice,
    model,
    options,
    data,
    id
  }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isInitialized) {
      await this.init(this.key);
      await Promise.all([this.waitFor("ack_auth"), this.waitFor("ack_act")]);
    }
    return new Promise(res => {
      if (this.isInitialized && !this.inProgress && this.conId && this.ws?.readyState === WebSocket.OPEN) {
        this.inProgress = true;
        this.isChatting = ["chat", "search"].includes(action);
        this.chatResult = {};
        this._chatPromise = this.isChatting ? res : null;
        const payload = {
          id: id || this.historyId,
          con_id: this.conId
        };
        switch (action) {
          case "chat":
          case "search":
            const msgobj = img ? [{
              type: "image_url",
              image_url: {
                url: img,
                detail: detail
              }
            }, ...prompt?.trim() ? [{
              type: "text",
              text: prompt.trim()
            }] : []] : prompt?.trim() ? prompt.trim() : "";
            Object.assign(payload, {
              type: img ? "new_chat_img" : "new_chat",
              msg: msgobj,
              block_search: block_search,
              bot_id: bot_id,
              model: model_id,
              sys: sys,
              ...trim_num > 0 && {
                trim_hist: {
                  num: trim_num,
                  mode: trim_mode || "trim"
                }
              },
              extra: extra
            });
            this.send(payload);
            break;
          case "audio":
            promiseKey = "stt_output";
            this.pendingPromises[promiseKey] = {
              resolve: res
            };
            this.send({
              ...payload,
              type: "stt_input",
              dat: data
            });
            break;
          case "tts":
            promiseKey = index ? `tts_output_${index}` : "tts_output";
            this.pendingPromises[promiseKey] = {
              resolve: res
            };
            this.send({
              ...payload,
              type: "tts_input",
              txt: text,
              index: index,
              voice: voice,
              prompt: prompt
            });
            break;
          case "streamTTS":
            promiseKey = uuidv4();
            if (promiseKey) this.pendingPromises[promiseKey] = {
              resolve: res
            }, this.send({
              ...payload,
              type: "tts_input_stream",
              txt: text,
              voice: voice,
              prompt: prompt,
              job: promiseKey
            });
            else res(null);
            return;
          case "tti":
            promiseKey = uuidv4();
            this.pendingPromises[promiseKey] = {
              resolve: res
            };
            this.send({
              ...payload,
              type: "tti_input",
              model: model,
              prompt: prompt,
              opts: options,
              job: promiseKey
            });
            break;
          case "get_tti_samplers":
            promiseKey = "tti_samplers";
            this.pendingPromises[promiseKey] = {
              resolve: res
            };
            this.send({
              ...payload,
              type: "tti_samplers"
            });
            break;
          case "get_tti_models":
            promiseKey = "tti_models";
            this.pendingPromises[promiseKey] = {
              resolve: res
            };
            this.send({
              ...payload,
              type: "tti_models"
            });
            break;
          default:
            console.error("Aksi tidak dikenali:", action), res(null);
            return;
        }
        let promiseKey;
        if (promiseKey && !this.isChatting) {} else if (this.isChatting) this._chatPromise = res;
        else if (!promiseKey) res(null);
      } else console.error("Koneksi belum siap untuk mengirim chat."), res(null);
    }).finally(() => {
      this.inProgress = false;
      this.isChatting = false;
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new HotbotAssistant();
    const response = await client.sendChat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}