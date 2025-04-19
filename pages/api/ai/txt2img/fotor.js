import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class FotorAPI {
  constructor() {
    this.baseURL = "https://www.fotor.com/api/create/v1/generate";
    this.statusURL = "https://www.fotor.com/api/create/v3/get_picture_url";
    this.styleBaseURL = "https://www.fotor.com/api/image/text-to-image/recommend/style";
    this.distinctId = uuidv4();
  }
  generateCookie() {
    const cookieData = {
      distinct_id: this.distinctId,
      props: {
        $latest_traffic_source_type: "直接流量",
        $latest_search_keyword: "未取得值_直接打开"
      },
      $device_id: this.distinctId
    };
    return `sensorsdata2015jssdkcross=${encodeURIComponent(JSON.stringify(cookieData))}`;
  }
  async generateImage(params) {
    try {
      const payload = {
        content: params.prompt,
        upscale: params.upscale || false,
        whProportion: params.whProportion || "",
        templateId: params.templateId || "",
        labelList: params.labelList || [],
        pictureNums: params.generateNums || 1,
        originalImageUrl: params.originalImageUrl || "",
        customAppName: params.customAppName || "",
        userStrength: params.userStrength || "",
        negativePrompt: params.negativePrompt || "",
        customizeStyle: params.customStyle ? {
          id: params.styleId,
          coverUrl: params.styleCover,
          intensity: params.styleIntensity,
          prompt: params.stylePrompt
        } : undefined
      };
      const {
        data
      } = await axios.post(this.baseURL, payload, {
        headers: this.getHeaders()
      });
      if (data.status && data.data) {
        const taskIds = data.data.map(item => item.taskId);
        return await this.pollForResults(taskIds);
      }
      throw new Error("Invalid response from API");
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async getStyles(params) {
    try {
      const url = `${this.styleBaseURL}?pageNo=${params.pageNo || 1}&pageSize=${params.pageSize || 1e3}&type=${params.type || "demo"}`;
      const {
        data
      } = await axios.get(url, {
        headers: this.getHeaders()
      });
      return data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async pollForResults(taskIds) {
    const maxTime = Date.now() + 6e4;
    while (Date.now() < maxTime) {
      try {
        const {
          data
        } = await axios.get(`${this.statusURL}?taskIds=${taskIds.join(",")}`, {
          headers: this.getHeaders()
        });
        const completedTasks = data.data.filter(item => item.status === 1);
        if (completedTasks.length === taskIds.length) {
          return {
            result: completedTasks
          };
        }
      } catch (error) {
        return {
          error: error.message
        };
      }
      await new Promise(res => setTimeout(res, 3e3));
    }
    return {
      error: "Polling timed out"
    };
  }
  getHeaders() {
    return {
      accept: "application/json",
      "content-type": "application/json",
      cookie: this.generateCookie(),
      origin: "https://www.fotor.com",
      referer: "https://www.fotor.com/images/create",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "x-app-id": "app-fotor-web"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const action = params.action || "create";
  const fotor = new FotorAPI();
  try {
    let data;
    switch (action) {
      case "create":
        if (!params.prompt) return res.status(400).json({
          error: "prompt is required"
        });
        data = await fotor.generateImage(params);
        break;
      case "style":
        data = await fotor.getStyles(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error processing request"
    });
  }
}