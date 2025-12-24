import axios from "axios";
class ImagePromptAPI {
  constructor() {
    this.apiUrl = "https://api.imagepromptguru.net/image-to-prompt";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://imagepromptguru.net",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://imagepromptguru.net/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async getPrompt({
    imageUrl,
    model = "general",
    lang = "id"
  }) {
    if (!imageUrl) {
      throw new Error("imageUrl is required.");
    }
    let imageBase64Data;
    let inputImageMimeType;
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      inputImageMimeType = imageResponse.headers["content-type"];
      if (!inputImageMimeType || !inputImageMimeType.startsWith("image/")) {
        throw new Error(`Downloaded file from ${imageUrl} is not an image. Content-Type: ${inputImageMimeType || "unknown"}`);
      }
      imageBase64Data = Buffer.from(imageResponse.data).toString("base64");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Failed to download image from ${imageUrl}. Status: ${error.response.status}. Data: ${JSON.stringify(error.response.data)}`);
      } else if (axios.isAxiosError(error) && error.request) {
        throw new Error(`Failed to download image from ${imageUrl}. No response from server.`);
      }
      throw new Error(`Failed to download or process image from ${imageUrl}: ${error.message}`);
    }
    const imagePayloadString = `data:${inputImageMimeType};base64,${imageBase64Data}`;
    const payloadToApi = {
      image: imagePayloadString,
      model: model,
      language: lang
    };
    try {
      const apiResponse = await axios.post(this.apiUrl, payloadToApi, {
        headers: this.defaultHeaders
      });
      return apiResponse.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`ImagePromptGuru API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (axios.isAxiosError(error) && error.request) {
        throw new Error("ImagePromptGuru API Error: No response from server.");
      }
      throw new Error(`ImagePromptGuru API Error: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new ImagePromptAPI();
    const response = await api.getPrompt(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}