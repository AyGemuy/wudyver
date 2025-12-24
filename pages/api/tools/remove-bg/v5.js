import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class ImageRemover {
  constructor() {
    this.base = "https://removal.ai";
    this.remove = "https://api.removal.ai";
    this.cookieJar = new CookieJar();
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        connection: "keep-alive",
        pragma: "no-cache",
        referer: `${this.base}/upload/`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...SpoofHead()
      },
      jar: this.cookieJar,
      withCredentials: true
    });
    this.securityToken = null;
  }
  async fetchSecurityToken() {
    try {
      const response = await this.client.get("/upload/");
      const htmlContent = response.data;
      const scriptTagMatch = htmlContent.match(/<script.*?id="upload-script-js-extra">([\s\S]*?)<\/script>/i)?.[1];
      const jsonMatch = scriptTagMatch?.match(/var ajax_upload_object = (\{[\s\S]*?\});/)?.[1];
      const parsedObject = jsonMatch ? JSON.parse(jsonMatch) : {};
      this.securityToken = parsedObject.security;
      if (this.securityToken) {
        console.log("Security Token:", this.securityToken);
        return this.securityToken;
      } else {
        throw new Error("Security token not found in the upload page.");
      }
    } catch (error) {
      console.error("Error fetching security token:", error);
      throw error;
    }
  }
  async getWebToken() {
    if (!this.securityToken) {
      await this.fetchSecurityToken();
    }
    try {
      const response = await this.client.get(`/wp-admin/admin-ajax.php?action=ajax_get_webtoken&security=${this.securityToken}`);
      const {
        success,
        data
      } = response.data;
      if (success && data.webtoken) {
        console.log("Web Token:", data.webtoken);
        return data.webtoken;
      } else {
        throw new Error("Failed to get web token");
      }
    } catch (error) {
      console.error("Error getting web token:", error);
      throw error;
    }
  }
  async removeImage({
    imageUrl
  }) {
    try {
      const webToken = await this.getWebToken();
      const {
        blob,
        contentType
      } = await this.fetchImageBlob(imageUrl);
      const formData = new FormData();
      const fileExtension = contentType.split("/")[1] || "jpg";
      formData.append("image_file", blob, `image.${fileExtension}`);
      const response = await axios.post(`${this.remove}/3.0/remove`, formData, {
        headers: {
          "content-type": `multipart/form-data; boundary=${formData.boundary}`,
          "web-token": webToken,
          origin: this.base,
          priority: "u=1, i",
          ...formData.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error removing image:", error);
      throw error;
    }
  }
  async fetchImageBlob(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"] || "image/jpg";
      return {
        blob: new Blob([buffer], {
          type: contentType
        }),
        contentType: contentType
      };
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const remover = new ImageRemover();
    const result = await remover.removeImage(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}