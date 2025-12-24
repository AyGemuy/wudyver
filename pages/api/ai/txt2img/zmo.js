import fetch from "node-fetch";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class ImgCreatorAPI {
  constructor() {
    this.baseURL = "https://web-backend-prod.zmo.ai/api/v1.0/microTask/makeUp";
    this.appCode = "dalle";
    this.identify = "zmo-ai-image-generator-identify";
    this.bearerToken = null;
    this.email = null;
    this.uuid = null;
    this.code = null;
    this.password = this.genRandPass();
    this.styleCache = {};
    this.catCache = {};
  }
  getTimestamp() {
    return Date.now().toString();
  }
  genRandPass(len = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    return Array.from({
      length: len
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    const commonHeaders = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "App-Code": this.appCode,
      Authorization: this.bearerToken ? `Bearer ${this.bearerToken}` : undefined,
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      Identify: this.identify,
      Language: "en-US",
      Origin: "https://www.zmo.ai",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://www.zmo.ai/",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A;Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "Time-Stamp": this.getTimestamp(),
      "Time-Zone": "Asia/Makassar",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "X-Forwarded-For": ip,
      "X-Real-Ip": ip,
      "X-Request-Id": this.randomID(8),
      ...extra
    };
    return commonHeaders;
  }
  async api(method, endpoint, data = null) {
    try {
      const currentHeaders = this.buildHeaders();
      const url = `${this.baseURL}/${endpoint}`;
      const options = {
        method: method,
        headers: currentHeaders
      };
      if (data) {
        options.body = JSON.stringify(data);
      }
      if (method.toUpperCase() === "GET" && options.headers["Content-Type"] === "application/json") {
        delete options.headers["Content-Type"];
      }
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          message: res.statusText
        }));
        throw new Error(`API Call Error: ${method} ${endpoint} - ${res.status} ${errorData.message}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`API Call Error: ${method} ${endpoint}`, err.message);
      throw err;
    }
  }
  async createMail() {
    console.log("Creating temporary email...");
    try {
      const res = await fetch(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      if (!res.ok) {
        throw new Error(`Failed to create email: ${res.statusText}`);
      }
      const data = await res.json();
      ({
        email: this.email,
        uuid: this.uuid
      } = data);
      console.log(`Email: ${this.email}`);
    } catch (e) {
      console.error(`Failed to create email: ${e.message}`);
      throw e;
    }
  }
  async sendCode() {
    if (!this.email) throw new Error("Email not created.");
    console.log(`Sending code to ${this.email}...`);
    try {
      const res = await fetch("https://web-backend-prod.zmo.ai/api/v1.0/simpleUser/sendEmailCode", {
        method: "POST",
        headers: this.buildHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          email: this.email
        })
      });
      if (!res.ok) {
        throw new Error(`Error sending code: ${res.statusText}`);
      }
      console.log("Code sent.");
    } catch (e) {
      console.error(`Error sending code: ${e.message}`);
      throw e;
    }
  }
  async getCode(maxAttempts = 10, delay = 5e3) {
    if (!this.email || !this.uuid) throw new Error("Email or UUID not available.");
    console.log("Getting verification code...");
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      try {
        const res = await fetch(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (!res.ok) continue;
        const data = await res.json();
        const content = data.data?.[0]?.text_content;
        const match = content?.match(/(\d{6})/);
        if (match) {
          this.code = match[1];
          console.log(`Code found: ${this.code}`);
          return this.code;
        }
      } catch (e) {}
      console.log(`Code not found. Retrying... (${attempts + 1}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, delay));
    }
    console.warn("Failed to get verification code.");
    return null;
  }
  async verifyAccount() {
    if (!this.email || !this.code || !this.password || !this.identify) throw new Error("Missing credentials for verification.");
    console.log("Verifying account...");
    try {
      const res = await fetch("https://web-backend-prod.zmo.ai/api/v1.0/simpleUser/authenticate", {
        method: "POST",
        headers: this.buildHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          email: this.email,
          password: this.password,
          emailCode: this.code
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          message: res.statusText
        }));
        throw new Error(`Account verification failed: ${errorData.message}`);
      }
      const data = await res.json();
      if (data.token) {
        this.bearerToken = data.token;
        console.log("Account verified. Bearer token obtained.");
        return data;
      } else {
        console.error(`Account verification failed: ${data.message}`);
        return null;
      }
    } catch (e) {
      console.error(`Failed to verify account: ${e.message}`);
      throw e;
    }
  }
  async authenticate() {
    if (this.bearerToken) return this.bearerToken;
    console.log("Starting authentication process...");
    try {
      await this.createMail();
      await this.sendCode();
      const code = await this.getCode();
      if (!code) throw new Error("Verification code not found during authentication.");
      const verificationResult = await this.verifyAccount();
      if (!verificationResult?.token) throw new Error("Account verification failed during authentication.");
      return this.bearerToken;
    } catch (error) {
      console.error("Authentication failed:", error.message);
      throw error;
    }
  }
  async createMT(payload) {
    const endpoint = this.bearerToken ? "create" : "anonymous/create";
    return await this.api("POST", endpoint, payload);
  }
  async getMT(taskId) {
    return await this.api("GET", `get?batchTaskId=${taskId}`);
  }
  async getStyles({
    type = "pc"
  } = {}) {
    const cacheKey = type.toLowerCase();
    if (this.styleCache[cacheKey]) return this.styleCache[cacheKey];
    const endpoint = `category/${type.toLowerCase()}`;
    try {
      const res = await this.api("GET", endpoint);
      this.styleCache[cacheKey] = res?.category || [];
      return this.styleCache[cacheKey];
    } catch (error) {
      console.error("Failed to fetch styles:", error.message);
      throw error;
    }
  }
  async _findStyle(styleName, type = "pc") {
    const categories = await this.getStyles({
      type: type
    });
    const lowerName = styleName.toLowerCase();
    const availableStyles = [];
    let foundId = null;
    for (const category of categories) {
      if (category.options) {
        for (const option of category.options) {
          if (option.label?.toLowerCase() === lowerName) {
            foundId = option.categoryId;
            return {
              id: foundId,
              available: []
            };
          }
          availableStyles.push(option.label);
        }
      }
      if (category?.children) {
        const styleSubCategory = category.children.find(child => child.label?.toLowerCase() === "style");
        if (styleSubCategory?.options) {
          for (const option of styleSubCategory.options) {
            if (option.label?.toLowerCase() === lowerName) {
              foundId = option.categoryId;
              return {
                id: foundId,
                available: []
              };
            }
            availableStyles.push(option.label);
          }
        }
      }
    }
    return {
      id: null,
      available: [...new Set(availableStyles)]
    };
  }
  async getCatList(type = "pc") {
    const cacheKey = type.toLowerCase();
    if (this.catCache[cacheKey]) return this.catCache[cacheKey];
    const res = await this.getStyles({
      type: type
    });
    this.catCache[cacheKey] = res;
    return res;
  }
  async _findCategory(catName, type = "pc") {
    const cats = await this.getCatList(type);
    const lowerName = catName.toLowerCase();
    let foundId;
    const availableCategories = [];
    for (const cat of cats) {
      if (cat.label?.toLowerCase() === lowerName) {
        foundId = cat.categoryId;
        return {
          id: foundId,
          available: []
        };
      }
      availableCategories.push(cat.label);
    }
    return {
      id: null,
      available: [...new Set(availableCategories)]
    };
  }
  async _pollTask(taskId, timeout = 12e4, interval = 5e3) {
    const startTime = Date.now();
    let taskResult = null;
    let attempt = 0;
    console.log(`Polling task ${taskId} (max ${timeout / 1e3}s, interval ${interval / 1e3}s)`);
    while (Date.now() - startTime < timeout) {
      try {
        attempt++;
        taskResult = await this.getMT(taskId);
        console.log(`Polling Task ID: ${taskId}, Attempt: ${attempt}, Status: ${taskResult?.taskStatus || "unknown"}`);
        if (taskResult?.taskStatus === 22 && taskResult.images && taskResult.images.length > 0) {
          console.log(`Task ${taskId} completed.`);
          return taskResult;
        }
        if (taskResult?.taskStatus === 40 || taskResult?.taskStatus === 50) {
          throw new Error(`Task ${taskId} failed with status ${taskResult.taskStatus}`);
        }
      } catch (err) {
        console.warn(`Polling error for Task ID: ${taskId}, Attempt: ${attempt}, Error: ${err.message}. Retrying...`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    console.warn(`Polling for Task ID: ${taskId} timed out after ${timeout / 1e3} seconds.`);
    return taskResult;
  }
  async txt2img({
    prompt,
    category: catName = "Anime",
    style: styleName = "Chibi Girl",
    scale = "432x768",
    resolution = "432x768",
    numOfImages = 1,
    login = false,
    styleType = "pc"
  }) {
    if (login) {
      try {
        await this.authenticate();
        this.identify = "zmo-ai-image-generator-identify";
      } catch (error) {
        console.error("Authentication failed. Proceeding in anonymous mode.");
        this.bearerToken = null;
      }
    } else {
      this.bearerToken = null;
      this.identify = "zmo-ai-image-generator-identify";
    }
    let usedCategoryId;
    let usedStyleId;
    let taskId = null;
    let finalResult = null;
    let availableCategories;
    let availableStyles;
    let categoryId;
    let styleId;
    const categoryResult = await this._findCategory(catName, styleType);
    const styleResult = await this._findStyle(styleName, styleType);
    usedCategoryId = catName;
    usedStyleId = styleName;
    availableCategories = categoryResult.available;
    availableStyles = styleResult.available;
    if (!categoryResult.id) {
      console.log(`Category not found: ${catName}. Available: ${availableCategories.join(", ")}`);
      return {
        error: `Category '${catName}' not found`,
        availableCategories: availableCategories
      };
    } else {
      const categoryData = (await this.getCatList(styleType))?.find(cat => cat.categoryId === categoryResult.id);
      console.log(`Using Category: ${categoryData?.label} (ID: ${categoryData?.categoryId})`);
      categoryId = categoryResult.id;
    }
    if (!styleResult.id) {
      console.log(`Style not found: ${styleName}. Available: ${availableStyles.join(", ")}`);
      return {
        error: `Style '${styleName}' not found`,
        availableStyles: availableStyles
      };
    } else {
      console.log(`Using Style ID: ${styleResult.id}`);
      styleId = styleResult.id;
    }
    try {
      const taskData = await this.createMT({
        subject: prompt,
        categoryId: categoryId,
        styleCategoryIds: styleId ? [styleId] : [],
        scale: scale,
        resolution: resolution,
        numOfImages: numOfImages
      });
      if (taskData?.batchTaskId) {
        taskId = taskData.batchTaskId;
        console.log("Task ID:", taskId);
        finalResult = await this._pollTask(taskId);
      } else {
        console.error("Failed to get batchTaskId from createMT response:", taskData);
        return {
          error: "Failed to initiate image generation task."
        };
      }
    } catch (err) {
      console.error("Error in txt2img:", err.message);
      return {
        error: err.message
      };
    }
    return {
      usedCategory: usedCategoryId,
      usedStyle: usedStyleId,
      taskId: taskId,
      ...finalResult
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const imgCreator = new ImgCreatorAPI();
  try {
    const data = await imgCreator.txt2img(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}