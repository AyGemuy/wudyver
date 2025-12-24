import CryptoJS from "crypto-js";
import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class ImageGenerator {
  constructor() {
    this.secretKeyHex = "85d3f541b21d0a307566ae59bb49484d3cefcd9f56d42a3de6d965594b71a836";
    this.ivHex = "09e1612e1bb08c162a6654437f51e939";
    this.bearerTokenPayload = "1dca7ac0450ecefb7d8ba4e6357958489382e4744382db6102c1fad7d95d9780796801dd40c8c7ad5219fb870416eaf7af460beb2d0889656d83281261e2962c";
    this.generateCartoonUrl = "https://be.neuralframes.com/tools/generate_cartoon";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    console.log("ImageGenerator: Instance created.");
  }
  async generateBearerAuth() {
    console.log("ImageGenerator: Generating Bearer Authentication...");
    try {
      if (!this.secretKeyHex || !this.ivHex) {
        const error = new Error("Secret key/IV missing.");
        console.error("ImageGenerator: Error generating Bearer Authentication:", error);
        return error;
      }
      const token = `Bearer ${CryptoJS.AES.encrypt(this.bearerTokenPayload, CryptoJS.enc.Hex.parse(this.secretKeyHex), {
iv: CryptoJS.enc.Hex.parse(this.ivHex),
mode: CryptoJS.mode.CBC,
padding: CryptoJS.pad.Pkcs7
}).toString()}`;
      console.log("ImageGenerator: Bearer Authentication generated successfully.");
      return token;
    } catch (error) {
      console.error("ImageGenerator: Error during Bearer Authentication generation:", error);
      throw error;
    }
  }
  async getBase64FromUrl({
    url
  }) {
    console.log(`ImageGenerator: Fetching base64 from URL: ${url}`);
    try {
      const {
        data,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(data, "binary").toString("base64");
      const contentType = headers["content-type"];
      console.log(`ImageGenerator: Successfully fetched base64. Content type: ${contentType.substring(0, 20)}...`);
      return {
        base64: base64,
        contentType: contentType
      };
    } catch (error) {
      console.error(`ImageGenerator: Error fetching base64 from URL ${url}:`, error);
      throw error;
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
  async generate({
    imageUrl,
    styleUrl = "https://img.freepik.com/premium-photo/stock-photo-cute-animal_759095-65008.jpg?w=740",
    strength = .75
  }) {
    console.log(`ImageGenerator: Generating image with URL: ${imageUrl}, style URL: ${styleUrl}, strength: ${strength}`);
    try {
      const bearerToken = await this.generateBearerAuth();
      if (bearerToken instanceof Error) {
        return Promise.reject(bearerToken);
      }
      let base64Image = imageUrl;
      if (imageUrl?.startsWith("http") || imageUrl?.startsWith("https")) {
        const imageData = await this.getBase64FromUrl({
          url: imageUrl
        });
        base64Image = `data:${imageData.contentType};base64,${imageData.base64}`;
        console.log("ImageGenerator: Image URL converted to base64.");
      }
      console.log("ImageGenerator: Sending request to generate cartoon API...");
      const {
        data
      } = await axios.post(this.generateCartoonUrl, {
        image: base64Image,
        strength: strength,
        styleImage: styleUrl
      }, {
        headers: {
          accept: "application/json, text/plain, */*",
          acceptLanguage: "id-ID,id;q=0.9",
          authorization: bearerToken,
          cacheControl: "no-cache",
          contentType: "application/json",
          origin: "https://www.neuralframes.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.neuralframes.com/",
          secChUa: '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          secChUaMobile: "?1",
          secChUaPlatform: '"Android"',
          secFetchDest: "empty",
          secFetchMode: "cors",
          secFetchSite: "same-site",
          userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      console.log("ImageGenerator: Generate cartoon API response:", data);
      if (data?.success && data?.imageUrl?.startsWith("data:")) {
        console.log("ImageGenerator: Generated image is in base64 format, proceeding to upload.");
        return await this.uploadImage(this.toBuffer(data.imageUrl));
      } else if (data?.success && data?.imageUrl) {
        console.log("ImageGenerator: Generated image URL received (not base64).");
        return {
          generatedImageUrl: data.imageUrl,
          uploadResult: "Gambar dihasilkan (bukan base64), perlu diunggah terpisah."
        };
      } else {
        const error = "Gagal menghasilkan gambar dari API.";
        console.error("ImageGenerator: Error during image generation:", error, data);
        return Promise.reject(error);
      }
    } catch (error) {
      console.error("ImageGenerator: Error during the image generation process:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    if (!params.imageUrl) {
      return res.status(400).json({
        error: "imageUrl is required"
      });
    }
    const generator = new ImageGenerator();
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during image generation request",
      details: error.message || error
    });
  }
}