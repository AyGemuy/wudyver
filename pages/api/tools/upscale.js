import axios from "axios";
import sizeOf from "image-size";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
class Upscale {
  availableScales = [2, 4, 6, 8, 16];
  async upscaleV1(mediaURL) {
    try {
      const imageBase64 = await this.fetchImageBase64(mediaURL);
      const response = await axios.post("https://lexica.qewertyy.dev/upscale", {
        image_data: imageBase64,
        format: "binary",
        model_id: 37
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.error("UpscaleV1 Error:", error);
      return null;
    }
  }
  async upscaleV4(mediaURL, scale) {
    try {
      const imageBuffer = await this.fetchImageBuffer(mediaURL);
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(imageBuffer) || {
        ext: "jpg",
        mime: "image/jpeg"
      };
      const blob = new Blob([imageBuffer], {
        type: mime
      });
      const data = new FormData();
      data.append("image", blob, `image.${ext}`);
      data.append("scale", String(scale));
      const response = await axios.post("https://api2.pixelcut.app/image/upscale/v1", data, {
        headers: {
          Accept: "application/json",
          "User-Agent": `Mozilla/5.0 ${Date.now()}`,
          Referer: "https://pixelcut.app/"
        }
      });
      return response.data.result_url;
    } catch (error) {
      console.error("UpscaleV4 Error:", error);
      return null;
    }
  }
  async upscaleV5(mediaURL, scale = 2, level = "None") {
    try {
      const imageBuffer = await this.fetchImageBuffer(mediaURL);
      const fileType = await fileTypeFromBuffer(imageBuffer);
      const mimeType = fileType?.mime || "image/jpeg";
      const dimensions = sizeOf(imageBuffer);
      const formData = new FormData();
      formData.append("image_file", new Blob([imageBuffer], {
        type: mimeType
      }), `image.${fileType?.ext || "jpg"}`);
      formData.append("desiredHeight", dimensions.height * scale);
      formData.append("desiredWidth", dimensions.width * scale);
      formData.append("outputFormat", "png");
      formData.append("compressionLevel", level || "None");
      const res = await axios.post("https://api.upscalepics.com/upscale-to-size", formData, {
        headers: {
          Accept: "application/json",
          Origin: "https://upscalepics.com",
          Referer: "https://upscalepics.com/"
        }
      });
      return res.data.bgRemoved;
    } catch (error) {
      console.error("UpscaleV5 Error:", error);
      return null;
    }
  }
  async upscaleV6(mediaURL) {
    try {
      const imageBuffer = await this.fetchImageBuffer(mediaURL);
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(imageBuffer) || {
        ext: "jpg",
        mime: "image/jpeg"
      };
      const blob = new Blob([imageBuffer], {
        type: mime
      });
      const data = new FormData();
      data.append("image", blob, `image.${ext}`);
      const response = await axios.post("https://pixgen.pro:8002/api/utils/upload_image", data, {
        headers: {
          Accept: "application/json",
          "User-Agent": `Mozilla/5.0 ${Date.now()}`,
          Referer: "https://pixgen.pro/"
        }
      });
      return response.data.image_url;
    } catch (error) {
      console.error("UpscaleV6 Error:", error);
      return null;
    }
  }
  async fetchImageBase64(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data).toString("base64");
    } catch (error) {
      console.error("FetchImageBase64 Error:", error);
      return null;
    }
  }
  async fetchImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("FetchImageBuffer Error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    provider = 2,
    scale = 2,
    level
  } = req.method === "GET" ? req.query : req.body;
  const upscale = new Upscale();
  if (!url || !provider) {
    return res.status(400).json({
      error: "URL and provider are required"
    });
  }
  try {
    let result;
    switch (parseInt(provider, 10)) {
      case 1:
        result = await upscale.upscaleV1(url);
        break;
      case 4:
        result = await upscale.upscaleV4(url, scale);
        break;
      case 5:
        result = await upscale.upscaleV5(url, scale, level || "None");
        break;
      case 6:
        result = await upscale.upscaleV6(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid provider specified"
        });
    }
    if (!result) {
      return res.status(500).json({
        error: "Failed to upscale the image"
      });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error"
    });
  }
}