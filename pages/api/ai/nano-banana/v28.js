import axios from "axios";
import FormData from "form-data";
import https from "https";
const LOGIN_URL = "https://www.vidguru.ai/cgi-bin/login";
const UPLOAD_URL = "https://www.vidguru.ai/cgi-bin/auth/aigc/vidguru/upload";
const PROXY_URL = "https://www.vidguru.ai/cgi-bin/aigc/proxy";
const TASK_URL = "https://www.vidguru.ai/cgi-bin/auth/aigc/vidguru/vtask-get";
const HEADERS = {
  accept: "application/json",
  "accept-language": "id-ID",
  "content-type": "application/x-www-form-urlencoded;charset=utf-8",
  origin: "https://www.vidguru.ai",
  referer: "https://www.vidguru.ai/profile",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};

function randomCode(length = 40) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
class VidGuru {
  constructor() {
    this.client = axios.create({
      headers: {
        ...HEADERS
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    this.ticket = null;
    this.uid = null;
    this.cookie = null;
    this.logged = false;
  }
  log(...args) {
    console.log("[VidGuru]", ...args);
  }
  async login() {
    if (this.logged) {
      this.log("Already logged in");
      return {
        ticket: this.ticket,
        uid: this.uid,
        cookie: this.cookie
      };
    }
    try {
      const code = randomCode();
      this.log("Login with code:", code);
      const response = await this.client.post(LOGIN_URL, `type=0&code=${code}&vid=`);
      if (response.data?.code !== 0) {
        throw new Error(response.data?.message || "Login failed");
      }
      const {
        ticket,
        uid,
        remain,
        name
      } = response.data.data || {};
      this.ticket = ticket;
      this.uid = uid;
      this.cookie = `ticket=${ticket}; uid=${uid}`;
      this.logged = true;
      this.client.defaults.headers.cookie = this.cookie;
      this.log("Login success:", name, "UID:", uid, "Remain:", remain);
      return {
        ticket: ticket,
        uid: uid,
        remain: remain,
        name: name,
        cookie: this.cookie
      };
    } catch (error) {
      this.log("Login error:", error.message);
      throw error;
    }
  }
  async ensureLogin() {
    if (!this.logged) await this.login();
  }
  async upload(file) {
    await this.ensureLogin();
    const form = new FormData();
    let buffer, mime = "image/jpeg",
      filename = "image.jpg";
    try {
      if (Buffer.isBuffer(file)) {
        buffer = file;
      } else if (typeof file === "string") {
        if (file.startsWith("http")) {
          this.log("Fetch URL:", file);
          const {
            data,
            headers
          } = await this.client.get(file, {
            responseType: "arraybuffer"
          });
          buffer = data;
          mime = headers["content-type"] || mime;
          filename = (file.split("/").pop() || filename).split("?")[0];
        } else if (file.startsWith("data:")) {
          const [meta, b64] = file.split(",");
          mime = meta.match(/:(.*?);/)?.[1] || mime;
          buffer = Buffer.from(b64, "base64");
          filename = `image.${mime.split("/")[1] || "jpg"}`;
        } else {
          throw new Error("Unsupported file input");
        }
      } else {
        throw new Error("Invalid file");
      }
      form.append("file", buffer, {
        filename: filename,
        contentType: mime
      });
      this.log("Uploading:", filename);
      const {
        data
      } = await this.client.post(UPLOAD_URL, form, {
        headers: {
          ...form.getHeaders(),
          cookie: this.cookie
        }
      });
      if (data?.code !== 0) throw new Error(data?.message || "Upload failed");
      this.log("Upload success:", data.data?.file_url);
      return data.data?.file_url;
    } catch (error) {
      this.log("Upload error:", error.message);
      throw error;
    }
  }
  async uploadImages(imageUrl) {
    const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const uploaded = [];
    try {
      for (const url of urls) {
        const result = await this.upload(url);
        uploaded.push(result);
        this.log("Uploaded:", result);
      }
      return uploaded;
    } catch (error) {
      this.log("Upload images error:", error.message);
      throw error;
    }
  }
  async pollTask(taskId, taskType = "209", delay = 3e3) {
    while (true) {
      try {
        this.log("Check task:", taskId, "type:", taskType);
        const {
          data
        } = await this.client.post(TASK_URL, {
          task_id: taskId,
          task_type: taskType
        }, {
          headers: {
            "content-type": "application/json",
            cookie: this.cookie
          }
        });
        if (data?.code !== 0) throw new Error(data?.message);
        const task = data.data?.task || {};
        const result = task?.result_json ? JSON.parse(task.result_json) : {};
        if (result.status === "completed" || task?.state === "1") {
          this.log("Task completed");
          return result;
        }
        if (result.status === "failed" || task?.state === "2") {
          throw new Error(result.message || "Task failed");
        }
        this.log(`Progress: ${task?.progress || 0}% - Waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        this.log("Poll error:", error.message);
        throw error;
      }
    }
  }
  async submitTask(params, eventType) {
    await this.ensureLogin();
    try {
      const paramJson = JSON.stringify(params);
      this.log("Submit task event:", eventType);
      const {
        data
      } = await this.client.post(PROXY_URL, {
        event_type: eventType,
        param_json: paramJson
      }, {
        headers: {
          "content-type": "application/json",
          cookie: this.cookie
        }
      });
      if (data?.code !== 0) throw new Error(data?.message);
      const result = JSON.parse(data.data?.result_json || "{}");
      const taskId = result.task_id;
      if (!taskId) throw new Error("No task ID");
      this.log("Task ID:", taskId);
      return taskId;
    } catch (error) {
      this.log("Submit task error:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    size = "1K",
    aspect_ratio = "1:1",
    output_format = "png",
    ...rest
  }) {
    try {
      await this.ensureLogin();
      const isImg2Img = !!imageUrl;
      const eventType = isImg2Img ? "11" : "12";
      const taskType = isImg2Img ? "209" : "204";
      this.log(`Start ${isImg2Img ? "img2img" : "txt2img"}`);
      const imageInput = isImg2Img ? await this.uploadImages(imageUrl) : [];
      const params = {
        model: "nano-banana",
        prompt: prompt,
        size: size,
        aspect_ratio: isImg2Img ? "match_input_image" : aspect_ratio,
        output_format: output_format,
        image_input: imageInput,
        ...rest
      };
      this.log("Params:", {
        ...params,
        image_input: imageInput.length
      });
      const taskId = await this.submitTask(params, eventType);
      const result = await this.pollTask(taskId, taskType);
      this.log("Generate success, images:", result.images?.length || 0);
      return result;
    } catch (error) {
      this.log("Generate error:", error.message);
      throw error;
    }
  }
  async getAccount() {
    await this.ensureLogin();
    return {
      uid: this.uid,
      ticket: this.ticket,
      cookie: this.cookie
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new VidGuru();
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