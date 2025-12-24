import WebSocket from "ws";
import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class IAsk {
  constructor() {
    this.state = {
      finalResult: [],
      ws: null,
      phxId: null,
      csrfToken: null,
      phxSession: null,
      staticToken: null,
      responseUrl: null,
      cookies: null,
      resolveWs: null,
      rejectWs: null,
      stopSignalReceived: false
    };
    this.baseUrl = "https://iask.ai";
  }
  log(key, data) {
    console.log(`[LOG] ${key}:`, data);
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    this.log("HEADERS_BUILT", headers);
    return headers;
  }
  async inspect(res) {
    const $ = cheerio.load(res.data);
    const el = $('[id^="phx-"]').first();
    const result = {
      phxId: el?.attr("id"),
      phxSession: el?.attr("data-phx-session"),
      csrfToken: $('meta[name="csrf-token"]')?.attr("content"),
      responseUrl: res.request.res.responseUrl,
      staticToken: el?.attr("data-phx-static")
    };
    Object.assign(this.state, result);
    this.log("INIT_INSPECT", result);
  }
  async parseChunk(msg) {
    if (this.state.stopSignalReceived) return false;
    try {
      const data = JSON.parse(msg);
      if (!Array.isArray(data)) return true;
      const nonEmptyObjects = data.filter(item => typeof item === "object" && item !== null && Object.keys(item).length > 0);
      if (nonEmptyObjects.length === 0) return true;
      const mergedObject = nonEmptyObjects.reduce((acc, item) => ({
        ...acc,
        ...item
      }), {});
      const logChunk = {
        content: mergedObject
      };
      if (mergedObject.c && mergedObject.c["4"] !== undefined) {
        this.log("STOP_CONDITION_MET", "Detected 'c': { '4': ... } chunk. Stopping further processing.");
        this.state.stopSignalReceived = true;
        this.state.resolveWs?.(this.state.finalResult);
        this.state.ws?.close();
        return false;
      }
      if (mergedObject?.[1]?.["5"]?.["8"]) {
        logChunk.chatText = mergedObject?.[1]?.["5"]?.["8"];
        this.state.finalResult.push({
          chatText: logChunk.chatText
        });
      } else {
        this.state.finalResult.push(mergedObject);
      }
      this.log("CHUNK_PARSED", logChunk);
      return false;
    } catch (error) {
      this.log("CHUNK_ERROR", error);
      return true;
    }
  }
  async sendMessage(payload) {
    if (this.state.ws?.readyState !== WebSocket.OPEN || this.state.stopSignalReceived) {
      this.log("SEND_SKIP", "WS not open or stop signal received.");
      return;
    }
    const message = JSON.stringify(payload);
    this.state.ws.send(message);
    this.log("SEND_MSG", {
      payload: message.slice(0, 100) + "..."
    });
  }
  async connectWebSocket() {
    const wsUrl = `wss://iask.ai/live/websocket?_csrf_token=${this.state.csrfToken}&vsn=2.0.0`;
    return new Promise((resolve, reject) => {
      Object.assign(this.state, {
        resolveWs: resolve,
        rejectWs: reject
      });
      try {
        const wsHeaders = this.buildHeaders({
          Cookie: this.state.cookies
        });
        this.state.ws = new WebSocket(wsUrl, {
          headers: wsHeaders
        });
        this.state.ws.on("open", async () => {
          this.log("WS_OPEN", "WebSocket connected.");
          const id = this.state.phxId?.split("-")[1];
          const joinPayload = [id, id, `lv:${this.state.phxId}`, "phx_join", {
            url: this.state.responseUrl,
            params: {
              _csrf_token: this.state.csrfToken,
              time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale: "id",
              _track_static: [],
              _mounts: 0,
              _mount_attempts: 0
            },
            session: this.state.phxSession,
            static: this.state.staticToken
          }];
          await this.sendMessage(joinPayload);
        });
        this.state.ws.on("message", async message => {
          const text = message.toString();
          await this.parseChunk(text);
          if (this.state.stopSignalReceived) {
            return;
          }
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed[2] === "phoenix" && parsed[3] === "phx_reply" && parsed[4]?.status === "ok") {
              this.log("WS_REPLY_OK", "Final reply received.");
              this.state.resolveWs?.(this.state.finalResult);
            } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.state.phxId}` && parsed[3] === "phx_close") {
              this.state.resolveWs?.(this.state.finalResult);
              this.state.ws?.close();
            } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.state.phxId}` && parsed[3] === "phx_reply" && parsed[4]?.response?.live_redirect) {
              this.log("WS_REDIRECT", parsed[4].response.live_redirect);
              this.state.responseUrl = `https://iask.ai${parsed[4].response.live_redirect.to}`;
            } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.state.phxId}` && parsed[3] === "phx_reply" && parsed[4]?.status === "error") {
              this.state.rejectWs?.(parsed[4].response?.reason || "WS error");
              this.state.ws?.close();
            }
          } catch (error) {
            this.log("MSG_PARSE_ERR", error);
          }
        });
        this.state.ws.on("error", error => {
          this.log("WS_ERROR", error);
          if (!this.state.stopSignalReceived) {
            this.state.rejectWs?.(error);
          }
          this.state.ws?.close();
        });
        this.state.ws.on("close", () => {
          this.log("WS_CLOSE", "WebSocket closed.");
          if (!this.state.finalResult.length && !this.state.stopSignalReceived) {
            this.state.rejectWs?.("WS closed prematurely.");
          } else if (!this.state.stopSignalReceived) {
            this.state.resolveWs?.(this.state.finalResult);
          }
        });
      } catch (error) {
        this.log("WS_CONN_ERROR", error);
        reject(error);
      }
    });
  }
  async ask(query, mode = "question") {
    return new Promise(async (resolve, reject) => {
      const messageHandler = async message => {
        if (this.state.stopSignalReceived) {
          this.state.ws?.off("message", messageHandler);
          return;
        }
        try {
          const parsed = JSON.parse(message.toString());
          if (Array.isArray(parsed) && parsed[2] === `lv:${this.state.phxId}` && parsed[3] === "diff") {
            await this.parseChunk(message.toString());
            if (this.state.stopSignalReceived) {
              resolve(this.state.finalResult);
              this.state.ws?.off("message", messageHandler);
            }
          } else if (Array.isArray(parsed) && parsed[2] === "phoenix" && parsed[3] === "phx_reply" && parsed[4]?.status === "ok") {
            resolve(this.state.finalResult);
            this.state.ws?.off("message", messageHandler);
          }
        } catch (error) {
          this.log("ASK_PARSE_ERR", error);
        }
      };
      if (this.state.ws?.readyState === WebSocket.OPEN && !this.state.stopSignalReceived) {
        const validatePayload = ["4", `${parseInt("4") + 4}`, `lv:${this.state.phxId}`, "event", {
          type: "form",
          event: "validate",
          value: `mode=${mode}&q=${query}`,
          meta: {
            _target: "q"
          },
          uploads: {}
        }];
        await this.sendMessage(validatePayload);
        setTimeout(async () => {
          if (this.state.stopSignalReceived) return;
          const submitPayload = ["4", `${parseInt("4") + 6}`, `lv:${this.state.phxId}`, "event", {
            type: "form",
            event: "submit",
            value: `mode=${mode}&q=${query}`,
            meta: {}
          }];
          await this.sendMessage(submitPayload);
        }, 500);
        this.state.ws?.on("message", messageHandler);
      } else {
        resolve(this.state.finalResult);
      }
    });
  }
  async chat({
    prompt: query = "Hello!",
    mode = "question",
    detail_level = "detailed"
  }) {
    try {
      this.state.stopSignalReceived = false;
      this.state.finalResult = [];
      const jar = new CookieJar();
      const client = wrapper(axios.create({
        jar: jar,
        headers: this.buildHeaders()
      }));
      const url = `https://iask.ai?q=${encodeURIComponent(query)}&mode=${mode}&detail_level=${detail_level}`;
      const res = await client.get(url);
      this.state.cookies = await jar.getCookieString("https://iask.ai");
      await this.inspect(res);
      await this.connectWebSocket();
      const results = await this.ask(query, mode);
      return results;
    } catch (error) {
      this.log("CHAT_ERROR", error);
      throw error;
    }
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
    const api = new IAsk();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}