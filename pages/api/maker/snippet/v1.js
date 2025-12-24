import fetch from "node-fetch";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  const {
    code,
    title = "app.js"
  } = req.method === "GET" ? req.query : req.body;
  if (!code) return res.status(400).json({
    error: 'Paramenter "code" diperlukan'
  });
  try {
    const queryParams = new URLSearchParams({
      code: code,
      title: title
    }).toString();
    const url = `https://${apiConfig.DOMAIN_KOYEB}/chalkist?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).end(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({
      error: "Gagal memproses permintaan",
      details: error.message
    });
  }
}