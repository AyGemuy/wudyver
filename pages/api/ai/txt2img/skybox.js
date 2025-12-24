import axios from "axios";
import {
  FormData
} from "formdata-node";
class Skybox {
  constructor() {
    this.baseUrl = "https://skybox.blockadelabs.com/api";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Content-Type": "multipart/form-data",
      Origin: "https://skybox.blockadelabs.com",
      Referer: "https://skybox.blockadelabs.com/starter/a185f322c5adc94e85b02be3f5b427d4",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async generateImage(prompt, skyboxStyleId = 83, skyboxStarterId = 92, negativeText = "snow, ice") {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("skybox_style_id", skyboxStyleId);
    form.append("negative_text", negativeText);
    form.append("skybox_starter_id", skyboxStarterId);
    try {
      const response = await axios.post(`${this.baseUrl}/generateImage`, form, {
        headers: {
          ...this.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error in generateImage request:", error);
      throw new Error("Generate Image request failed");
    }
  }
  async getImage(id) {
    try {
      const response = await axios.get(`${this.baseUrl}/getImage`, {
        params: {
          id: id
        },
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error in getImage request:", error);
      throw new Error("Get Image request failed");
    }
  }
}
export default async function handler(req, res) {
  const {
    type,
    prompt,
    id,
    skyboxStyleId,
    skyboxStarterId,
    negativeText
  } = req.method === "GET" ? req.query : req.body;
  const skybox = new Skybox();
  try {
    let result;
    if (type === "generate") {
      result = await skybox.generateImage(prompt, skyboxStyleId, skyboxStarterId, negativeText);
    } else if (type === "check" && id) {
      result = await skybox.getImage(id);
    } else {
      return res.status(400).json({
        error: "Invalid type or missing parameters"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}