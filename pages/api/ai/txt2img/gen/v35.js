import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class ImagineAnythingAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://www.imagineanything.ai",
      headers: {
        "accept-language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        priority: "u=1, i",
        ...SpoofHead()
      }
    }));
    this.csrfToken = null;
    this.sessionData = null;
    this.isAuthenticated = false;
  }
  async auth() {
    try {
      if (this.isAuthenticated) return true;
      const csrfRes = await this.client.get("/api/auth/csrf");
      this.csrfToken = csrfRes?.data?.csrfToken;
      const sessionRes = await this.client.get("/api/auth/session");
      this.sessionData = sessionRes?.data;
      this.isAuthenticated = true;
      console.log("Authentication successful");
      return true;
    } catch (error) {
      console.error("Authentication failed:", error.message);
      this.isAuthenticated = false;
      throw error;
    }
  }
  async gen({
    prompt,
    ...rest
  }) {
    try {
      await this.auth();
      const payload = [prompt, "IMAGE", {
        user_id: 141,
        username: "guest",
        email: "guest@imagineanything.com",
        planType: "free"
      }, {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        numberOfImages: 1,
        ...rest
      }, true, "runware-realistic"];
      const response = await this.client.post("/?utm_source=moge.ai", payload, {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://www.imagineanything.ai",
          "next-action": "7e12f1f39691e45ac1ac04f064bede559081fb3bf3"
        }
      });
      const responseText = response.data;
      const parts = responseText.split(/\s*\d+:/).filter(Boolean);
      if (parts.length > 0) {
        for (let i = parts.length - 1; i >= 0; i--) {
          try {
            const result = JSON.parse(parts[i].trim());
            if (result.success === true || result.imageUrls) {
              return result;
            }
          } catch (e) {
            continue;
          }
        }
      }
      console.error("No valid result JSON found in response");
      console.log("Raw response:", responseText);
      throw new Error("Unexpected response format");
    } catch (error) {
      if (error.message !== "Unexpected response format") {
        console.error("Generation failed:", error.message);
        if (error.response) {
          console.error("Response data:", error.response.data);
        }
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const ai = new ImagineAnythingAI();
  try {
    const data = await ai.gen(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}