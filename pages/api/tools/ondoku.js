import {
  FormData
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import crypto from "crypto";
class Ondoku {
  constructor() {
    this.baseURL = "https://ondoku3.com/id/";
    this.textToSpeechURL = `${this.baseURL}text_to_speech/`;
    this.defaultHeaders = {
      "User-Agent": "Postify/1.0.0",
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Origin: "https://ondoku3.com",
      Referer: this.baseURL,
      "Upgrade-Insecure-Requests": "1",
      "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="58"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  randomIP() {
    return Array.from({
      length: 4
    }, () => crypto.randomInt(0, 256)).join(".");
  }
  async fetchToken() {
    try {
      const response = await fetch(this.baseURL, {
        headers: this.defaultHeaders
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      const token = $('input[name="csrfmiddlewaretoken"]').val();
      if (!token) throw new Error("CSRF token tidak ditemukan!");
      return token;
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      throw error;
    }
  }
  async scrape(data, voiceId, speed, pitch) {
    const csrfToken = await this.fetchToken();
    const headers = {
      ...this.defaultHeaders,
      Cookie: `settings={"voice":"${voiceId}","speed":${speed},"pitch":${pitch},"language":"id-ID"}; csrftoken=${csrfToken}`,
      "x-csrftoken": csrfToken,
      "X-Forwarded-For": this.randomIP()
    };
    try {
      const response = await fetch(this.textToSpeechURL, {
        method: "POST",
        headers: headers,
        body: data
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error response: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error in scrape method:", error);
      throw error;
    }
  }
  async textToSpeech(text, voiceId = "id-ID-Wavenet-B", speed = "1", pitch = "0") {
    const data = new FormData();
    data.append("text", text);
    data.append("voice", voiceId);
    data.append("speed", speed);
    data.append("pitch", pitch);
    return await this.scrape(data, voiceId, speed, pitch);
  }
  async imageToSpeech(imageUrl, voiceId = "id-ID-Wavenet-B", speed = "1", pitch = "0") {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${imageUrl}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const {
        ext = "jpeg",
          mime = "image/jpeg"
      } = await fileTypeFromBuffer(buffer) || {};
      const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      const data = new FormData();
      data.append("image_0", dataUrl);
      data.append("text", "");
      data.append("voice", voiceId);
      data.append("speed", speed);
      data.append("pitch", pitch);
      return await this.scrape(data, voiceId, speed, pitch);
    } catch (error) {
      console.error("Error in imageToSpeech method:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    type,
    text,
    imageUrl,
    voiceId = "id-ID-Wavenet-B",
    speed = "1",
    pitch = "0"
  } = req.method === "GET" ? req.query : req.body;
  if (!type || type !== "text" && type !== "image") {
    return res.status(400).json({
      error: "Invalid type. Use 'text' or 'image'."
    });
  }
  try {
    const ondoku = new Ondoku();
    if (type === "text") {
      if (!text) {
        return res.status(400).json({
          error: "Text is required for text-to-speech."
        });
      }
      const result = await ondoku.textToSpeech(text, voiceId, speed, pitch);
      return res.status(200).json({
        success: true,
        data: result
      });
    }
    if (type === "image") {
      if (!imageUrl) {
        return res.status(400).json({
          error: "Image URL is required for image-to-speech."
        });
      }
      const result = await ondoku.imageToSpeech(imageUrl, voiceId, speed, pitch);
      return res.status(200).json({
        success: true,
        data: result
      });
    }
  } catch (error) {
    console.error("Error in Ondoku API handler:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}