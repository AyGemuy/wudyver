import axios from "axios";
import {
  randomBytes
} from "crypto";
class TemplateNetAI {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://www.template.net",
      priority: "u=1, i",
      referer: "https://www.template.net/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    mode = "chat",
    prompt,
    imageUrl,
    messages,
    stream = false,
    ...rest
  }) {
    try {
      console.log(`[TemplateNetAI] Starting process mode: ${mode}`);
      let finalFileUrl = null;
      if (imageUrl) {
        console.log("[TemplateNetAI] Image detected, processing upload...");
        finalFileUrl = await this.processUpload(imageUrl);
        console.log(`[TemplateNetAI] Image ready: ${finalFileUrl}`);
      }
      const result = mode === "image" ? await this.reqImage(prompt, rest) : await this.reqChat(prompt, finalFileUrl, messages, stream);
      console.log(`[TemplateNetAI] Process ${mode} completed successfully.`);
      return result;
    } catch (error) {
      console.error("[TemplateNetAI] Error:", error?.message || error);
      return {
        status: false,
        error: error?.response?.data || error?.message
      };
    }
  }
  async processUpload(input) {
    try {
      let bufferData;
      let contentType = "image/jpeg";
      if (Buffer.isBuffer(input)) {
        bufferData = input;
      } else if (typeof input === "string" && input.startsWith("data:")) {
        const matches = input.match(/^data:(.+);base64,(.+)$/);
        contentType = matches?.[1] || "image/jpeg";
        bufferData = Buffer.from(matches?.[2], "base64");
      } else if (typeof input === "string" && input.startsWith("http")) {
        return input;
      } else {
        throw new Error("Invalid imageUrl format. Must be Buffer, Base64, or URL.");
      }
      const nameFile = `tOvf${Date.now()}${randomBytes(4).toString("hex")}`;
      console.log(`[TemplateNetAI] Requesting pre-signed URL for ${nameFile}...`);
      const preSignedRes = await axios.get(`https://msapi.template.net/image/upload/pre-signed-for-guest`, {
        params: {
          nameFile: nameFile
        },
        headers: {
          ...this.headers,
          "content-type": contentType
        }
      });
      const uploadUrl = preSignedRes?.data?.url;
      if (!uploadUrl) throw new Error("Failed to get upload URL");
      console.log("[TemplateNetAI] Uploading raw data to S3...");
      await axios.put(uploadUrl, bufferData, {
        headers: {
          "Content-Type": contentType
        }
      });
      const cleanUrl = uploadUrl.split("?")[0];
      const cdnUrl = cleanUrl.replace("editors-upload.s3.amazonaws.com", "editors-cdn.template.net");
      return cdnUrl;
    } catch (e) {
      console.error("[TemplateNetAI] Upload failed:", e?.message);
      throw e;
    }
  }
  async reqChat(prompt, fileUrl, messages, stream) {
    const url = "https://ai-tool-service.template.net/api/v1/open-ai/chat-content";
    const defaultHistory = [{
      role: "user",
      content: [{
        type: "input_text",
        text: "user selected tool: ai-photo-generator"
      }]
    }];
    const history_blocks = messages?.length ? messages : [...defaultHistory, ...prompt ? [{
      role: "user",
      content: [{
        type: "input_text",
        text: prompt
      }]
    }] : []];
    const payload = {
      prompt: prompt || "Describe this",
      history_blocks: history_blocks,
      stream: stream || false,
      send_developer_messages: true,
      response_format: "html",
      ...fileUrl && {
        fileUrl: fileUrl
      }
    };
    console.log("[TemplateNetAI] Sending Chat Payload...");
    const response = await axios.post(url, payload, {
      headers: {
        ...this.headers,
        "content-type": "application/json"
      },
      responseType: stream ? "stream" : "json"
    });
    return stream ? response.data : response.data;
  }
  async reqImage(prompt, options) {
    const url = "https://ai-tool-service.template.net/api/v9/image/generator";
    const enhancedPrompt = `Ultra-realistic, high-resolution photo of [${prompt}] . Natural lighting, true-to-life colors, accurate proportions, and fine detail.`;
    const payload = {
      instances: [{
        prompt: enhancedPrompt
      }],
      parameters: {
        sampleCount: options?.sampleCount || 1,
        aspectRatio: options?.aspectRatio || "3:4",
        ...options
      }
    };
    console.log("[TemplateNetAI] Sending Image Gen Payload...");
    const response = await axios.post(url, payload, {
      headers: {
        ...this.headers,
        "content-type": "application/json"
      }
    });
    return response?.data || {};
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new TemplateNetAI();
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