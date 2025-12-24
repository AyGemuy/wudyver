import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class BingImageGenerator {
  constructor() {
    this.baseURL = "https://www.bing.com/images/create";
    this.cookieJar = new CookieJar();
    this.httpClient = wrapper(axios.create({
      jar: this.cookieJar
    }));
    this.defaultHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.bing.com",
      referer: "https://www.bing.com/images/create?&wlexpsignin=1",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 11; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    prompt,
    output = "4",
    cookie = "15Saj6ishPr6tdYIlraA7JCe1UD_2un-nVF2S3NMV4nXEU1TqJjJBDbIc7hRe3disZ7rNHNnC7ty6Ac9l4iX0RThc0-XQI3Uz9lI4Xi307cYY8f_lKmzQfYDrPrCIwiwp3U0U1zZGnMuJSlJkUtKWI6f9jUMHgZVYpmPWIVrVZNbNQnYKOXLgQ1Vv7gvSsqK6t65wFvj3tpeB4q_miwpTdw"
  }) {
    if (!prompt) throw new Error('Paramenter "prompt" diperlukan');
    try {
      const headers = {
        ...this.defaultHeaders
      };
      if (cookie) {
        await this.cookieJar.setCookie(`_U=${cookie}`, "https://www.bing.com");
      }
      const response = await this.httpClient.post(this.baseURL, new URLSearchParams({
        q: prompt,
        rt: output,
        FORM: "GENCRE"
      }), {
        headers: headers,
        maxRedirects: 0,
        validateStatus: status => status >= 300 && status < 400
      });
      const redirectUrl = response.headers.location;
      if (!redirectUrl) throw new Error("Gagal mendapatkan redirect URL");
      const requestId = new URLSearchParams(redirectUrl.split("?")[1]).get("id");
      if (!requestId) throw new Error("ID tidak ditemukan dalam URL");
      return this.pollForImages({
        requestId: requestId,
        prompt: prompt,
        headers: headers
      });
    } catch (error) {
      console.error("Error fetching image:", error.message);
      return null;
    }
  }
  async pollForImages({
    requestId,
    prompt,
    headers
  }) {
    const pollingUrl = `${this.baseURL}/async/results/${requestId}?q=${encodeURIComponent(prompt)}`;
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 3e3));
      try {
        const response = await this.httpClient.get(pollingUrl, {
          headers: headers
        });
        const $ = cheerio.load(response.data);
        const images = [];
        $(".img_cont .mimg").each((_, el) => {
          images.push($(el).attr("src").split("?")[0]);
        });
        if (images.length > 0) return images;
      } catch (error) {
        console.error("Polling error:", error.message);
      }
      attempts++;
    }
    throw new Error("Gagal mendapatkan gambar setelah polling.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const bingAI = new BingImageGenerator();
  try {
    if (!params.prompt) {
      return res.status(400).json({
        error: "Missing required parameters: prompt"
      });
    }
    const result = await bingAI.generate({
      prompt: params.prompt,
      cookie: params.cookie
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}