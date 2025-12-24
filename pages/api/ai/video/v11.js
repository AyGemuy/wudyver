import axios from "axios";
class AILabs {
  constructor() {
    this.api = {
      base: "https://text2pet.zdex.top",
      endpoints: {
        images: "/images",
        videos: "/videos",
        videosBatch: "/videos/batch"
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
    if (!prompt) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Input prompt is empty"
        }
      };
    }
    await this.decrypt();
    const payload = {
      prompt: prompt,
      ...rest
    };
    try {
      const url = this.api.base + this.api.endpoints.images;
      const res = await axios.post(url, payload, {
        headers: this.headers
      });
      const {
        code,
        data,
        prompt: isPrompt
      } = res.data;
      if (code !== 0 || !data) {
        console.log("Image generation failed");
        return {
          success: false,
          code: res.status,
          result: {
            error: "Generation failed"
          }
        };
      }
      console.log("Image generation completed");
      return {
        success: true,
        code: res.status,
        result: {
          url: data,
          prompt: isPrompt || prompt,
          ...res.data
        }
      };
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Generation error"
        }
      };
    }
  }
  async txt2vid({
    prompt,
    isPremium = 1,
    ...rest
  }) {
    if (!prompt) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Invalid or empty prompt"
        }
      };
    }
    console.log("Connecting to AI Server for video generation...");
    await this.decrypt();
    const payload = {
      deviceID: this.deviceId(),
      isPremium: isPremium,
      prompt: prompt,
      used: [],
      versionCode: 6,
      ...rest
    };
    try {
      const url = this.api.base + this.api.endpoints.videos;
      const res = await axios.post(url, payload, {
        headers: this.headers
      });
      const {
        code,
        key
      } = res.data;
      if (code !== 0 || !key || typeof key !== "string") {
        console.log("Invalid key received, please try again later");
        return {
          success: false,
          code: res.status,
          result: {
            error: "Failed to get generation key"
          }
        };
      }
      return {
        task_id: key,
        ...res.data
      };
    } catch (err) {
      console.log("Cannot connect to API server");
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Connection error"
        }
      };
    }
  }
  async status({
    task_id: key,
    ...rest
  }) {
    if (!key) {
      console.log("Invalid task_id provided");
      return {
        success: false,
        code: 400,
        result: {
          error: "Invalid task_id"
        }
      };
    }
    await this.decrypt();
    const payload = {
      keys: [key],
      ...rest
    };
    const url = this.api.base + this.api.endpoints.videosBatch;
    try {
      const res = await axios.post(url, payload, {
        headers: this.headers,
        timeout: 15e3
      });
      const {
        code,
        datas
      } = res.data;
      if (code === 0 && Array.isArray(datas) && datas.length > 0) {
        const data = datas[0];
        if (!data.url || data.url.trim() === "") {
          const progress = parseFloat(data.progress || 0);
          return {
            success: true,
            code: res.status,
            result: {
              status: "processing",
              progress: `${Math.round(progress)}%`,
              key: data.key,
              video_id: data.video_id,
              ...res.data
            }
          };
        }
        return {
          success: true,
          code: res.status,
          result: {
            status: "completed",
            url: data.url.trim(),
            safe: data.safe === "true",
            key: data.key,
            video_id: data.video_id,
            progress: "100%",
            ...res.data
          }
        };
      }
      return {
        success: false,
        code: res.status,
        result: {
          error: "Invalid response from server"
        }
      };
    } catch (err) {
      console.log("Error checking status");
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message || "Status check error"
        }
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
  const aiLabs = new AILabs();
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