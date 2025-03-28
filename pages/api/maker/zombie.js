import axios from "axios";
import {
  fileTypeFromBuffer
} from "file-type";
export default async function handler(req, res) {
  const {
    imageUrl
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) return res.status(400).json({
    error: "Image URL is required"
  });
  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    const {
      ext,
      mime
    } = await fileTypeFromBuffer(imageBuffer) || {
      ext: "jpeg",
      mime: "image/jpeg"
    };
    if (!ext || !mime) return res.status(400).json({
      error: "Invalid image format"
    });
    const blob = new Blob([imageBuffer], {
      type: mime
    });
    const formData = new FormData();
    formData.append("image", blob, `image.${ext}`);
    const {
      data
    } = await axios.post("https://deepgrave-image-processor-no7pxf7mmq-uc.a.run.app/transform_in_place", formData, {
      headers: formData.getHeaders()
    });
    const imageResultBuffer = Buffer.from(data, "base64");
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageResultBuffer);
  } catch (error) {
    res.status(500).json({
      error: "Failed to process image"
    });
  }
}