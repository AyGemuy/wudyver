import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageProcessor {
  async getBuffer(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"];
      const ext = contentType.split("/")[1] || "png";
      return {
        blob: new Blob([response.data], {
          type: contentType
        }),
        ext: ext
      };
    } catch (error) {
      throw new Error("Gagal mengambil buffer gambar: " + error.message);
    }
  }
  async generate({
    imageUrl
  }) {
    try {
      const {
        blob,
        ext
      } = await this.getBuffer(imageUrl);
      const fileName = `${Date.now()}.${ext}`;
      const form = new FormData();
      form.append("image", blob, fileName);
      const {
        data
      } = await axios.post("https://binarypoint.in/manage-file.php", form, {
        headers: {
          ...form.headers,
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          origin: "https://binarypoint.in",
          referer: "https://binarypoint.in/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          cookie: "_ga=GA1.1.2105712382.1743780180; _ga_11B6WZBT6W=GS1.1.1743780179.1.0.1743780190.0.0.0"
        }
      });
      return data;
    } catch (error) {
      throw new Error("Gagal mengunggah gambar: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ai = new ImageProcessor();
  try {
    const data = await ai.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}