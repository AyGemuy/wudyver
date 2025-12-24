import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class MathGptApi {
  constructor() {
    this.api = axios.create({
      baseURL: "https://math-gpt.ai/api",
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://math-gpt.ai",
        priority: "u=1, i",
        referer: "https://math-gpt.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    console.log("Proses: Instance MathGptApi telah dibuat.");
  }
  async getUrl(path) {
    console.log(`Proses: Mendapatkan URL upload untuk path -> ${path}`);
    try {
      const response = await this.api.post("/trpc/uploads.signedUploadUrl?batch=1", {
        0: {
          json: {
            path: path,
            bucket: "mathgpt"
          }
        }
      });
      return response.data?.[0]?.result?.data?.json || null;
    } catch (error) {
      console.error("Error: Gagal mendapatkan URL pre-signed.", error.message);
      return null;
    }
  }
  async upload(url, data, mimeType) {
    console.log("Proses: Mengunggah data ke URL...");
    try {
      await axios.put(url, data, {
        headers: {
          "Content-Type": mimeType
        }
      });
      console.log("Proses: Unggah berhasil.");
      return true;
    } catch (error) {
      console.error("Error: Gagal mengunggah file.", error.message);
      return false;
    }
  }
  parseStream(stream) {
    return new Promise((resolve, reject) => {
      stream.on("data", chunk => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonData = line.slice(5).trim();
            if (jsonData) {
              try {
                const parsedData = JSON.parse(jsonData);
                if (parsedData?.type === "end") {
                  console.log('Proses: Pesan "end" ditemukan, stream selesai.');
                  resolve(parsedData);
                  stream.destroy();
                  return;
                }
              } catch (e) {}
            }
          }
        }
      });
      stream.on("error", err => {
        console.error("Error: Terjadi kesalahan pada stream.");
        reject(err);
      });
      stream.on("end", () => {
        reject(new Error('Stream berakhir tanpa menemukan pesan "end" yang valid.'));
      });
    });
  }
  async chat({
    prompt,
    answer = true,
    think = false,
    imageUrl = null
  }) {
    console.log(`Proses: Memulai chat dengan prompt -> "${prompt}"`);
    let fileDetails = null;
    if (imageUrl) {
      console.log("Proses: Menangani unggahan gambar...");
      const imageBuffer = Buffer.isBuffer(imageUrl) ? imageUrl : imageUrl.startsWith("http") ? (await axios.get(imageUrl, {
        responseType: "arraybuffer"
      })).data : Buffer.from(imageUrl, "base64");
      const mimeType = "image/jpeg";
      const fileName = `image-${Date.now()}.jpg`;
      const filePath = `chat/${crypto.randomBytes(32).toString("hex")}.jpg`;
      const uploadUrl = await this.getUrl(filePath);
      if (uploadUrl) {
        const isUploaded = await this.upload(uploadUrl, imageBuffer, mimeType);
        fileDetails = isUploaded ? {
          fileUrl: `https://files.math-gpt.ai/${filePath}`,
          mimeType: mimeType,
          fileName: fileName
        } : null;
      }
    }
    const payload = {
      messages: [{
        id: Date.now(),
        text: prompt,
        sender: "user",
        ...fileDetails || {}
      }],
      type: "MathAI",
      isJustAnswerEnabled: answer,
      isThinkingEnabled: think
    };
    console.log("Proses: Mengirim permintaan chat ke API...");
    try {
      const response = await this.api.post("/ai/generateAnswerStream", payload, {
        responseType: "stream",
        headers: {
          accept: "*/*"
        }
      });
      return this.parseStream(response.data);
    } catch (error) {
      if (error.response) {
        console.error(`Error: Gagal mengirim chat. Status: ${error.response.status}, Data: ${error.response.data}`);
      } else {
        console.error("Error: Gagal mengirim chat.", error.message);
      }
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
    const gpt = new MathGptApi();
    const response = await gpt.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}