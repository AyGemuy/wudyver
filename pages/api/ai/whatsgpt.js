import axios from "axios";
import {
  createCipheriv
} from "crypto";
class GPTClient {
  constructor() {
    this.URL = "https://us-central1-pc-api-7572373447067384777-526.cloudfunctions.net/reply-on-chatGPT-android-app-v5/";
    this.APP_NAME = "WHATSGPT";
    this.BEARER_TOKEN = "Bearer hbfvcher4t7r5dtrfcgfcTFDTYRDdtre543R";
    this.AES_KEY_BASE64 = "amN4YnZoZGc2dHlkdHZmdDc2ZnR0eWZjSEhHNg==";
    this.MODELS = ["gpt-5-nano", "gpt-4o-mini", "gpt-4.1-nano", "gpt-4.1-mini"];
    const fullKey = Buffer.from(this.AES_KEY_BASE64, "base64");
    this.key = fullKey.subarray(0, 16);
    this.iv = Buffer.alloc(16, 0);
    console.log(`[LOG] Client diinisialisasi untuk URL: ${this.URL}`);
  }
  enc(plainText) {
    try {
      console.log("[LOG] Memulai enkripsi payload...");
      const cipher = createCipheriv("aes-128-cbc", this.key, this.iv);
      let encrypted = cipher.update(plainText, "utf8", "base64");
      encrypted += cipher.final("base64");
      console.log("[LOG] Enkripsi selesai.");
      return encrypted;
    } catch (error) {
      console.error("[ERROR] Gagal dalam enkripsi:", error.message);
      throw new Error("Encryption failed.");
    }
  }
  valMod(modelName) {
    if (!this.MODELS.includes(modelName)) {
      const validModels = this.MODELS.join(", ");
      console.error(`[ERROR] Model '${modelName}' tidak valid.`);
      throw new Error(`Invalid model. Use one of: ${validModels}`);
    }
  }
  bldReq({
    model,
    prompt,
    messages,
    temperature,
    max_tokens,
    max_completion_tokens
  }) {
    const msg = messages?.length ? messages : prompt ? [{
      role: "user",
      content: [{
        type: "text",
        text: prompt
      }]
    }] : [];
    const req = {
      model: model,
      messages: msg,
      stream: true
    };
    if (temperature !== undefined) req.temperature = temperature;
    if (max_tokens !== undefined) req.max_tokens = max_tokens;
    if (max_completion_tokens !== undefined) req.max_completion_tokens = max_completion_tokens;
    return req;
  }
  async chat({
    model,
    prompt,
    messages,
    temperature,
    max_tokens,
    max_completion_tokens,
    ...rest
  }) {
    const finalModel = model || this.MODELS[0] || "gpt-5-nano";
    this.valMod(finalModel);
    const reqModel = this.bldReq({
      model: finalModel,
      prompt: prompt,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens,
      max_completion_tokens: max_completion_tokens
    });
    const jsonStr = JSON.stringify(reqModel, null, 2);
    const cleanJsonStr = jsonStr.replace(/\[DONE\]/g, "");
    const encrypted = this.enc(cleanJsonStr);
    const finalBody = JSON.stringify(encrypted);
    console.log(`[LOG] Request Model: ${finalModel}`);
    if (temperature !== undefined) console.log(`[LOG] Temperature: ${temperature}`);
    if (max_tokens !== undefined) console.log(`[LOG] Max Tokens: ${max_tokens}`);
    if (max_completion_tokens !== undefined) console.log(`[LOG] Max Completion Tokens: ${max_completion_tokens}`);
    console.log(`[LOG] Final Body Size: ${finalBody.length} bytes`);
    let content = "";
    let id = null;
    let created = null;
    let finish_reason = null;
    let buffer = "";
    try {
      const response = await axios({
        method: "POST",
        url: this.URL,
        params: {
          "app-name": this.APP_NAME
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: this.BEARER_TOKEN,
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Build/TP1A.220624.014)"
        },
        data: finalBody,
        responseType: "stream",
        timeout: 0
      });
      console.log(`[LOG] Response Status: ${response.status} OK`);
      const stream = response.data;
      for await (const chunk of stream) {
        buffer += chunk.toString("utf8");
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line.startsWith("data: ")) {
            const jsonPart = line.substring(6).trim();
            if (jsonPart === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonPart);
              if (!id && data.id) {
                id = data.id;
                created = data.created;
              }
              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                content += delta.content;
              }
              if (data.choices?.[0]?.finish_reason) {
                finish_reason = data.choices[0].finish_reason;
              }
            } catch (e) {}
          }
        }
      }
      if (buffer.trim()) {
        const lines = buffer.trim().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonPart = line.substring(6).trim();
            if (jsonPart === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonPart);
              if (!id && data.id) {
                id = data.id;
                created = data.created;
              }
              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                content += delta.content;
              }
              if (data.choices?.[0]?.finish_reason) {
                finish_reason = data.choices[0].finish_reason;
              }
            } catch (e) {}
          }
        }
      }
      console.log(`\n[LOG] Streaming selesai. Total karakter: ${content.length}`);
      return {
        id: id,
        model: finalModel,
        created: created,
        content: content,
        finish_reason: finish_reason
      };
    } catch (err) {
      console.error("\n[ERROR] Request Gagal:");
      if (err.response) {
        const stream = err.response.data;
        let errorData = "";
        for await (const chunk of stream) {
          errorData += chunk.toString("utf8");
        }
        console.error(`[API] Status ${err.response.status}: ${errorData}`);
        throw new Error(`API Error ${err.response.status}.`);
      } else {
        console.error(`[NETWORK] ${err.message}`);
        throw new Error(`Network Error: ${err.message}`);
      }
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
  const api = new GPTClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}