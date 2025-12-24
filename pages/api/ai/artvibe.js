import axios from "axios";
import crypto from "crypto";
class ArtVibeAPI {
  constructor(config = {}) {
    this.baseURL = config.baseURL || "https://api-ga-bp.artvibe.info";
    this.workflowURL = config.workflowURL || "https://api-ga-aws.artvibe.info";
    this.timezone = config.timezone || this.randomTimezone();
    this.userId = config.userId || "";
    this.packName = "com.yes366.etm";
    this.appVersion = "1.06.52";
    this.deviceId = config.deviceId || this.randomDeviceId();
    this.timeout = config.timeout || 36e4;
    this.headers = {
      "User-Agent": this.randomUserAgent(),
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "y-timezone": this.timezone,
      "cache-control": "no-cache",
      "y-user-id": this.userId,
      "y-pack-name": this.packName,
      "y-versions": JSON.stringify(this.genVersionData())
    };
  }
  randomUserAgent() {
    const devices = ["RMX3890", "RMX3686", "SM-G998B", "M2102J20SG", "2201116SG"];
    const builds = ["RE5C91L1", "TP1A.220905.001", "SP1A.210812.016"];
    const androidVer = [13, 14, 15][Math.floor(Math.random() * 3)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const build = builds[Math.floor(Math.random() * builds.length)];
    return `ETM/${this.appVersion} (Android ${androidVer}; ${device}; ${build}; arm64-v8a)`;
  }
  randomTimezone() {
    const zones = ["WIB | UTC +07:00", "WITA | UTC +08:00", "WIT | UTC +09:00"];
    return zones[Math.floor(Math.random() * zones.length)];
  }
  randomDeviceId() {
    return Array.from({
      length: 16
    }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  randomHex(len) {
    return Array.from({
      length: len
    }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  genVersionData() {
    const now = new Date();
    const insTime = new Date(now.getTime() - Math.random() * 864e5 * 30);
    const cuoTime = new Date(insTime.getTime() + Math.random() * 36e5);
    return {
      plt: "Android",
      pver: ["13", "14", "15"][Math.floor(Math.random() * 3)],
      aver: this.appVersion,
      "uid-gg-app-id": this.randomHex(32),
      "uid-gg-aut-id": "",
      "uid-se-dis-id": this.deviceId,
      "coun-code": ["ID", "MY", "SG"][Math.floor(Math.random() * 3)],
      "lang-code": ["id", "en", "ms"][Math.floor(Math.random() * 3)],
      "ins-time": insTime.toISOString().slice(0, 19).replace("T", " "),
      "cuo-time": cuoTime.toISOString().slice(0, 19).replace("T", " "),
      attr: "",
      "m-cid": "-1",
      "m-gid": "",
      "m-pid": "",
      "m-aid": "",
      ast: 0,
      asts: {
        5: 0,
        6: 0,
        7: 0
      },
      "ads-rh": {},
      "app-rh": {},
      "app-uap": false
    };
  }
  sign(timestamp) {
    return crypto.createHash("md5").update(`${timestamp}${this.packName}`).digest("hex");
  }
  async translate({
    text,
    source: sourceLang,
    target: targetLang,
    enhance: promptEnhance,
    model: modelType,
    ...rest
  }) {
    console.log("[TRANSLATE] Starting translation...");
    const timestamp = Math.floor(Date.now() / 1e3);
    try {
      const payload = {
        text: text,
        source_language: sourceLang || "auto",
        target_language: targetLang || "en",
        prompt_enhance: promptEnhance ?? false,
        sd_model_type: modelType || "sdxl",
        ...rest
      };
      const response = await axios.post(`${this.baseURL}/v2/call_translate`, payload, {
        headers: {
          ...this.headers,
          "x-timestamp": timestamp,
          "x-sign": this.sign(timestamp)
        },
        timeout: this.timeout
      });
      console.log("[TRANSLATE] Translation completed");
      return response?.data;
    } catch (err) {
      console.error("[TRANSLATE] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Translation failed: ${err?.response?.data?.message || err?.message || "Unknown error"}`);
    }
  }
  async suggestion({
    text: idea,
    lang: languages,
    count,
    ast,
    asts,
    ...rest
  }) {
    console.log("[SUGGESTION] Generating prompt suggestions...");
    const timestamp = Math.floor(Date.now() / 1e3);
    try {
      const payload = {
        idea: idea,
        languages: languages || ["en", "id"],
        count: count || 3,
        ...rest
      };
      const versionData = JSON.parse(this.headers["y-versions"]);
      versionData.ast = ast || 3;
      versionData.asts = asts || {
        5: 0,
        6: 0,
        7: 0,
        12: 2,
        23: 1
      };
      const response = await axios.post(`${this.baseURL}/v2/ai_prompt_suggestion`, payload, {
        headers: {
          ...this.headers,
          Accept: "application/json",
          "x-timestamp": timestamp,
          "x-sign": this.sign(timestamp),
          "y-versions": JSON.stringify(versionData)
        },
        timeout: this.timeout
      });
      console.log("[SUGGESTION] Suggestions generated successfully");
      return response?.data?.data || response?.data;
    } catch (err) {
      console.error("[SUGGESTION] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Suggestion failed: ${err?.response?.data?.message || err?.message || "Unknown error"}`);
    }
  }
  async generate({
    prompt,
    imageUrl,
    seed,
    steps,
    cfg,
    width,
    height,
    denoise,
    negative,
    referenceUrl,
    ...rest
  }) {
    console.log(`[GENERATE] Starting ${imageUrl ? "image-to-image" : "text-to-image"} generation...`);
    const timestamp = Math.floor(Date.now() / 1e3);
    const generatedSeed = seed || Math.floor(Math.random() * 1e15).toString();
    try {
      let imageData = null;
      if (imageUrl) {
        console.log("[GENERATE] Processing input image...");
        imageData = await this.processImage(imageUrl);
      }
      const options = {
        seed: generatedSeed,
        steps: steps || 22,
        cfg: cfg || (imageUrl ? 7.5 : 8),
        width: width || (imageUrl ? 1024 : 832),
        height: height || (imageUrl ? 1024 : 832),
        denoise: denoise || .55,
        negative: negative || "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
        referenceUrl: referenceUrl || "",
        ...rest
      };
      const workflow = this.buildT2IWorkflow(prompt, imageData, generatedSeed, options);
      const versionData = JSON.parse(this.headers["y-versions"]);
      versionData.wty = imageUrl ? 23 : 12;
      versionData.ast = imageUrl ? 2 : 0;
      versionData.asts = imageUrl ? {
        5: 0,
        6: 0,
        7: 0,
        12: 2
      } : {
        5: 0,
        6: 0,
        7: 0
      };
      const headers = {
        ...this.headers,
        Accept: "text/event-stream",
        "x-timestamp": timestamp,
        "x-sign": this.sign(timestamp),
        "y-versions": JSON.stringify(versionData)
      };
      const response = await axios.post(`${this.workflowURL}/v2/call_workflow`, {
        input: workflow,
        toolType: imageUrl ? 23 : 12
      }, {
        headers: headers,
        responseType: "stream",
        timeout: this.timeout
      });
      return await this.pollStream(response.data);
    } catch (err) {
      console.error("[GENERATE] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Generation failed: ${err?.response?.data?.message || err?.message || "Unknown error"}`);
    }
  }
  async processImage(input) {
    try {
      if (Buffer.isBuffer(input)) {
        console.log("[PROCESS_IMAGE] Converting Buffer to base64...");
        return input.toString("base64");
      }
      if (input.startsWith("data:image")) {
        console.log("[PROCESS_IMAGE] Extracting base64 from data URL...");
        return input.split(",")[1];
      }
      if (input.match(/^[A-Za-z0-9+/=]+$/)) {
        console.log("[PROCESS_IMAGE] Using provided base64...");
        return input;
      }
      console.log("[PROCESS_IMAGE] Fetching image from URL...");
      const response = await axios.get(input, {
        responseType: "arraybuffer",
        timeout: this.timeout
      });
      return Buffer.from(response.data).toString("base64");
    } catch (err) {
      console.error("[PROCESS_IMAGE] Error:", err?.message || err);
      throw new Error(`Image processing failed: ${err?.message || "Unknown error"}`);
    }
  }
  buildT2IWorkflow(prompt, imageData, seed, options) {
    const timestamp = Date.now();
    const filename = `upload_${timestamp}.png`;
    const imagesArray = imageData ? [{
      name: filename,
      image: imageData
    }] : null;
    return {
      images: imagesArray,
      workflow: {
        5: {
          inputs: {
            add_noise: "enable",
            noise_seed: seed,
            steps: options.steps,
            cfg: options.cfg,
            sampler_name: options.sampler || "euler_ancestral",
            scheduler: options.scheduler || "normal",
            start_at_step: 0,
            end_at_step: 1e4,
            return_with_leftover_noise: "disable",
            preview_method: "none",
            vae_decode: "true",
            model: ["6", 0],
            positive: ["6", 1],
            negative: ["6", 2],
            latent_image: ["6", 3],
            optional_vae: ["6", 4]
          },
          class_type: "KSampler Adv. (Efficient)"
        },
        6: {
          inputs: {
            ckpt_name: options.model || "animagineXLV31_v31.safetensors",
            vae_name: options.vae || "Baked VAE",
            clip_skip: options.clipSkip || -2,
            lora_name: options.lora || "add-detail-xl.safetensors",
            lora_model_strength: options.loraModelStrength || 0,
            lora_clip_strength: options.loraClipStrength || 1,
            positive: prompt.includes("masterpiece") ? prompt : `masterpiece,${prompt}`,
            negative: options.negative,
            token_normalization: "none",
            weight_interpretation: "comfy",
            empty_latent_width: options.width,
            empty_latent_height: options.height,
            batch_size: options.batchSize || 1
          },
          class_type: "Efficient Loader"
        },
        44: {
          inputs: {
            filename_prefix: "ComfyUI",
            format: options.format || "webp",
            webp_quality: options.quality || 75,
            images: ["5", 5]
          },
          class_type: "ETM_SaveImage"
        }
      },
      workflow_parameters: {
        seed: seed,
        prompt: prompt.includes("masterpiece") ? prompt : `masterpiece,${prompt}`,
        width: options.width.toString(),
        height: options.height.toString(),
        add_detail: options.addDetail || 0,
        batch_size: options.batchSize || 1
      }
    };
  }
  async pollStream(stream) {
    console.log("[POLL_STREAM] Starting stream polling...");
    let buffer = "";
    let lastProgress = 0;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Stream timeout after 5 minutes"));
      }, this.timeout);
      stream.on("data", chunk => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim() || !line.startsWith("{")) continue;
            try {
              const data = JSON.parse(line);
              if (data?.progress && data.progress !== lastProgress) {
                console.log(`[POLL_STREAM] Progress: ${(data.progress * 100).toFixed(1)}% - ${data?.title || "Processing..."}`);
                lastProgress = data.progress;
              }
              if (data?.type === "result" && data?.message) {
                console.log("[POLL_STREAM] Result received, converting to buffer...");
                clearTimeout(timeout);
                const imgBuffer = Buffer.from(data.message, "base64");
                resolve({
                  buffer: imgBuffer,
                  length: imgBuffer.length,
                  base64: data.message
                });
              }
              if (data?.status === "error") {
                clearTimeout(timeout);
                reject(new Error(data?.message || "Stream error"));
              }
            } catch (parseErr) {
              console.error("[POLL_STREAM] Parse error:", parseErr?.message);
            }
          }
        } catch (err) {
          console.error("[POLL_STREAM] Chunk processing error:", err?.message);
        }
      });
      stream.on("end", () => {
        clearTimeout(timeout);
        console.log("[POLL_STREAM] Stream ended");
        reject(new Error("Stream ended without result"));
      });
      stream.on("error", err => {
        clearTimeout(timeout);
        console.error("[POLL_STREAM] Stream error:", err?.message || err);
        reject(err);
      });
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
      error: "Parameter 'action' wajib diisi.",
      supportedActions: ["translate", "suggestion", "generate"]
    });
  }
  const api = new ArtVibeAPI();
  try {
    let response;
    switch (action) {
      case "translate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'translate'."
          });
        }
        response = await api.translate(params);
        return res.status(200).json(response);
      case "suggestion":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'suggestion'."
          });
        }
        response = await api.suggestion(params);
        return res.status(200).json(response);
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        if (response && response.buffer instanceof Buffer) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Content-Length", response.length);
          return res.status(200).send(response.buffer);
        } else {
          return res.status(500).json({
            success: false,
            error: "Output 'generate' tidak valid atau tidak berisi data gambar."
          });
        }
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supportedActions: ["translate", "suggestion", "generate"]
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error.message);
    if (error.response?.data) {
      console.error("API Response Data:", error.response.data);
    }
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal pada server.",
      action: action
    });
  }
}