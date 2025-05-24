import axios from "axios";
import qs from "qs";
class DehazeAPI {
  constructor(imgUrl) {
    this.imgUrl = imgUrl;
    this.tokenEndpoint = "https://www.imgkits.com/api/ai/baiduai?only_token=1";
    this.dehazeEndpoint = "https://aip.baidubce.com/rest/2.0/image-process/v1/dehaze";
  }
  async getAccessToken() {
    try {
      const res = await axios.get(this.tokenEndpoint);
      if (res.data?.success && res.data?.data?.token) {
        return res.data.data.token;
      }
      throw new Error("Failed to retrieve token");
    } catch (error) {
      throw new Error("Token request error: " + error.message);
    }
  }
  async processDehaze() {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(`${this.dehazeEndpoint}?access_token=${token}`, qs.stringify({
        url: this.imgUrl
      }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error("Dehaze processing failed: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Image URL is required"
  });
  const api = new DehazeAPI(url);
  try {
    const result = await api.processDehaze();
    return res.status(200).json(result);
  } catch (err) {
    console.error("Dehaze error:", err.message);
    return res.status(500).json({
      error: err.message
    });
  }
}