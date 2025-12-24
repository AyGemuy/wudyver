import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class RemoveBg {
  constructor() {
    this.API_URL = "https://backrem.pi7.org/remove_bg";
    this.HEADERS = {
      Connection: "keep-alive",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
      Accept: "*/*",
      Origin: "https://image.pi7.org",
      Referer: "https://image.pi7.org/",
      ...SpoofHead()
    };
  }
  _randName() {
    return `id_${Date.now()}${(Math.random() + 1).toString(36).substring(7)}`;
  }
  async run({
    imageUrl
  }) {
    console.log(`[INFO] Starting process for: ${imageUrl}`);
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const fileSizeMB = buffer.length / (1024 * 1024);
      if (fileSizeMB > 5) {
        throw new Error(`File size ${fileSizeMB.toFixed(2)}MB exceeds 5MB limit.`);
      }
      console.log(`[INFO] Image downloaded, size: ${fileSizeMB.toFixed(2)}MB`);
      const contentType = response.headers["content-type"] || "image/jpeg";
      const extension = contentType.split("/")[1] || "jpg";
      const form = new FormData();
      const fileName = `${this._randName()}.${extension}`;
      form.append("myFile[]", buffer, {
        filename: fileName,
        contentType: contentType
      });
      console.log(`[INFO] Prepared form data with filename: ${fileName}`);
      const result = await axios.post(this.API_URL, form, {
        headers: {
          ...form.getHeaders(),
          ...this.HEADERS
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      if (result.data?.images?.length > 0) {
        const outputUrl = `https://backrem.pi7.org/${result.data.images[0].filename}`;
        console.log(`[SUCCESS] Process complete. Output: ${outputUrl}`);
        return outputUrl;
      } else {
        throw new Error("Failed to process image, invalid API response.");
      }
    } catch (error) {
      console.error("[ERROR] Background removal failed:", error.message);
      throw error;
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
    const remover = new RemoveBg();
    const result = await remover.run(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}