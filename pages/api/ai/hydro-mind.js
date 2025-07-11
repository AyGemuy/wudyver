import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class HydroMindChat {
  constructor() {
    this.url = "https://mind.hydrooo.web.id/v2/chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://mind.hydrooo.web.id",
      priority: "u=1, i",
      referer: "https://mind.hydrooo.web.id/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt,
    model = "@google/gemini-1.5-flash",
    system = "",
    file = null
  }) {
    try {
      const form = new FormData();
      form.append("content", prompt);
      form.append("model", model);
      form.append("system", system);
      if (file) {
        if (typeof file === "string" && file.startsWith("http")) {
          const {
            data,
            headers
          } = await axios.get(file, {
            responseType: "arraybuffer"
          });
          form.append("file", new Blob([data], {
            type: headers["content-type"] || "application/octet-stream"
          }), "file");
        } else if (Buffer.isBuffer(file)) {
          form.append("file", new Blob([file], {
            type: "application/octet-stream"
          }), "file");
        } else if (file instanceof Blob) {
          form.append("file", file, "file");
        }
      }
      const response = await axios.post(this.url, form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const result = await new HydroMindChat().chat(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}