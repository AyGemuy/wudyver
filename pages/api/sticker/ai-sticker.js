import axios from "axios";
import FormData from "form-data";
class StickerAPI {
  constructor({
    baseUrl,
    aiUrl,
    token
  } = {}) {
    this.base = baseUrl || "https://stickercommunity.com/api_v3/";
    this.ai = aiUrl || "https://stickercommunity.com/apps/ai-sticker/api/";
    this.token = token || "Bearer eGPiQb4UpJlEeY5Ewy0NIuDRUBnVpGPlDg2BqgJ2EFkuyFJFRLXGeRvp5kw0b1BbyHxM5ycdNmNT8Y";
    this.ax = axios.create({
      timeout: 3e4
    });
  }
  genId() {
    return `device_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
  }
  async getBuff(img) {
    try {
      if (Buffer.isBuffer(img)) {
        console.log("[INFO] Image is already buffer");
        return img;
      }
      if (typeof img === "string") {
        if (img.startsWith("data:image")) {
          console.log("[INFO] Converting base64 to buffer");
          const b64 = img.split(",")[1] || img;
          return Buffer.from(b64, "base64");
        }
        if (!img.startsWith("http")) {
          console.log("[INFO] Converting base64 string to buffer");
          return Buffer.from(img, "base64");
        }
        console.log("[INFO] Downloading image from URL");
        const {
          data
        } = await this.ax.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      throw new Error("Invalid image format. Use URL, base64, or Buffer");
    } catch (err) {
      console.error("[ERR] getBuff:", err?.message || err);
      throw err;
    }
  }
  async tags() {
    try {
      console.log("[GET] tags_list.php");
      const {
        data
      } = await this.ax.get(`${this.base}tags_list.php`);
      console.log("[OK] Tags retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] tags:", err?.message || err);
      throw err;
    }
  }
  async search_list({
    query: search = "",
    device = "android",
    appversion = "1.0",
    country = "US",
    version = "52",
    page = 1
  } = {}) {
    try {
      console.log(`[POST] ok_best_sticker_search.php - search: "${search}", page: ${page}`);
      const params = new URLSearchParams({
        search: search,
        device: device,
        appversion: appversion,
        country_code: country,
        version: version,
        page_number: page
      });
      const {
        data
      } = await this.ax.post(`${this.base}ok_best_sticker_search.php`, params);
      console.log("[OK] Stickers retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] search_list:", err?.message || err);
      throw err;
    }
  }
  async related({
    id: packImgId
  }) {
    try {
      console.log(`[POST] pack_images_basedPackSingleImg.php - packImgId: ${packImgId}`);
      const params = new URLSearchParams({
        pack_image_id: packImgId
      });
      const {
        data
      } = await this.ax.post(`${this.base}pack_images_basedPackSingleImg.php`, params);
      console.log("[OK] Related stickers retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] related:", err?.message || err);
      throw err;
    }
  }
  async emoji() {
    try {
      console.log("[GET] emoji_list.php");
      const {
        data
      } = await this.ax.get(`${this.base}emoji_list.php`);
      console.log("[OK] Emoji list retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] emoji:", err?.message || err);
      throw err;
    }
  }
  async suggestion() {
    try {
      console.log("[GET] prompt_suggestions_listing.php");
      const {
        data
      } = await this.ax.get(`${this.ai}prompt_suggestions_listing.php`);
      console.log("[OK] Prompt suggestions retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] suggestion:", err?.message || err);
      throw err;
    }
  }
  async add_prompt({
    device = "android",
    country = "US",
    prompt
  }) {
    try {
      console.log(`[POST] add_prompt_iphone.php - prompt: "${prompt}"`);
      const params = new URLSearchParams({
        device: device,
        country_code: country,
        prompt_name: prompt
      });
      const {
        data
      } = await this.ax.post(`${this.ai}add_prompt_iphone.php`, params, {
        headers: {
          Authorization: this.token
        }
      });
      console.log("[OK] Prompt added:", data?.prompt_id || "success");
      return data;
    } catch (err) {
      console.error("[ERR] add_prompt:", err?.message || err);
      throw err;
    }
  }
  async prompt_status({
    id: promptId
  }) {
    try {
      console.log(`[POST] get_prompt_status.php - promptId: ${promptId}`);
      const params = new URLSearchParams({
        prompt_id: promptId
      });
      const {
        data
      } = await this.ax.post(`${this.ai}get_prompt_status.php`, params, {
        headers: {
          Authorization: this.token
        }
      });
      console.log("[OK] Status:", data?.status || "retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] prompt_status:", err?.message || err);
      throw err;
    }
  }
  async cancel_prompt({
    id: promptId
  }) {
    try {
      console.log(`[POST] cancel_process.php - promptId: ${promptId}`);
      const params = new URLSearchParams({
        prompt_id: promptId
      });
      const {
        data
      } = await this.ax.post(`${this.ai}cancel_process.php`, params, {
        headers: {
          Authorization: this.token
        }
      });
      console.log("[OK] Prompt cancelled");
      return data;
    } catch (err) {
      console.error("[ERR] cancel_prompt:", err?.message || err);
      throw err;
    }
  }
  async add_face({
    img,
    deviceId,
    appVer = "1.0",
    country = "US"
  } = {}) {
    try {
      const devId = deviceId || this.genId();
      console.log(`[POST] add_face_sticker.php - device: ${devId}`);
      const buffer = await this.getBuff(img);
      const form = new FormData();
      form.append("IMG", buffer, {
        filename: "image.jpg"
      });
      form.append("device_id", devId);
      form.append("app_version_id", appVer);
      form.append("country_id", country);
      const {
        data
      } = await this.ax.post(`${this.ai}add_face_sticker.php`, form, {
        headers: form.getHeaders()
      });
      console.log("[OK] Face sticker added:", data?.sticker_id || "success");
      return data;
    } catch (err) {
      console.error("[ERR] add_face:", err?.message || err);
      throw err;
    }
  }
  async face_status({
    id: stickerId
  }) {
    try {
      console.log(`[POST] get_face_sticker_status.php - stickerId: ${stickerId}`);
      const params = new URLSearchParams({
        sticker_id: stickerId
      });
      const {
        data
      } = await this.ax.post(`${this.ai}get_face_sticker_status.php`, params);
      console.log("[OK] Status:", data?.status || "retrieved");
      return data;
    } catch (err) {
      console.error("[ERR] face_status:", err?.message || err);
      throw err;
    }
  }
  async cancel_face({
    id: stickerId
  }) {
    try {
      console.log(`[POST] cancel_face_sticker.php - stickerId: ${stickerId}`);
      const params = new URLSearchParams({
        sticker_id: stickerId
      });
      const {
        data
      } = await this.ax.post(`${this.ai}cancel_face_sticker.php`, params);
      console.log("[OK] Face sticker cancelled");
      return data;
    } catch (err) {
      console.error("[ERR] cancel_face:", err?.message || err);
      throw err;
    }
  }
  async report({
    id: stickerId,
    type = "AI",
    desc = ""
  }) {
    try {
      console.log(`[POST] ai_sticker_report.php - stickerId: ${stickerId}`);
      const params = new URLSearchParams({
        sticker_id: stickerId,
        sticker_type: type,
        description: desc
      });
      const {
        data
      } = await this.ax.post(`${this.ai}ai_sticker_report.php`, params);
      console.log("[OK] Sticker reported");
      return data;
    } catch (err) {
      console.error("[ERR] report:", err?.message || err);
      throw err;
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
      actions: ["tags", "search", "related", "emoji", "suggestions", "add_prompt", "prompt_status", "cancel_prompt", "add_face", "face_status", "cancel_face", "report"]
    });
  }
  const api = new StickerAPI();
  try {
    let response;
    switch (action) {
      case "tags":
        console.log("[ACTION] Getting tags list");
        response = await api.tags();
        break;
      case "search":
        console.log("[ACTION] Searching stickers:", params.search || "all");
        response = await api.search_list(params);
        break;
      case "related":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk action 'related'.",
            example: "action=related&id=12345"
          });
        }
        console.log("[ACTION] Getting related stickers for:", params.id);
        response = await api.related(params);
        break;
      case "emoji":
        console.log("[ACTION] Getting emoji list");
        response = await api.emoji();
        break;
      case "suggestions":
        console.log("[ACTION] Getting prompt suggestions");
        response = await api.suggestion();
        break;
      case "add_prompt":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib untuk action 'add_prompt'.",
            example: "action=add_prompt&prompt=A dog wearing a hat"
          });
        }
        console.log("[ACTION] Adding prompt:", params.prompt);
        response = await api.add_prompt(params);
        break;
      case "prompt_status":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk action 'prompt_status'.",
            example: "action=prompt_status&id=123"
          });
        }
        console.log("[ACTION] Checking prompt status:", params.id);
        response = await api.prompt_status(params);
        break;
      case "cancel_prompt":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk action 'cancel_prompt'.",
            example: "action=cancel_prompt&id=123"
          });
        }
        console.log("[ACTION] Cancelling prompt:", params.id);
        response = await api.cancel_prompt(params);
        break;
      case "add_face":
        if (!params.img) {
          return res.status(400).json({
            error: "Parameter 'img' wajib untuk action 'add_face'.",
            tip: "img bisa berupa URL, base64, atau buffer",
            example: "action=add_face&img=https://example.com/photo.jpg"
          });
        }
        console.log("[ACTION] Adding face sticker");
        response = await api.add_face(params);
        break;
      case "face_status":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk action 'face_status'.",
            example: "action=face_status&id=456"
          });
        }
        console.log("[ACTION] Checking face sticker status:", params.id);
        response = await api.face_status(params);
        break;
      case "cancel_face":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk action 'cancel_face'.",
            example: "action=cancel_face&id=456"
          });
        }
        console.log("[ACTION] Cancelling face sticker:", params.id);
        response = await api.cancel_face(params);
        break;
      case "report":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib untuk action 'report'.",
            example: "action=report&id=789&type=AI&desc=Inappropriate content"
          });
        }
        console.log("[ACTION] Reporting sticker:", params.id);
        response = await api.report(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supported: ["tags", "search", "related", "emoji", "suggestions", "add_prompt", "prompt_status", "cancel_prompt", "add_face", "face_status", "cancel_face", "report"],
          examples: {
            tags: "?action=tags",
            search: "?action=search&search=cat&page=1",
            related: "?action=related&id=12345",
            emoji: "?action=emoji",
            suggestions: "?action=suggestions",
            add_prompt: "?action=add_prompt&prompt=A dog wearing a hat",
            prompt_status: "?action=prompt_status&id=123",
            cancel_prompt: "?action=cancel_prompt&id=123",
            add_face: "?action=add_face&img=https://example.com/photo.jpg",
            face_status: "?action=face_status&id=456",
            cancel_face: "?action=cancel_face&id=456",
            report: "?action=report&id=789&type=AI&desc=Bad content"
          }
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error?.message || error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal.",
      action: action,
      params: Object.keys(params)
    });
  }
}