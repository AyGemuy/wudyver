import axios from "axios";
import qs from "qs";
async function Drawever(imageUrl) {
  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    const mimeType = imageResponse.headers["content-type"];
    const validMimeType = mimeType && mimeType.startsWith("image/") ? mimeType : "image/png";
    const base64Image = Buffer.from(imageResponse.data).toString("base64");
    const base64ImageUrl = `data:${validMimeType};base64,${base64Image}`;
    const payload = qs.stringify({
      image: base64ImageUrl
    });
    const config = {
      method: "POST",
      url: "https://www.drawever.com/api/tools/process",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: payload
    };
    const apiResponse = await axios.request(config);
    if (!Array.isArray(apiResponse.data) || apiResponse.data.length === 0) {
      throw new Error("Invalid API response format");
    }
    const base64ImageResult = apiResponse.data[0];
    const matches = base64ImageResult.match(/^data:image\/png;base64,(.+)$/);
    if (!matches || !matches[1]) {
      throw new Error("Invalid image data received from API");
    }
    return Buffer.from(matches[1], "base64");
  } catch (error) {
    throw new Error(`Drawever Error: ${error.message}`);
  }
}
export default async function handler(req, res) {
  try {
    const {
      url: imageUrl
    } = req.method === "GET" ? req.query : req.body;
    if (!imageUrl) {
      return res.status(400).json({
        message: "Image URL is required"
      });
    }
    const buffer = await Drawever(imageUrl);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while processing the image",
      error: error.message
    });
  }
}