import axios from "axios";
import FormData from "form-data";
class Mooniverse {
  _b64tobuf(base64) {
    console.log("Mengonversi Base64 ke Buffer...");
    return Buffer.from(base64, "base64");
  }
  async _initImage(imageUrl) {
    if (Buffer.isBuffer(imageUrl)) {
      console.log("Tipe masukan: Buffer");
      return {
        imageBuffer: imageUrl,
        filename: "image.png"
      };
    }
    if (imageUrl.startsWith("http")) {
      console.log("Tipe masukan: URL. Mengunduh gambar...");
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(response.data, "binary");
      const filename = imageUrl.split("/").pop() || "image.png";
      return {
        imageBuffer: imageBuffer,
        filename: filename
      };
    }
    console.log("Tipe masukan: diasumsikan Base64");
    return {
      imageBuffer: this._b64tobuf(imageUrl),
      filename: "image.png"
    };
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    console.log("Proses 'generate' dimulai...");
    try {
      const {
        imageBuffer,
        filename
      } = await this._initImage(imageUrl);
      const form = new FormData();
      const scale = rest.scale || 2;
      form.append("files", imageBuffer, {
        filename: filename
      });
      form.append("scale", scale.toString());
      console.log(`Mengirim permintaan ke API dengan skala ${scale}x...`);
      const headers = {
        ...form.getHeaders(),
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://mooniverse.dev",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://mooniverse.dev/Image/UpscaleImage",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const response = await axios.post("https://mooniverse.dev/Image/UpscaleImages", form, {
        headers: headers
      });
      console.log("Berhasil menerima respons dari API.");
      const result = response.data?.files?.[0] || {};
      if (result.success && result.data) {
        return this._b64tobuf(result.data);
      } else {
        const message = result.error || "API tidak mengembalikan data gambar yang valid.";
        throw new Error(message);
      }
    } catch (error) {
      console.error("Terjadi kesalahan di dalam class:", error.message);
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  try {
    const api = new Mooniverse();
    const finalImageBuffer = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", finalImageBuffer.length);
    return res.status(200).send(finalImageBuffer);
  } catch (error) {
    console.error("Kesalahan saat memproses permintaan:", error);
    return res.status(500).json({
      error: error.message || "Kesalahan Internal Server"
    });
  }
}