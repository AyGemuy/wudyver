import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
const headers = {
  accept: "*/*",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
  "cache-control": "no-cache",
  origin: "https://ai.animedb.cn",
  pragma: "no-cache",
  referer: "https://ai.animedb.cn/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36"
};
export default async function handler(req, res) {
  const {
    force_one,
    model,
    ai_detect,
    is_multi,
    imageUrl
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    const buffer = Buffer.from(imageResponse.data);
    const {
      ext
    } = await fileTypeFromBuffer(buffer);
    if (!ext) {
      return res.status(400).json({
        error: "Unsupported image format"
      });
    }
    const formData = new FormData();
    const blob = new Blob([buffer], {
      type: `image/${ext}`
    });
    formData.append("image", blob, `image.${ext}`);
    const query = new URLSearchParams({
      force_one: force_one || "0",
      model: model || "anime",
      ai_detect: ai_detect || "2",
      is_multi: is_multi || "0"
    });
    const response = await axios.post(`https://ai.animedb.cn/ai/api/detect?${query.toString()}`, formData, {
      headers: {
        ...headers
      }
    });
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    return res.status(error.response ? error.response.status : 500).json({
      error: error.response ? error.response.data : "An error occurred while processing your request"
    });
  }
}