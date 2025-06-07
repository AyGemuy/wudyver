import axios from "axios";
import crypto from "crypto";
class GhibliGenerator {
  constructor() {
    this.apiUrl = "https://api.futurebaby.ai/ghibli-generator";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      origin: "https://www.maxstudio.ai",
      referer: "https://www.maxstudio.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  generateFileName(imageUrl) {
    return crypto.createHash("sha256").update(imageUrl).digest("hex").substring(0, 16);
  }
  async createGhibli({
    imageUrl
  }) {
    try {
      const fileName = this.generateFileName(imageUrl);
      const payload = {
        image: imageUrl,
        fileName: fileName
      };
      const {
        data
      } = await axios.post(this.apiUrl, payload, {
        headers: this.headers
      });
      const {
        jobId
      } = data;
      const result = await this.jobGhibli({
        jobId: jobId
      });
      return result;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  async jobGhibli({
    jobId
  }) {
    try {
      while (true) {
        const {
          data
        } = await axios.get(`${this.apiUrl}/${jobId}`, {
          headers: this.headers
        });
        if (data.status === "completed") return data;
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibli = new GhibliGenerator();
  try {
    const data = await ghibli.createGhibli(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}