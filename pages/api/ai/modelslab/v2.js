import axios from "axios";
import ApiKey from "@/configs/api-key";
class ImageGenerator {
  constructor() {
    this.cfg = {
      replicate: {
        url: "https://api.replicate.com/v1/predictions",
        keys: ApiKey.replicate,
        models: {
          sdxl: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
          dalle: "2ade2cbfc88298b98366a6e361559e11666c17ed415d341c9ae776b30a61b196",
          openjourney: "ad59ca21177f9e217b9075e7300cf6e14f7e5b4505b87b9689dbd866e9768969",
          proteus: "06775cd262843edbde5abab958abdbb65a0a6b58ca301c9fd78fa55c775fc019",
          deliberate: "3cd4070012626a5788a0731e12a1e6ba9bc7a9dc7e6d3842cf2b7b05b56e9580"
        },
        payload: {
          width: 512,
          height: 512,
          num_outputs: 1
        },
        pollInterval: 3e3,
        pollTimeout: 6e4
      },
      stable: {
        url: {
          txt2img: "https://modelslab.com/api/v6/realtime/text2img",
          img2img: "https://modelslab.com/api/v6/realtime/img2img"
        },
        key: "BGPf1qQVf3jGwLklDJwjuXy68pxliroGoZagXpdhsov3JcK4TIgSNpxkoVd7",
        payload: {
          width: 512,
          height: 512,
          samples: 1,
          safety_checker: false,
          seed: Math.floor(Math.random() * 1e5),
          instant_response: false,
          base64: false,
          webhook: null,
          track_id: null
        }
      }
    };
  }
  valModel(type, model) {
    console.log(`[VAL] Validating model: ${model || "default"}`);
    try {
      if (type === "replicate") {
        const m = model || "sdxl";
        const valid = this.cfg.replicate.models?.[m];
        if (!valid) {
          const avail = Object.keys(this.cfg.replicate.models).join(", ");
          throw new Error(`Invalid model: ${m}. Available: ${avail}`);
        }
        console.log(`[VAL] Model OK: ${m}`);
        return m;
      }
      console.log("[VAL] Stable API (no model validation)");
      return null;
    } catch (e) {
      console.error(`[VAL] Error: ${e?.message || e}`);
      throw e;
    }
  }
  async generate({
    type = "stable",
    prompt,
    imageUrl,
    model,
    ...rest
  }) {
    console.log(`[START] Type: ${type}, Prompt: "${prompt?.substring(0, 50)}..."`);
    try {
      if (!type || !prompt) {
        throw new Error("Type and prompt required");
      }
      if (type === "replicate") {
        const validModel = this.valModel(type, model);
        return await this.genRep(prompt, imageUrl, validModel, rest);
      } else if (type === "stable") {
        return await this.genStb(prompt, imageUrl, rest);
      }
      throw new Error(`Invalid type: ${type}. Use 'replicate' or 'stable'`);
    } catch (e) {
      console.error(`[ERROR] Generate failed: ${e?.message || e}`);
      throw e;
    }
  }
  async genRep(prompt, imageUrl, model, opts) {
    console.log(`[REP] Starting with model: ${model}`);
    const keys = this.cfg.replicate.keys;
    if (!keys || keys.length === 0) throw new Error("No Replicate keys available.");
    let lastError = null;
    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];
      console.log(`[REP] Trying key index [${i}]...`);
      try {
        const version = this.cfg.replicate.models[model];
        const payload = {
          version: version,
          input: {
            prompt: prompt,
            ...this.cfg.replicate.payload,
            ...opts
          }
        };
        if (imageUrl) {
          console.log("[REP] Processing image input...");
          const imgs = await this.procImg(imageUrl);
          if (imgs.length > 0) {
            payload.input.image = imgs[0];
          }
        }
        console.log("[REP] Sending request...");
        const {
          data
        } = await axios.post(this.cfg.replicate.url, payload, {
          headers: {
            Authorization: `Token ${currentKey}`,
            "Content-Type": "application/json"
          }
        });
        const pollUrl = data?.urls?.get || "";
        console.log(`[REP] Job created: ${data?.id || "unknown"}`);
        return await this.pollRep(pollUrl, currentKey);
      } catch (e) {
        const errMsg = e?.response?.data?.detail || e?.message || e;
        console.warn(`[REP] Key index [${i}] failed: ${errMsg}`);
        lastError = e;
        if (i === keys.length - 1) {
          console.error("[REP] All keys exhausted.");
          throw lastError;
        } else {
          console.log("[REP] Switching to next key...");
        }
      }
    }
  }
  async pollRep(url, activeKey) {
    console.log("[REP-POLL] Starting polling (max 1 min, interval 3s)...");
    const startTime = Date.now();
    const timeout = this.cfg.replicate.pollTimeout;
    const interval = this.cfg.replicate.pollInterval;
    try {
      while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          throw new Error("Polling timeout (1 minute exceeded)");
        }
        console.log(`[REP-POLL] Checking... (${Math.floor(elapsed / 1e3)}s)`);
        const {
          data
        } = await axios.get(url, {
          headers: {
            Authorization: `Token ${activeKey}`
          }
        });
        const status = data?.status || "";
        console.log(`[REP-POLL] Status: ${status}`);
        if (status === "succeeded") {
          console.log("[REP-POLL] Success! Returning response...");
          return data;
        }
        if (status === "failed" || status === "canceled") {
          const err = data?.error || "Process failed/canceled";
          console.error(`[REP-POLL] Failed: ${err}`);
          throw new Error(err);
        }
        await this.delay(interval);
      }
    } catch (e) {
      console.error(`[REP-POLL] Error: ${e?.message || e}`);
      throw e;
    }
  }
  async genStb(prompt, imageUrl, opts) {
    const mode = imageUrl ? "img2img" : "txt2img";
    console.log(`[STB] Mode: ${mode} (ModelsLab v6)`);
    try {
      const url = this.cfg.stable.url[mode];
      const payload = {
        key: this.cfg.stable.key,
        prompt: prompt,
        negative_prompt: opts.negative_prompt || "",
        ...this.cfg.stable.payload,
        ...opts
      };
      if (imageUrl) {
        console.log("[STB] Processing image input for img2img...");
        const imgs = await this.procImg(imageUrl);
        if (imgs.length > 0) {
          payload.init_image = imgs[0];
          payload.strength = opts.strength || .5;
        }
      }
      console.log(`[STB] Sending request to ${url}...`);
      const {
        data
      } = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const status = data?.status || "";
      console.log(`[STB] Response Status: ${status}`);
      if (status === "success") {
        console.log("[STB] Success! Returning output.");
        return data;
      }
      if (status === "error" || status === "failed") {
        throw new Error(data?.message || data?.tip || "Generation failed");
      }
      return data;
    } catch (e) {
      console.error(`[STB] Error: ${e?.response?.data?.message || e?.message || e}`);
      throw e;
    }
  }
  async procImg(imageUrl) {
    console.log("[PROC-IMG] Processing input...");
    try {
      const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const res = [];
      for (const u of urls) {
        if (typeof u === "string" && u.startsWith("http")) {
          console.log("[PROC-IMG] URL detected");
          res.push(u);
        } else if (typeof u === "string" && u.startsWith("data:")) {
          console.log("[PROC-IMG] Base64 detected");
          res.push(u);
        } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(u)) {
          console.log("[PROC-IMG] Buffer detected, converting...");
          const b64 = u.toString("base64");
          res.push(`data:image/png;base64,${b64}`);
        } else {
          console.log("[PROC-IMG] Unknown format, passing as-is");
          res.push(u);
        }
      }
      console.log(`[PROC-IMG] Processed ${res.length} image(s)`);
      return res;
    } catch (e) {
      console.error(`[PROC-IMG] Error: ${e?.message || e}`);
      throw e;
    }
  }
  delay(ms) {
    return new Promise(r => setTimeout(r, ms || 1e3));
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ImageGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}