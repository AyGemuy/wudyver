import fetch from "node-fetch";
import crypto from "crypto";
import fakeUserAgent from "fake-useragent";
class Talkai {
  constructor() {
    this.baseUrl = "https://talkai.info/chat/send/";
    this.headers = {
      "User-Agent": fakeUserAgent()
    };
  }
  generateRandomHeader() {
    return crypto.randomBytes(4).join(".");
  }
  async chat(id = "fb2e159b-da56-431c-b856-3a691a4a9d3c", message = "Halo", model = "gpt-4o-mini", temperature = .7) {
    const payload = {
      type: "chat",
      messagesHistory: [{
        id: id,
        from: "you",
        content: message
      }],
      settings: {
        model: model,
        temperature: parseFloat(temperature)
      }
    };
    const headers = {
      ...this.headers,
      "X-Forwarded-For": this.generateRandomHeader(),
      Referer: "https://talkai.info/chat/"
    };
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const responseText = await response.json();
      return responseText;
    } catch (error) {
      throw new Error(`Failed to fetch from TalkAI API: ${error.message}`);
    }
  }
  async image(id = "271b5550-d0df-43f5-80a5-b56c239c0cd3", message = "Men", size = "256x256", model = "dall-e-2") {
    const payload = {
      type: "image",
      messagesHistory: [{
        id: id,
        from: "you",
        content: message
      }],
      settings: {
        model: model,
        size: size
      }
    };
    const headers = {
      ...this.headers,
      "X-Forwarded-For": this.generateRandomHeader(),
      Referer: "https://talkai.info/image/"
    };
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const responseText = await response.json();
      return responseText;
    } catch (error) {
      throw new Error(`Failed to fetch from TalkAI API: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    type = "chat",
      message = "Halo",
      model = "gpt-4o-mini",
      temperature = .7,
      size = "256x256",
      id
  } = req.method === "GET" ? req.query : req.body;
  if (!id) return res.status(400).json({
    error: "Missing id parameter"
  });
  const talkai = new Talkai();
  try {
    let response;
    if (type === "chat") {
      response = await talkai.chat(id, message, model, temperature);
    } else if (type === "image") {
      response = await talkai.image(id, message, size, model);
    } else {
      return res.status(400).json({
        error: 'Invalid type, must be "chat" or "image"'
      });
    }
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}