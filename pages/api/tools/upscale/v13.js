import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class PicsartAI {
  constructor() {
    this.enhanceUrl = "https://ai.picsart.com/gw1/enhancement/v0319/pipeline";
    this.uploadUrl = "https://upload.picsart.com/files";
    this.headers = {};
  }
  async getBearerToken() {
    try {
      const {
        data
      } = await axios.get("https://picsart.com/static/baseStore-DNtjyPkn-ADdGwXSr.js");
      const token = data.match(/Bearer\s+([A-Za-z0-9\-_\.]+)/)?.[1];
      if (!token) throw new Error("Token not found");
      this.headers = {
        "x-app-authorization": "Bearer " + token
      };
    } catch (error) {
      console.error("Error fetching Bearer token:", error);
      throw new Error("Failed to retrieve token");
    }
  }
  async uploadFile(imageUrl, type = "web-editor", url = "", metainfo = "") {
    try {
      const {
        data
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const form = new FormData();
      form.append("type", type);
      form.append("file", new Blob([data], {
        type: "image/png"
      }), "image.png");
      form.append("url", url);
      form.append("metainfo", metainfo);
      return (await axios.post(this.uploadUrl, form, {
        headers: this.headers
      })).data;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("File upload failed");
    }
  }
  async enhanceImage(params) {
    try {
      await this.getBearerToken();
      const query = new URLSearchParams({
        picsart_cdn_url: params.url,
        format: params.format || "PNG",
        model: params.model || "REALESERGAN"
      });
      const data = {
        sharp: {
          enabled: params.sharp || false,
          threshold: params.threshold || 5,
          kernel_size: params.kernel_size || 3,
          sigma: params.sigma || 1,
          amount: params.amount || 1
        },
        upscale: {
          enabled: params.upscale || true,
          target_scale: params.target_scale,
          units: params.units || "pixels",
          node: params.node_upscale || "esrgan"
        },
        face_enhancement: {
          enabled: params.face_enhancement || true,
          blending: params.blending || 1,
          max_faces: params.max_faces || 1e3,
          impression: params.impression || false,
          gfpgan: params.gfpgan || true,
          node: params.node_face_enhancement || "ada"
        },
        get_y: {
          enabled: params.get_y || true,
          get_y_channel: params.get_y_channel || false
        }
      };
      const response = await axios.post(`${this.enhanceUrl}?${query}`, data, {
        headers: {
          "Content-Type": "application/json",
          ...this.headers
        }
      });
      if (response.data?.status === "ACCEPTED") return this.pollEnhancement(response.data.transaction_id);
      throw new Error("Enhancement request not accepted");
    } catch (error) {
      console.error("Error enhancing image:", error);
      throw new Error("Image enhancement failed");
    }
  }
  async pollEnhancement(transactionId) {
    try {
      const pollUrl = `${this.enhanceUrl}/${transactionId}`;
      while (true) {
        const {
          data
        } = await axios.get(pollUrl, {
          headers: this.headers
        });
        if (data?.status === "DONE") return data;
        await new Promise(res => setTimeout(res, 5e3));
      }
    } catch (error) {
      console.error("Error polling enhancement:", error);
      throw new Error("Polling failed");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    error: "Missing url in request"
  });
  const picsart = new PicsartAI();
  try {
    const uploadResult = await picsart.uploadFile(params.url);
    const enhancedImage = await picsart.enhanceImage({
      ...params,
      url: uploadResult.result.url
    });
    return res.status(200).json(enhancedImage);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      error: error.message
    });
  }
}