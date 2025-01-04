import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const buffer = Buffer.from(response.data);
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType || fileType.mime.split("/")[0] !== "audio") {
      return res.status(400).json({
        error: "The provided URL does not contain a valid audio file"
      });
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
    return res.status(200).json({
      result: apiResponse.data
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data
      });
    }
    return res.status(500).json({
      error: error.message
    });
  }
}