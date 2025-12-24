import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class Downloader {
  constructor() {
    this.metadataApi = "https://socialdldr.com/api/download-video";
    this.baseDownloadUrl = "https://socialdldr.com";
    this.axios = axios.create();
    this.headers = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Dnt: "1",
      "Sec-Fetch-Mode": "cors"
    };
    this.axios.interceptors.request.use(config => {
      config.headers = {
        ...this.headers,
        ...this.spoofHeaders(),
        ...config.headers
      };
      return config;
    });
  }
  spoofHeaders() {
    return {
      origin: this.baseDownloadUrl,
      referer: `${this.baseDownloadUrl}/en/xiaohongshu-videos-and-photos-downloader`,
      "x-request-id": crypto.randomBytes(4).toString("hex"),
      "X-Requested-With": "XMLHttpRequest",
      ...SpoofHead()
    };
  }
  slug(str = "") {
    return str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }
  async getMeta(url = "", consent = false) {
    console.log("[Downloader] Fetching metadata...");
    const fp = {
      canvas: "fp_" + Math.random().toString(36).slice(2),
      screen: "1080x720",
      timezone: "Asia/Jakarta",
      language: "id-ID",
      platform: "Android",
      user_agent: "Mozilla/5.0",
      timestamp: Date.now()
    };
    const data = {
      tweet_url: url,
      browser_fingerprint: fp,
      user_consent: consent
    };
    try {
      const res = await this.axios.post(this.metadataApi, data);
      console.log("[Downloader] Metadata fetched.");
      return res.data;
    } catch (err) {
      console.error("[Downloader] Metadata fetch failed:", err.message);
      throw new Error("Failed to fetch metadata");
    }
  }
  async extractTaskId(finalUrl) {
    console.log("[Downloader] Extracting task_id from final URL...");
    try {
      const res = await this.axios.get(finalUrl);
      if (res.data?.task_id) {
        console.log("[Downloader] task_id found:", res.data.task_id);
        return res.data.task_id;
      }
      throw new Error("task_id not found in response");
    } catch (err) {
      console.error("[Downloader] Failed to extract task_id:", err.message);
      throw new Error("Failed to extract task_id");
    }
  }
  async download({
    url = "",
    quality = "480p",
    consent = false
  } = {}) {
    try {
      const meta = await this.getMeta(url, consent);
      if (!meta?.formats?.length) throw new Error("No formats found");
      const formats = meta.formats.map(f => ({
        label: f.label,
        resolution: f.resolution,
        size: f.size,
        is_audio_only: f.is_audio_only,
        url: f.url.startsWith("/") ? this.baseDownloadUrl + f.url : f.url
      }));
      const videoFormats = formats.filter(f => !f.is_audio_only);
      let selected = videoFormats.find(f => this.slug(f.resolution) === this.slug(quality) || this.slug(f.label).includes(this.slug(quality))) || videoFormats[0];
      if (!selected) throw new Error("No suitable format found");
      console.log("[Downloader] Selected quality:", selected.label || selected.resolution);
      const task_id = await this.extractTaskId(selected.url);
      return {
        task_id: task_id,
        quality: selected.resolution || selected.label,
        final_url: selected.url,
        available_formats: videoFormats.map(f => ({
          resolution: f.resolution,
          label: f.label,
          size: f.size
        }))
      };
    } catch (err) {
      console.error("[Downloader] Download failed:", err.message);
      throw err;
    }
  }
  async status({
    task_id
  }) {
    console.log("[Downloader] Checking status for task_id:", task_id);
    try {
      const url = `${this.baseDownloadUrl}/api/status/${task_id}`;
      const res = await this.axios.get(url);
      const data = res.data;
      if (data.status === "complete") {
        console.log("[Downloader] Task complete. File ready.");
        return {
          ...data,
          download_url: `${this.baseDownloadUrl}/api/download/file/${task_id}`
        };
      }
      console.log("[Downloader] Status:", data.status);
      return data;
    } catch (e) {
      console.error("[Downloader] Failed to get status:", e.message);
      return {
        status: "error",
        error: e.message
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
      error: "Missing required field: action",
      required: {
        action: "download | status"
      }
    });
  }
  try {
    const dldr = new Downloader();
    let result;
    switch (action) {
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await dldr.download({
          url: params.url,
          quality: params.quality,
          consent: params.consent === "true" || params.consent === true
        });
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id (required for ${action})`
          });
        }
        result = await dldr.status({
          task_id: params.task_id
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: download | status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}