import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
import https from "https";
class TextEffect {
  constructor() {
    this.client = axios.create({
      withCredentials: true,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    });
  }
  async ttp(text) {
    const url = "https://www.picturetopeople.org/p2p/text_effects_generator.p2p/transparent_text_effect";
    const form = new FormData();
    form.append("TextToRender", text);
    form.append("FontSize", "100");
    form.append("Margin", "30");
    form.append("LayoutStyle", "0");
    form.append("TextRotation", "0");
    form.append("TextColor", "ffffff");
    form.append("TextTransparency", "0");
    form.append("OutlineThickness", "3");
    form.append("OutlineColor", "000000");
    form.append("FontName", "Lekton");
    form.append("ResultType", "view");
    try {
      const {
        data
      } = await this.client.post(url, form);
      const $ = cheerio.load(data);
      const resultFile = $("form[name='MyForm']").find("#idResultFile").attr("value");
      return resultFile ? "https://www.picturetopeople.org" + resultFile : null;
    } catch (error) {
      console.error("Error in ttp:", error);
      throw new Error("Error fetching TTP image");
    }
  }
  async raterian(text) {
    try {
      return `https://raterian.sirv.com/New%20Project.png?text.0.text=${text}&text.0.position.y=-35%25&text.0.color=ffffff&text.0.font.family=Poppins&text.0.font.weight=800&text.0.outline.color=000000&text.0.outline.width=1`;
    } catch (error) {
      console.error("Error in raterian:", error);
      throw new Error("Error fetching Raterian image");
    }
  }
  async getImageUrl(text, type) {
    let url;
    try {
      switch (type) {
        case "1":
          url = await this.ttp(text);
          break;
        case "2":
          url = await this.raterian(text);
          break;
        default:
          throw new Error("Version tidak valid. Pilih versi: 1 atau 2");
      }
      return await this.fetchImage(url);
    } catch (error) {
      console.error("Error in getImageUrl:", error);
      throw new Error("Error fetching image URL");
    }
  }
  async fetchImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error fetching image from URL:", error);
      throw new Error("Error fetching image from URL");
    }
  }
}
export default async function handler(req, res) {
  const {
    text,
    type = "1"
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: 'Paramenter "text" required'
    });
  }
  const textEffect = new TextEffect();
  try {
    const imageBuffer = await textEffect.getImageUrl(text, type);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}