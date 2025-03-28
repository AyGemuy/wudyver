import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
async function v2(imageURL) {
  async function upscaleImage(imageData) {
    try {
      const url = "https://api.imggen.ai/guest-upscale-image";
      const payload = {
        image: {
          ...imageData,
          url: "https://api.imggen.ai" + imageData.url
        }
      };
      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return {
        original_image: "https://api.imggen.ai" + response.data.original_image,
        upscaled_image: "https://api.imggen.ai" + response.data.upscaled_image
      };
    } catch (error) {
      console.error("Error during upscaling:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  try {
    const imageBuffer = await axios.get(imageURL, {
      responseType: "arraybuffer"
    });
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer.data], {
      type: "image/png"
    });
    formData.append("image", imageBlob, "image.png");
    const headers = {
      "Content-Type": "multipart/form-data"
    };
    const uploadResponse = await axios.post("https://api.imggen.ai/guest-upload", formData, {
      headers: headers
    });
    const upscaledResponse = await upscaleImage(uploadResponse.data.image);
    return upscaledResponse;
  } catch (error) {
    console.error("Error uploading or processing image:", error.response ? error.response.data : error.message);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  try {
    const result = await v2(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}