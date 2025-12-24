import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class BratService {
  constructor(host = 1) {
    this.BASE_URLS = {
      1: "https://skyzxu-brat.hf.space/brat-animated?text=",
      2: "onlineconvert",
      3: "https://restapi.rizk.my.id/bardvidio?text=",
      4: "https://api.nekorinn.my.id/maker/bratvid?text=",
      5: "https://rest-api.nazirganz.space/maker/brat?text=",
      6: "https://api.yupradev.biz.id/api/video/bratv?text=",
      7: "https://api.ryzendesu.vip/api/image/brat/animated?text="
    };
    this.host = Math.min(Math.max(host, 1), Object.keys(this.BASE_URLS).length);
    this.BASE_URL = this.BASE_URLS[this.host];
    this.client = axios.create({
      timeout: 1e4,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
  }
  async fetchData(url, responseType = "json", headers = {}) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let response;
    while (true) {
      try {
        response = await this.client.get(url, {
          responseType: responseType,
          headers: headers
        });
        if (response.status === 200) {
          if (responseType === "arraybuffer") return Buffer.from(response.data);
          return response.data;
        }
      } catch (error) {
        console.error(`Gagal mengakses URL: ${url} - ${error.message}`);
      }
      console.log(`Retrying in 2 seconds...`);
      await delay(2e3);
    }
  }
  async fetchImage(text) {
    try {
      let url;
      if (this.host === 8) {
        url = `${this.BASE_URL}${encodeURIComponent(text)}&apikey=free`;
      } else {
        url = `${this.BASE_URL}${encodeURIComponent(text)}`;
      }
      return await this.fetchData(url, "arraybuffer", {
        Accept: "video/mp4"
      });
    } catch (error) {
      throw new Error(`Error fetching image for text "${text}": ${error.message}`);
    }
  }
  async processInput(input) {
    try {
      const urls = input.split(" ").map(word => `https://${apiConfig.DOMAIN_URL}/api/maker/brat/v1?text=${encodeURIComponent(word)}`);
      const {
        data
      } = await this.client.post(`https://${apiConfig.DOMAIN_URL}/api/tools/onlineconvert`, {
        url: urls,
        duration: 1
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (data.result) {
        return await this.fetchData(data.result, "arraybuffer", {
          Accept: "video/mp4"
        });
      }
      return data;
    } catch (error) {
      throw new Error(`Error processing input: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      text,
      host
    } = req.method === "GET" ? req.query : req.body;
    if (!text) {
      return res.status(400).json({
        error: "Text parameter is required"
      });
    }
    const downloader = new BratService(parseInt(host, 10) || 1);
    let imageBuffer;
    switch (downloader.host) {
      case 1:
        imageBuffer = await downloader.fetchImage(text);
        break;
      case 2:
        imageBuffer = await downloader.processInput(text);
        break;
      case 3:
        imageBuffer = await downloader.fetchImage(text);
        break;
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        imageBuffer = await downloader.fetchImage(text);
        break;
      default:
        return res.status(400).json({
          error: "Invalid host selected"
        });
    }
    res.setHeader("Content-Type", "video/mp4");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      error: `Failed to process the request: ${error.message}`
    });
  }
}