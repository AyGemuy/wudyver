import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageUploader {
  constructor() {
    this.uploadUrl = "https://i.supa.codes/api/upload";
  }
  async uploadImage(buffer) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer]), "image.png");
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      if (!uploadResponse) throw new Error("Upload failed");
      return uploadResponse;
    } catch (error) {
      throw new Error("Error uploading image: " + error.message);
    }
  }
  async generate({
    prompt,
    size = "1024x1024",
    ratio = "1:1"
  }) {
    const payload = {
      prompt: prompt,
      size: size,
      aspectRatio: ratio
    };
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://ghiblichatgpt.net",
      referer: "https://ghiblichatgpt.net/generateimage",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    try {
      const response = await axios.post("https://ghiblichatgpt.net/api/replicate/image", payload, {
        headers: headers
      });
      if (!response.data || !response.data.images || !response.data.images[0].uint8ArrayData) {
        throw new Error("Invalid response data.");
      }
      const imageBuffer = this.convertToBuffer(response.data.images[0].uint8ArrayData);
      const uploadResponse = await this.uploadImage(imageBuffer);
      return uploadResponse;
    } catch (error) {
      throw new Error("Error generating or uploading image: " + error.message);
    }
  }
  convertToBuffer(uint8ArrayData) {
    const byteArray = new Uint8Array(Object.values(uint8ArrayData));
    return Buffer.from(byteArray);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const uploader = new ImageUploader();
  try {
    const data = await uploader.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}