import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import axios from "axios";
const KEY = Buffer.from("KgACJju0JScxBvlP", "latin1");
const IV = Buffer.from("wmozBgboU9HRzWG6", "latin1");
const tokenSign = (data, timestamp) => {
  const input = data + timestamp;
  const cipher = crypto.createCipheriv("aes-128-cbc", KEY, IV);
  const encrypted = cipher.update(input, "utf8", "hex") + cipher.final("hex");
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `${encrypted}.${hash}`;
};
const fetchImageBuffer = async url => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to fetch image from URL: ${error.message}`);
  }
};
const request = async (endpoint, data, headers = {}) => {
  try {
    const response = await axios.post(`https://ai-api.free-videoconverter.net/v4/sr/${endpoint}`, data, {
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Postify/1.0.0"
      },
      timeout: 6e4
    });
    return response.data;
  } catch (error) {
    throw new Error(`${endpoint}: ${error.message}`);
  }
};
const processImage = async (imageUrl, scale) => {
  const fileData = await fetchImageBuffer(imageUrl);
  const imgmd5 = crypto.createHash("md5").update(fileData).digest("hex");
  const fileType = await fileTypeFromBuffer(fileData);
  const fileName = `${uuidv4()}.${fileType?.ext || "jpg"}`;
  const blob = new Blob([fileData], {
    type: fileType?.mime || "image/jpeg"
  });
  const formData = new FormData();
  formData.set("img", blob, fileName);
  formData.set("name", fileName);
  formData.set("sign", tokenSign(fileName, Date.now()));
  const uploadRes = await request("upload", formData);
  const progressRes = await request("status", {
    code: uploadRes.token
  });
  if (progressRes.status !== "201") {
    const finalRes = await request("sr", {
      imgmd5: imgmd5,
      scale: scale,
      sign: tokenSign(imgmd5 + scale, Date.now())
    });
    return finalRes;
  }
  throw new Error("Image processing is still in progress.");
};
export default async function handler(req, res) {
  try {
    const {
      imageUrl,
      scale
    } = req.method === "GET" ? req.query : req.body;
    if (!imageUrl || !scale) {
      return res.status(400).json({
        error: "Missing required parameters: imageUrl or scale"
      });
    }
    const result = await processImage(imageUrl, parseInt(scale, 10));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}