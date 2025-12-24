import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class DraweverAPI {
  constructor() {
    this.baseUrl = "https://www.drawever.com/api/tools/queue";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
  }
  generateHeaders() {
    try {
      return {
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://www.drawever.com",
        referer: "https://www.drawever.com/ai/photo-to-anime",
        "user-agent": `Mozilla/5.0 (Linux; Android ${8 + Math.random() * 6}; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/${90 + Math.random() * 20}.0.0.0 Mobile Safari/537.36`,
        "sec-ch-ua": `"Chromium";v="${120 + Math.random() * 10}", "Not_A Brand";v="24"`,
        "sec-ch-ua-platform": '"Android"',
        "X-Forwarded-For": Array.from({
          length: 4
        }, () => Math.floor(Math.random() * 256)).join("."),
        path: "/ai/photo-to-anime"
      };
    } catch (error) {
      console.error("Error generating headers:", error.message);
      throw new Error("Header generation failed");
    }
  }
  async imageUrlToDataUri(url) {
    try {
      const {
        data
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return `data:image/jpeg;base64,${Buffer.from(data).toString("base64")}`;
    } catch (error) {
      console.error("Error converting image:", error.message);
      throw new Error("Failed to convert image");
    }
  }
  toBuffer(inputString) {
    const base64Data = inputString.startsWith("data:") ? inputString.split(",")[1] : inputString;
    return Buffer.from(base64Data, "base64");
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async convertImage({
    url,
    style = "anime",
    quality = "medium",
    strength = .4
  }) {
    try {
      const {
        data
      } = await axios.post(this.baseUrl, {
        image: await this.imageUrlToDataUri(url),
        style: style,
        quality: quality,
        strength: strength
      }, {
        headers: this.generateHeaders()
      });
      if (!data?.queueId) throw new Error("Failed to get queueId");
      console.log(`Queue ID: ${data.queueId}`);
      return await this.pollQueue(data.queueId);
    } catch (error) {
      console.error("Error in convertImage:", error.message);
      throw new Error("Image conversion failed");
    }
  }
  async pollQueue(queueId) {
    try {
      const pollingUrl = `${this.baseUrl}?queueId=${queueId}`;
      while (true) {
        const {
          data
        } = await axios.get(pollingUrl, {
          headers: this.generateHeaders()
        });
        console.log(`Queue ID: ${queueId}, Status: ${data.status}`);
        if (data?.output?.startsWith("data:image")) {
          const result = await this.uploadImage(this.toBuffer(data.output));
          console.log(`Queue ID: ${queueId}, Result: ${result}`);
          return {
            image: result,
            prompt: data.prompt
          };
        }
        await new Promise(res => setTimeout(res, 2e3));
      }
    } catch (error) {
      console.error("Error polling queue:", error.message);
      throw new Error("Polling failed");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const drawever = new DraweverAPI();
  try {
    const data = await drawever.convertImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}