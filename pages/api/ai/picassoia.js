import axios from "axios";
import CryptoJS from "crypto-js";
const VALID_ASPECT_RATIOS = ["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"];

function encrypt(data, key) {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  } catch (e) {
    console.error("Encrypt error:", e.message);
    return null;
  }
}

function parseField(f) {
  if (!f) return null;
  const k = Object.keys(f)[0];
  const v = f[k];
  if (k === "mapValue") {
    const obj = {};
    for (const key in v.fields) {
      obj[key] = parseField(v.fields[key]);
    }
    return obj;
  }
  if (k === "arrayValue") {
    return v.values ? v.values.map(parseField) : [];
  }
  return k.endsWith("Value") ? v : null;
}
class PicassoAI {
  constructor() {
    this.client = axios.create({
      timeout: 3e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://picassoia.com",
        referer: "https://picassoia.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-client-data": "CLjxygE=",
        "x-client-version": "Chrome/JsCore/9.10.0/FirebaseCore-web",
        "x-firebase-gmpid": "1:848355355730:web:5a018aca672793fb19438b"
      }
    });
    this.key = "AIzaSyDRaQ_WwRJPPLeHIweKj3rLwICqPa2XZfQ";
    this.secret = "2d9adfd8a1e5c57e82731e9d4c6a1cffae41b546d1fcbaf119366cc0926071db";
    this.uid = null;
    this.token = null;
  }
  validateAspectRatio(ratio) {
    if (!ratio) return true;
    if (!VALID_ASPECT_RATIOS.includes(ratio)) {
      console.log(`[Warn] Invalid aspect_ratio: ${ratio}. Using default.`);
      return false;
    }
    return true;
  }
  async auth() {
    if (this.token) return true;
    console.log("[Auth] Creating anonymous account...");
    const email = `${Math.random().toString(36).slice(2)}@emailhook.site`;
    try {
      const {
        data
      } = await this.client.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.key}`, {
        returnSecureToken: true,
        email: email,
        password: email
      });
      this.token = data.idToken;
      this.uid = data.localId;
      console.log("[Auth] Success!");
      return true;
    } catch (e) {
      console.error("[Auth] Failed →", e.response?.data || e.message);
      return false;
    }
  }
  async uploadImage(input) {
    if (!this.token) return null;
    let buffer;
    try {
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
        } else if (input.startsWith("data:")) {
          buffer = Buffer.from(input.split(",")[1], "base64");
        } else {
          buffer = Buffer.from(input, "base64");
        }
      } else {
        return null;
      }
      const fileName = `text-to-image/${this.uid}/p-image-edit/client-uploads/${Date.now()}-init.jpg`;
      const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
      const metadata = JSON.stringify({
        name: fileName,
        contentType: "image/jpeg"
      });
      const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n`), Buffer.from(`--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`), buffer, Buffer.from(`\r\n--${boundary}--\r\n`)]);
      await this.client.post(`https://firebasestorage.googleapis.com/v0/b/picassoai/o?name=${encodeURIComponent(fileName)}`, payload, {
        headers: {
          Authorization: `Firebase ${this.token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "x-goog-upload-protocol": "multipart"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      const {
        data
      } = await this.client.get(`https://firebasestorage.googleapis.com/v0/b/picassoai/o/${encodeURIComponent(fileName)}`, {
        headers: {
          Authorization: `Firebase ${this.token}`
        }
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/picassoai/o/${encodeURIComponent(fileName)}?alt=media&token=${data.downloadTokens}`;
      console.log("[Upload] Success → " + url);
      return url;
    } catch (e) {
      console.error("[Upload] Failed →", e.message);
      return null;
    }
  }
  async invokeTask(payload, modelName) {
    if (!this.token || !this.uid) return false;
    const encrypted = encrypt(payload, this.secret);
    if (!encrypted) return false;
    try {
      await this.client.post("https://us-central1-picassoai.cloudfunctions.net/invoke_ai", {
        data: {
          uid: this.uid,
          d: encrypted
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      console.log(`[Task] ${modelName} invoked`);
      return true;
    } catch (e) {
      console.error(`[Task] Invoke failed →`, e.response?.data || e.message);
      return false;
    }
  }
  async pollResult() {
    if (!this.token) return [];
    const query = {
      structuredQuery: {
        from: [{
          collectionId: "predicts"
        }],
        where: {
          fieldFilter: {
            field: {
              fieldPath: "uid"
            },
            op: "EQUAL",
            value: {
              stringValue: this.uid
            }
          }
        },
        orderBy: [{
          field: {
            fieldPath: "created_at"
          },
          direction: "DESCENDING"
        }],
        limit: 1
      }
    };
    const start = Date.now();
    while (Date.now() - start < 7e4) {
      try {
        const {
          data
        } = await this.client.post("https://firestore.googleapis.com/v1/projects/picassoai/databases/(default)/documents:runQuery", query, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        if (data?.[0]?.document?.fields) {
          const doc = {};
          for (const k in data[0].document.fields) {
            doc[k] = parseField(data[0].document.fields[k]);
          }
          const status = doc.status || doc.prediction_data?.status || "processing";
          process.stdout.write(`\r[Polling] ${status}...`);
          if (status === "succeeded") {
            console.log(`\n[Success] Generation complete!`);
            return doc;
          }
          if (status === "failed") {
            console.log(`\n[Failed] Generation failed`);
            return [];
          }
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 3e3));
    }
    console.log(`\n[Timeout] No result after 70s`);
    return [];
  }
  async generate({
    prompt = "",
    imageUrl,
    aspect_ratio,
    ...extraParams
  } = {}) {
    console.log("\n=== PicassoAI Generation ===");
    if (aspect_ratio && !this.validateAspectRatio(aspect_ratio)) {
      aspect_ratio = imageUrl ? "match_input_image" : "1:1";
    }
    if (!await this.auth()) {
      return {
        success: false,
        error: "Authentication failed"
      };
    }
    let payload, model;
    try {
      if (imageUrl) {
        model = "prunaai/p-image-edit";
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        const uploaded = [];
        for (let i = 0; i < urls.length; i++) {
          console.log(`[Upload] ${i + 1}/${urls.length}`);
          const url = await this.uploadImage(urls[i]);
          if (!url) {
            return {
              success: false,
              error: `Upload failed for image ${i + 1}`
            };
          }
          uploaded.push(url);
        }
        payload = {
          model_input: {
            model: model,
            input: {
              turbo: true,
              images: uploaded,
              prompt: prompt || "",
              aspect_ratio: aspect_ratio || "match_input_image",
              disable_safety_checker: true,
              ...extraParams
            }
          },
          config: {
            folder_bucket_to_save_predict: `text-to-image/${this.uid}/p-image-edit`,
            is_llm: false,
            category: "text-to-image",
            model: model,
            token_quantity: .2
          }
        };
      } else {
        model = "black-forest-labs/flux-schnell";
        payload = {
          model_input: {
            model: model,
            input: {
              prompt: prompt,
              go_fast: true,
              megapixels: "1",
              num_outputs: 2,
              aspect_ratio: aspect_ratio || "1:1",
              output_format: "webp",
              output_quality: 80,
              num_inference_steps: 4,
              disable_safety_checker: true,
              ...extraParams
            }
          },
          config: {
            folder_bucket_to_save_predict: `text-to-image/${this.uid}/flux-schnell`,
            is_llm: false,
            category: "text-to-image",
            model: model,
            token_quantity: .1
          }
        };
      }
      const taskOk = await this.invokeTask(payload, model);
      if (!taskOk) {
        return {
          success: false,
          error: "Failed to invoke AI task"
        };
      }
      const result = await this.pollResult();
      return result;
    } catch (e) {
      console.error("Unexpected error:", e.message);
      return {
        success: false,
        error: "Internal error: " + e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt && !params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'prompt' atau 'imageUrl' diperlukan"
    });
  }
  const api = new PicassoAI();
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