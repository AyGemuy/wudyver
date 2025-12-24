import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class BackgroundRemover {
  constructor() {
    this.uploadURL = "https://api.backgroundremoverai.com/conversions/upload-image-removebackground/";
    this.resultURL = "https://www.backgroundremoverai.com/results/";
  }
  async fetchImage(imageUrl) {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return {
        buffer: res.data,
        type: res.headers["content-type"]
      };
    } catch (error) {
      throw new Error("Gagal mengambil gambar: " + error.message);
    }
  }
  async uploadImage(imageUrl) {
    try {
      const {
        buffer,
        type
      } = await this.fetchImage(imageUrl);
      const form = new FormData();
      form.append("files", new Blob([buffer], {
        type: type
      }), `image.${type.split("/")[1] || "jpg"}`);
      form.append("data", JSON.stringify({
        route: "image",
        tool: "remove_background_image",
        domain: "https://www.backgroundremoverai.com",
        model: "u2net"
      }));
      const res = await axios.post(this.uploadURL, form, {
        headers: form.headers
      });
      return res.data?.uuid || null;
    } catch (error) {
      throw new Error("Gagal mengunggah gambar: " + error.message);
    }
  }
  async waitForResults(uuid, maxRetries = 10, delayMs = 3e3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await axios.get(`${this.resultURL}${uuid}/`);
        const $ = cheerio.load(res.data);
        const links = $(".files-downloaded li a").map((_, el) => ({
          name: $(el).find(".text-ellipsis").text().trim(),
          link: $(el).attr("href")
        })).get();
        if (links.length) return links;
      } catch (error) {
        console.warn(`Percobaan ${i + 1} gagal: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error("Gagal mendapatkan hasil dalam batas waktu.");
  }
  async removeBackground({
    imageUrl
  }) {
    try {
      const uuid = await this.uploadImage(imageUrl);
      if (!uuid) throw new Error("Gagal mendapatkan UUID.");
      return await this.waitForResults(uuid);
    } catch (error) {
      throw new Error("Gagal menghapus latar belakang: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const api = new BackgroundRemover();
    const result = await api.removeBackground(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}