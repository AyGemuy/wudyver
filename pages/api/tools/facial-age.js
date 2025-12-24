import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class FacialAge {
  constructor() {}
  async validateImage(url) {
    if (!url) throw new Error("Waduh, URL image-nya kagak ada ceunah 😏");
    const validExtensions = ["jpg", "jpeg", "png"];
    const extension = url.split(".").pop().toLowerCase();
    if (!validExtensions.includes(extension)) {
      throw new Error(`Mimetype-nya kagak valid bree, yang valid cuman: ${validExtensions.join(", ")}`);
    }
    const response = await axios.head(url);
    if (!response.headers["content-type"].startsWith("image/")) {
      throw new Error("URL-nya kagak valid bree, bukan gambar!");
    }
    return url;
  }
  async downloadImage(url) {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });
    return new Blob([response.data], {
      type: response.headers["content-type"]
    });
  }
  async tokens() {
    const response = await axios.get("https://www.facialage.com/");
    const $ = cheerio.load(response.data);
    return {
      token: $('input[name="_token"]').val(),
      cookies: response.headers["set-cookie"]
    };
  }
  async check(imgUrl) {
    try {
      const validatedUrl = await this.validateImage(imgUrl);
      const imageBlob = await this.downloadImage(validatedUrl);
      const {
        token,
        cookies
      } = await this.tokens();
      const form = new FormData();
      form.append("face", imageBlob, "image.jpg");
      form.append("_token", token);
      const response = await axios.post("https://www.facialage.com/", form, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          Origin: "https://www.facialage.com",
          Referer: "https://www.facialage.com/",
          "User-Agent": "Postify/1.0.0",
          Cookie: cookies.join("; ")
        }
      });
      const $ = cheerio.load(response.data);
      if ($(".title").text().trim().includes("The page has expired")) {
        throw new Error("Pagenya expired bree, coba lagi nanti yak 👍🏻");
      }
      const parse = selector => $(selector).text().split(":")[1]?.trim() || "Kagak ada";
      return {
        age: $(".entry__date-day").text() || "Kagak ada",
        gender: parse(".entry__meta-slack"),
        expression: parse(".entry__meta-facebook"),
        faceShape: parse(".entry__meta-comments")
      };
    } catch (error) {
      console.error(error);
      throw new Error("Dahlah capek 😮‍💨");
    }
  }
}
export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    try {
      const {
        imgUrl
      } = req.method === "GET" ? req.query : req.body;
      if (!imgUrl) {
        return res.status(400).json({
          error: "URL gambar tidak ditemukan"
        });
      }
      const facialAge = new FacialAge();
      const result = await facialAge.check(imgUrl);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        error: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method not allowed"
    });
  }
}