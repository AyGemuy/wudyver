import axios from "axios";
import FormData from "form-data";
class AiLabs {
  constructor() {
    this.api = {
      base: "https://text2video.aritek.app",
      endpoints: {
        text2img: "/text2img",
        generate: "/txt2videov3",
        video: "/video"
      }
    };
    this.headers = {
      "user-agent": "NB Android/1.0.0",
      "accept-encoding": "gzip",
      "content-type": "application/json",
      authorization: ""
    };
    this.state = {
      token: null
    };
    this.setup = {
      cipher: "hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW",
      shiftValue: 3
    };
  }
  dec(text, shift) {
    return [...text].map(c => /[a-z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97) : /[A-Z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65) : c).join("");
  }
  async decrypt() {
    if (this.state.token) return this.state.token;
    const input = this.setup.cipher;
    const shift = this.setup.shiftValue;
    const decrypted = this.dec(input, shift);
    this.state.token = decrypted;
    this.headers.authorization = decrypted;
    return decrypted;
  }
  deviceId() {
    return Array.from({
      length: 16
    }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    try {
      if (!prompt) {
        return {
          success: false,
          code: 400,
          error: "Prompt cannot be empty"
        };
      }
      console.log("Generating image...");
      const token = await this.decrypt();
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("token", token);
      const url = this.api.base + this.api.endpoints.text2img;
      const response = await axios.post(url, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const {
        code,
        url: imageUrl
      } = response.data;
      if (code !== 0 || !imageUrl) {
        console.log("Image generation failed");
        return {
          success: false,
          code: response.status,
          error: "Image generation failed"
        };
      }
      console.log("Image generated successfully");
      return {
        success: true,
        code: response.status,
        data: {
          url: imageUrl.trim(),
          prompt: prompt
        }
      };
    } catch (error) {
      console.error("Error in txt2img:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        error: error.message || "Image generation failed"
      };
    }
  }
  async txt2vid({
    prompt,
    isPremium = 1,
    ...rest
  }) {
    try {
      if (!prompt) {
        return {
          success: false,
          code: 400,
          error: "Prompt cannot be empty"
        };
      }
      console.log("Starting video generation...");
      await this.decrypt();
      const payload = {
        deviceID: this.deviceId(),
        isPremium: isPremium,
        prompt: prompt,
        used: [],
        versionCode: 59
      };
      const url = this.api.base + this.api.endpoints.generate;
      const response = await axios.post(url, payload, {
        headers: this.headers
      });
      const {
        code,
        key
      } = response.data;
      if (code !== 0 || !key || typeof key !== "string") {
        console.log("Failed to get video generation key");
        return {
          success: false,
          code: response.status,
          error: "Failed to get video generation key"
        };
      }
      console.log("Video generation started successfully");
      return {
        success: true,
        code: response.status,
        data: {
          task_id: key,
          status: "processing",
          prompt: prompt
        }
      };
    } catch (error) {
      console.error("Error in txt2vid:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        error: error.message || "Video generation failed"
      };
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    try {
      if (!task_id) {
        return {
          success: false,
          code: 400,
          error: "Invalid task_id provided"
        };
      }
      await this.decrypt();
      const payload = {
        keys: [task_id]
      };
      const url = this.api.base + this.api.endpoints.video;
      const response = await axios.post(url, payload, {
        headers: this.headers,
        timeout: 15e3
      });
      const {
        code,
        datas
      } = response.data;
      if (code === 0 && Array.isArray(datas) && datas.length > 0) {
        const data = datas[0];
        if (data.url && data.url.trim() !== "") {
          console.log("Video generation completed");
          return {
            success: true,
            code: response.status,
            data: {
              url: data.url.trim(),
              safe: data.safe === "true",
              key: data.key,
              status: "completed",
              progress: "100%"
            }
          };
        }
        const progress = parseFloat(data.progress || 0);
        console.log(`Video generation progress: ${Math.round(progress)}%`);
        return {
          success: true,
          code: response.status,
          data: {
            status: "processing",
            progress: `${Math.round(progress)}%`,
            key: data.key
          }
        };
      }
      return {
        success: false,
        code: response.status,
        error: "Invalid response from server"
      };
    } catch (error) {
      console.error("Error checking status:", error.message);
      const isRetryableError = ["ECONNRESET", "ECONNABORTED", "ETIMEDOUT"].includes(error.code);
      return {
        success: false,
        code: error.response?.status || 500,
        error: error.message || "Status check failed",
        retryable: isRetryableError
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
      error: "Action is required."
    });
  }
  const aiLabs = new AiLabs();
  try {
    let response;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        const txt2img_task = await aiLabs.txt2img(params);
        return res.status(200).json(txt2img_task);
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        const txt2vid_task = await aiLabs.txt2vid(params);
        return res.status(200).json(txt2vid_task);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await aiLabs.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'txt2img', 'txt2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}