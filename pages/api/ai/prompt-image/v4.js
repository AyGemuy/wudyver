import fetch from "node-fetch";
import {
  FormData
} from "formdata-node";
class ImagePrompt {
  constructor() {
    this.baseUrl = "https://imageprompt.org/api/ai/prompts";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://imageprompt.org/image-prompt-generator"
    };
  }
  async image(url, model = 0, lang = "id") {
    try {
      const imageResponse = await fetch(url);
      const buffer = await imageResponse.arrayBuffer();
      const mimeType = "image/webp";
      const base64Url = `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
      const form = new FormData();
      form.append("base64Url", base64Url);
      form.append("imageModelId", model);
      form.append("language", lang);
      const response = await fetch(`${this.baseUrl}/image`, {
        method: "POST",
        headers: {
          ...this.headers
        },
        body: form
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Image prompt failed: ${error.message}`);
    }
  }
  async text(prompt = "Men") {
    try {
      const body = JSON.stringify({
        userPrompt: prompt,
        page: "image-prompt-generator"
      });
      const response = await fetch(`${this.baseUrl}/magic-enhance`, {
        method: "POST",
        headers: this.headers,
        body: body
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Magic prompt failed: ${error.message}`);
    }
  }
  async edit(prompt = "Men", detail = "Very Men") {
    try {
      const body = JSON.stringify({
        userPrompt: prompt,
        editDetails: detail
      });
      const response = await fetch(`${this.baseUrl}/edit-with-ai`, {
        method: "POST",
        headers: this.headers,
        body: body
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Edit prompt failed: ${error.message}`);
    }
  }
  async translate(prompt = "Men", lang = "id") {
    try {
      const body = JSON.stringify({
        userPrompt: prompt,
        targetLanguage: lang,
        page: "image-prompt-generator"
      });
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: "POST",
        headers: this.headers,
        body: body
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Translate prompt failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action,
    url,
    model,
    lang,
    prompt,
    detail
  } = params;
  const imagePrompt = new ImagePrompt();
  try {
    let result;
    switch (method) {
      case "POST":
      case "GET": {
        switch (action) {
          case "image":
            result = await imagePrompt.image(url, model, lang);
            break;
          case "text":
            result = await imagePrompt.text(prompt);
            break;
          case "edit":
            result = await imagePrompt.edit(prompt, detail);
            break;
          case "translate":
            result = await imagePrompt.translate(prompt, lang);
            break;
          default:
            return res.status(400).json({
              error: "Action not supported"
            });
        }
        return res.status(200).json(result);
      }
      default:
        return res.status(405).json({
          error: "Method not allowed"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}