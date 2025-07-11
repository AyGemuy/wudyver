import axios from "axios";
import crypto from "crypto";
class Downloader {
  constructor() {
    this.metadata_api_url = "https://socialdldr.com/api/download-video";
    this.base_download_url = "https://socialdldr.com";
    this.base_url_for_spoofing = "https://socialdldr.com";
    this.axios_instance = axios.create();
    this.default_headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7,as;q=0.6",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Dnt: "1",
      "Sec-Ch-Ua": `"Not-A.Brand";v="99", "Chromium";v="124"`,
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": `"Android"`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };
    this.axios_instance.interceptors.request.use(config => {
      const spoofed_headers = this.build_headers(config.headers);
      config.headers = {
        ...this.default_headers,
        ...config.headers,
        ...spoofed_headers
      };
      return config;
    }, error => {
      return Promise.reject(error);
    });
    console.log("Downloader initialized with Axios interceptors.");
  }
  to_slug(s = "") {
    return String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }
  screen_dims() {
    const min_w = 800,
      max_w = 1920;
    const min_h = 600,
      max_h = 1080;
    const r_w = Math.floor(Math.random() * (max_w - min_w + 1)) + min_w;
    const r_h = Math.floor(Math.random() * (max_h - min_h + 1)) + min_h;
    return `${r_w}x${r_h}`;
  }
  get_fp() {
    const tzs = ["Asia/Jakarta", "America/New_York", "Europe/London", "Asia/Makassar"];
    const langs = ["en-US", "id-ID", "en-GB", "es-ES"];
    const plats = ["Win32", "Linux x86_64", "MacIntel", "Android"];
    const uas = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/604.1", "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"];
    const r_c = arr => arr[Math.floor(Math.random() * arr.length)];
    return {
      canvas: "gen_canvas_fp_" + Math.random().toString(36).substring(2, 15),
      screen: this.screen_dims(),
      timezone: r_c(tzs),
      language: r_c(langs),
      platform: r_c(plats),
      user_agent: r_c(uas),
      timestamp: Date.now()
    };
  }
  random_crypto_ip() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  random_id(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  build_headers(extra = {}) {
    const ip = this.random_crypto_ip();
    return {
      origin: this.base_url_for_spoofing,
      referer: `${this.base_url_for_spoofing}/en/xiaohongshu-videos-and-photos-downloader`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.random_id(8),
      "X-Requested-With": "XMLHttpRequest",
      ...extra
    };
  }
  async get_meta(t_url = "", u_consent = false) {
    console.log(`Fetching metadata for URL: ${t_url}`);
    const fp = this.get_fp();
    const d = {
      tweet_url: t_url,
      browser_fingerprint: fp,
      user_consent: u_consent
    };
    try {
      const res = await this.axios_instance.post(this.metadata_api_url, d);
      console.log("Metadata fetched successfully.");
      return res.data;
    } catch (err) {
      console.error("Error fetching metadata:", err.response ? err.response.data : err.message);
      throw new Error(`Failed to fetch metadata: ${err.response ? err.response.status : "Network Error"}`);
    }
  }
  async download({
    url = "",
    quality = "480p",
    consent = false,
    output_format = "url"
  } = {}) {
    console.log(`Starting download process for URL: ${url} with quality: ${quality || "highest available"}, output format: ${output_format}`);
    let meta;
    try {
      meta = await this.get_meta(url, consent);
    } catch (err) {
      console.error("Failed to get metadata, aborting download:", err.message);
      throw err;
    }
    if (!meta || !meta.formats || meta.formats.length === 0) {
      console.log("No formats found in metadata.");
      throw new Error("No formats found.");
    }
    const fmts_with_full_urls = meta.formats.map(fmt => ({
      ...fmt,
      url: fmt.url.startsWith("/") ? `${this.base_download_url}${fmt.url}` : fmt.url
    }));
    console.log("Formats processed with full URLs.");
    let sel_fmt = null;
    const v_fmts = fmts_with_full_urls.filter(f => !f.is_audio_only);
    if (quality) {
      const t_q_slug = this.to_slug(quality);
      sel_fmt = v_fmts.find(f => this.to_slug(f.resolution) === t_q_slug);
      if (!sel_fmt) {
        sel_fmt = v_fmts.find(f => this.to_slug(f.label).includes(t_q_slug));
      }
      if (sel_fmt) {
        console.log(`Selected format based on quality "${quality}": ${sel_fmt.label}`);
      } else {
        console.log(`Quality "${quality}" not found, attempting to find highest available.`);
      }
    }
    if (!sel_fmt && v_fmts.length > 0) {
      v_fmts.sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution));
      sel_fmt = v_fmts[0];
      console.log(`No specific quality found, selected highest resolution: ${sel_fmt.label}`);
    }
    if (!sel_fmt) {
      console.log("No suitable format found after all attempts.");
      throw new Error("No suitable format found.");
    }
    const final_dl_url = sel_fmt.url;
    console.log(`Final download URL determined: ${final_dl_url}`);
    let dl_status = "skipped_get_for_url_output";
    let dl_error = null;
    let base64_data = null;
    if (output_format === "base64") {
      try {
        console.log("Attempting GET request to final download URL for Base64 conversion...");
        const dl_res = await this.axios_instance.get(final_dl_url, {
          responseType: "arraybuffer"
        });
        if (dl_res.status === 200) {
          dl_status = "success";
          console.log("GET request to download URL successful (status 200).");
          base64_data = Buffer.from(dl_res.data).toString("base64");
          console.log("Video data converted to Base64.");
        } else {
          dl_status = "failed";
          dl_error = `HTTP Status: ${dl_res.status}`;
          console.log(`GET request to download URL failed with status: ${dl_res.status}`);
        }
      } catch (dl_err) {
        dl_status = "failed";
        dl_error = dl_err.message;
        console.error("Error during final download GET:", dl_err.message);
      }
    } else {
      console.log('Skipping direct GET request as output format is "url".');
    }
    return {
      selected_format_details: sel_fmt,
      download_link: final_dl_url,
      download_attempt: {
        status: dl_status,
        error: dl_error
      },
      base64_data: base64_data,
      ...meta,
      formats: fmts_with_full_urls,
      base_download_url: this.base_download_url
    };
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: 'Parameter "url" wajib diisi.'
      });
    }
    const downloader = new Downloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}