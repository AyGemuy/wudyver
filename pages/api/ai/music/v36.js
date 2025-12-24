import fetch from "node-fetch";
import {
  Agent as HttpsAgent
} from "https";
import ApiKey from "@/configs/api-key";
const httpsAgent = new HttpsAgent({
  keepAlive: true
});
const MAX_ATTEMPTS = 3;

function getAgent(url) {
  return url.startsWith("https") ? httpsAgent : null;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class Api302Service {
  constructor() {
    this.apiKeys = ApiKey.threezero;
    this.currentKeyIndex = 0;
    this.config = {
      endpoint: "https://api.302.ai",
      basePath: "/suno",
      defaultHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.getCurrentKey()
      }
    };
  }
  getCurrentKey() {
    return this.apiKeys[this.currentKeyIndex];
  }
  rotateToNextKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.config.defaultHeaders.Authorization = this.getCurrentKey();
    console.log(`[API_KEY] Rotated to key index: ${this.currentKeyIndex}`);
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  async _attemptReq(params, attempt = 1, originalKeyIndex = this.currentKeyIndex) {
    const {
      path,
      method
    } = params;
    const url = `${this.config.endpoint}${this.config.basePath}${path}`;
    let response, responseText;
    try {
      const options = {
        method: method,
        headers: {
          ...this.config.defaultHeaders,
          ...params.headers
        },
        agent: getAgent(url)
      };
      if (params.data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(params.data);
      }
      console.log(`[API_REQ] (Attempt ${attempt}/${MAX_ATTEMPTS}) ${method} ${url} (Key: ${this.currentKeyIndex})`);
      response = await fetch(url, options);
      responseText = await response.text();
      console.log(`[API_RES] Status: ${response.status} for ${path}`);
      if (!response.ok) {
        if (response.status === 401 && attempt < MAX_ATTEMPTS) {
          console.warn(`[API_KEY] Key ${this.currentKeyIndex} failed with 401, rotating to next key`);
          this.rotateToNextKey();
          if (this.currentKeyIndex === originalKeyIndex) {
            throw new Error(`Semua API key gagal: HTTP ${response.status}: ${responseText}`);
          }
          console.warn(`[RETRY] Authentication error. Retrying with new key in ${attempt}s...`);
          await sleep(attempt * 1e3);
          return await this._attemptReq(params, attempt + 1, originalKeyIndex);
        }
        if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
          console.warn(`[RETRY] Server error ${response.status}. Retrying in ${attempt}s...`);
          await sleep(attempt * 1e3);
          return await this._attemptReq(params, attempt + 1, originalKeyIndex);
        }
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.warn(`[API_WARN] Non-JSON response: ${responseText.substring(0, 50)}...`);
        return {
          raw: responseText
        };
      }
    } catch (error) {
      const isNetworkError = !response || /fetch|ECONN|EHOST/.test(error.message);
      const isAuthError = error.message.includes("401") || error.message.includes("Unauthorized");
      if (isAuthError && attempt < MAX_ATTEMPTS && this.currentKeyIndex !== originalKeyIndex) {
        console.warn(`[API_KEY] Auth error detected, rotating to next key`);
        this.rotateToNextKey();
        if (this.currentKeyIndex === originalKeyIndex) {
          throw new Error(`Semua API key gagal: ${error.message}`);
        }
        console.warn(`[RETRY] Authentication error. Retrying with new key in ${attempt}s...`);
        await sleep(attempt * 1e3);
        return await this._attemptReq(params, attempt + 1, originalKeyIndex);
      }
      if (isNetworkError && attempt < MAX_ATTEMPTS) {
        console.warn(`[RETRY] Network error. Retrying in ${attempt}s...`);
        await sleep(attempt * 1e3);
        return await this._attemptReq(params, attempt + 1, originalKeyIndex);
      }
      console.error(`[API_FAIL] Final failure for ${path}: ${error.message}`);
      throw error;
    }
  }
  async _req(params) {
    return await this._attemptReq(params);
  }
  async generate({
    custom = false,
    continue: isContinue = false,
    ...rest
  }) {
    const path = "/submit/music";
    let data = {};
    let logMsg = "";
    if (isContinue) {
      const {
        taskId,
        continueClipId,
        prompt,
        tags,
        title,
        continueAt = 0
      } = rest;
      data = {
        task_id: taskId,
        continue_clip_id: continueClipId,
        prompt: prompt,
        tags: tags,
        title: title,
        continue_at: continueAt,
        mv: rest.mv || "chirp-crow"
      };
      logMsg = `Continuing song: "${title}" (Task: ${taskId})`;
    } else if (custom) {
      const {
        prompt,
        tags = "rap",
        title,
        make_instrumental = false,
        metadata = {}
      } = rest;
      data = {
        prompt: prompt,
        tags: tags,
        title: title,
        mv: rest.mv || "chirp-crow",
        make_instrumental: make_instrumental,
        metadata: {
          create_mode: "custom",
          vocal_gender: metadata.vocal_gender || "f",
          control_sliders: metadata.control_sliders || {
            style_weight: .87,
            weirdness_constraint: .75
          },
          can_control_sliders: metadata.can_control_sliders || ["style_weight", "weirdness_constraint"],
          ...metadata
        }
      };
      logMsg = `Generating CUSTOM music: "${title}"`;
    } else {
      const {
        gpt_description_prompt,
        make_instrumental = false
      } = rest;
      data = {
        gpt_description_prompt: gpt_description_prompt,
        mv: rest.mv || "chirp-crow",
        make_instrumental: make_instrumental
      };
      logMsg = `Generating AUTO music from prompt: "${gpt_description_prompt}"`;
    }
    console.log(`[PROCESS] ${logMsg}`);
    return await this._req({
      method: "POST",
      path: path,
      data: data
    });
  }
  async status({
    task_id
  }) {
    console.log(`[PROCESS] Fetching status for task: ${task_id}`);
    return await this._req({
      method: "GET",
      path: `/fetch/${task_id}`
    });
  }
  async lyrics({
    prompt
  }) {
    console.log(`[PROCESS] Generating lyrics for prompt: "${prompt}"`);
    return await this._req({
      method: "POST",
      path: "/submit/lyrics",
      data: {
        prompt: prompt
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new Api302Service();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt && !params.gpt_description_prompt && !params.lyrics) {
          return res.status(400).json({
            error: "Salah satu dari 'prompt', 'gpt_description_prompt', atau 'lyrics' wajib diisi."
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi."
          });
        }
        result = await api.status(params);
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi."
          });
        }
        result = await api.lyrics(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Gunakan: generate, status, lyrics`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}