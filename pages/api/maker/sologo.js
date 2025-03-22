import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SologoAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://www.sologo.ai/v1/api/logo",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://www.sologo.ai",
        Priority: "u=1, i",
        Referer: "https://www.sologo.ai/ai-logo-generator/generated",
        "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      },
      jar: this.jar,
      withCredentials: true
    }));
  }
  getPayload({
    title = "wudy",
    slogan = "",
    industry_index = "tech",
    industry_index_id = "",
    idea = "tech",
    width = 400,
    height = 300,
    whiteEdge = 80,
    pagesize = 4,
    ai_icon = []
  } = {}) {
    return {
      session_id: "",
      title: title,
      slogan: slogan,
      industry_index: industry_index,
      industry_index_id: industry_index_id,
      idea: idea,
      width: width,
      height: height,
      whiteEdge: whiteEdge,
      pagesize: pagesize,
      ai_icon: ai_icon
    };
  }
  async generate(options = {}) {
    try {
      const {
        limit = 4
      } = options;
      const payload = this.getPayload(options);
      const response = await this.client.post("/logo_generate", payload);
      const {
        status,
        msg,
        data
      } = response.data;
      if (status !== 0) throw new Error(msg || "Gagal menghasilkan logo");
      const {
        session_id,
        logoList
      } = data;
      if (!logoList?.length) throw new Error("Tidak ada logo yang ditemukan");
      const limitedLogos = logoList.slice(0, limit);
      const logos = await Promise.all(limitedLogos.map(async logo => {
        const {
          logoKey,
          logo_thumb
        } = logo;
        const preview = await this.getLogoPreview(logoKey);
        return {
          key: logoKey,
          thumb: logo_thumb,
          style: preview.data.logoStyle
        };
      }));
      return {
        session_id: session_id,
        logos: logos
      };
    } catch (error) {
      console.error("Error generating logo:", error.message);
      return null;
    }
  }
  async getLogoPreview(logoKey) {
    try {
      const response = await this.client.post("https://api.sologo.ai/generate/svg/generateLogoPreviewv1", {
        logoStyle: 1,
        caseTemplate: 0,
        logoKey: logoKey
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching logo preview:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.title) {
    return res.status(400).json({
      error: "Title parameter is required"
    });
  }
  try {
    const sologo = new SologoAI();
    const data = await sologo.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetchi"
    });
  }
}