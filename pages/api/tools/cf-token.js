import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class CloudflareBypasser {
  constructor() {
    if (!apiConfig.DOMAIN_CF) {
      throw new Error("apiConfig.DOMAIN_CF belum didefinisikan.");
    }
    this.baseUrl = `https://${apiConfig.DOMAIN_CF}/tools/tcloudflare`;
  }
  async bypass({
    url,
    siteKey,
    ...rest
  }) {
    if (!url || !siteKey) {
      throw new Error("Parameter 'url' dan 'siteKey' wajib untuk bypass.");
    }
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          url: url,
          siteKey: siteKey,
          ...rest
        }
      });
      return response.data;
    } catch (error) {
      console.error("Kesalahan saat bypass Cloudflare:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url || !params.siteKey) {
    return res.status(400).json({
      error: "Parameter 'url' dan 'siteKey' wajib disediakan."
    });
  }
  try {
    const bypasser = new CloudflareBypasser();
    const response = await bypasser.bypass(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Kesalahan API Bypasser:", error.message);
    res.status(500).json({
      error: error.message || "Terjadi kesalahan server internal saat melakukan bypass Cloudflare."
    });
  }
}