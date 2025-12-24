import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class QuizGenerator {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://aiquizgenerator.ifscswiftcodeapp.in",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://aiquizgenerator.ifscswiftcodeapp.in/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async upload({
    imageData,
    filename = "image.png"
  }) {
    try {
      console.log("Proses upload gambar dimulai...");
      const form = new FormData();
      let buffer;
      if (Buffer.isBuffer(imageData)) {
        buffer = imageData;
      } else if (imageData?.startsWith?.("data:")) {
        const base64Data = imageData.split(",")[1];
        buffer = Buffer.from(base64Data, "base64");
      } else if (imageData?.startsWith?.("http")) {
        console.log("Download gambar dari URL...");
        const response = await axios.get(imageData, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(response.data);
      } else {
        throw new Error("Format gambar tidak didukung");
      }
      form.append("image", buffer, {
        filename: filename,
        contentType: "image/png"
      });
      const response = await this.client.post("/upload-temp-image.php", form, {
        headers: form.getHeaders()
      });
      console.log("Upload berhasil:", response.data?.url || "tidak ada URL");
      return response.data;
    } catch (error) {
      console.error("Upload gagal:", error.message);
      throw error;
    }
  }
  async generate({
    chatId,
    prompt,
    messages,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Mulai generate...");
      const finalChatId = chatId || Date.now().toString();
      const messageContent = [];
      let imagePath = null;
      if (prompt) {
        messageContent.push({
          type: "text",
          text: prompt
        });
      }
      if (imageUrl) {
        console.log("Upload gambar untuk processing...");
        const uploadResult = await this.upload({
          imageData: imageUrl
        });
        if (uploadResult?.url) {
          imagePath = uploadResult.url;
          messageContent.push({
            type: "image_url",
            image_url: {
              url: imagePath
            }
          });
        } else {
          console.log("Gambar tidak diupload, lanjut tanpa gambar");
        }
      }
      const chatHistory = messages?.length ? messages.map(msg => ({
        role: msg.role || "user",
        content: Array.isArray(msg.content) ? msg.content : [{
          type: "text",
          text: msg.content || ""
        }],
        timestamp: msg.timestamp || new Date().toISOString()
      })) : [];
      const payload = {
        message: messageContent,
        chatId: finalChatId,
        chatHistory: chatHistory,
        generatorType: "QuizGenerator",
        ...rest
      };
      console.log("Kirim request ke API...");
      const response = await this.client.post("/api.php", payload);
      console.log("Generate selesai:", response.data?.success ? "sukses" : "gagal");
      return response.data;
    } catch (error) {
      console.error("Generate error:", error.message);
      return {
        success: false,
        response: error.message,
        chatId: chatId || "error",
        error: true
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new QuizGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}