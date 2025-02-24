import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageEnhancer {
  constructor() {
    this.url = "https://ai.picsart.com/gw1/enhancement/v0319/pipeline";
    this.headers = {};
  }
  async getBearerToken() {
    try {
      const {
        data
      } = await axios.get("https://picsart.com/static/baseStore-DNtjyPkn-ADdGwXSr.js");
      const match = data.match(/Bearer\s+([A-Za-z0-9\-_\.]+)/);
      const token = match ? match[1] : null;
      this.headers = {
        "x-app-authorization": "Bearer " + token
      };
    } catch (error) {
      console.error("Error fetching the Bearer token:", error);
    }
  }
  async enhanceImage(picsartCdnUrl) {
    await this.getBearerToken();
    const params = new URLSearchParams({
      picsart_cdn_url: picsartCdnUrl,
      format: "PNG",
      model: "REALESERGAN"
    });
    const data = {
      sharp: {
        enabled: false,
        threshold: 5,
        kernel_size: 3,
        sigma: 1,
        amount: 1
      },
      upscale: {
        enabled: true,
        target_scale: 4,
        units: "pixels",
        node: "esrgan"
      },
      face_enhancement: {
        enabled: true,
        blending: 1,
        max_faces: 1e3,
        impression: false,
        gfpgan: true,
        node: "ada"
      },
      get_y: {
        enabled: false,
        get_y_channel: false
      }
    };
    try {
      const response = await axios.post(`${this.url}?${params}`, data, {
        headers: {
          "Content-Type": "application/json",
          ...this.headers
        }
      });
      if (response.data?.status === "ACCEPTED") {
        return await this.pollEnhancement(response.data.transaction_id);
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
  async pollEnhancement(transactionId) {
    const pollUrl = `${this.url}/${transactionId}`;
    while (true) {
      try {
        const response = await axios.get(pollUrl, {
          headers: this.headers
        });
        if (response.data?.status === "DONE") {
          return response.data;
        }
      } catch (error) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 5e3));
    }
  }
}
class FileUploader {
  constructor() {
    this.url = "https://upload.picsart.com/files";
  }
  async uploadFile(imageUrl, type = "web-editor", url = "", metainfo = "") {
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBlob = new Blob([imageResponse.data], {
        type: "image/png"
      });
      const form = new FormData();
      form.append("type", type);
      form.append("file", imageBlob, "image.png");
      form.append("url", url);
      form.append("metainfo", metainfo);
      const uploadResponse = await axios.post(this.url, form, {
        headers: this.headers
      });
      return uploadResponse.data;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing url in request"
    });
  }
  const uploader = new FileUploader();
  const enhancer = new ImageEnhancer();
  try {
    const result = await uploader.uploadFile(url);
    const enhancedImageUrl = await enhancer.enhanceImage(result.result.url);
    return res.status(200).json(enhancedImageUrl);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}