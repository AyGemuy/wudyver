import axios from "axios";
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const {
      text = "Brat"
    } = req.method === "GET" ? req.query : req.body;
    try {
      const url = `https://brat.caliphdev.com/api/brat?text=${encodeURIComponent(text)}`;
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", 'inline; filename="brat-image.png"');
      res.status(200).send(Buffer.from(response.data));
    } catch (error) {
      res.status(500).json({
        error: "Terjadi kesalahan",
        details: error.message
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({
      error: `Metode ${req.method} tidak diizinkan`
    });
  }
}