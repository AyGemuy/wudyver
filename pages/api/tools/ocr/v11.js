import axios from "axios";
import FormData from "form-data";
const OCR_ENDPOINT = "https://ashirwadinfotech.com/api/ocr_with_google_cloud_vision/";
const API_KEY = "123@#11112@######&&&123";
const FILE_FIELD = "file";
const API_KEY_FIELD = "api_key";
class OcrClient {
  constructor() {
    console.log("OcrClient diinisialisasi.");
    this.client = axios.create({
      timeout: 3e5
    });
  }
  async prep(source) {
    if (!source) {
      throw new Error("Sumber gambar kosong.");
    }
    try {
      console.log("Proses: Mempersiapkan data input...");
      let data;
      let contentType = "application/octet-stream";
      let filename = "image.bin";
      if (typeof source === "string" && (source.startsWith("http://") || source.startsWith("https://"))) {
        console.log(`Proses: Mengambil data dari URL: ${source}`);
        const response = await this.client.get(source, {
          responseType: "arraybuffer"
        });
        data = response.data;
        contentType = response.headers["content-type"] || "image/jpeg";
        filename = source.split("/").pop()?.split("?")[0] || `remote_image.${contentType.split("/")[1] || "jpeg"}`;
      } else if (typeof source === "string" && source.startsWith("data:")) {
        console.log("Proses: Mengkonversi Base64 string ke Buffer.");
        const match = source.match(/^data:(.+?);base64,(.+)$/);
        if (!match) {
          throw new Error("Format Base64 tidak valid.");
        }
        contentType = match[1];
        const base64Data = match[2];
        data = Buffer.from(base64Data, "base64");
        filename = `base64_img.${contentType.split("/")[1] ? contentType.split("/")[1] : "jpeg"}`;
      } else if (source instanceof Buffer || source instanceof ArrayBuffer) {
        console.log("Proses: Menggunakan Buffer/ArrayBuffer langsung.");
        data = source instanceof Buffer ? source : Buffer.from(source);
        contentType = "image/jpeg";
        filename = "buffer_upload.jpeg";
      } else if (source.constructor.name === "Blob" || source.constructor.name === "File") {
        console.log("Proses: Menggunakan Blob/File object.");
        data = Buffer.from(await source.arrayBuffer());
        contentType = source.type || "image/jpeg";
        filename = source.name || "blob_upload.jpeg";
      } else {
        throw new Error("Tipe input gambar tidak didukung.");
      }
      console.log(`Proses: Data disiapkan. File: ${filename}, Tipe: ${contentType}`);
      return {
        data: data,
        filename: filename,
        contentType: contentType
      };
    } catch (error) {
      console.error("Gagal dalam prepareData:", error.message);
      throw new Error(`Persiapan data gagal: ${error.message}`);
    }
  }
  async postData(imageInfo) {
    console.log("Proses: Membuat request Multipart FormData...");
    const form = new FormData();
    form.append(FILE_FIELD, imageInfo.data, {
      filename: imageInfo.filename,
      contentType: imageInfo.contentType
    });
    form.append(API_KEY_FIELD, API_KEY);
    try {
      console.log(`Proses: Mengirim data ke ${OCR_ENDPOINT}...`);
      const response = await this.client.post(OCR_ENDPOINT, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal dalam postData:", error.message);
      const status = error.response?.status || "N/A";
      const data = error.response?.data || {
        message: "Tidak ada data respons"
      };
      throw new Error(`Permintaan API gagal. Status: ${status}. Detail: ${JSON.stringify(data)}`);
    }
  }
  async read({
    image,
    ...rest
  }) {
    try {
      console.log("--- OCR READ START ---");
      const imageInfo = await this.prep(image);
      const responseData = await this.postData(imageInfo);
      console.log("Proses: Data diterima.");
      return responseData;
    } catch (error) {
      console.error("!!! KESALAHAN KRITIS OCR !!!");
      console.error(error.message);
      return `ERROR: ${error.message}`;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new OcrClient();
  try {
    const data = await api.read(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}