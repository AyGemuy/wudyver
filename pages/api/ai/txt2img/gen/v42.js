import axios from "axios";
class GenerateImage {
  async generateImage({
    prompt,
    ...rest
  }) {
    console.log("Proses generateImage dimulai...");
    const selectedWidth = rest?.width || 1920;
    const selectedHeight = rest?.height ? rest.height : 1080;
    const seed = Math.floor(Math.random() * 1e6);
    const imgUrl = `https://lailaautobot.one/api.php?prompt=${encodeURIComponent(prompt)}&width=${selectedWidth}&height=${selectedHeight}&seed=${seed}`;
    console.log(`Mengambil gambar dari URL: ${imgUrl}`);
    try {
      const response = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      console.log("Gambar berhasil diambil.");
      return response.data;
    } catch (error) {
      console.error("Gagal mengambil gambar dari API eksternal:", error.message);
      throw new Error("Gagal mengambil gambar dari layanan eksternal.");
    } finally {
      console.log("Proses generateImage selesai.");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    prompt
  } = params;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const imageGenerator = new GenerateImage();
    const imageBuffer = await imageGenerator.generateImage(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}