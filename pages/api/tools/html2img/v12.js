import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  v4 as uuidv4
} from "uuid";
class GroupDocsConverter {
  constructor() {
    this.tokenUrl = "https://app-widgets-y1390q5d.k8s.dynabic.com/api/groupdocs/token";
    this.uploadUrl = "https://api.groupdocs.cloud/v2.0/conversion/storage/file/";
    this.conversionUrl = "https://api.groupdocs.cloud/v2.0/conversion";
    this.finalUploadUrl = "https://i.supa.codes/api/upload";
    this.clientId = "339d3302-096e-420c-968f-c07d32dafe7f";
    this.clientSecret = "db03dc4ebb489f2b9817780f57da7106";
    this.authToken = null;
    this.authHeader = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`;
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://app-widgets-y1390q5d.k8s.dynabic.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://app-widgets-y1390q5d.k8s.dynabic.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.fileName = null;
  }
  genName() {
    this.fileName = `temp_${uuidv4()}.html`;
  }
  async getToken() {
    this.genName();
    try {
      const response = await axios.post(this.tokenUrl, "grant_type=client_credentials", {
        headers: {
          ...this.defaultHeaders,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Authorization: this.authHeader,
          "sec-fetch-site": "cross-site"
        }
      });
      this.authToken = response.data.access_token;
      return this.authToken;
    } catch (error) {
      console.error("Error getting token:", error);
      throw error;
    }
  }
  async uploadHtml(htmlString) {
    if (!this.authToken) {
      await this.getToken();
    }
    try {
      const formData = new FormData();
      const blob = new Blob([Buffer.from(htmlString)], {
        type: "text/html"
      });
      formData.append("File", blob, this.fileName);
      const response = await axios.put(this.uploadUrl + this.fileName, formData, {
        headers: {
          ...this.defaultHeaders,
          ...formData.headers,
          Authorization: `Bearer ${this.authToken}`,
          "sec-fetch-site": "cross-site"
        }
      });
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error("Error uploading HTML:", error);
      throw error;
    }
  }
  async convertHtmlToPng() {
    if (!this.authToken) {
      await this.getToken();
    }
    try {
      const requestData = {
        FilePath: this.fileName,
        Format: "png",
        OutputPath: "ConvertedFiles"
      };
      const response = await axios.post(this.conversionUrl, requestData, {
        headers: {
          ...this.defaultHeaders,
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
          "sec-fetch-site": "cross-site"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during conversion:", error);
      throw error;
    }
  }
  async downloadImage(imageUrl) {
    if (!this.authToken) {
      await this.getToken();
    }
    try {
      const response = await axios.get(imageUrl, {
        headers: {
          Authorization: `Bearer ${this.authToken}`
        },
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error downloading image:", error);
      throw error;
    }
  }
  async uploadImageToSupaCodes(buffer) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer]), "converted-image.png");
      const uploadResponse = await axios.post(this.finalUploadUrl, formData, {
        headers: {
          ...formData.headers
        }
      });
      if (!uploadResponse.data?.link) throw new Error("Upload to supa.codes failed");
      return uploadResponse.data.link;
    } catch (error) {
      console.error("Error uploading to supa.codes:", error);
      throw error;
    }
  }
  async convertHTMLToImage({
    html
  }) {
    try {
      await this.getToken();
      this.genName();
      const uploadSuccess = await this.uploadHtml(html);
      if (!uploadSuccess) {
        throw new Error("HTML upload failed.");
      }
      const conversionResult = await this.convertHtmlToPng();
      if (conversionResult && conversionResult.length > 0 && conversionResult[0].url) {
        const imageUrl = conversionResult[0].url;
        const imageBuffer = await this.downloadImage(imageUrl);
        const uploadedImageUrl = await this.uploadImageToSupaCodes(imageBuffer);
        console.log("Image uploaded to supa.codes:", uploadedImageUrl);
        return uploadedImageUrl;
      } else {
        throw new Error("Conversion failed or no image URL found in response.");
      }
    } catch (error) {
      console.error("Error processing HTML to PNG and uploading:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new GroupDocsConverter();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}