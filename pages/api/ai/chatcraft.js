import axios from "axios";
class Api {
  constructor() {
    this.baseUri = "https://free-chatcraft-ai.deno.dev";
  }
  async toBase64(imageUrl) {
    console.log("Converting image to base64...");
    try {
      if (imageUrl?.startsWith?.("data:")) {
        console.log("Input is already base64");
        return imageUrl;
      }
      if (Buffer.isBuffer(imageUrl)) {
        console.log("Converting Buffer to base64");
        return `data:image/jpeg;base64,${imageUrl.toString("base64")}`;
      }
      const url = imageUrl?.startsWith?.("http") ? imageUrl : `${this.baseUri}/${imageUrl}`;
      console.log("Fetching image from URL:", url);
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res?.data || "");
      const mimeType = res?.headers?.["content-type"] || "image/jpeg";
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (err) {
      console.error("Failed to convert to base64:", err?.message || "Unknown error");
      throw err;
    }
  }
  async chat({
    model = "auto",
    prompt = "",
    messages = [],
    imageUrl,
    stream = false,
    ...rest
  }) {
    console.log("Starting API request generation...");
    try {
      const payload = {
        model: model,
        temperature: 0,
        messages: messages.length ? messages : [{
          role: "user",
          content: prompt
        }],
        stream: stream,
        ...rest
      };
      if (imageUrl) {
        console.log("Processing image URL...");
        const base64Image = await this.toBase64(imageUrl);
        payload.messages.push({
          role: "user",
          content: [{
            type: "text",
            text: prompt
          }, {
            type: "image_url",
            image_url: {
              url: base64Image
            }
          }]
        });
      }
      console.log("Sending request to API...");
      const res = await axios.post(`${this.baseUri}/api/v1/chat/completions`, payload, {
        headers: {
          accept: "application/json",
          "accept-language": "id-ID",
          authorization: "Bearer mock_key",
          "content-type": "application/json",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          origin: "https://chatcraft.org",
          referer: "https://chatcraft.org/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-stainless-arch": "unknown",
          "x-stainless-lang": "js",
          "x-stainless-os": "Unknown",
          "x-stainless-package-version": "4.90.0",
          "x-stainless-retry-count": "0",
          "x-stainless-runtime": "browser:chrome",
          "x-stainless-runtime-version": "127.0.0",
          "x-stainless-timeout": "600000"
        }
      });
      console.log("API request successful:", res?.data);
      return res?.data || {};
    } catch (err) {
      console.error("API request failed:", err?.message || "Unknown error");
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new Api();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}