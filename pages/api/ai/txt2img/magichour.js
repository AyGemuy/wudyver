import axios from "axios";
import FormData from "form-data";
class MagicHourAPI {
  constructor(options = {}) {
    this.base_url = "https://magichour.ai/api/free-tools/v1";
    this.cookies = {};
    this.tz_offset = options.tz_offset || -480;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://magichour.ai",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-timezone-offset": this.tz_offset.toString()
    };
    this.axios = axios.create();
    this.setup_interceptors();
  }
  async init() {
    try {
      await this.axios.get("https://magichour.ai/", {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/"
        }
      });
    } catch (err) {
      console.error("Init error:", err.message);
    }
  }
  setup_interceptors() {
    this.axios.interceptors.request.use(config => {
      if (Object.keys(this.cookies).length) {
        config.headers.Cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      }
      config.headers.newrelic = this.gen_new_relic();
      config.headers.traceparent = this.gen_trace_parent();
      config.headers.tracestate = this.gen_trace_state();
      return config;
    });
    this.axios.interceptors.response.use(res => {
      const cookies = res.headers["set-cookie"];
      if (cookies) cookies.forEach(c => {
        const [cookie] = c.split(";");
        const [name, val] = cookie.split("=");
        this.cookies[name] = val;
      });
      return res;
    }, err => {
      console.error("Request failed:", err.message);
      throw err;
    });
  }
  gen_new_relic() {
    return Buffer.from(JSON.stringify({
      v: [0, 1],
      d: {
        ty: "Browser",
        ac: "3978410",
        ap: "1134343550",
        id: this.gen_id(16),
        tr: this.gen_id(32),
        ti: Date.now()
      }
    })).toString("base64");
  }
  gen_trace_parent() {
    return `00-${this.gen_id(32)}-${this.gen_id(16)}-01`;
  }
  gen_trace_state() {
    return `3978410@nr=0-1-3978410-1134343550-${this.gen_id(16)}----${Date.now()}`;
  }
  gen_id(length) {
    return Array.from({
      length: length
    }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  gen_uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  async txt2img(params) {
    try {
      const res = await this.axios.post(`${this.base_url}/ai-image-generator`, {
        prompt: params.prompt,
        orientation: params.orientation || "square",
        tool: params.tool || "general",
        task_id: params.task_id || this.gen_uuid()
      }, {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/products/ai-image-generator"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Image gen error:", err.message);
      throw err;
    }
  }
  async txt2img_status(task_id) {
    try {
      const res = await this.axios.get(`${this.base_url}/ai-image-generator/${task_id}/status`, {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/products/ai-image-generator"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Check img error:", err.message);
      throw err;
    }
  }
  async txt2vid(params) {
    try {
      const res = await this.axios.post(`${this.base_url}/text-to-video`, {
        prompt: params.prompt,
        orientation: params.orientation || "9:16",
        task_id: params.task_id || this.gen_uuid()
      }, {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/products/text-to-video"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Text to video error:", err.message);
      throw err;
    }
  }
  async txt2vid_status(task_id) {
    try {
      const res = await this.axios.get(`${this.base_url}/text-to-video/${task_id}/status`, {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/products/text-to-video"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Check video error:", err.message);
      throw err;
    }
  }
  async img2vid(params) {
    try {
      let imageKey = params.imageKey;
      if (!imageKey && params.imageUrl) {
        console.log("Uploading image from URL:", params.imageUrl);
        const uploadResult = await this.upload(params.imageUrl, params.filename);
        imageKey = uploadResult.path;
        console.log("Upload successful, imageKey:", imageKey);
      }
      if (!imageKey) {
        throw new Error("Either imageKey or imageUrl must be provided");
      }
      const res = await this.axios.post(`${this.base_url}/image-to-video`, {
        image_key: imageKey,
        prompt: params.prompt,
        task_id: params.task_id || this.gen_uuid()
      }, {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/products/image-to-video"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Image to video error:", err.message);
      throw err;
    }
  }
  async upload(imageUrl, filename = "image.jpg") {
    try {
      const task_id = this.gen_uuid();
      const img_res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(img_res.data);
      let contentType = "image/jpeg";
      if (filename.toLowerCase().includes(".png")) {
        contentType = "image/png";
      } else if (filename.toLowerCase().includes(".gif")) {
        contentType = "image/gif";
      } else if (filename.toLowerCase().includes(".webp")) {
        contentType = "image/webp";
      }
      const upload_path = `generated/image-to-video/${task_id}`;
      const full_filename = filename.includes(".") ? filename : `${filename}.jpg`;
      const upload_res = await this.axios.post("https://magichour.ai/products/image-to-video", [upload_path, full_filename, contentType], {
        headers: {
          ...this.headers,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "70bafc7ef7c5f8e9ea4bcd9267ca38e2f452de9ed3",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(signed-out)%22%2C%7B%22children%22%3A%5B%22products%22%2C%7B%22children%22%3A%5B%22image-to-video%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fproducts%2Fimage-to-video%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%2Cnull%2Cnull%2Ctrue%5D",
          referer: "https://magichour.ai/products/image-to-video"
        }
      });
      const lines = upload_res.data.split("\n");
      let upload_data = null;
      for (const line of lines) {
        if (line.trim().startsWith("1:")) {
          upload_data = JSON.parse(line.substring(2));
          break;
        }
      }
      if (!upload_data || !upload_data.url) {
        throw new Error("Failed to get upload URL");
      }
      await this.axios.put(upload_data.url, buffer, {
        headers: {
          "content-type": "application/octet-stream",
          "content-length": buffer.length.toString(),
          "sec-fetch-site": "same-site",
          referer: "https://magichour.ai/",
          origin: "https://magichour.ai",
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          "user-agent": this.headers["user-agent"]
        }
      });
      return {
        path: upload_data.path,
        url: upload_data.url,
        task_id: task_id,
        filename: full_filename
      };
    } catch (err) {
      console.error("Upload error:", err.message);
      throw err;
    }
  }
  async img2vid_status(task_id) {
    try {
      const res = await this.axios.get(`${this.base_url}/image-to-video/${task_id}/status`, {
        headers: {
          ...this.headers,
          referer: "https://magichour.ai/products/image-to-video"
        }
      });
      return res.data;
    } catch (err) {
      console.error("Check img video error:", err.message);
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
      error: "Missing required field: action",
      required: {
        action: "txt2img | txt2img_status | txt2vid | txt2vid_status | img2vid | img2vid_status | upload"
      }
    });
  }
  const api = new MagicHourAPI();
  await api.init();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt`
          });
        }
        result = await api.txt2img(params);
        break;
      case "txt2img_status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id`
          });
        }
        result = await api.txt2img_status(params.task_id);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt`
          });
        }
        result = await api.txt2vid(params);
        break;
      case "txt2vid_status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id`
          });
        }
        result = await api.txt2vid_status(params.task_id);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl`
          });
        }
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt`
          });
        }
        result = await api.img2vid(params);
        break;
      case "img2vid_status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id`
          });
        }
        result = await api.img2vid_status(params.task_id);
        break;
      case "upload":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl`
          });
        }
        result = await api.upload(params.imageUrl, params.filename);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}