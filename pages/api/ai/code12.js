import axios from "axios";
import FormData from "form-data";
const genUUID = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === "x" ? r : r & 3 | 8).toString(16);
});
class GhibliClient {
  constructor() {
    this.cfg = {
      id: "CODE12_515_02",
      secret: "29BB2947BC9C6FD9F361B5CC34E54",
      urls: {
        auth: "https://api.code12.cloud/app/paygate-oauth/token",
        theme: "https://api.code12.cloud/app/v2/ghibli/",
        tool: "https://api.code12.cloud/app/v2/ai-tool/"
      },
      ua: "okhttp/4.12.0"
    };
    this.session = {
      token: null,
      exp: 0
    };
    this.store = {
      themes: [],
      options: []
    };
  }
  async _auth() {
    try {
      if (this.session.token && Date.now() < this.session.exp) return this.session.token;
      console.log("[Auth] 🔑 Requesting new token...");
      const {
        data
      } = await axios.post(this.cfg.urls.auth, {
        appId: this.cfg.id,
        secretKey: this.cfg.secret
      }, {
        headers: {
          "User-Agent": this.cfg.ua,
          "Content-Type": "application/json"
        }
      });
      if (data?.data?.token) {
        this.session = {
          token: data.data.token,
          exp: data.data.tokenExpire - 3e4
        };
        console.log("[Auth] ✅ Token acquired");
        return this.session.token;
      }
      throw new Error("Token response empty");
    } catch (e) {
      console.error("[Auth] ❌ Failed:", e.message);
      throw e;
    }
  }
  async _load(mode) {
    try {
      const token = await this._auth();
      if (mode === "theme" && !this.store.themes.length) {
        console.log("[Data] 📥 Fetching themes...");
        const {
          data
        } = await axios.get(`${this.cfg.urls.theme}themes?languageCode=en`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": this.cfg.ua
          }
        });
        this.store.themes = data.data || [];
      } else if (mode === "option" && !this.store.options.length) {
        console.log("[Data] 📥 Fetching options...");
        const {
          data
        } = await axios.get(`${this.cfg.urls.theme}options?languageCode=en&parentId=0`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": this.cfg.ua
          }
        });
        const flat = arr => arr.reduce((acc, cur) => acc.concat(cur, cur.featureChild ? flat(cur.featureChild) : []), []);
        this.store.options = flat(data.data || []);
      }
    } catch (e) {
      console.error(`[Data] ❌ Failed to load ${mode}:`, e.message);
      throw e;
    }
  }
  _resolve(mode, input) {
    const list = mode === "theme" ? this.store.themes : this.store.options;
    if (!list.length) return {
      valid: false,
      msg: `No ${mode}s available`
    };
    let item = null;
    if (input) {
      const k = String(input).toLowerCase();
      item = list.find(x => x.studioId == k || x.featureId == k || x.code && x.code.toLowerCase() === k || (x.name || x.featureName || "").toLowerCase().includes(k));
    }
    if (item) return {
      valid: true,
      item: item,
      isRandom: false
    };
    const candidates = mode === "option" ? list.filter(x => x.attribute) : list;
    const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      valid: true,
      item: randomItem,
      isRandom: true,
      originalInput: input
    };
  }
  async generate({
    mode = "theme",
    imageUrl,
    model,
    ...rest
  }) {
    const result = {
      success: false,
      mode: mode,
      request_model: model,
      timestamp: new Date().toISOString()
    };
    try {
      console.log(`\n🚀 GENERATE START: [${mode.toUpperCase()}]`);
      await this._load(mode);
      const token = await this._auth();
      const res = this._resolve(mode, model);
      if (!res.valid) throw new Error(res.msg);
      const target = res.item;
      const targetName = target.name || target.featureName;
      if (res.isRandom) {
        console.log(`⚠️ Input '${model}' not found/empty. Randomly picked: "${targetName}"`);
      } else {
        console.log(`✅ Model resolved: "${targetName}"`);
      }
      result.used_model = {
        id: target.studioId || target.featureId,
        name: targetName,
        code: target.code || null,
        is_random: res.isRandom
      };
      console.log(`📦 Downloading image: ${imageUrl}`);
      const imgBuffer = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      }).then(r => r.data);
      const form = new FormData();
      const filename = `img_${Date.now()}.jpg`;
      const uuid = genUUID();
      let url = "";
      if (mode === "theme") {
        url = `${this.cfg.urls.theme}user-image/edit-theme`;
        form.append("studio", target.code, {
          contentType: "text/plain"
        });
      } else {
        url = `${this.cfg.urls.tool}user-image/edit-option`;
        const attr = typeof target.attribute === "string" ? target.attribute : JSON.stringify(target.attribute || {});
        form.append("feature", attr, {
          contentType: "text/plain"
        });
      }
      form.append("file", Buffer.from(imgBuffer), {
        filename: filename,
        contentType: "image/jpeg"
      });
      console.log(`📡 Sending request to API...`);
      const {
        data
      } = await axios.post(url, form, {
        params: {
          uuid: uuid
        },
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
          "User-Agent": this.cfg.ua
        }
      });
      if (data?.status?.code == 200) {
        console.log(`✅ Success! Image URL acquired.`);
        result.success = true;
        result.image_url = data.data.imageUrl;
        result.message = "Success";
        result.store = this.store;
      } else {
        throw new Error(data?.status?.message || "API returned non-200");
      }
    } catch (e) {
      console.error(`💥 GENERATE ERROR: ${e.message}`);
      result.error = {
        message: e.message,
        detail: e.response?.data || "No details"
      };
    }
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new GhibliClient();
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