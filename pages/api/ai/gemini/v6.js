import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GeminiChat {
  constructor() {
    this.chatUrl = "https://ai.jaze.top/api/auth/gemini";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      cookie: "i18n_redirected=zh",
      origin: "https://ai.jaze.top",
      priority: "u=1, i",
      referer: "https://ai.jaze.top/?session=1",
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
    imageUrl = "",
    model = "gemini-1.5-flash",
    system = "",
    messages = []
  }) {
    try {
      console.log("[1] Menyiapkan FormData...");
      const form = new FormData();
      form.append("model", model);
      console.log("[2] Menambahkan model:", model);
      const finalMessages = messages.length ? messages : [system ? {
        role: "system",
        content: system
      } : {
        role: "system",
        content: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown."
      }, {
        role: "user",
        content: prompt
      }];
      form.append("messages", JSON.stringify(finalMessages));
      console.log("[3] Menambahkan pesan:", finalMessages);
      if (imageUrl) {
        try {
          console.log("[4] Mengunduh gambar:", imageUrl);
          const {
            data: buffer,
            headers: resHeaders
          } = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          const mimeType = resHeaders["content-type"] || "image/webp";
          const blob = new Blob([buffer], {
            type: mimeType
          });
          form.append("files", blob, "image.webp");
          console.log("[5] Gambar ditambahkan ke FormData.");
        } catch (imgErr) {
          console.warn("[Gagal unduh gambar]", imgErr.message);
        }
      }
      console.log("[6] Mengirim permintaan ke Gemini...");
      const res = await axios.post(this.chatUrl, form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      console.log("[7] Respons diterima.");
      return res.data;
    } catch (err) {
      console.error("[chat error]", err.message);
      return null;
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
    const gemini = new GeminiChat();
    const response = await gemini.chat(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}