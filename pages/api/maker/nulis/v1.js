import fetch from "node-fetch";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  try {
    const {
      waktu = "08:00",
        hari = "Senin",
        nama = "Anonim",
        kelas = "XII",
        text = "Agus",
        type = "1"
    } = req.method === "GET" ? req.query : req.body;
    const validType = isNaN(type) ? 1 : Math.min(parseInt(type), 14);
    const url = `https://${apiConfig.DOMAIN_KOYEB}/nulis?waktu=${encodeURIComponent(waktu)}&hari=${encodeURIComponent(hari)}&nama=${encodeURIComponent(nama)}&kelas=${encodeURIComponent(kelas)}&text=${encodeURIComponent(text)}&type=${validType}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch the image");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({
      error: "Terjadi kesalahan saat mengambil gambar."
    });
  }
}