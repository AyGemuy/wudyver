import fetch from "node-fetch";
import {
  randomBytes
} from "crypto";
import FormData from "form-data";
class PhotoMagic {
  constructor() {
    console.log("PhotoMagic: Instance dibuat.");
    this.config = {};
    this.FIREBASE_URL = "https://firebaseremoteconfig.googleapis.com/v1/projects/424324512840/namespaces/firebase:fetch";
    this.API_KEY = "AIzaSyDzC9vhzOyEYNIfa5R09C7Alv2yQwk4GIA";
    this.basePayload = {
      appId: "1:424324512840:android:9c5325510bf22b838eac7d",
      appInstanceId: this._rStr(20),
      appInstanceIdToken: this._rStr(15),
      platformVersion: "33",
      packageName: "com.hangoverstudios.photomagic.ai.photo.generator",
      sdkVersion: "22.1.2"
    };
    this.VALID_EFFECTS = new Set(["kissing", "lionbaby", "lionqueen", "batman", "harleyquinn", "pirate", "doll", "longhair", "samurai", "gladiator", "joker", "babyelephant", "lion", "turtle", "wolf", "walkie", "maid", "angel", "tiger", "money", "butterfly", "crown", "horse", "hug", "hug_jesus", "hulk", "gun_shoot", "electrify", "crying", "crush", "baby_face", "cakeify", "angry_face", "laughing", "olympic_winner", "superwoman", "ironman", "boxing_champion", "western_cowboy", "catwoman"]);
    this.DUMMY_IMAGE_BUFFER = randomBytes(1024 * 10);
    this.configPromise = null;
  }
  _rStr(length) {
    return randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  async _gBuf(imageUrl) {
    if (!imageUrl) return this.DUMMY_IMAGE_BUFFER;
    try {
      if (Buffer.isBuffer(imageUrl)) return imageUrl;
      if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        return matches ? Buffer.from(matches[2], "base64") : this.DUMMY_IMAGE_BUFFER;
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        console.log(`   >> [Log Proses] Input: URL (${imageUrl.substring(0, 50)}...)`);
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        console.log(`   >> [Log Proses] Downloaded: ${(buffer.length / 1024).toFixed(2)} KB`);
        return buffer;
      }
      return Buffer.from(imageUrl) || this.DUMMY_IMAGE_BUFFER;
    } catch (err) {
      console.log(`   >> [Log Proses] Gagal mendapatkan Buffer. Error: ${err.message}`);
      return this.DUMMY_IMAGE_BUFFER;
    }
  }
  async gConf() {
    console.log("\n1. Mengambil Config (gConf)...");
    try {
      const res = await fetch(this.FIREBASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.API_KEY
        },
        body: JSON.stringify(this.basePayload)
      });
      const data = await res.json();
      const e = data.entries || {};
      const parse = str => {
        try {
          return JSON.parse(str);
        } catch {
          return {};
        }
      };
      const aiTools = parse(e.aiToolsAPIJson?.toString());
      const artGen = parse(e.artGenrationApisJson?.toString());
      this.config = {
        appcheck: e.defaultAppcheck?.toString() || null,
        fcmToken: e.defaultFcmToken?.toString() || null,
        img2vidUrl: e.imagetoVideoAPiIdService?.toString() || null,
        img2vidResultUrl: e.imagetoVideoMp4ResultAPiService?.toString() || null,
        aiEnhanceIDApi: aiTools.aiEnhanceIDApi || null,
        aiEnhanceResultApi: aiTools.aiEnhanceResultApi || null,
        bgRemoveIDApi: aiTools.bgRemoveIDApi || null,
        bgRemoveResultApi: aiTools.bgRemoveResultApi || null,
        faceSwapUpload: artGen.templateCreationInstanceIdAPI || null,
        faceSwapResult: artGen.templateCreationForResultAPI || null
      };
      const requiredKeys = ["appcheck", "fcmToken", "img2vidUrl", "img2vidResultUrl", "aiEnhanceIDApi", "faceSwapUpload"];
      for (const key of requiredKeys) {
        if (!this.config[key]) {
          throw new Error(`Konfigurasi penting hilang: ${key}`);
        }
      }
      console.log("   [Log Proses] Config OK.");
      return true;
    } catch (err) {
      console.log(`   [Log Proses] Gagal config: ${err.message}`);
      this.config = {};
      return false;
    }
  }
  async _eConf() {
    if (Object.keys(this.config).length > 0) {
      return;
    }
    if (!this.configPromise) {
      console.log("\n[Log Proses] Config belum dimuat. Mencoba memuat...");
      this.configPromise = this.gConf().then(success => {
        this.configPromise = null;
        if (!success) {
          throw new Error("PhotoMagic Error: Gagal memuat atau mengkonfirmasi konfigurasi API.");
        }
        return;
      }).catch(error => {
        this.configPromise = null;
        throw error;
      });
    }
    await this.configPromise;
  }
  async img2vid({
    effect: effectName = "lion",
    imageUrl
  }) {
    console.log("\n2. Image to Video (vid)...");
    try {
      await this._eConf();
      const effect = effectName.toLowerCase() || "lion";
      if (!this.VALID_EFFECTS.has(effect)) {
        return {
          result: null
        };
      }
      const img = await this._gBuf(imageUrl);
      const params = new URLSearchParams({
        effect_name: effect,
        app_name: "PhotoMagic",
        user_id: `user-${this._rStr(8)}`
      });
      const form = new FormData();
      form.append("input_image", img, {
        filename: "img.png",
        contentType: "image/png"
      });
      const url = `${this.config.img2vidUrl}${params}`;
      console.log(`   [Log Proses] [POST] Request ke: ${url.substring(0, 80)}...`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          "x-firebase-appcheck": this.config.appcheck,
          fcmtoken: this.config.fcmToken
        },
        body: form
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(`   [Log Proses] Upload gagal (Status ${res.status}): ${text.substring(0, 200)}`);
        return {
          result: null
        };
      }
      const json = JSON.parse(text);
      const reqId = json.request_id || `vid-${this._rStr(6)}`;
      const resultUrl = `${this.config.img2vidResultUrl}${reqId}`;
      console.log(`   [Log Proses] Request ID: ${reqId}. Mengembalikan URL Polling: ${resultUrl}`);
      return {
        result: resultUrl
      };
    } catch (err) {
      console.log(`   [Log Proses] Error di vid: ${err.message}`);
      return {
        result: null
      };
    }
  }
  async enhance({
    imageUrl
  }) {
    console.log("\n3. AI Enhance (enh)...");
    try {
      await this._eConf();
      const img = await this._gBuf(imageUrl);
      const params = new URLSearchParams({
        template_id: "0",
        app_name: "PhotoMagic"
      });
      const baseUrl = this.config.aiEnhanceIDApi ? this.config.aiEnhanceIDApi : "";
      const url = `${baseUrl}?${params}`;
      const form = new FormData();
      form.append("sourceImage", img, {
        filename: "img.jpg"
      });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          "x-firebase-appcheck": this.config.appcheck,
          fcmtoken: this.config.fcmToken
        },
        body: form
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(`   [Log Proses] Upload gagal (Status ${res.status}): ${text.substring(0, 200)}`);
        return {
          result: null
        };
      }
      const json = JSON.parse(text);
      const reqId = json.request_id || `enh-${this._rStr(6)}`;
      const resultUrl = `${this.config.aiEnhanceResultApi}${reqId}`;
      console.log(`   [Log Proses] Request ID: ${reqId}. Mengembalikan URL Polling: ${resultUrl}`);
      return {
        result: resultUrl
      };
    } catch (err) {
      console.log(`   [Log Proses] Error di enh: ${err.message}`);
      return {
        result: null
      };
    }
  }
  async bgremove({
    imageUrl
  }) {
    console.log("\n4. Background Remover (rmBG)...");
    try {
      await this._eConf();
      const img = await this._gBuf(imageUrl);
      const params = new URLSearchParams({
        template_id: "0",
        app_name: "PhotoMagic"
      });
      const url = `${this.config.bgRemoveIDApi}?${params}`;
      const form = new FormData();
      form.append("sourceImage", img, {
        filename: "img.jpg"
      });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          "x-firebase-appcheck": this.config.appcheck,
          fcmtoken: this.config.fcmToken
        },
        body: form
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(`   [Log Proses] Upload gagal (Status ${res.status}): ${text.substring(0, 200)}`);
        return {
          result: null
        };
      }
      const json = JSON.parse(text);
      const reqId = json.request_id || `bg-${this._rStr(6)}`;
      const resultUrl = `${this.config.bgRemoveResultApi}${reqId}`;
      console.log(`   [Log Proses] Request ID: ${reqId}. Mengembalikan URL Polling: ${resultUrl}`);
      return {
        result: resultUrl
      };
    } catch (err) {
      console.log(`   [Log Proses] Error di rmBG: ${err.message}`);
      return {
        result: null
      };
    }
  }
  async faceswap({
    target: targetImageUrl,
    source: sourceImageUrl
  }) {
    console.log("\n5. FaceSwap (swp)...");
    try {
      await this._eConf();
      const source = await this._gBuf(sourceImageUrl);
      await this._gBuf(targetImageUrl);
      const params = new URLSearchParams({
        template_id: "0",
        app_name: "PhotoMagic"
      });
      const url = `${this.config.faceSwapUpload}?${params}`;
      const form = new FormData();
      form.append("sourceImage", source, {
        filename: "src.jpg"
      });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          "x-firebase-appcheck": this.config.appcheck,
          fcmtoken: this.config.fcmToken
        },
        body: form
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(`   [Log Proses] Upload gagal (Status ${res.status}): ${text.substring(0, 200)}`);
        return {
          result: null
        };
      }
      const json = JSON.parse(text);
      const reqId = json.request_id || `swap-${this._rStr(6)}`;
      const resultUrl = `${this.config.faceSwapResult}${reqId}`;
      console.log(`   [Log Proses] Request ID: ${reqId}. Mengembalikan URL Polling: ${resultUrl}`);
      return {
        result: resultUrl
      };
    } catch (err) {
      console.log(`   [Log Proses] Error di swp: ${err.message}`);
      return {
        result: null
      };
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new PhotoMagic();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      case "enhance":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'enhance'."
          });
        }
        response = await api.enhance(params);
        break;
      case "bgremove":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'bgremove'."
          });
        }
        response = await api.bgremove(params);
        break;
      case "faceswap":
        if (!params.target) {
          return res.status(400).json({
            error: "Parameter 'target' wajib diisi untuk action 'faceswap'."
          });
        }
        if (!params.source) {
          return res.status(400).json({
            error: "Parameter 'source' wajib diisi untuk action 'faceswap'."
          });
        }
        response = await api.faceswap(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'img2vid', 'enhance', 'bgremove', 'faceswap'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}