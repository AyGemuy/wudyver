import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class TinfoilAPI {
  constructor(baseURL = "https://inference.tinfoil.sh", apiBaseURL = "https://api.tinfoil.sh") {
    this.baseURL = baseURL;
    this.apiBaseURL = apiBaseURL;
    this.systemPromptCache = null;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://chat.tinfoil.sh",
      priority: "u=1, i",
      referer: "https://chat.tinfoil.sh/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async systemPrompt() {
    if (this.systemPromptCache) {
      return this.systemPromptCache;
    }
    try {
      console.log("Mengambil system prompt dari API...");
      const response = await axios.get(`${this.apiBaseURL}/api/app/system-prompt`, {
        headers: this.headers
      });
      this.systemPromptCache = response.data;
      return this.systemPromptCache;
    } catch (error) {
      console.error("Gagal mengambil system prompt:", error.message);
      return null;
    }
  }
  async convertFile({
    file,
    toFormat = "md",
    fromFormat = "image",
    model = "docling"
  }) {
    try {
      console.log("Memulai konversi file...");
      const form = new FormData();
      let fileBuffer, filename, contentType;
      if (Buffer.isBuffer(file)) {
        fileBuffer = file;
        filename = `image-${Date.now()}.jpg`;
        contentType = "application/octet-stream";
      } else if (typeof file === "string") {
        if (file.startsWith("data:")) {
          const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) throw new Error("Data URI base64 tidak valid");
          contentType = matches[1];
          fileBuffer = Buffer.from(matches[2], "base64");
          const extension = contentType.split("/")[1] || "bin";
          filename = `image-${Date.now()}.${extension}`;
        } else {
          const response = await axios.get(file, {
            responseType: "arraybuffer"
          });
          fileBuffer = Buffer.from(response.data);
          contentType = response.headers["content-type"] || "application/octet-stream";
          const contentDisposition = response.headers["content-disposition"];
          const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          } else {
            try {
              const urlPath = new URL(file).pathname;
              const baseName = urlPath.split("/").pop();
              if (baseName && baseName.includes(".")) {
                filename = baseName;
              } else {
                filename = `image-${Date.now()}.jpg`;
              }
            } catch (e) {
              filename = `image-${Date.now()}.jpg`;
            }
          }
        }
      } else {
        throw new Error("Tipe file tidak didukung untuk konversi.");
      }
      console.log(`Mengunggah file: filename="${filename}", Content-Type="${contentType}"`);
      form.append("files", fileBuffer, {
        filename: filename,
        contentType: contentType
      });
      form.append("to_formats[]", toFormat);
      form.append("from_formats[]", fromFormat);
      form.append("pipeline", "standard");
      form.append("return_as_file", "false");
      form.append("include_images", "false");
      form.append("do_picture_classification", "false");
      form.append("do_picture_description", "false");
      form.append("image_export_mode", "placeholder");
      form.append("model", model);
      console.log("Mengirim permintaan konversi...");
      const response = await axios.post(`${this.baseURL}/v1/convert/file`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log("Konversi berhasil");
      return {
        reason: "success",
        result: response.data
      };
    } catch (error) {
      console.error("Error konversi file:", error.response ? JSON.stringify(error.response.data) : error.message);
      return {
        reason: "error",
        result: error.response?.data || error.message
      };
    }
  }
  async chat({
    prompt,
    media,
    model = "llama-free",
    messages = [],
    stream = false,
    ...rest
  }) {
    try {
      console.log("Mempersiapkan chat...");
      const promptData = await this.systemPrompt();
      if (!promptData) throw new Error("Gagal melanjutkan karena system prompt tidak tersedia.");
      const systemPromptContent = promptData.systemPrompt.replace("{MODEL_NAME}", model).replace("{CURRENT_DATETIME}", new Date().toLocaleString("id-ID")).replace("{USER_PREFERENCES}", "");
      const rulesContent = promptData.rules.replace("{LANGUAGE}", "Indonesia");
      const finalSystemContent = `<system>${systemPromptContent}\n${rulesContent}</system>`;
      const chatMessages = messages.length ? messages : [{
        role: "system",
        content: finalSystemContent
      }];
      let userContent = prompt;
      if (media) {
        console.log("Memproses media...");
        const conversionResult = await this.convertFile({
          file: media,
          model: rest.conversionModel || "docling"
        });
        if (conversionResult.reason === "success" && conversionResult.result?.document) {
          const {
            filename,
            md_content
          } = conversionResult.result.document;
          userContent = `${prompt}\n\nDocument title: ${filename}\nDocument contents:\n${md_content}`;
        } else {
          console.error("Gagal mengonversi media, melanjutkan dengan prompt teks saja.");
        }
      }
      chatMessages.push({
        role: "user",
        content: userContent
      });
      const payload = {
        model: model,
        messages: chatMessages,
        stream: stream,
        ...rest
      };
      console.log("Mengirim permintaan chat...");
      const response = await axios.post(`${this.baseURL}/v1/chat/completions`, payload, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          authorization: rest.authorization ? `Bearer ${rest.authorization}` : "Bearer"
        },
        responseType: stream ? "stream" : "json"
      });
      if (stream) {
        const streamResult = await this.parseStream(response);
        return {
          reason: "success",
          result: {
            content: streamResult.fullContent
          },
          id: streamResult.id
        };
      }
      return {
        reason: "success",
        result: response.data,
        id: response.data?.id
      };
    } catch (error) {
      console.error("Error chat:", error.response ? JSON.stringify(error.response.data) : error.message);
      return {
        reason: "error",
        result: error.response?.data || error.message
      };
    }
  }
  async parseStream(response) {
    return new Promise((resolve, reject) => {
      let fullContent = "",
        chatId = null;
      response.data.on("data", chunk => {
        const lines = chunk.toString().split("\n").filter(line => line.trim().startsWith("data: "));
        for (const line of lines) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") break;
          try {
            const data = JSON.parse(dataStr);
            chatId = data.id;
            const content = data.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              process.stdout.write(content);
            }
          } catch (e) {}
        }
      });
      response.data.on("end", () => resolve({
        fullContent: fullContent,
        id: chatId
      }));
      response.data.on("error", err => reject(err));
    });
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
    const api = new TinfoilAPI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}