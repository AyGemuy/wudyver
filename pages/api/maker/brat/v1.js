import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class BratService {
  constructor(host = 1) {
    this.BASE_URLS = {
      1: "https://brat.caliphdev.com/api/brat?text=",
      2: `https://${apiConfig.DOMAIN_KOYEB}/brat?text=`,
      3: "https://aqul-brat.hf.space/?text=",
      4: "https://siputzx-bart.hf.space/?q=",
      5: `https://${apiConfig.DOMAIN_KOYEB}/brat/v2?text=`,
      6: "https://qyuunee-brat.hf.space/?q="
    };
    this.totalHosts = Object.keys(this.BASE_URLS).length;
    const validHost = Math.min(Math.max(host, 1), this.totalHosts);
    this.BASE_URL = this.BASE_URLS[validHost];
  }
  async fetchImage(text) {
    const url = `${this.BASE_URL}${encodeURIComponent(text)}`;
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Error fetching image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    text,
    host
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  const hostInt = host ? parseInt(host) : 1;
  const downloader = new BratService(hostInt);
  if (hostInt < 1 || hostInt > downloader.totalHosts) {
    return res.status(400).json({
      error: `Host must be between 1 and ${downloader.totalHosts}.`
    });
  }
  try {
    const imageBuffer = await downloader.fetchImage(text);
    console.log("Query processing complete!");
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error processing query:", error);
    return res.status(500).json({
      error: "Failed to process the request"
    });
  }
}