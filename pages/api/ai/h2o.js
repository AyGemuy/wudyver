import WebSocket from "ws";
import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  URL
} from "url";
class WSChat {
  constructor() {
    this.ws = null;
    this.sessionId = this._genId();
    this.currentSessionID = null;
    this.csrfToken = null;
    this.baseUrl = "wss://h2ogpte.genai.h2o.ai/ws";
    this.homeUrl = "https://h2ogpte.genai.h2o.ai/";
    this.rpcUrl = "https://h2ogpte.genai.h2o.ai/rpc/db";
    this.debug = true;
    this.cookieJar = new CookieJar();
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.axios = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        "User-Agent": this.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9",
        Priority: "u=0, i",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      }
    }));
  }
  _genId() {
    return crypto.randomUUID() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  async _getCSRFToken() {
    try {
      const response = await this.axios.get(this.homeUrl);
      const csrfMatch = response.data.match(/"csrf_token":"([^"]+)"/);
      if (csrfMatch && csrfMatch[1]) {
        this.csrfToken = csrfMatch[1];
        this._log("Found CSRF token:", this.csrfToken);
        return true;
      }
      throw new Error("CSRF token not found in HTML");
    } catch (err) {
      this._logError("Failed to get CSRF token:", err);
      throw err;
    }
  }
  async _verifyAndGetSession() {
    try {
      const response = await this.axios.post(this.rpcUrl, JSON.stringify(["create_chat_session", null]), {
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken,
          Accept: "*/*",
          Priority: "u=1, i",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          Referer: this.homeUrl
        }
      });
      if (response.data && response.data.id) {
        this.currentSessionID = response.data.id;
        this._log("Got new session ID from RPC:", this.currentSessionID);
        return true;
      }
      throw new Error("No session ID in RPC response");
    } catch (err) {
      this._logError("Failed to verify and get session:", err);
      throw err;
    }
  }
  async _getAuthCookies() {
    try {
      await this._getCSRFToken();
      await this._verifyAndGetSession();
      this._log("Authentication completed");
    } catch (err) {
      this._logError("Failed to get auth cookies:", err);
      throw new Error(`Authentication failed: ${err.message}`);
    }
  }
  _getCookieHeader() {
    return this.cookieJar.getCookieStringSync(this.homeUrl);
  }
  async _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      await this._getAuthCookies();
      const wsUrl = `${this.baseUrl}?currentSessionID=${this.currentSessionID}`;
      const headers = {
        Cookie: this._getCookieHeader(),
        "User-Agent": this.userAgent
      };
      this._log("Connecting to WebSocket with cookies:", this._getCookieHeader());
      this.ws = new WebSocket(wsUrl, {
        headers: headers
      });
      await new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          this._log("WS connected");
          resolve();
        };
        this.ws.onerror = err => {
          this._logError("Connection error:", err);
          reject(err);
        };
      });
    } catch (err) {
      this._logError("Connection failed:", err);
      throw err;
    }
  }
  async chat({
    prompt,
    type = "chat",
    ...params
  }) {
    try {
      await this._connect();
      const message = {
        t: "cq",
        mode: "s",
        session_id: this.sessionId,
        correlation_id: this._genId(),
        body: prompt,
        llm: "auto",
        llm_args: JSON.stringify(this._getLlmArgs(type, params)),
        self_reflection_config: "null",
        rag_config: JSON.stringify({
          rag_type: type === "search" ? "agent_only" : "auto",
          hyde_no_rag_llm_prompt_extension: null,
          num_neighbor_chunks_to_include: 1,
          meta_data_to_include: {
            name: true,
            page: true,
            text: true,
            captions: true
          }
        }),
        include_chat_history: "auto",
        tags: [],
        prompt_template_id: null,
        ...params
      };
      this._log("Sending:", message);
      this.ws.send(JSON.stringify(message));
      const response = await this._waitResponse();
      return response;
    } catch (err) {
      this._logError("Chat error:", err);
      this.close();
      throw err;
    }
  }
  _getLlmArgs(type, params) {
    const base = {
      enable_vision: "auto",
      visible_vision_models: ["auto"],
      cost_controls: {
        max_cost: .05,
        willingness_to_pay: .2,
        willingness_to_wait: 10
      },
      remove_non_private: false,
      ...params.llm_args
    };
    if (type === "chat") return {
      ...base,
      use_agent: false
    };
    return {
      ...base,
      use_agent: true,
      agent_max_turns: type === "search" ? 80 : 10,
      agent_accuracy: type === "search" ? "maximum" : "basic",
      agent_timeout: type === "search" ? 240 : 60,
      agent_tools: ["aider_code_generation.py", "mermaid_renderer.py", "image_generation.py", "audio_video_transcription.py", "convert_document_to_text.py", "download_web_video.py", "screenshot_webpage.py", "google_search.py", "bing_search.py", "browser_agent.py", "unified_search.py", "scholar_papers_query.py", "wolfram_alpha_math_science_query.py", "driverless_ai_data_science.py", "query_to_web_image.py", "ask_question_about_documents.py", "wikipedia_article.py", "wayback_machine_search.py", "advanced_reasoning.py", "shell", "python", "rag_vision", "rag_text", "internet", "intranet", "global"],
      ...params.agent_args
    };
  }
  async _waitResponse() {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, val) => {
        if (done) return;
        done = true;
        this.close();
        fn(val);
      };
      this.ws.on("message", data => {
        if (done) return;
        try {
          const res = JSON.parse(data.toString());
          this._log("Received:", res);
          if (res.t.includes("ca")) {
            return finish(resolve, res);
          }
        } catch (err) {
          return finish(reject, err);
        }
      });
      this.ws.on("error", err => finish(reject, err));
      this.ws.on("close", () => {
        if (!done) this._log("WebSocket closed before result");
      });
    });
  }
  close() {
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
      } catch {}
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this._log("WS connection closed");
      this.ws = null;
    }
  }
  _log(...args) {
    if (this.debug) {
      console.log("[WSChat]", ...args);
    }
  }
  _logError(...args) {
    if (this.debug) {
      console.error("[WSChat]", ...args);
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
    const chat = new WSChat();
    const response = await chat.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}