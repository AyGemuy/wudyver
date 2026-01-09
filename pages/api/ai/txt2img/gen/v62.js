import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class ZImage {
  constructor() {
    this.baseUrl = "https://zimage.run";
    this.api = axios.create({
      timeout: 6e4,
      withCredentials: true
    });
    this.baseHeaders = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: "https://zimage.run",
      Referer: "https://zimage.run/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };
    this.cookie = null;
    this.models = ["turbo", "qwen-image", "beyond-reality", "redcraft", "dark-beast"];
  }
  log(msg, type = "info") {
    const map = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warn: "⚠️"
    };
    console.log(`[${new Date().toLocaleTimeString()}] ${map[type] || ""} ${msg}`);
  }
  validate(m) {
    return this.models.includes(m) ? m : "turbo";
  }
  async token() {
    try {
      this.log("Getting Turnstile token...", "info");
      const {
        data
      } = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        url: this.baseUrl,
        sitekey: "0x4AAAAAACKAZAeGcWYuRc3g"
      });
      return data?.token || null;
    } catch (e) {
      this.log(`Token fail: ${e.message}`, "error");
      return null;
    }
  }
  async verify() {
    if (this.cookie) return;
    try {
      const t = await this.token();
      if (!t) throw new Error("Turnstile token empty");
      const {
        data,
        headers
      } = await this.api.post(`${this.baseUrl}/api/z-image/verify-anonymous`, {
        token: t
      }, {
        headers: {
          ...this.baseHeaders,
          "Content-Type": "application/json"
        }
      });
      if (!data?.success) throw new Error("Verify API returned success:false");
      const setCookie = headers["set-cookie"] || headers["Set-Cookie"];
      if (setCookie) {
        this.cookie = setCookie.map(c => c.split(";")[0]).join("; ");
        this.log("Auth success", "success");
      } else {
        throw new Error("No cookie received");
      }
    } catch (e) {
      this.log(`Auth failed: ${e.message}`, "error");
      throw e;
    }
  }
  async poll(uuid, isBatch) {
    const url = `${this.baseUrl}/api/z-image/${isBatch ? "batch-status" : "task"}/${uuid}`;
    let retry = 0;
    while (retry < 60) {
      try {
        const {
          data
        } = await this.api.get(url, {
          headers: {
            ...this.baseHeaders,
            Cookie: this.cookie
          }
        });
        if (isBatch) {
          const {
            allCompleted,
            tasks
          } = data?.data || {};
          if (allCompleted) return tasks?.filter(t => t.status === "completed").map(t => t.resultUrl) || [];
        } else {
          const t = data?.data?.task;
          if (t?.taskStatus === "completed") {
            try {
              return JSON.parse(t.resultUrl);
            } catch {
              return [t.resultUrl];
            }
          }
          if (t?.taskStatus === "failed") throw new Error(t?.errorMessage || "Task marked failed");
        }
        await new Promise(r => setTimeout(r, 3e3));
        retry++;
      } catch (e) {
        if (e.message.includes("failed")) throw e;
        await new Promise(r => setTimeout(r, 3e3));
        retry++;
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    prompt,
    model,
    width = 512,
    height = 512,
    batchSize = 1,
    seed,
    ...rest
  }) {
    const results = [];
    try {
      await this.verify();
      const payload = {
        prompt: prompt,
        width: width,
        height: height,
        batchSize: batchSize,
        modelType: this.validate(model),
        ...seed && {
          seed: String(seed)
        },
        ...rest
      };
      this.log(`Sending T2I request (${this.validate(model)})...`, "info");
      const {
        data
      } = await this.api.post(`${this.baseUrl}/api/z-image/generate`, payload, {
        headers: {
          ...this.baseHeaders,
          "Content-Type": "application/json",
          Cookie: this.cookie
        }
      });
      if (!data?.success) throw new Error(data?.error || `Request rejected: ${JSON.stringify(data)}`);
      const uuid = data?.data?.uuid || data?.data?.task?.uuid;
      const parentId = data?.data?.parentTaskUuid;
      const targetId = parentId || uuid;
      const isBatch = !!parentId || batchSize > 1;
      const res = await this.poll(targetId, isBatch);
      if (res) results.push(...Array.isArray(res) ? res : [res]);
    } catch (e) {
      const errMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      this.log(`Gen error: ${errMsg}`, "error");
    }
    return {
      result: results
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ZImage();
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