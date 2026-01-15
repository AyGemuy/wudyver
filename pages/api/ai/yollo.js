import axios from "axios";
import FormData from "form-data";
class YolloAI {
  constructor() {
    this.base = "https://www.yollo.ai";
    this.token = null;
    this.finger = this.genFinger();
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: this.base,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "x-language": "id",
      "x-platform": "web",
      "x-version": "999.0.0",
      "x-finger": this.finger
    };
  }
  genFinger() {
    try {
      const rand = () => Math.random().toString(16).slice(2);
      const components = {
        userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        language: "id-ID",
        colorDepth: 24,
        deviceMemory: 4,
        hardwareConcurrency: 8,
        screenResolution: [1920, 1080],
        timezone: "Asia/Jakarta",
        platform: "Linux armv81",
        vendor: "Google Inc.",
        timestamp: Date.now(),
        random: rand()
      };
      const str = Object.keys(components).sort().map(k => `${k}:${JSON.stringify(components[k])}`).join("|");
      return this.murmur(str);
    } catch (e) {
      console.error("[ERROR] genFinger:", e?.message);
      return this.genRandom();
    }
  }
  genRandom() {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return Array(32).fill(0).map(hex).join("");
  }
  murmur(str, seed = 0) {
    const buf = Buffer.from(str, "utf8");
    let h1 = seed;
    const c1 = 3432918353;
    const c2 = 461845907;
    for (let i = 0; i < buf.length - 3; i += 4) {
      let k1 = buf[i] | buf[i + 1] << 8 | buf[i + 2] << 16 | buf[i + 3] << 24;
      k1 = Math.imul(k1, c1);
      k1 = k1 << 15 | k1 >>> 17;
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
      h1 = h1 << 13 | h1 >>> 19;
      h1 = Math.imul(h1, 5) + 3864292196;
    }
    h1 ^= buf.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 2246822507);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 3266489909);
    h1 ^= h1 >>> 16;
    return (h1 >>> 0).toString(16).padStart(8, "0") + this.genRandom().slice(0, 24);
  }
  async ensure() {
    if (this.token) return this.token;
    try {
      console.log("[AUTH] Creating guest...");
      const {
        data: g
      } = await axios.post(`${this.base}/api/auth/createGuest`, {}, {
        headers: this.headers
      });
      const {
        guestUid: uid,
        guestKey: key
      } = g?.data || {};
      console.log("[AUTH] Logging in...");
      const {
        data: l
      } = await axios.post(`${this.base}/api/auth/loginByGuest`, {
        guestUid: uid,
        guestKey: key
      }, {
        headers: this.headers
      });
      this.token = l?.data?.idToken || null;
      console.log("[AUTH] Token obtained:", this.token ? "OK" : "FAIL");
      return this.token;
    } catch (e) {
      console.error("[ERROR] ensure:", e?.message);
      throw e;
    }
  }
  async search({
    token,
    query,
    pageNo = 1,
    pageSize = 30,
    ...rest
  }) {
    try {
      const t = token || await this.ensure();
      console.log("[SEARCH] Query:", query);
      const {
        data
      } = await axios.get(`${this.base}/api/bot`, {
        params: {
          pageNo: pageNo,
          pageSize: pageSize,
          sortColumn: "popularity",
          sortType: false,
          keyword: query,
          ...rest
        },
        headers: {
          ...this.headers,
          "x-auth-token": t
        }
      });
      return {
        token: t,
        data: data?.data
      };
    } catch (e) {
      console.error("[ERROR] search:", e?.message);
      throw e;
    }
  }
  async chat({
    token,
    prompt,
    image,
    media,
    sessionId,
    botId = 147006,
    ...rest
  }) {
    try {
      const t = token || await this.ensure();
      let sid = sessionId;
      if (!sid) {
        console.log("[CHAT] Creating session for bot:", botId);
        try {
          const {
            data: s
          } = await axios.post(`${this.base}/api/msg/createSession?botId=${botId}`, {}, {
            headers: {
              ...this.headers,
              "x-auth-token": t
            }
          });
          sid = s?.data?.id;
        } catch (e) {
          console.error("[ERROR] chat.createSession:", e?.message);
          throw e;
        }
      }
      if (!sid) throw new Error("Failed to get sessionId");
      let fileToUpload = image || media;
      let imageUrl = null;
      if (fileToUpload) {
        try {
          if (Buffer.isBuffer(fileToUpload) || fileToUpload.startsWith("data:") || typeof fileToUpload === "string" && fileToUpload.startsWith("http")) {
            imageUrl = await this.upload(fileToUpload, t);
          } else {
            imageUrl = await this.upload(fileToUpload, t);
          }
        } catch (e) {
          console.error("[ERROR] chat.upload:", e?.message);
          throw e;
        }
      }
      const isImgGen = rest.generateImage || imageUrl;
      if (isImgGen) {
        return await this.genImg({
          token: t,
          prompt: prompt,
          image: imageUrl,
          sessionId: sid,
          ...rest
        });
      }
      console.log("[CHAT] Sending message...");
      try {
        await axios.post(`${this.base}/api/msg/send`, {
          sessionId: sid,
          msg: prompt
        }, {
          headers: {
            ...this.headers,
            "x-auth-token": t,
            "x-no-show-msg-handle": "true"
          }
        });
      } catch (e) {
        console.error("[ERROR] chat.send:", e?.message);
        throw e;
      }
      let conv = [];
      try {
        const {
          data: hist
        } = await axios.post(`${this.base}/api/msg/getChatMessages`, {
          chatSessionId: sid,
          size: 10
        }, {
          headers: {
            ...this.headers,
            "x-auth-token": t
          }
        });
        conv = (hist?.data || []).filter(m => m.sendUserType === 1).map(m => ({
          role: "assistant",
          content: m.content
        })).slice(-3);
      } catch (e) {
        console.error("[ERROR] chat.getHistory:", e?.message);
      }
      console.log("[CHAT] Streaming response...");
      let reply = "";
      try {
        const {
          data: stream
        } = await axios.post(`${this.base}/id/chat-stream`, {
          message: prompt,
          sessionId: String(sid),
          conversationHistory: conv,
          userToken: t,
          userLocale: "id",
          isRegenerate: false,
          isSafeMode: false,
          ...rest
        }, {
          headers: this.headers,
          responseType: "stream"
        });
        for await (const chunk of stream) {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.type === "content") reply += json.content;
              } catch {}
            }
          }
        }
      } catch (e) {
        console.error("[ERROR] chat.stream:", e?.message);
        throw e;
      }
      try {
        await axios.post(`${this.base}/api/msg/callback`, {
          sessionId: sid,
          msg: reply,
          generateType: "1"
        }, {
          headers: {
            ...this.headers,
            "x-auth-token": t
          }
        });
      } catch (e) {
        console.error("[ERROR] chat.callback:", e?.message);
      }
      return {
        token: t,
        data: {
          reply: reply,
          sessionId: sid
        }
      };
    } catch (e) {
      console.error("[ERROR] chat:", e?.message);
      throw e;
    }
  }
  async upload(media, token) {
    try {
      const t = token || await this.ensure();
      console.log("[UPLOAD] Processing media...");
      let buffer;
      if (Buffer.isBuffer(media)) {
        buffer = media;
      } else if (media.startsWith("http")) {
        const {
          data
        } = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(data);
      } else if (media.startsWith("data:")) {
        buffer = Buffer.from(media.split(",")[1], "base64");
      } else {
        buffer = Buffer.from(media, "base64");
      }
      const form = new FormData();
      form.append("file", buffer, {
        filename: "image.png",
        contentType: "image/png"
      });
      const {
        data
      } = await axios.post(`${this.base}/api/upload/uploadTempFile`, form, {
        headers: {
          ...this.headers,
          "x-auth-token": t,
          ...form.getHeaders()
        }
      });
      console.log("[UPLOAD] URL:", data?.data);
      return data?.data;
    } catch (e) {
      console.error("[ERROR] upload:", e?.message);
      throw e;
    }
  }
  async genImg({
    token,
    prompt,
    image,
    baseImage,
    sessionId,
    size = "2K",
    ...rest
  }) {
    try {
      const t = token || await this.ensure();
      const inputImage = image || baseImage || "";
      console.log("[IMAGE] Generating:", prompt);
      const {
        data
      } = await axios.post(`${this.base}/api/aiImage/createForChat`, {
        baseImage: inputImage,
        imageUrls: [],
        prompt: prompt,
        size: size,
        sessionId: sessionId,
        ...rest
      }, {
        headers: {
          ...this.headers,
          "x-auth-token": t
        }
      });
      const taskId = data?.data?.result?.generateId;
      const msgId = data?.data?.result?.id;
      if (!msgId && taskId) {
        return {
          token: t,
          data: {
            generateId: taskId,
            status: "processing",
            ...data?.data?.result
          }
        };
      }
      if (!taskId) {
        return {
          token: t,
          data: data?.data?.result
        };
      }
      return await this.poll(taskId, msgId, t);
    } catch (e) {
      console.error("[ERROR] genImg:", e?.message);
      throw e;
    }
  }
  async checkStatus({
    token,
    taskId
  }) {
    try {
      const t = token || await this.ensure();
      console.log("[STATUS] Checking task:", taskId);
      const {
        data
      } = await axios.get(`${this.base}/api/aiImage/getTaskStatus/${taskId}`, {
        headers: {
          ...this.headers,
          "x-auth-token": t,
          "x-no-handle": "true"
        }
      });
      return {
        token: t,
        data: data?.data
      };
    } catch (e) {
      console.error("[ERROR] checkStatus:", e?.message);
      throw e;
    }
  }
  async poll(taskId, msgId, t) {
    console.log("[POLL] Task:", taskId);
    for (let i = 0; i < 60; i++) {
      try {
        const {
          data: s
        } = await axios.get(`${this.base}/api/aiImage/getTaskStatus/${taskId}`, {
          headers: {
            ...this.headers,
            "x-auth-token": t,
            "x-no-handle": "true"
          }
        });
        const status = s?.data;
        console.log("[POLL] Status:", status);
        if (status === 2) {
          try {
            const {
              data: m
            } = await axios.post(`${this.base}/api/msg/getMessageById/${msgId}`, {}, {
              headers: {
                ...this.headers,
                "x-auth-token": t
              }
            });
            return {
              token: t,
              data: m?.data
            };
          } catch (e) {
            console.error("[ERROR] poll.getMessage:", e?.message);
            throw e;
          }
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        console.error("[ERROR] poll.iteration:", e?.message);
      }
    }
    throw new Error("Timeout waiting for image generation");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["search", "chat", "upload", "status"]
    });
  }
  const api = new YolloAI();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "upload":
        const mediaFile = params.image || params.media;
        if (!mediaFile) {
          return res.status(400).json({
            error: "Parameter 'image' atau 'media' wajib diisi untuk action 'upload'."
          });
        }
        const url = await api.upload(mediaFile, params.token);
        response = {
          token: params.token || api.token,
          data: url
        };
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status'."
          });
        }
        response = await api.checkStatus(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["search", "chat", "upload", "status"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}