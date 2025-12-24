import axios from "axios";
class BgRemover {
  constructor() {
    this.baseURL = "https://remove-background.com/api/transaction/";
  }
  async removeBg({
    imageUrl
  }) {
    try {
      const filename = `${Math.random().toString(36).substring(2, 15)}${imageUrl.split("/").pop()}`;
      const apiURL = `${this.baseURL}?originalFileName=${filename}`;
      const image = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mime = image.headers["content-type"] || "image/jpeg";
      const blob = new Blob([Buffer.from(image.data)], {
        type: mime
      });
      const headers = {
        "Content-Type": mime
      };
      const upload = await axios.post(apiURL, blob, {
        headers: headers
      });
      return upload.data ? await this.getTransaction(upload.data.id) : null;
    } catch (e) {
      console.error("Err:", e);
      throw e;
    }
  }
  async getTransaction(id) {
    try {
      const res = await axios.get(`${this.baseURL}/${id}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://remove-background.com/app/editor",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const data = res.data;
      const base = "https://remove-background.com/api/transaction/fetch/image";
      let result = {
        id: data.id
      };
      if (data.pipeline) {
        result = {
          ...result,
          original: data.pipeline.original ? `${base}/${data.pipeline.original.path}` : null,
          resized: data.pipeline.resized ? `${base}/${data.pipeline.resized.path}` : null,
          transformed: data.pipeline["transformed:low"] ? `${base}/${data.pipeline["transformed:low"].path}` : null
        };
      }
      return result;
    } catch (e) {
      throw e;
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
    const remover = new BgRemover();
    const result = await remover.removeBg(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}