import axios from "axios";
import crypto from "crypto";
class ImgCreatorAPI {
  constructor(token = "zmo-ai-image-generator-identify") {
    this.baseURL = "https://web-backend-prod.zmo.ai/api/v1.0/microTask/makeUp";
    this.appCode = "dalle";
    this.identify = token || Date.now().toString();
    this.headers = {
      ...this.buildHeaders(),
      "Content-Type": "application/json",
      "App-Code": this.appCode,
      identify: this.identify
    };
    this.baseHeaders = {
      "App-Code": this.appCode
    };
    this.styleCache = {};
    this.catCache = {};
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
    return {
      origin: "https://www.zmo.ai/",
      referer: "https://www.zmo.ai/ai-anime-generator/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...extra
    };
  }
  async api(method, endpoint, data, headers = this.headers) {
    try {
      const res = await axios({
        method: method,
        url: `${this.baseURL}/${endpoint}`,
        data: data,
        headers: headers
      });
      return res.data;
    } catch (err) {
      throw err;
    }
  }
  async createMT(payload) {
    return await this.api("POST", "anonymous/create", payload);
  }
  async getMT(taskId) {
    return await this.api("GET", `get?batchTaskId=${taskId}`, null, this.baseHeaders);
  }
  async getStyles({
    type = "pc"
  }) {
    const cacheKey = type.toLowerCase();
    if (this.styleCache[cacheKey]) return this.styleCache[cacheKey];
    const endpoint = type.toLowerCase() === "text2img" || type.toLowerCase() === "pc" ? "category/pc" : "category/pc";
    const res = await this.api("GET", endpoint, null, this.baseHeaders);
    this.styleCache[cacheKey] = res?.category || [];
    return this.styleCache[cacheKey];
  }
  async _findStyle(styleName, type = "pc") {
    const cats = await this.getStyles({
      type: type
    });
    const lowerName = styleName.toLowerCase();
    let foundId;
    const availableStyles = [];
    for (const cat of cats) {
      if (cat?.children) {
        const styleCategory = cat.children.find(child => child.label?.toLowerCase() === "style");
        if (styleCategory?.options) {
          for (const option of styleCategory.options) {
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
  async _pollTask(taskId, timeout = 6e4, interval = 2e3) {
    const startTime = Date.now();
    let taskResult = null;
    let attempt = 0;
    while (Date.now() - startTime < timeout && !taskResult?.images?.[0]?.hqPreview) {
      try {
        attempt++;
        taskResult = await this.getMT(taskId);
        console.log(`Polling Task ID: ${taskId}, Attempt: ${attempt}`);
        if (taskResult?.images?.[0]?.hqPreview) return taskResult;
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (err) {
        console.log(`Polling Task ID: ${taskId}, Attempt: ${attempt}, Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    return taskResult;
  }
  async txt2img({
    prompt,
    category: catName,
    style: styleName,
    scale = "432x768",
    resolution = "432x768",
    numOfImages = 1
  }) {
    let usedCategoryId;
    let usedStyleId;
    let taskId;
    let finalResult;
    let availableCategories;
    let availableStyles;
    let categoryId;
    let styleId;
    const categoryResult = await this._findCategory(catName, "pc");
    const styleResult = await this._findStyle(styleName, "pc");
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
      const categoryData = (await this.getCatList("pc"))?.find(cat => cat.categoryId === categoryResult.id);
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
      }
    } catch (err) {
      console.error("Error in txt2img:", err);
      return {
        error: err.message
      };
    } finally {
      return {
        usedCategory: usedCategoryId,
        usedStyle: usedStyleId,
        taskId: taskId || null,
        ...finalResult
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const api = new ImgCreatorAPI();
  try {
    const data = await api.txt2img(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}