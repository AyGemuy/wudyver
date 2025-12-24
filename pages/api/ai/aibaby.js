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
const generateBabyTask = async (fatherImageUrl, motherImageUrl, gender = "girl") => {
  console.log(`🎨 Memulai proses pembuatan gambar bayi dengan gender: ${gender}`);
  if (gender !== "girl" && gender !== "boy") {
    throw new Error('⛔ Gender hanya boleh "girl" atau "boy"!');
  }
  const apiUrl = "https://ai-baby-generator.net/api/ai.generateImage?batch=1";
  const requestHeaders = {
    "content-type": "application/json",
    origin: "https://ai-baby-generator.net",
    referer: "https://ai-baby-generator.net/in",
    "user-agent": "Postify/1.0.0"
  };
  try {
    const fatherImageData = await uploadImageFromUrl(fatherImageUrl);
    const motherImageData = await uploadImageFromUrl(motherImageUrl);
    if (!fatherImageData || !motherImageData) {
      throw new Error("❌ Salah satu gambar gagal diunggah, proses pembuatan bayi dibatalkan.");
    }
    const requestData = {
      0: {
        json: {
          fatherImage: fatherImageData,
          motherImage: motherImageData,
          gender: gender
        }
      }
    };
    console.log("📡 Mengirim permintaan pembuatan bayi ke server...");
    const response = await axios.post(apiUrl, requestData, {
      headers: requestHeaders
    });
    const taskId = response.data[0].result.data.json.taskId;
    console.log(`✅ Permintaan berhasil, Task ID: ${taskId}`);
    return taskId;
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat memulai proses pembuatan bayi:", error);
    throw error;
  }
};
const getBabyTaskResult = async taskId => {
  const apiUrl = "https://ai-baby-generator.net/api/ai.getTask?batch=1";
  const requestHeaders = {
    "content-type": "application/json",
    origin: "https://ai-baby-generator.net",
    referer: "https://ai-baby-generator.net/in",
    "user-agent": "Postify/1.0.0"
  };
  const requestData = {
    0: {
      json: {
        taskId: taskId
      }
    }
  };
  try {
    console.log(`📡 Memeriksa status Task ID: ${taskId}`);
    const response = await axios.post(apiUrl, requestData, {
      headers: requestHeaders
    });
    const result = response.data[0].result.data.json;
    console.log(`✅ Status Task ID: ${taskId} - ${result.status}`);
    return result;
  } catch (error) {
    console.error(`❌ Terjadi kesalahan saat memeriksa Task ID: ${taskId}`, error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    ayah: fatherImageUrl,
    ibu: motherImageUrl,
    gender = "girl"
  } = req.method === "GET" ? req.query : req.body;
  if (!fatherImageUrl || !motherImageUrl) {
    console.log("⛔ Paramenter gambar tidak lengkap.");
    return res.status(400).json({
      error: "Paramenter ayah dan ibu harus diisi!"
    });
  }
  try {
    console.log("🚀 Memulai proses pembuatan gambar bayi...");
    const taskId = await generateBabyTask(fatherImageUrl, motherImageUrl, gender);
    let taskResult;
    do {
      console.log("⏳ Menunggu hasil dari server...");
      await new Promise(resolve => setTimeout(resolve, 5e3));
      taskResult = await getBabyTaskResult(taskId);
    } while (taskResult.status !== "SUCCEED");
    console.log("✅ Gambar bayi berhasil dibuat!");
    return res.status(200).json({
      imageUrl: taskResult.imageUrl
    });
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat memproses pembuatan gambar bayi:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan dalam proses pembuatan gambar bayi."
    });
  }
}