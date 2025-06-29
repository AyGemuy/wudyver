import axios from "axios";
import {
  FormData
} from "formdata-node";
import crypto from "crypto";
class VheerService {
  constructor() {
    this.url = "https://vheer.com/app/image-to-text";
  }
  async ocr({
    url,
    lang = "ENG"
  }) {
    try {
      const {
        data: fileBuffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const base64Image = Buffer.from(fileBuffer).toString("base64");
      const form = new FormData();
      form.append("1_imageBase64", `data:${headers["content-type"]};base64,${base64Image}`);
      form.append("1_languageIndex", lang);
      form.append("0", `["$K1","${this.randomString(10)}"]`);
      const {
        data
      } = await axios.post(this.url, form, {
        headers: {
          accept: "text/x-component",
          "user-agent": "Mozilla/5.0",
          referer: this.url,
          "next-action": "99625e5ddd7496b07a3d1bef68618b3c0dea0807",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22image-to-text%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-text%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
          ...form.headers
        },
        data: form
      });
      return JSON.parse(data.split("\n")[1].slice(2));
    } catch (error) {
      throw new Error(`Error: ${error.message}`);
    }
  }
  randomString(length) {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const ocr = new VheerService();
  try {
    const data = await ocr.ocr(params);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}