import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class MediafireDownloader {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_KOYEB}/mediafire?url=`;
  }
  async fetchMediafireData(url) {
    try {
      const {
        data
      } = await axios.get(`${this.apiUrl}${url}`);
      const {
        fileName = "N/A",
          downloadLink = "N/A",
          fileSize = "N/A",
          meta
      } = data;
      const {
        app_id,
        type,
        site_name,
        locale,
        title,
        image,
        card,
        site
      } = meta || {};
      return {
        fileName: fileName,
        downloadLink: downloadLink,
        fileSize: fileSize,
        meta: {
          appId: app_id || "N/A",
          type: type || "N/A",
          siteName: site_name || "N/A",
          locale: locale || "N/A",
          url: url || "N/A",
          title: title || "N/A",
          image: image || "N/A",
          card: card || "N/A",
          site: site || "N/A"
        }
      };
    } catch {
      throw new Error("Failed to fetch MediaFire data");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "URL is required"
  });
  const downloader = new MediafireDownloader();
  try {
    const result = await downloader.fetchMediafireData(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}