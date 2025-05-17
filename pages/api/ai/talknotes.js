import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
class ApiClient {
  async processAudioUrl(url) {
    if (!url) {
      throw new Error("URL parameter is required");
    }
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || fileType.mime.split("/")[0] !== "audio") {
        throw new Error("The provided URL does not contain a valid audio file");
      }
      const blob = new Blob([buffer], {
        type: fileType.mime
      });
      const formData = new FormData();
      formData.append("file", blob, "audio." + fileType.ext);
      const apiResponse = await axios.post("https://api.talknotes.io/tools/converter", formData, {
        headers: {
          authority: "api.talknotes.io",
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br",
          origin: "https://talknotes.io",
          referer: "https://talknotes.io/",
          "User-Agent": "Postify/1.0.0"
        },
        maxBodyLength: Infinity
      });
      return {
        result: apiResponse.data
      };
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        data: {
          error: error.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  const apiClient = new ApiClient();
  try {
    const result = await apiClient.processAudioUrl(url);
    return res.status(200).json(result);
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && "data" in error) {
      return res.status(error.status).json(error.data);
    }
    return res.status(500).json({
      error: "An unexpected error occurred"
    });
  }
}