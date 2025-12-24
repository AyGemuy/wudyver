import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class NanoImg {
  constructor() {
    this.baseURL = "https://nanoimg.com";
    this.headers = {
      accept: "text/x-component",
      "accept-language": "id-ID",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://nanoimg.com",
      referer: "https://nanoimg.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      ...SpoofHead()
    };
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Mulai proses generate...");
      let imageUrls = [];
      if (imageUrl) {
        console.log("Mode: Image to Image");
        const uploadedUrls = await this.uploadImages(imageUrl);
        imageUrls = uploadedUrls?.map(img => img.publicUrl) || [];
      } else {
        console.log("Mode: Text to Image");
      }
      const payload = [{
        prompt: prompt,
        imageUrls: imageUrls,
        numImages: rest.numImages || 1,
        outputFormat: rest.outputFormat || "jpeg",
        model: rest.model || "nano-banana",
        ...rest
      }];
      console.log("Payload:", JSON.stringify(payload, null, 2));
      const response = await axios.post(`${this.baseURL}/?utm_source=iuu`, payload, {
        headers: {
          ...this.headers,
          "next-action": "405ff8d311eab59118c2d634f6df681eed0f8a5ebc",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D"
        }
      });
      console.log("Response status:", response.status);
      const result = this.parseResponse(response.data);
      return result;
    } catch (error) {
      console.error("Error generate:", error.message);
      throw error;
    }
  }
  async uploadImages(imageUrl) {
    try {
      console.log("Upload gambar...");
      const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const uploadResults = [];
      for (const img of images) {
        console.log("Proses gambar:", img?.substring?.(0, 50) || "Buffer/Base64");
        const uploadData = await this.getUploadUrl();
        const publicUrl = uploadData?.publicUrl;
        if (publicUrl && uploadData?.url) {
          await this.putImage(uploadData.url, img);
          uploadResults.push({
            url: uploadData.url,
            publicUrl: publicUrl,
            objectKey: uploadData.objectKey
          });
        }
      }
      return uploadResults;
    } catch (error) {
      console.error("Error upload images:", error.message);
      throw error;
    }
  }
  async getUploadUrl() {
    try {
      console.log("Dapatkan URL upload...");
      const payload = [{
        key: `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.webp`,
        contentType: "image/webp"
      }];
      const response = await axios.post(`${this.baseURL}/?utm_source=iuu`, payload, {
        headers: {
          ...this.headers,
          "next-action": "405ff8d311eab59118c2d634f6df681eed0f8a5ebc",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D"
        }
      });
      const data = this.parseResponse(response.data);
      return data?.[0] || null;
    } catch (error) {
      console.error("Error get upload URL:", error.message);
      throw error;
    }
  }
  async putImage(uploadUrl, imageData) {
    try {
      console.log("Upload ke storage...");
      let imageBuffer;
      if (typeof imageData === "string") {
        if (imageData.startsWith("http")) {
          console.log("Download dari URL...");
          const response = await axios.get(imageData, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          imageBuffer = response.data;
        } else if (imageData.startsWith("data:")) {
          console.log("Decode base64...");
          const base64Data = imageData.split(",")[1] || imageData;
          imageBuffer = Buffer.from(base64Data, "base64");
        } else {
          throw new Error("Format image tidak didukung");
        }
      } else if (Buffer.isBuffer(imageData)) {
        imageBuffer = imageData;
      } else {
        throw new Error("Tipe data image tidak valid");
      }
      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          Accept: "*/*",
          "Content-Type": "image/webp",
          "Content-Length": imageBuffer.length,
          Origin: "https://nanoimg.com",
          Referer: "https://nanoimg.com/"
        },
        timeout: 3e4
      });
      console.log("Upload selesai");
    } catch (error) {
      console.error("Error put image:", error.message);
      throw error;
    }
  }
  parseResponse(data) {
    try {
      console.log("Parse response...");
      if (typeof data !== "string") return data;
      const lines = data.split("\n");
      const results = [];
      for (const line of lines) {
        const trimmedLine = line?.trim();
        if (trimmedLine) {
          try {
            const match = trimmedLine.match(/^\d+:(.+)$/);
            const jsonStr = match?.[1] || trimmedLine;
            const parsed = JSON.parse(jsonStr);
            if (parsed?.images || parsed?.generation) {
              return parsed;
            }
            results.push(parsed);
          } catch (e) {
            console.log("Skip line parsing:", trimmedLine?.substring?.(0, 100));
          }
        }
      }
      return results.length === 1 ? results[0] : results;
    } catch (error) {
      console.error("Error parse response:", error.message);
      return data;
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
  const api = new NanoImg();
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