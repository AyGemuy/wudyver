import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class PhotoCutAPI {
  constructor() {
    this.baseUrl = "https://photocutapi.info/andor-media-1.0/aiart";
    this.headers = {
      "sec-ch-ua-platform": '"Android"',
      Referer: "https://www.photocut.ai/",
      "Accept-Language": "id-ID,id;q=0.9",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      auth: JSON.stringify({
        clientHash: "7cf8827df8029914de3397e5eb5429f25",
        accessToken: "",
        version: "0.1",
        deviceId: "",
        model: "",
        os: 24,
        platform: "web",
        appname: "photocut",
        locale: "en-GB",
        appVersion: 3,
        apiHash: "fb194c698ecca6bc73d649c3fabee629cfe0e2ccc9805ef5a91b0374e52fe4969cd62e2b9abe8bb3d55738914fedcd50ffbe225740ae84c9e2b1aa5081c511fc"
      }),
      "sec-ch-ua-mobile": "?1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      ...SpoofHead()
    };
  }
  async removeBg({
    imageUrl
  }) {
    try {
      const generateResponse = await axios.post(`${this.baseUrl}/generateImage?sys=404`, {
        imageUrl: imageUrl,
        featureType: "changebg",
        background: ""
      }, {
        headers: this.headers
      });
      if (generateResponse.data.status !== "SUCCESS") {
        throw new Error("Gagal mengirim permintaan.");
      }
      const assetId = generateResponse.data.body.assetId;
      console.log("Processing Asset ID:", assetId);
      return await this.waitForResult(assetId);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      return null;
    }
  }
  async waitForResult(assetId, maxRetries = 10, delay = 3e3) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(res => setTimeout(res, delay));
      try {
        const statusResponse = await axios.post(`${this.baseUrl}/checkStatus?sys=404`, {
          assetId: assetId
        }, {
          headers: this.headers
        });
        const {
          body
        } = statusResponse.data;
        if (body?.status === "active" && body?.imgUrl) {
          return {
            assetId: assetId,
            imgUrl: body.imgUrl,
            urls: body.urls
          };
        }
      } catch (error) {
        console.error("Error checking status:", error.response?.data || error.message);
      }
    }
    throw new Error("Gagal mendapatkan hasil dalam batas waktu.");
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
    const api = new PhotoCutAPI();
    const result = await api.removeBg(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}