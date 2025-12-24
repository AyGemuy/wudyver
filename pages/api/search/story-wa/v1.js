import axios from "axios";
import crypto from "crypto";
class LulaStoryClient {
  constructor() {
    this.host = "https://storywav4.lulaservice.web.id";
    this.ua = "okhttp/3.12.0";
    this.pkg = "com.storywa.vidstatus.videostatus";
    this.devId = crypto.randomBytes(16).toString("hex");
  }
  makeUrl(file, type) {
    if (!file) return null;
    const base = "https://storywav4.lulaservice.web.id/status/NewUploads";
    const filename = file.split("/").pop();
    const encoded = encodeURIComponent(filename);
    switch (type) {
      case "video":
        return `${base}/mojly/${encoded}`;
      case "thumb":
        return `${base}/mojly/thumbs/${encoded}`;
      case "profile":
        return `${base}/profile/${encoded}`;
      default:
        if (file.startsWith("http://") || file.startsWith("https://")) return file;
        if (file.startsWith("//")) return `https:${file}`;
        if (file.includes(".")) return `https://${file}`;
        return file;
    }
  }
  async req(method, path, data = {}) {
    const isGet = method === "GET";
    const queryString = isGet ? "?" + new URLSearchParams(data).toString() : "";
    const url = `${this.host}/${path}${queryString}`;
    const body = isGet ? undefined : {
      app: this.pkg,
      ...data
    };
    console.log(`[LOG] ${method} ${path}`);
    try {
      const {
        data: res,
        status
      } = await axios({
        method: method,
        url: url,
        data: body,
        headers: {
          "User-Agent": this.ua,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 1e4
      });
      console.log(`[LOG] Success | HTTP ${status}`);
      return res?.msg || res || [];
    } catch (err) {
      console.error(`[ERR] ${method} ${path}: ${err.message}`);
      return [];
    }
  }
  async search({
    query,
    page = 1
  }) {
    const raw = await this.req("POST", "getdatacategorywise1.php", {
      search: query || "cinta",
      page: page
    });
    console.log(raw);
    return raw;
  }
  async by_cats({
    cat = "Latest",
    page = 1
  }) {
    const raw = await this.req("POST", "getdatacategorywise1.php", {
      cat: cat,
      page: page
    });
    console.log(raw);
    return raw;
  }
  async cats({
    cat = "Latest"
  }) {
    const raw = await this.req("POST", "getallcategory.php", {
      cat: cat
    });
    console.log(raw);
    return raw;
  }
  async music() {
    const raw = await this.req("POST", "getAllMusicList.php", {});
    console.log(raw);
    return raw;
  }
  async status({
    page = 1,
    type = 0,
    lang = 0
  } = {}) {
    const raw = await this.req("GET", "status/default.php", {
      page: page,
      "device-id": this.devId,
      type: type,
      lang: lang
    });
    console.log(raw);
    return Array.isArray(raw) ? raw.map(item => ({
      id: item?.id ?? "0",
      title: item?.video_url?.replace(".mp4", "") || "Untitled",
      category: item?.cat_name || "Unknown",
      video: this.makeUrl(item?.video_url, "video"),
      thumb: this.makeUrl(item?.thumb_image, "thumb"),
      stats: {
        downloads: parseInt(item?.downloads) || 0,
        likes: parseInt(item?.likes) || 0,
        shares: parseInt(item?.shares) || 0
      },
      uploaded: item?.uploaded_on || null,
      isLiked: item?.is_liked || false
    })) : [];
  }
  async status_cats() {
    const raw = await this.req("GET", "status/default.php", {
      type: "category"
    });
    console.log(raw);
    return raw;
  }
  async download({
    id: videoId
  }) {
    const raw = await this.req("GET", "status/addDownloads.php", {
      id: videoId
    });
    console.log(raw);
    if (Array.isArray(raw) && raw[0]) {
      const item = raw[0];
      return {
        id: item?.id,
        category: item?.cat_name,
        video: this.makeUrl(item?.video_url, "video"),
        thumb: this.makeUrl(item?.video_thumb, "thumb"),
        stats: {
          downloads: parseInt(item?.downloads) || 0,
          likes: parseInt(item?.likes) || 0,
          shares: parseInt(item?.shares) || 0
        },
        uploaded: item?.uploaded_on
      };
    }
    return null;
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
  const api = new LulaStoryClient();
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
      case "by_cats":
        if (!params.cat) {
          return res.status(400).json({
            error: "Parameter 'cat' wajib diisi untuk action 'by_cats'."
          });
        }
        response = await api.by_cats(params);
        break;
      case "cats":
        response = await api.cats(params);
        break;
      case "music":
        response = await api.music();
        break;
      case "status":
        response = await api.status(params);
        break;
      case "status_cats":
        response = await api.status_cats();
        break;
      case "download":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'download'."
          });
        }
        response = await api.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'by_cats', 'cats', 'music', 'status', 'status_cats', 'download'.`
        });
    }
    return res.status(200).json({
      success: true,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}