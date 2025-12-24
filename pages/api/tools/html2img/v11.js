import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class FileUploader {
  constructor() {
    this.apiUrl = "https://service5.coolutils.org/upload.php";
    this.convertUrl = "https://service5.coolutils.org/word_convert.php";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "multipart/form-data",
      origin: "https://www.coolutils.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.coolutils.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async convertHTMLToImage({
    html,
    output = "png"
  }) {
    try {
      const randomFileName = `content_${Math.random().toString(36).substring(2, 15)}.html`;
      const form = new FormData();
      const blob = new Blob([html], {
        type: "text/html"
      });
      form.append("userfile", blob, randomFileName);
      const response = await axios.post(this.apiUrl, form, {
        headers: {
          ...form.headers,
          ...this.headers
        }
      });
      if (response.data) {
        const srcfile = response.data;
        const convertResult = await this.convertFile(srcfile, output);
        if (convertResult) {
          const uploadResult = await this.uploadImage(convertResult);
          return uploadResult;
        } else {
          throw new Error("Conversion failed");
        }
      } else {
        throw new Error("No response data received from the first request");
      }
    } catch (error) {
      throw error;
    }
  }
  async convertFile(srcfile, output) {
    try {
      const convertForm = new URLSearchParams();
      convertForm.append("Flag", "6");
      convertForm.append("srcfile", srcfile);
      convertForm.append("Ref", "/online/DOC-to-JPG");
      convertForm.append("src", "0");
      convertForm.append("fmt", output);
      const response = await axios.post(this.convertUrl, convertForm, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded"
        },
        responseType: "arraybuffer"
      });
      if (response.data) {
        return Buffer.from(response.data);
      } else {
        throw new Error("Failed to convert file");
      }
    } catch (error) {
      throw error;
    }
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
      return uploadResponse.result;
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
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new FileUploader();
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