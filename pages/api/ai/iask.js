import WebSocket from "ws";
import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class IAsk {
  constructor() {
    this.finalResult = [];
    this.ws = null;
    this.phxId = null;
    this.csrfToken = null;
    this.phxSession = null;
    this.staticToken = null;
    this.responseUrl = null;
    this.cookies = null;
    this.resolveWebSocket = null;
    this.rejectWebSocket = null;
    this.isRedirecting = false;
    this.c60Found = false;
  }
  async inspect(res) {
    try {
      const $ = cheerio.load(res.data);
      const el = $('[id^="phx-"]').first();
      const result = {
        phxId: el?.attr("id"),
        phxSession: el?.attr("data-phx-session"),
        csrfToken: $('meta[name="csrf-token"]')?.attr("content"),
        responseUrl: res.request.res.responseUrl,
        staticToken: el?.attr("data-phx-static")
      };
      console.log("Inspection Result:", result);
      this.phxId = result.phxId;
      this.phxSession = result.phxSession;
      this.csrfToken = result.csrfToken;
      this.staticToken = result.staticToken;
      this.responseUrl = result.responseUrl;
      return result;
    } catch (error) {
      console.error("Error during inspection:", error);
      throw error;
    }
  }
  async parseChunk(msg) {
    if (this.c60Found) {
      return false;
    }
    try {
      const data = JSON.parse(msg);
      if (Array.isArray(data)) {
        const nonEmptyObjects = data.filter(item => typeof item === "object" && item !== null && Object.keys(item).length > 0);
        if (nonEmptyObjects.length > 0) {
          const mergedObject = nonEmptyObjects.reduce((acc, item) => ({
            ...acc,
            ...item
          }), {});
          const chunkData = {
            content: mergedObject
          };
          if (mergedObject?.c?.[6]?.[0]) {
            this.c60Found = true;
            chunkData.chatText = mergedObject?.[1]?.["5"]?.["8"];
            this.finalResult.push(chunkData);
            console.log("Parsed chunk (c.6.0 found):", mergedObject);
            if (this.resolveWebSocket) {
              this.resolveWebSocket(this.finalResult);
            }
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.close();
            }
            return false;
          } else if (Object.keys(mergedObject).length > 0) {
            this.finalResult.push(chunkData);
            console.log("Parsed chunk:", mergedObject);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to parse chunk:", error);
      return true;
    }
  }
  async sendMessage(payload) {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.c60Found) {
        const message = JSON.stringify(payload);
        this.ws.send(message);
        console.log("Sending:", message.slice(0, 100) + "...");
      } else if (this.c60Found) {
        console.warn("WebSocket not open (c.6.0 found), not sending:", payload);
      } else {
        console.warn("WebSocket not open, cannot send:", payload);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
  async connectWebSocket() {
    const wsUrl = `wss://iask.ai/live/websocket?_csrf_token=${this.csrfToken}&vsn=2.0.0`;
    return new Promise((resolve, reject) => {
      this.resolveWebSocket = resolve;
      this.rejectWebSocket = reject;
      try {
        this.ws = new WebSocket(wsUrl, {
          headers: {
            Cookie: this.cookies
          }
        });
        this.ws.on("open", async () => {
          console.log("WebSocket connected.");
          const id = this.phxId?.split("-")[1];
          const joinPayload = [id, id, `lv:${this.phxId}`, "phx_join", {
            url: this.responseUrl,
            params: {
              _csrf_token: this.csrfToken,
              time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale: "id",
              _track_static: [],
              _mounts: 0,
              _mount_attempts: 0
            },
            session: this.phxSession,
            static: this.staticToken
          }];
          try {
            await this.sendMessage(joinPayload);
          } catch (e) {
            console.error("Error sending join payload", e);
            reject(e);
            this.ws?.close();
            return;
          }
        });
        this.ws.on("message", async message => {
          const text = message.toString();
          await this.parseChunk(text);
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed[2] === "phoenix" && parsed[3] === "phx_reply" && parsed[4]?.status === "ok" && !this.c60Found) {
              console.log("Received final reply.");
              if (this.resolveWebSocket) this.resolveWebSocket(this.finalResult);
            } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.phxId}` && parsed[3] === "phx_close" && this.resolveWebSocket && !this.c60Found) {
              this.resolveWebSocket(this.finalResult);
              this.ws?.close();
            } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.phxId}` && parsed[3] === "phx_reply" && parsed[4]?.response?.live_redirect && !this.isRedirecting && !this.c60Found) {
              this.isRedirecting = true;
              console.log("Received live_redirect:", parsed[4].response.live_redirect);
              const redirectUrl = parsed[4].response.live_redirect.to;
              this.responseUrl = `https://iask.ai${redirectUrl}`;
              this.isRedirecting = false;
            } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.phxId}` && parsed[3] === "phx_reply" && parsed[4]?.status === "error" && this.rejectWebSocket && !this.c60Found) {
              this.rejectWebSocket(parsed[4].response?.reason || "WebSocket error");
              this.ws?.close();
            }
          } catch (error) {
            console.error("Parse error in message handler:", error);
          }
        });
        this.ws.on("error", error => {
          console.error("WebSocket error:", error);
          if (this.rejectWebSocket && !this.c60Found) this.rejectWebSocket(error);
          this.ws?.close();
        });
        this.ws.on("close", () => {
          console.log("WebSocket closed.");
          if (!this.finalResult.length && this.rejectWebSocket && !this.c60Found) {
            this.rejectWebSocket("WebSocket closed prematurely.");
          } else if (this.resolveWebSocket && !this.c60Found) {
            this.resolveWebSocket(this.finalResult);
          }
        });
      } catch (error) {
        console.error("Error during WebSocket connection:", error);
        reject(error);
      }
    });
  }
  async ask(query, mode = "question") {
    return new Promise(async (resolve, reject) => {
      const messageHandler = async message => {
        try {
          const parsed = JSON.parse(message.toString());
          if (Array.isArray(parsed) && parsed[2] === "phoenix" && parsed[3] === "phx_reply" && parsed[4]?.status === "ok" && !this.c60Found) {
            resolve(this.finalResult);
            this.ws?.off("message", messageHandler);
          } else if (Array.isArray(parsed) && parsed[2] === `lv:${this.phxId}` && parsed[3] === "diff" && !this.c60Found) {
            await this.parseChunk(message.toString());
          }
        } catch (error) {
          console.error("Ask parse error:", error);
        }
      };
      if (this.ws?.readyState === WebSocket.OPEN && !this.c60Found) {
        const validatePayload = ["4", `${parseInt("4") + 4}`, `lv:${this.phxId}`, "event", {
          type: "form",
          event: "validate",
          value: `mode=${mode}&q=${query}`,
          meta: {
            _target: "q"
          },
          uploads: {}
        }];
        try {
          await this.sendMessage(validatePayload);
        } catch (e) {
          console.error("Error sending validate payload", e);
          reject(e);
          this.ws?.close();
          return;
        }
        setTimeout(async () => {
          const submitPayload = ["4", `${parseInt("4") + 6}`, `lv:${this.phxId}`, "event", {
            type: "form",
            event: "submit",
            value: `mode=${mode}&q=${query}`,
            meta: {}
          }];
          try {
            await this.sendMessage(submitPayload);
          } catch (e) {
            console.error("Error sending submit payload", e);
            reject(e);
            this.ws?.close();
            return;
          }
        }, 500);
        this.ws?.on("message", messageHandler);
      } else {
        resolve(this.finalResult);
      }
    });
  }
  async chat({
    query,
    mode = "question",
    detail_level = "detailed"
  }) {
    try {
      const jar = new CookieJar();
      const client = wrapper(axios.create({
        jar: jar
      }));
      const url = `https://iask.ai?q=${encodeURIComponent(query)}&mode=${mode}&detail_level=${detail_level}`;
      const res = await client.get(url);
      this.cookies = await jar.getCookieString("https://iask.ai");
      await this.inspect(res);
      await this.connectWebSocket();
      const results = await this.ask(query, mode);
      return results.filter(item => item && typeof item.content === "object" && Object.keys(item.content).length > 0).map(item => JSON.stringify(item.content)).join("");
    } catch (error) {
      console.error("Error during chat:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const iaskClient = new IAsk();
    const response = await iaskClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}