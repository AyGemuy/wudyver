import fetch from "node-fetch";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) return res.status(400).json({
    error: 'Paramenter "text" diperlukan'
  });
  try {
    const url = `https://${apiConfig.DOMAIN_KOYEB}/balogo?text=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log("Query processing complete!");
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Error processing query:", error);
    return res.status(500).json({
      error: "Gagal memproses permintaan"
    });
  }
}