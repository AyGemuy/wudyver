import axios from "axios";
const uploadImageFromUrl = async imageUrl => {
  try {
    console.log(`📤 Mengunggah gambar dari URL: ${imageUrl}`);
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    const imageBuffer = Buffer.from(response.data);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
    console.log(`✅ Gambar berhasil diunggah dari URL: ${imageUrl}`);
    return base64Image;
  } catch (error) {
    console.error(`❌ Gagal mengunggah gambar dari URL: ${imageUrl}`, error);
    return null;
  }
};
const describeImage = async (imageUrl, prompt = "Gambar apa itu?") => {
  const apiUrl = "https://aidescribe.org/api/ai.describe?batch=1";
  const requestHeaders = {
    "content-type": "application/json",
    origin: "https://aidescribe.org",
    referer: "https://aidescribe.org/",
    "user-agent": "Postify/1.0.0"
  };
  try {
    console.log(`🖼️ Memproses deskripsi gambar dari URL: ${imageUrl} dengan prompt: "${prompt}"`);
    const imageBase64 = await uploadImageFromUrl(imageUrl);
    if (!imageBase64) {
      throw new Error("❌ Gagal mengunggah gambar. Proses deskripsi dibatalkan.");
    }
    const requestData = {
      0: {
        json: {
          image: imageBase64,
          prompt: prompt
        }
      }
    };
    console.log("📡 Mengirim permintaan deskripsi gambar ke server...");
    const response = await axios.post(apiUrl, requestData, {
      headers: requestHeaders
    });
    const result = response.data[0].result.data.json;
    console.log(`✅ Deskripsi berhasil diproses: ${result.description}`);
    return result;
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat mendeskripsikan gambar:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    img: imageUrl,
    prompt = "Gambar apa itu?"
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    console.log("⛔ URL gambar tidak ditemukan.");
    return res.status(400).json({
      error: "Parameter img harus diisi!"
    });
  }
  try {
    console.log("🚀 Memulai proses deskripsi gambar...");
    const result = await describeImage(imageUrl, prompt);
    console.log("✅ Proses deskripsi selesai.");
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat memproses deskripsi gambar:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan dalam proses deskripsi gambar."
    });
  }
}