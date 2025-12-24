import axios from "axios";
import {
  FormData
} from "formdata-node";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class ModelClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  async dataModel(url) {
    try {
      console.log(`[LOG] Fetching main page: ${url}`);
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const results = [];
      const links = $(".explore-item__img a").map((_, el) => new URL($(el).attr("href"), this.baseUrl).href).get();
      console.log(`[LOG] Found ${links.length} model links.`);
      for (const link of links) {
        console.log(`[LOG] Fetching model page: ${link}`);
        const {
          data: modelPage
        } = await axios.get(link);
        const $$ = cheerio.load(modelPage);
        const controlLink = $$(".model__col .model-control .model-share").attr("data-link") || "";
        const imageSrc = $$(".model__col .model__content .model__img").attr("src") || "";
        const image = new URL(imageSrc, this.baseUrl).href;
        if (!controlLink) {
          console.log(`[WARN] No control link found for ${link}`);
          continue;
        }
        const urlObj = new URL(controlLink);
        const name = urlObj.pathname.split("/")[2] || "Unknown";
        const model = urlObj.searchParams.get("model") || "Unknown";
        console.log(`[LOG] Extracted - Name: ${name}, Model: ${model}, Image: ${image}, Control Link: ${controlLink}`);
        results.push({
          name: name,
          model: model,
          image: image,
          controlLink: controlLink
        });
      }
      console.log(`[LOG] Scraping completed. Total models: ${results.length}`);
      return results;
    } catch (error) {
      console.error(`[ERROR] Fetching data failed: ${error.message}`);
      return [];
    }
  }
}
class MultiAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.baseURL = "https://multi-ai.pro/api/handler";
    this.headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://multi-ai.pro",
      priority: "u=1, i",
      referer: "https://multi-ai.pro/model/anything-v3-better-vae",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async createImage(params = {}) {
    try {
      const {
        model = "09a5805203f4c12da649ec1923bb7729517ca25fcac790e640eaa9ed66573b65",
          name = "anything-v3-better-vae",
          prompt = "men",
          negativePrompt = "",
          width = 512,
          height = 512,
          steps = 50,
          scale = 12,
          scheduler = "DPMSolverMultistep",
          seed = ""
      } = params;
      const form = new FormData();
      form.append("model", model);
      form.append("promt", prompt);
      form.append("negative_prompt", negativePrompt);
      form.append("width", width);
      form.append("height", height);
      form.append("num_inference_steps", steps);
      form.append("guidance_scale", scale);
      form.append("scheduler", scheduler);
      form.append("seed", seed);
      form.append("action", "create");
      const {
        data
      } = await this.client.post(this.baseURL, form, {
        headers: {
          ...this.headers,
          "content-type": `multipart/form-data;`
        }
      });
      if (!data?.id) throw new Error("Gagal membuat gambar.");
      console.log(`✅ Image creation started. ID: ${data.id}`);
      return await this.checkStatus(model, name, data.id);
    } catch (error) {
      console.error("❌ Error creating image:", error);
      return null;
    }
  }
  async checkStatus(model, name, id) {
    try {
      let attempt = 0;
      while (true) {
        attempt++;
        console.log(`🔄 Polling attempt #${attempt} - Checking status for ID: ${id}`);
        await new Promise(res => setTimeout(res, 3e3));
        const payload = new URLSearchParams({
          id: id,
          model: model,
          "model-name": name,
          "model-water": "",
          "file-temp": "[]",
          action: "check"
        });
        const {
          data
        } = await this.client.post(this.baseURL, payload.toString(), {
          headers: {
            ...this.headers,
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
          }
        });
        if (data?.status === "succeeded") {
          console.log(`✅ Image generation complete. Result: ${data.data?.file[0]}`);
          return data.data?.file[0];
        }
      }
    } catch (error) {
      console.error("❌ Error checking status:", error);
      return null;
    }
  }
  async getModel() {
    try {
      const models = new ModelClient("https://multi-ai.pro");
      const data = await models.dataModel("https://multi-ai.pro/collection/text-to-image");
      return data;
    } catch (error) {
      console.error("❌ Error get models:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.query;
  const ai = new MultiAI();
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' diperlukan"
    });
  }
  switch (action) {
    case "model":
      try {
        const models = await ai.getModel();
        return res.status(200).json({
          result: models
        });
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    case "create":
      if (!params.prompt) {
        return res.status(400).json({
          error: "Paramenter 'prompt' diperlukan"
        });
      }
      try {
        const image = await ai.createImage(params);
        return res.status(200).json({
          result: image
        });
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    default:
      return res.status(400).json({
        error: "Aksi tidak valid"
      });
  }
}