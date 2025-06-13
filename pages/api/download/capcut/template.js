import axios from "axios";
import md5 from "crypto-js/md5.js";
const BASE_URL = "https://3bic.com";
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "user-agent": "Postify/1.0.0",
    accept: "application/json, text/plain, */*"
  }
});
class CapcutDownloader {
  async download(link) {
    try {
      link = link?.trim() || "";
      if (!/^https?:\/\/(?:www\.)?capcut\.com\/t\/[a-zA-Z0-9_-]+\/?$/.test(link)) {
        throw new Error("Invalid link format");
      }
      const time = Date.now().toString();
      const sign = md5(time + "12345678901234567890123456789012").toString();
      const kukis = `sign=${sign}; device-time=${time}`;
      const {
        data: {
          url
        }
      } = await axiosInstance.get("/api/download/get-url", {
        params: {
          url: link
        },
        headers: {
          Cookie: kukis
        }
      });
      const templateId = url.match(/template_id=(\d+)/)?.[1] || "";
      if (!templateId) {
        throw new Error("Template ID not found");
      }
      const {
        data
      } = await axiosInstance.get(`/api/download/${templateId}`, {
        headers: {
          Cookie: kukis
        }
      });
      ["originalVideoUrl", "authorUrl", "coverUrl"].forEach(key => {
        data[key] = data[key] ? `${BASE_URL}${data[key]}` : "";
      });
      return data || "No result";
    } catch (error) {
      throw new Error(`Error during download: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const downloader = new CapcutDownloader();
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}