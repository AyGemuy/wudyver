import fetch from "node-fetch";
class GrsAI {
  constructor() {
    this.baseUrls = ["https://api.grsai.com", "https://grsai.dakka.com.cn"];
    this.currentBaseIndex = 0;
    this.apiKey = "sk-0204a3b3797e4e199f4708172918f02a";
    this.config = {
      endpoint: {
        chat: "/v1/chat/completions",
        draw: "/v1/draw/completions",
        nano: "/v1/draw/nano-banana",
        sora: "/v1/video/sora-video",
        veo: "/v1/video/veo",
        flux: "/v1/draw/flux",
        imagen: "/v1/draw/imagen",
        result: "/v1/draw/result"
      },
      defaultPayload: {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        }
      },
      supported: {
        chat: ["nano-banana-fast", "nano-banana", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gpt-4o-all", "o4-mini-all", "gpt-4o-mini"],
        image: ["sora-image", "gpt-4o-image"],
        nano: ["nano-banana"],
        video: ["sora-2"],
        veo: ["veo3.1-fast", "veo3.1-pro", "veo3-fast", "veo3-pro"],
        flux: ["flux-pro-1.1", "flux-pro-1.1-ultra", "flux-kontext-pro", "flux-kontext-max"],
        imagen: ["imagen-4-ultra"]
      }
    };
  }
  async parseResponse(response) {
    const text = await response.text();
    if (text.trim().startsWith("data:")) {
      try {
        const lines = text.split("\n").filter(line => line.trim());
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr && jsonStr !== "[DONE]") {
              return JSON.parse(jsonStr);
            }
          }
        }
      } catch (e) {
        console.warn("⚠️ Failed to parse streaming data, trying full text parse");
      }
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("❌ Failed to parse response:", text.substring(0, 200));
      throw new Error(`Invalid JSON response: ${e.message}`);
    }
  }
  async req({
    endpoint,
    payload,
    method = "POST"
  }) {
    let lastError;
    for (let i = 0; i < this.baseUrls.length; i++) {
      const baseUrl = this.baseUrls[(this.currentBaseIndex + i) % this.baseUrls.length];
      try {
        console.log(`🚀 Starting request to: ${baseUrl}${endpoint}`);
        const url = `${baseUrl}${endpoint}`;
        const response = await fetch(url, {
          method: method,
          headers: this.config.defaultPayload.headers,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        console.log("✅ Request successful");
        this.currentBaseIndex = (this.currentBaseIndex + i) % this.baseUrls.length;
        return await this.parseResponse(response);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Base URL ${baseUrl} failed:`, error.message);
        if (i < this.baseUrls.length - 1) {
          console.log(`🔄 Trying fallback base URL...`);
          continue;
        }
      }
    }
    console.error("❌ All base URLs failed");
    throw lastError;
  }
  async chat({
    prompt,
    model = "gpt-4o-mini",
    stream = false,
    ...rest
  }) {
    try {
      console.log("🎯 Generating chat completion...");
      const payload = {
        model: this.config.supported.chat.includes(model) ? model : "gpt-4o-mini",
        stream: stream || false,
        messages: [{
          role: "user",
          content: prompt
        }],
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.chat,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Chat completions failed:", error.message);
      throw error;
    }
  }
  async draw({
    prompt,
    model = "sora-image",
    size = "1:1",
    variants = 1,
    urls = [],
    ...rest
  }) {
    try {
      console.log("🎨 Generating image...");
      const payload = {
        model: this.config.supported.image.includes(model) ? model : "sora-image",
        prompt: prompt || "A cute cat playing on the grass",
        size: size || "1:1",
        variants: variants || 1,
        urls: Array.isArray(urls) ? urls : [],
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.draw,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Draw completions failed:", error.message);
      throw error;
    }
  }
  async nano({
    prompt,
    model = "nano-banana",
    aspectRatio = "auto",
    urls = [],
    ...rest
  }) {
    try {
      console.log("🍌 Generating Nano Banana image...");
      const payload = {
        model: this.config.supported.nano.includes(model) ? model : "nano-banana",
        prompt: prompt || "A beautiful girl with long hair and blue eyes",
        aspectRatio: aspectRatio || "auto",
        urls: Array.isArray(urls) ? urls : [],
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.nano,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Draw Nano Banana failed:", error.message);
      throw error;
    }
  }
  async sora({
    prompt,
    model = "sora-2",
    aspectRatio = "9:16",
    duration = 10,
    size = "small",
    ...rest
  }) {
    try {
      console.log("🎥 Generating Sora video...");
      const payload = {
        model: this.config.supported.video.includes(model) ? model : "sora-2",
        prompt: prompt || "A cute cat playing on the grass",
        aspectRatio: aspectRatio || "9:16",
        duration: duration || 10,
        size: size || "small",
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.sora,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Sora video failed:", error.message);
      throw error;
    }
  }
  async veo({
    prompt,
    model = "veo3.1-fast",
    aspectRatio = "16:9",
    firstFrameUrl,
    lastFrameUrl,
    urls = [],
    ...rest
  }) {
    try {
      console.log("📹 Generating Veo video...");
      const payload = {
        model: this.config.supported.veo.includes(model) ? model : "veo3.1-fast",
        prompt: prompt || "A cute cat playing on the grass",
        aspectRatio: aspectRatio || "16:9",
        firstFrameUrl: firstFrameUrl || "",
        lastFrameUrl: lastFrameUrl || "",
        urls: Array.isArray(urls) ? urls : [],
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.veo,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Veo video failed:", error.message);
      throw error;
    }
  }
  async flux({
    prompt,
    model = "flux-kontext-max",
    urls = [],
    aspectRatio = "1:1",
    seed,
    ...rest
  }) {
    try {
      console.log("🌀 Generating Flux image...");
      const payload = {
        model: this.config.supported.flux.includes(model) ? model : "flux-kontext-max",
        prompt: prompt || "A cute cat playing on the grass",
        urls: Array.isArray(urls) ? urls : [],
        aspectRatio: aspectRatio || "1:1",
        seed: seed || 0,
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.flux,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Flux failed:", error.message);
      throw error;
    }
  }
  async imagen({
    prompt,
    model = "imagen-4-ultra",
    aspectRatio = "1:1",
    ...rest
  }) {
    try {
      console.log("🖼️ Generating Imagen image...");
      const payload = {
        model: this.config.supported.imagen.includes(model) ? model : "imagen-4-ultra",
        prompt: prompt || "A cute cat playing on the grass",
        aspectRatio: aspectRatio || "1:1",
        ...rest
      };
      return await this.req({
        endpoint: this.config.endpoint.imagen,
        payload: payload
      });
    } catch (error) {
      console.error("❌ Imagen failed:", error.message);
      throw error;
    }
  }
  async result({
    id
  }) {
    try {
      console.log("📋 Getting result for ID:", id);
      if (!id) {
        throw new Error('Parameter "id" is required');
      }
      return await this.req({
        endpoint: this.config.endpoint.result,
        payload: {
          id: id
        }
      });
    } catch (error) {
      console.error("❌ Get result failed:", error.message);
      throw error;
    }
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
      actions: ["chat", "draw", "nano", "sora", "veo", "flux", "imagen", "result"]
    });
  }
  const api = new GrsAI();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "draw":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'draw'."
          });
        }
        response = await api.draw(params);
        break;
      case "nano":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'nano'."
          });
        }
        response = await api.nano(params);
        break;
      case "sora":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'sora'."
          });
        }
        response = await api.sora(params);
        break;
      case "veo":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'veo'."
          });
        }
        response = await api.veo(params);
        break;
      case "flux":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'flux'."
          });
        }
        response = await api.flux(params);
        break;
      case "imagen":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'imagen'."
          });
        }
        response = await api.imagen(params);
        break;
      case "result":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'result'."
          });
        }
        response = await api.result(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          actions: ["chat", "draw", "nano", "sora", "veo", "flux", "imagen", "result"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}