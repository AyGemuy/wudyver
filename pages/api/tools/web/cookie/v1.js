import fetch from "node-fetch";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  const {
    url = "https://google.com"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      status: "error"
    });
  }
  try {
    const response = await fetch(`https://${apiConfig.DOMAIN_KOYEB}/cookie?url=${url}`);
    if (!response.ok) {
      return res.status(response.status).json({
        status: "error"
      });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat memproses permintaan.",
      error: error.message
    });
  }
}