import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class RemakerAI {
  constructor() {
    this.options = {
      models: ["anime", "ghibli1", "ghibli2", "ghibli3"],
      ratio: ["1:1", "2:3", "9:16", "3:2", "16:9"]
    };
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: "",
      origin: "https://remaker.ai",
      priority: "u=1, i",
      "product-code": "067003",
      "product-serial": "7d154502ecac257ed30d6b30b5a828d7",
      referer: "https://remaker.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async img2img({
    imageUrl,
    prompt,
    ...rest
  }) {
    try {
      console.log("Starting img2img process...");
      const form = new FormData();
      form.append("strength", rest.strength || "0.55");
      console.log("Fetching image from URL...");
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      console.log("Image fetched, preparing form data...");
      form.append("image", Buffer.from(imageResponse.data), {
        filename: `image-${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      if (prompt) form.append("prompt", prompt);
      for (const key in rest) {
        if (key !== "strength") {
          form.append(key, rest[key]);
        }
      }
      const headers = {
        ...this.defaultHeaders,
        ...form.getHeaders()
      };
      console.log("Sending img2img request...");
      const response = await axios.post("https://api.remaker.ai/api/pai/v4/ai-toanime/appapi/create-job", form, {
        headers: headers
      });
      console.log("img2img request successful");
      return {
        success: response.data.code === 1e5,
        task_id: response.data.result?.job_id,
        message: response.data.message?.en || "Request completed"
      };
    } catch (error) {
      console.error("Error in img2img:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Status code:", error.response.status);
      }
      throw error;
    }
  }
  async img2img_status({
    task_id
  }) {
    try {
      console.log(`Checking img2img status for job: ${task_id}`);
      const headers = {
        ...this.defaultHeaders
      };
      const response = await axios.get(`https://api.remaker.ai/api/pai/v3/ai-toanime/appapi/get-job/${task_id}`, {
        headers: headers
      });
      console.log("img2img status check successful");
      return {
        success: response.data.code === 1e5,
        status: response.data.result?.status,
        message: response.data.message?.en || "Status check completed",
        ...response.data
      };
    } catch (error) {
      console.error("Error in img2img_status:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Status code:", error.response.status);
      }
      throw error;
    }
  }
  async txt2img({
    prompt,
    model = "anime",
    ratio = "9:16",
    ...rest
  }) {
    try {
      console.log("Starting txt2img process...");
      if (!this.options.models.includes(model)) {
        throw new Error(`Invalid model. Available models: ${this.options.models.join(", ")}`);
      }
      if (!this.options.ratio.includes(ratio)) {
        throw new Error(`Invalid ratio. Available ratios: ${this.options.ratio.join(", ")}`);
      }
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("style", model);
      form.append("aspect_ratio", ratio);
      for (const key in rest) {
        if (!["style", "aspect_ratio"].includes(key)) {
          form.append(key, rest[key]);
        }
      }
      const headers = {
        ...this.defaultHeaders,
        ...form.getHeaders()
      };
      console.log("Sending txt2img request...");
      const response = await axios.post("https://api.remaker.ai/api/pai/v4/ai-anime/create-job", form, {
        headers: headers
      });
      console.log("txt2img request successful");
      return {
        success: response.data.code === 1e5,
        task_id: response.data.result?.job_id,
        message: response.data.message?.en || "Request completed"
      };
    } catch (error) {
      console.error("Error in txt2img:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Status code:", error.response.status);
      }
      throw error;
    }
  }
  async txt2img_status({
    task_id
  }) {
    try {
      console.log(`Checking txt2img status for job: ${task_id}`);
      const headers = {
        ...this.defaultHeaders
      };
      const response = await axios.get(`https://api.remaker.ai/api/pai/v4/ai-anime/get-job/${task_id}`, {
        headers: headers
      });
      console.log("txt2img status check successful");
      return {
        success: response.data.code === 1e5,
        status: response.data.result?.status,
        message: response.data.message?.en || "Status check completed",
        ...response.data
      };
    } catch (error) {
      console.error("Error in txt2img_status:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Status code:", error.response.status);
      }
      throw error;
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
        action: "img2img | txt2img | img2img_status | txt2img_status"
      }
    });
  }
  const remaker = new RemakerAI();
  try {
    let result;
    switch (action) {
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await remaker.img2img(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await remaker.txt2img(params);
        break;
      case "img2img_status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id (required for ${action})`
          });
        }
        result = await remaker.img2img_status(params);
        break;
      case "txt2img_status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id (required for ${action})`
          });
        }
        result = await remaker.txt2img_status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: img2img | txt2img | img2img_status | txt2img_status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}