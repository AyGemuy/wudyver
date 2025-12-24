import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class ApiRequest {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.headers = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0"
    };
    this.baseUrl = "https://3bic.com";
  }
  async download({
    url
  }) {
    try {
      const response = await this.client.post(`${this.baseUrl}/api/download`, {
        url: url
      }, {
        headers: this.headers
      });
      if (response.data.code === 200) {
        const result = {};
        Object.keys(response.data).forEach(key => {
          if (key !== "code") result[key] = response.data[key];
        });
        if (result.originalVideoUrl) {
          result.videoUrl = `${this.baseUrl}${result.originalVideoUrl}`;
          delete result.originalVideoUrl;
        }
        return result;
      }
      return {
        error: "Failed to retrieve data"
      };
    } catch (error) {
      return {
        error: "Download failed",
        details: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const apiRequest = new ApiRequest();
  try {
    const data = await apiRequest.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}