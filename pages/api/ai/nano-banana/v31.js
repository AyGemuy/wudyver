import axios from "axios";
import {
  randomUUID,
  createHash,
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
class BananaApi {
  constructor() {
    this.base = "https://bananadesigner.com/api";
    this.sbUrl = "https://vmmqjmxlhqrwpxsqclux.supabase.co/auth/v1";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbXFqbXhsaHFyd3B4c3FjbHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTMxMTcsImV4cCI6MjA3MzY4OTExN30.QHdcZ7Fr3lDvSsqGepvlHP1RNG2JTtJVla67C_zyzmY";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.token = null;
    this.user = null;
    this.models = {
      "nano-banana": {
        provider: "kie.ai",
        maxImages: 10,
        supportMulti: "multiple",
        defaultSecondary: null,
        baseFeature: "standard"
      },
      "nano-banana-pro": {
        provider: "kie.ai",
        maxImages: 10,
        supportMulti: "multiple",
        defaultSecondary: "1K",
        baseFeature: "standard-v2"
      },
      flux: {
        provider: "flux",
        maxImages: 1,
        supportMulti: "single",
        defaultSecondary: "pro",
        baseFeature: null
      },
      midjourney: {
        provider: "midjourney",
        maxImages: 1,
        supportMulti: "single",
        defaultSecondary: "fast",
        baseFeature: null
      },
      gpt4o: {
        provider: "gpt4o",
        maxImages: 10,
        supportMulti: "multiple",
        defaultSecondary: "1v",
        baseFeature: null
      },
      seedream: {
        provider: "seedream",
        maxImages: 10,
        supportMulti: "multiple",
        defaultSecondary: "1K",
        baseFeature: null
      },
      qwen: {
        provider: "qwen",
        maxImages: 1,
        supportMulti: "single",
        defaultSecondary: null,
        baseFeature: null
      }
    };
    this.ratioMaps = {
      "nano-banana": {
        auto: "auto",
        "1:1": "1:1",
        "3:4": "3:4",
        "4:3": "4:3",
        "2:3": "2:3",
        "3:2": "3:2",
        "9:16": "9:16",
        "16:9": "16:9",
        "5:4": "5:4",
        "4:5": "4:5",
        "21:9": "21:9",
        "2:1": "2:1"
      },
      "nano-banana-pro": {
        auto: "auto",
        "1:1": "1:1",
        "3:4": "3:4",
        "4:3": "4:3",
        "2:3": "2:3",
        "3:2": "3:2",
        "9:16": "9:16",
        "16:9": "16:9",
        "5:4": "5:4",
        "4:5": "4:5",
        "21:9": "21:9",
        "2:1": "2:1"
      },
      flux: {
        "1:1": "1:1",
        "4:3": "4:3",
        "3:4": "3:4",
        "16:9": "16:9",
        "9:16": "9:16",
        "21:9": "21:9",
        "9:21": "9:21"
      },
      midjourney: {
        "1:1": "1:1",
        "3:2": "3:2",
        "2:3": "2:3",
        "4:3": "4:3",
        "3:4": "3:4",
        "16:9": "16:9",
        "9:16": "9:16"
      },
      gpt4o: {
        "1:1": "1:1",
        "3:2": "3:2",
        "2:3": "2:3"
      },
      seedream: {
        "1:1": "square_hd",
        "1:1 (HD)": "square_hd",
        "3:2": "landscape_3_2",
        "2:3": "portrait_3_2",
        "4:3": "landscape_4_3",
        "3:4": "portrait_4_3",
        "16:9": "landscape_16_9",
        "9:16": "portrait_16_9",
        "21:9": "landscape_21_9"
      },
      qwen: {
        "1:1": "square_hd",
        "1:1 (HD)": "square_hd",
        "4:3": "landscape_4_3",
        "3:4": "portrait_4_3",
        "16:9": "landscape_16_9",
        "9:16": "portrait_16_9"
      }
    };
  }
  log(msg) {
    console.log(`[Banana] ${msg}`);
  }
  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  pkce() {
    const verifier = randomBytes(32).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const challenge = createHash("sha256").update(verifier).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return {
      verifier: verifier,
      challenge: challenge
    };
  }
  async mkMail() {
    try {
      const {
        data
      } = await axios.get(`${this.mailApi}?action=create`);
      if (!data?.email) throw new Error("Email provider failed");
      this.log(`Temp Mail: ${data.email}`);
      return data.email;
    } catch (e) {
      throw new Error(`Mail Error: ${e.message}`);
    }
  }
  async waitOtp(email) {
    this.log("Waiting for OTP...");
    let tries = 0;
    while (tries < 30) {
      await this.sleep(3e3);
      try {
        const {
          data
        } = await axios.get(`${this.mailApi}?action=message&email=${email}`);
        const msgs = data?.data || [];
        if (msgs.length) {
          const txt = msgs[0].text_content || msgs[0].html_content || "";
          const link = txt.match(/https:\/\/vmmqjmxlhqrwpxsqclux\.supabase\.co\/auth\/v1\/verify\?[^"\s\]\)]+/);
          if (link) return link[0];
        }
      } catch (e) {}
      tries++;
    }
    throw new Error("OTP Timeout");
  }
  async auth() {
    if (this.token) return;
    try {
      const mail = await this.mkMail();
      const {
        challenge
      } = this.pkce();
      await axios.post(`${this.sbUrl}/signup`, {
        email: mail,
        password: mail,
        data: {
          name: ""
        },
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: "s256"
      }, {
        headers: {
          apikey: this.sbKey,
          "content-type": "application/json"
        }
      });
      let verifyUrl = await this.waitOtp(mail);
      if (!verifyUrl.includes("redirect_to")) verifyUrl += "&redirect_to=https://bananadesigner.com";
      await axios.get(verifyUrl);
      const {
        data
      } = await axios.post(`${this.sbUrl}/token?grant_type=password`, {
        email: mail,
        password: mail,
        gotrue_meta_security: {}
      }, {
        headers: {
          apikey: this.sbKey,
          "content-type": "application/json"
        }
      });
      this.token = data?.access_token;
      this.log("Auth Success!");
    } catch (e) {
      throw new Error(`Auth Error: ${e.message}`);
    }
  }
  async prepImg(src) {
    try {
      let buf, mime = "image/jpeg",
        name = `img_${Date.now()}.jpg`;
      if (Buffer.isBuffer(src)) {
        buf = src;
      } else if (src.startsWith("http")) {
        const res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res.data);
        mime = res.headers["content-type"] || mime;
        name = `url_${Date.now()}.${mime.split("/")[1]}`;
      } else return null;
      return {
        b: buf,
        t: mime,
        n: name,
        s: buf.length
      };
    } catch (e) {
      return null;
    }
  }
  async upImg(imgObj) {
    if (!this.token) await this.auth();
    const {
      data: sign
    } = await axios.post(`${this.base}/storage/signed-upload`, {
      filename: imgObj.n,
      contentType: imgObj.t,
      size: imgObj.s
    }, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "content-type": "application/json"
      }
    });
    await axios.put(sign.uploadUrl, imgObj.b, {
      headers: {
        "Content-Type": imgObj.t
      }
    });
    return sign.publicUrl;
  }
  resolveRatio(model, ratio) {
    const map = this.ratioMaps[model] || this.ratioMaps["nano-banana-pro"];
    return map[ratio] || ratio;
  }
  buildFeatureString(model, isImg2Img, secondaryOption) {
    const baseType = isImg2Img ? "image2image" : "text2image";
    const conf = this.models[model] || this.models["nano-banana-pro"];
    const opt = (secondaryOption || conf.defaultSecondary || "").toLowerCase();
    if (model === "nano-banana") return `${baseType}-standard`;
    if (model === "nano-banana-pro") return `${baseType}-standard-v2-${opt || "1k"}`;
    if (model === "flux") return `flux-${baseType}-${opt || "pro"}`;
    if (model === "midjourney") return `midjourney-${baseType}-${opt || "fast"}`;
    if (model === "gpt4o") return `gpt4o-${baseType}-${opt || "1v"}`;
    if (model === "seedream") return `seedream-${isImg2Img ? "edit" : "text2image"}-${opt || "1k"}`;
    if (model === "qwen") return `qwen-${baseType}`;
    return `${baseType}-standard`;
  }
  buildInputJson(model, options) {
    const {
      prompt,
      aspectRatio,
      imageUrls,
      secondaryOption
    } = options;
    const conf = this.models[model] || this.models["nano-banana-pro"];
    const ratio = this.resolveRatio(model, aspectRatio || "1:1");
    const opt = secondaryOption || conf.defaultSecondary;
    const isImg2Img = imageUrls && imageUrls.length > 0;
    const feature = this.buildFeatureString(model, isImg2Img, opt);
    const json = {
      prompt: prompt,
      _provider: conf.provider,
      _feature: feature,
      _model: model
    };
    if (conf.provider === "kie.ai") {
      json.aspect_ratio = ratio;
      if (model === "nano-banana-pro") {
        json.resolution = opt || "1K";
        json.output_format = "png";
        if (isImg2Img) {
          json.image_input = imageUrls;
          json.image_sequence = imageUrls.map((url, i) => ({
            url: url,
            sequence: i + 1
          }));
        }
      } else {
        json.output_format = "jpeg";
        if (isImg2Img) json.image_urls = imageUrls;
      }
    } else if (conf.provider === "flux") {
      json.aspectRatio = ratio;
      json.model = opt === "max" ? "flux-kontext-max" : "flux-kontext-pro";
      json.enableTranslation = true;
      json.outputFormat = "jpeg";
      if (isImg2Img) json.inputImage = imageUrls[0];
    } else if (conf.provider === "midjourney") {
      json.aspectRatio = ratio;
      json.speed = opt || "fast";
      json.version = "7";
      if (isImg2Img) json.fileUrl = imageUrls[0];
    } else if (conf.provider === "gpt4o") {
      json.size = ratio;
      json.nVariants = opt === "4v" ? 4 : opt === "2v" ? 2 : 1;
      if (isImg2Img) json.filesUrl = imageUrls;
    } else if (conf.provider === "seedream") {
      json.image_size = ratio;
      json.image_resolution = opt || "1K";
      if (isImg2Img) json.image_urls = imageUrls;
      else json.max_images = 1;
    } else if (conf.provider === "qwen") {
      json.image_size = ratio;
      if (isImg2Img) json.image_url = imageUrls[0];
    }
    return json;
  }
  async generate({
    token,
    prompt,
    imageUrl,
    model = "nano-banana-pro",
    ratio = "auto",
    secondaryOption = null
  }) {
    try {
      if (token) this.token = token;
      if (!this.token) await this.auth();
      let imageUrls = [];
      if (imageUrl) {
        const rawList = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        const conf = this.models[model] || this.models["nano-banana-pro"];
        if (conf.supportMulti === "single" && rawList.length > 1) {
          throw new Error(`Model ${model} only supports 1 image.`);
        }
        for (const raw of rawList) {
          if (typeof raw === "string" && raw.startsWith("http")) {
            imageUrls.push(raw);
          } else {
            const p = await this.prepImg(raw);
            if (p) imageUrls.push(await this.upImg(p));
          }
        }
      }
      const isImg2Img = imageUrls.length > 0;
      const feature = this.buildFeatureString(model, isImg2Img, secondaryOption);
      const inputJson = this.buildInputJson(model, {
        prompt: prompt,
        aspectRatio: ratio,
        imageUrls: imageUrls,
        secondaryOption: secondaryOption
      });
      const payload = {
        type: isImg2Img ? "image_to_image" : "text_to_image",
        input_json: inputJson,
        feature: feature,
        idempotency_key: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      this.log(`Generating [${model}] ${feature} (${ratio})...`);
      const {
        data: task
      } = await axios.post(`${this.base}/tasks`, payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          "user-agent": this.ua
        }
      });
      if (!task.task_id) throw new Error("Task creation failed");
      const tid = task.task_id;
      this.log(`Task ID: ${tid}`);
      while (true) {
        await this.sleep(3e3);
        const {
          data: st
        } = await axios.get(`${this.base}/tasks/${tid}/status`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        const status = st.task.status;
        if (status === "complete") {
          const result = st.task.result;
          let images = [];
          if (result.images) images = result.images.map(i => i.url);
          else if (result.outputs) images = result.outputs.map(i => i.image_url);
          else if (result.resultUrls) images = result.resultUrls;
          return {
            success: true,
            task_id: tid,
            images: images,
            raw: result,
            token: this.token
          };
        } else if (status === "failed") {
          throw new Error(st.task.result?.error || "Generation Failed");
        }
      }
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new BananaApi();
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