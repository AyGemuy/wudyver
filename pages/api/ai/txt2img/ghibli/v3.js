import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliAIGen {
  constructor() {
    this.generateUrl = "https://ghibliaigenerator.im/api/generate";
    this.uploadUrl = "https://i.supa.codes/api/upload";
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10)",
      referer: "https://ghibliaigenerator.im/"
    };
  }
  async generate({
    prompt
  }) {
    try {
      console.log("[🚀] Mengirim prompt ke GhibliAI Generator...");
      const {
        data
      } = await axios.post(this.generateUrl, {
        prompt: prompt
      }, {
        headers: this.headers
      });
      if (!data?.data?.img) throw "Tidak ada hasil gambar.";
      const base64 = data.data.img.split(",").pop();
      const buffer = Buffer.from(base64, "base64");
      console.log("[📤] Mengunggah gambar ke Supa.codes...");
      const formData = new FormData();
      formData.append("file", new Blob([buffer]), "ghibli.png");
      const uploadResponse = await axios.post(this.uploadUrl, formData, {
        headers: formData.headers
      });
      if (!uploadResponse.data) throw "Upload gagal.";
      console.log("[✅] Gambar berhasil diupload!");
      return uploadResponse.data;
    } catch (err) {
      console.error("[❌] Gagal generate atau upload:", err);
      throw new Error("Gagal generate GhibliAI: " + err);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ghibliGen = new GhibliAIGen();
  try {
    const data = await ghibliGen.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}