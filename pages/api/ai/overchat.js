import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class OverchatAPI {
  constructor() {
    this.getRandomValues = crypto.getRandomValues.bind(crypto);
    this._SU = (t, n) => {
      let r = "";
      for (let e = 0; e < 16; e++) {
        const i = t[e];
        (n || e) && e % 4 === 0 && (r += "-");
        r += (i < 16 ? "0" : "") + i.toString(16);
      }
      return r;
    };
    this.getUuidV4 = n => {
      try {
        const t = new Uint8Array(16);
        this.getRandomValues(t);
        t[8] &= 63;
        t[8] |= 128;
        t[6] &= 15;
        t[6] |= 64;
        return this._SU(t, n);
      } catch (i) {
        return "";
      }
    };
    this.deviceUUID = this.getUuidV4();
    this.deviceVersion = "1.0.44";
    this.apiKey = "";
    this.baseURL = "https://widget-api.overchat.ai/v1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: `Bearer ${this.apiKey}`,
      "cache-control": "no-cache",
      origin: "https://widget.overchat.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://widget.overchat.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-device-language": "id-ID",
      "x-device-platform": "web",
      "x-device-uuid": this.deviceUUID,
      "x-device-version": this.deviceVersion,
      ...SpoofHead()
    };
    this.userId = null;
    this.personas = null;
  }
  async getId() {
    try {
      const response = await axios.get(`${this.baseURL}/auth/me`, {
        headers: this.headers
      });
      this.userId = response.data.id;
      return this.userId;
    } catch (error) {
      throw error;
    }
  }
  async getPersonas() {
    try {
      const response = await axios.get(`${this.baseURL}/personas`, {
        headers: this.headers
      });
      this.personas = response.data;
      return this.personas;
    } catch (error) {
      console.error("Gagal mengambil data personas:", error);
      throw error;
    }
  }
  async createId(personaId) {
    try {
      if (!this.userId) {
        await this.getId();
      }
      let finalPersonaId = personaId;
      if (!finalPersonaId) {
        if (!this.personas) {
          await this.getPersonas();
        }
        const defaultPersona = this.personas.find(p => p.isDefault) || this.personas[0];
        if (defaultPersona) {
          finalPersonaId = defaultPersona.id;
        } else {
          throw new Error("Tidak ada persona yang tersedia.");
        }
      }
      const response = await axios.post(`${this.baseURL}/chat/${this.userId}`, {
        personaId: finalPersonaId
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      return response.data.id;
    } catch (error) {
      throw error;
    }
  }
  async downloadImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"] || "application/octet-stream";
      const filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
      return {
        buffer: Buffer.from(response.data),
        filename: filename,
        contentType: contentType
      };
    } catch (error) {
      throw new Error(`Gagal mengunduh gambar dari URL: ${imageUrl}, Error: ${error.message}`);
    }
  }
  async uploadImage(fileBuffer, filename, contentType = "image/png") {
    try {
      const formData = new FormData();
      formData.append("file", fileBuffer, {
        filename: filename,
        contentType: contentType
      });
      const response = await axios.post(`${this.baseURL}/chat/upload`, formData, {
        headers: {
          ...this.headers,
          "content-type": `multipart/form-data; boundary=${formData._boundary}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error saat mengunggah gambar:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async chat({
    chatId,
    prompt,
    messages,
    model,
    personaId,
    mode = "chat",
    frequency_penalty = 0,
    max_tokens = 2048,
    presence_penalty = 0,
    stream = false,
    temperature = .5,
    top_p = .95,
    imageUrl,
    imageUrls = [],
    endpointType = "thread",
    ...rest
  }) {
    try {
      if (!this.userId) {
        await this.getId();
      }
      if (!this.personas) {
        await this.getPersonas();
      }
      let selectedPersona = null;
      if (personaId) {
        selectedPersona = this.personas.find(p => p.id === personaId);
      } else if (model) {
        selectedPersona = this.personas.find(p => p.model === model);
      } else {
        selectedPersona = this.personas.find(p => p.isDefault) || this.personas[0];
      }
      if (!selectedPersona) {
        throw new Error("Tidak dapat menemukan persona yang cocok. Coba tentukan personaId atau model yang valid.");
      }
      const finalModel = model || selectedPersona.model;
      const finalPersonaId = personaId || selectedPersona.id;
      let requestEndpoint = "";
      let requestData = {};
      let isImageMode = mode.toLowerCase() === "image";
      if (isImageMode) {
        if (!prompt) {
          throw new Error("Prompt diperlukan untuk membuat gambar.");
        }
        requestEndpoint = `${this.baseURL}/images/generations`;
        requestData = {
          chatId: chatId,
          prompt: prompt,
          model: finalModel || "alibaba/qwen-image",
          personaId: finalPersonaId || "qwen-image",
          ...rest
        };
      } else {
        requestEndpoint = endpointType === "thread" ? `${this.baseURL}/chat/thread` : `${this.baseURL}/chat/completions`;
        requestData = {
          model: finalModel,
          personaId: finalPersonaId,
          frequency_penalty: frequency_penalty,
          max_tokens: max_tokens,
          presence_penalty: presence_penalty,
          stream: stream,
          temperature: temperature,
          top_p: top_p,
          ...rest
        };
        const allImageUrls = [];
        if (typeof imageUrl === "string" && imageUrl) allImageUrls.push(imageUrl);
        if (Array.isArray(imageUrls) && imageUrls.length > 0) allImageUrls.push(...imageUrls);
        let uploadedFilesInfo = [];
        let messageLinks = [];
        if (allImageUrls.length > 0) {
          if (endpointType === "completions") {
            console.warn("Peringatan: Unggahan gambar tidak didukung untuk endpoint 'completions' dan akan diabaikan.");
          } else {
            for (const url of allImageUrls) {
              const downloadedFile = await this.downloadImage(url);
              const uploadResult = await this.uploadImage(downloadedFile.buffer, downloadedFile.filename, downloadedFile.contentType);
              uploadedFilesInfo.push({
                path: downloadedFile.filename,
                link: uploadResult.link,
                croppedImageLink: uploadResult.croppedImageLink
              });
              messageLinks.push(uploadResult.link);
            }
          }
        }
        if (prompt) {
          requestData.messages = [{
            id: crypto.randomUUID(),
            role: "user",
            content: prompt
          }];
          if (endpointType === "thread" && uploadedFilesInfo.length > 0) {
            requestData.messages[0].metadata = {
              files: uploadedFilesInfo
            };
          }
        } else if (messages) {
          requestData.messages = messages.map(msg => ({
            ...msg,
            id: msg.id || crypto.randomUUID()
          }));
          if (endpointType === "thread" && uploadedFilesInfo.length > 0) {
            const lastUserMessageIndex = requestData.messages.findLastIndex(msg => msg.role === "user");
            if (lastUserMessageIndex !== -1) {
              if (!requestData.messages[lastUserMessageIndex].metadata) requestData.messages[lastUserMessageIndex].metadata = {};
              if (!requestData.messages[lastUserMessageIndex].metadata.files) requestData.messages[lastUserMessageIndex].metadata.files = [];
              requestData.messages[lastUserMessageIndex].metadata.files.push(...uploadedFilesInfo);
            }
          }
        } else {
          throw new Error("Anda harus menyediakan 'prompt', array 'messages', atau 'imageUrl(s)'.");
        }
        if (endpointType === "thread") {
          let currentChatId = chatId;
          if (!currentChatId) {
            currentChatId = await this.createId(finalPersonaId);
          }
          requestData.chatId = currentChatId;
          if (messageLinks.length > 0) {
            requestData.links = messageLinks;
          }
        }
      }
      const response = await axios.post(requestEndpoint, requestData, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      return isImageMode ? response.data : this.processChatResponse(response.data);
    } catch (error) {
      console.error("Error dalam fungsi chat:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  processChatResponse(responseString) {
    if (typeof responseString !== "string") {
      return responseString;
    }
    const lines = responseString.trim().split("\n");
    const result = {
      result: "",
      array: []
    };
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          const dataJson = line.substring(5).trim();
          if (dataJson === "[DONE]") {
            break;
          }
          const data = JSON.parse(dataJson);
          if (data?.choices?.[0]?.delta?.content) {
            result.result += data.choices[0].delta.content;
            result.array.push(data.choices[0].delta.content);
          }
        } catch (parseError) {
          console.error("Gagal mem-parsing data streaming:", parseError, line);
        }
      }
    }
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Paramenter 'prompt' diperlukan."
    });
  }
  try {
    const overchat = new OverchatAPI();
    const result = await overchat.chat(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("API Handler Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}