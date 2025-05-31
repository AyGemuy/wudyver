import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliAI {
  async generate({
    imageUrl
  }) {
    try {
      console.log("Fetching image...");
      const {
        data: buffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const form = new FormData();
      form.set("image", new Blob([buffer], {
        type: contentType
      }), "image.png");
      console.log("Uploading to Ghibli AI...");
      const uploadRes = await axios.post("https://ghibli-ai-generator.net/api/ghibli-image/", form, {
        headers: {
          ...form.headers,
          origin: "https://ghibli-ai-generator.net",
          referer: "https://ghibli-ai-generator.net/ghibli-image-generator/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const id = uploadRes?.data?.data?.id;
      if (!id) throw new Error("Upload failed or ID not found");
      console.log("Polling for result...", id);
      const statusUrl = `https://ghibli-ai-generator.net/api/ghibli-image/status/?id=${id}`;
      const timeout = Date.now() + 60 * 60 * 1e3;
      while (Date.now() < timeout) {
        const statusRes = await axios.get(statusUrl, {
          headers: {
            referer: "https://ghibli-ai-generator.net/ghibli-image-generator/",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
          }
        });
        const status = statusRes?.data?.data?.status;
        console.log("Status:", status);
        if (status === "succeeded") {
          const output = statusRes?.data;
          if (!output) throw new Error("No output image URL found");
          console.log("Done:", output);
          return output;
        } else if (status === "failed") {
          throw new Error("Generation failed.");
        }
        await new Promise(r => setTimeout(r, 3e3));
      }
      throw new Error("Timeout reached (1 hour)");
    } catch (err) {
      console.error("Error:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibli = new GhibliAI();
  try {
    const data = await ghibli.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}