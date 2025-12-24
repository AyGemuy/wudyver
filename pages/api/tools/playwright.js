import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class PlaywrightAPI {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_KOYEB}/playwright`;
    this.headers = {
      "Content-Type": "application/json"
    };
    this.defaultTimeout = 3e5;
  }
  async execute(code, timeout) {
    if (!code) {
      throw new Error("Code diperlukan.");
    }
    const executionTimeout = timeout ?? this.defaultTimeout;
    try {
      const response = await axios.post(this.url, {
        code: code,
        timeout: executionTimeout
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else {
        throw new Error(error.message);
      }
    }
  }
}
export default async function handler(req, res) {
  const {
    code,
    timeout
  } = req.method === "POST" ? req.body : req.query;
  if (!code) {
    return res.status(400).json({
      error: "Code diperlukan."
    });
  }
  try {
    const playwright = new PlaywrightAPI();
    const result = await playwright.execute(code, timeout);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}