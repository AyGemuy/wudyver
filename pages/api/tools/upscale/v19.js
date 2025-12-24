import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class ImageProcessor {
  async upscale({
    imageUrl
  }) {
    try {
      console.log("Starting image upscale process...");
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = response.data;
      const contentType = response.headers["content-type"] || "image/png";
      console.log(`Image buffer obtained. Content-Type detected: ${contentType}`);
      const form = new FormData();
      form.append("image", buffer, {
        filename: contentType.includes("jpeg") ? "upload.jpg" : "upload.png",
        contentType: contentType
      });
      form.append("user_id", "undefined");
      form.append("is_public", "true");
      console.log("Form data prepared.");
      const headers = {
        ...form.getHeaders(),
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: "https://picupscaler.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://picupscaler.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      console.log("Request headers set with multiple spoofed IP headers.");
      const {
        data
      } = await axios.post("https://picupscaler.com/api/generate/handle", form, {
        headers: headers
      });
      console.log("Image upscale request successful.");
      return data;
    } catch (err) {
      console.error("Error during image upscale:", err.message);
      return {
        error: true,
        message: err.message
      };
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
    const processor = new ImageProcessor();
    const result = await processor.upscale(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}