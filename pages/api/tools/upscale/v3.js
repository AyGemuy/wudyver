import axios from "axios";
import {
  FormData
} from "formdata-node";
class BigJPG {
  constructor() {
    this.api = {
      base: "https://bigjpg.com",
      endpoint: {
        task: "/task",
        free: "/free"
      }
    };
    this.available = {
      styles: {
        art: "Artwork",
        photo: "Photo"
      },
      noise: {
        "-1": "None",
        0: "Low",
        1: "Medium",
        2: "High",
        3: "Highest"
      }
    };
    this.headers = {
      origin: "https://bigjpg.com",
      referer: "https://bigjpg.com/",
      "user-agent": "Postify/1.0.0",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  isValid(style = "art", noise = "-1") {
    if (!style && !noise) {
      return {
        valid: true,
        style: "art",
        noise: "-1"
      };
    }
    if (style && !this.available.styles[style]) {
      return {
        valid: false,
        error: `Invalid style. Choose one of: ${Object.keys(this.available.styles).join(", ")}`
      };
    }
    if (noise && !this.available.noise[noise]) {
      return {
        valid: false,
        error: `Invalid noise level. Choose one of: ${Object.keys(this.available.noise).join(", ")}`
      };
    }
    return {
      valid: true,
      style: style || "art",
      noise: noise || "-1"
    };
  }
  async getImageInfo(img) {
    if (!img) {
      return {
        valid: false,
        error: "Image URL is missing."
      };
    }
    try {
      const response = await axios.get(img, {
        responseType: "arraybuffer"
      });
      const fileSize = parseInt(response.headers["content-length"] || response.data.length);
      const width = Math.floor(Math.random() * (2e3 - 800 + 1)) + 800;
      const height = Math.floor(Math.random() * (2e3 - 800 + 1)) + 800;
      let fileName = img.split("/").pop().split("#")[0].split("?")[0] || "image.jpg";
      if (fileName.endsWith(".webp")) {
        fileName = fileName.replace(".webp", ".jpg");
      }
      if (fileSize > 5 * 1024 * 1024) {
        return {
          valid: false,
          error: "Image size exceeds 5MB."
        };
      }
      return {
        valid: true,
        info: {
          fileName: fileName,
          fileSize: fileSize,
          width: width,
          height: height
        }
      };
    } catch {
      return {
        valid: false,
        error: "Failed to fetch the image. Please check the URL."
      };
    }
  }
  async upscale(img, options = {}) {
    const validation = await this.getImageInfo(img);
    if (!validation.valid) {
      return {
        success: false,
        code: 400,
        result: {
          error: validation.error
        }
      };
    }
    const inputx = this.isValid(options.style, options.noise);
    if (!inputx.valid) {
      return {
        success: false,
        code: 400,
        result: {
          error: inputx.error
        }
      };
    }
    const config = {
      x2: "2",
      style: inputx.style,
      noise: inputx.noise,
      file_name: validation.info.fileName,
      files_size: validation.info.fileSize,
      file_height: validation.info.height,
      file_width: validation.info.width,
      input: img
    };
    try {
      const params = new URLSearchParams();
      params.append("conf", JSON.stringify(config));
      const taskx = await axios.post(`${this.api.base}${this.api.endpoint.task}`, params, {
        headers: this.headers
      });
      if (taskx.data.status !== "ok") {
        return {
          success: false,
          code: 400,
          result: {
            error: "Failed to create the task."
          }
        };
      }
      const taskId = taskx.data.info;
      let attempts = 0;
      const maxAttempts = 20;
      while (attempts < maxAttempts) {
        const res = await axios.get(`${this.api.base}${this.api.endpoint.free}?fids=${JSON.stringify([ taskId ])}`, {
          headers: this.headers
        });
        const result = res.data[taskId];
        if (result[0] === "success") {
          return {
            success: true,
            code: 200,
            result: {
              info: validation.info,
              url: result[1],
              size: result[2],
              config: {
                style: config.style,
                styleName: this.available.styles[config.style],
                noise: config.noise,
                noiseName: this.available.noise[config.noise]
              }
            }
          };
        } else if (result[0] === "error") {
          return {
            success: false,
            code: 400,
            result: {
              error: "Upscale failed."
            }
          };
        }
        await new Promise(resolve => setTimeout(resolve, 15e3));
        attempts++;
      }
      return {
        success: false,
        code: 400,
        result: {
          error: "Process timed out."
        }
      };
    } catch (err) {
      return {
        success: false,
        code: 400,
        result: {
          error: err.message || "An error occurred during the request."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const bigjpg = new BigJPG();
  try {
    const data = await bigjpg.upscale(url, params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}