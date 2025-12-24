import axios from "axios";
class AinSFXUploader {
  constructor(apiUrl = "https://ins.neastooid.xyz/api/ai/ainsfxv2") {
    this.apiUrl = apiUrl;
  }
  async uploadImage(imageUrl) {
    try {
      const {
        data
      } = await axios.post(this.apiUrl, {
        imageUrl: imageUrl
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return data?.uploadedUrl || null;
    } catch (error) {
      console.error("Error uploading image to AinSFX:", error?.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url: imageUrl
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const uploader = new AinSFXUploader();
  const uploadedUrl = await uploader.uploadImage(imageUrl);
  if (!uploadedUrl) {
    return res.status(500).json({
      error: "Failed to upload image"
    });
  }
  return res.status(200).json({
    result: uploadedUrl
  });
}