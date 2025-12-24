import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class ImageProcessor {
  constructor() {
    this.filters = ["coklat", "hitam", "nerd", "piggy", "carbon", "botak"];
    this.processUrl = "https://wpw.my.id/api/process-image";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
  }
  async generate({
    imageUrl,
    filter = "coklat"
  }) {
    try {
      console.log("Memulai proses gambar dengan filter:", filter);
      if (!this.filters.includes(filter)) {
        throw new Error(`Filter '${filter}' tidak valid. Gunakan: ${this.filters.join(", ")}`);
      }
      let fileBuffer, mimeType;
      if (imageUrl?.startsWith("http")) {
        console.log("Mengunduh gambar dari URL...");
        try {
          const imageResponse = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          fileBuffer = Buffer.from(imageResponse?.data);
          mimeType = imageResponse?.headers?.["content-type"] || "image/jpeg";
        } catch (downloadError) {
          console.error("Error download gambar:", downloadError?.message);
          throw new Error(`Gagal mengunduh gambar: ${downloadError?.message}`);
        }
      } else if (imageUrl?.startsWith("data:image")) {
        console.log("Memproses gambar dari base64...");
        try {
          const base64Data = imageUrl?.split?.(",")?.[1];
          if (!base64Data) {
            throw new Error("Format base64 tidak valid");
          }
          fileBuffer = Buffer.from(base64Data, "base64");
          mimeType = imageUrl?.split?.(",")?.[0]?.split?.(":")?.[1]?.split?.(";")?.[0] || "image/jpeg";
        } catch (base64Error) {
          console.error("Error decode base64:", base64Error?.message);
          throw new Error(`Format base64 tidak valid: ${base64Error?.message}`);
        }
      } else {
        throw new Error("Input harus URL gambar atau data URI base64");
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("Gagal mendapatkan data gambar");
      }
      console.log("Gambar berhasil diproses, ukuran:", fileBuffer.length, "bytes");
      const base64Image = fileBuffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      console.log("Mengirim ke API proses filter...");
      const processResponse = await axios.post(this.processUrl, {
        imageData: dataUri,
        filter: filter
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/json",
          origin: "https://wpw.my.id",
          referer: "https://wpw.my.id/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        },
        timeout: 6e4
      });
      const processedImageUrl = processResponse?.data?.processedImageUrl;
      if (!processedImageUrl) {
        throw new Error("API tidak mengembalikan gambar yang diproses");
      }
      console.log("Gambar berhasil diproses oleh API");
      const processedBase64 = processedImageUrl?.split?.(",")?.[1];
      if (!processedBase64) {
        throw new Error("Format data URI hasil tidak valid");
      }
      const processedBuffer = Buffer.from(processedBase64, "base64");
      console.log("Mengupload gambar hasil...");
      const formData = new FormData();
      const fileExtension = mimeType?.split?.("/")?.[1] || "png";
      formData.append("file", processedBuffer, `filtered_${filter}.${fileExtension}`);
      const uploadResponse = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 3e4
      });
      console.log("Upload berhasil!");
      return uploadResponse?.data;
    } catch (error) {
      console.error("Error dalam proses gambar:", error?.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const imageProcessor = new ImageProcessor();
    const response = await imageProcessor.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}