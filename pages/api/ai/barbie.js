import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import {
  createHash
} from "crypto";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing URL parameter"
    });
  }
  try {
    const result = await Barbie(url);
    res.setHeader("Content-Type", "image/jpeg");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).json({
      error: error.response ? error.response.data : error.message
    });
  }
}
async function Barbie(input) {
  try {
    const data = Buffer.isBuffer(input) ? input : Buffer.from((await axios.get(input, {
      responseType: "arraybuffer"
    })).data);
    const {
      ext,
      mime
    } = await fileTypeFromBuffer(data) || {
      ext: "jpg",
      mime: "image/jpg"
    };
    const filename = `${createHash("sha256").update(data).digest("hex")}.${ext}`;
    const formData = new FormData();
    formData.append("myfile", new Blob([data], {
      type: mime
    }), filename);
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
      Origin: "https://www.barbieselfie.ai",
      Referer: "https://www.barbieselfie.ai/intl/step/loading/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    };
    const response = await axios.post("https://www.barbieselfie.ai/api/upload.php", formData, {
      headers: headers,
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
    throw error;
  }
}