import axios from "axios";
class ImageWithAI {
  constructor() {
    this.urlMake = "https://overscale.imagewith.ai/api/make";
    this.urlQuery = "https://overscale.imagewith.ai/api/query_make";
    this.headers = {
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://overscale.imagewith.ai/"
    };
  }
  async makeRequest(data) {
    try {
      const response = await axios.post(this.urlMake, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error making request:", error);
      throw error;
    }
  }
  async queryRequest(businessId) {
    const data = {
      businessId: businessId,
      lastQuery: false
    };
    try {
      const response = await axios.post(this.urlQuery, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error querying the task:", error);
      throw error;
    }
  }
  prepareData(url, scale) {
    return {
      event: `{"process_event_type":54,"image_sr_event":{"out_image_type":1,"factor":${scale},"model_type":1}}`,
      datas: [{
        url: url
      }],
      __KEY: "UPSCALE_MAKE_CALL_LIMIT"
    };
  }
  async processImage(url, scale) {
    const data = this.prepareData(url, scale);
    const resultMake = await this.makeRequest(data);
    if (resultMake.success) {
      const businessId = resultMake.data.businessId;
      let isCompleted = false;
      let resultQuery;
      while (!isCompleted) {
        resultQuery = await this.queryRequest(businessId);
        if (resultQuery.success && resultQuery.data.fileUrl) {
          isCompleted = true;
          console.log("Task completed. File URL:", resultQuery.data.fileUrl);
        } else {
          console.log("Task still processing, waiting...");
          await this.delay(3e3);
        }
      }
      return resultQuery;
    } else {
      console.error("Error: Task creation failed");
      throw new Error("Task creation failed");
    }
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const {
    url,
    scale = 2
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  try {
    const imageAI = new ImageWithAI();
    const result = await imageAI.processImage(url, scale);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}