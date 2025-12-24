import axios from "axios";
class RemoveBackground {
  constructor() {
    this.apiUrl = "https://s5ash41h3g.execute-api.ap-south-1.amazonaws.com/default/api/v1/rmbg/predict";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://clyrbg.com",
      priority: "u=1, i",
      referer: "https://clyrbg.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async removeBg({
    imageUrl,
    hd = false
  }) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"] || "image/png";
      const fileExtension = contentType.split("/").pop() || "png";
      const imageBase64 = Buffer.from(response.data).toString("base64");
      const payload = {
        file_extension: fileExtension,
        image_bytes: imageBase64,
        hd: hd
      };
      const apiResponse = await axios.post(this.apiUrl, payload, {
        headers: this.headers
      });
      return apiResponse.data;
    } catch (error) {
      throw new Error(`Failed to remove background: ${error.message}`);
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
    const api = new removeBg();
    const result = await api.removeBg(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}