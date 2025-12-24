import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GazouLab {
  constructor() {
    this.api = axios.create({
      baseURL: "https://gazoulab.com/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://gazoulab.com",
        priority: "u=1, i",
        referer: "https://gazoulab.com/tools/photo-background-changer",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  async _get_img(imageUrl) {
    console.log("Proses: Mengambil gambar dari", imageUrl);
    try {
      if (Buffer.isBuffer(imageUrl)) {
        return imageUrl;
      }
      if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (imageUrl.startsWith("data:image")) {
        return Buffer.from(imageUrl.split(",")[1], "base64");
      }
      throw new Error("Format imageUrl tidak didukung");
    } catch (error) {
      console.error("Error saat mengambil gambar:", error.message);
      throw error;
    }
  }
  async _presign(buffer) {
    console.log("Proses: Melakukan presign gambar");
    try {
      const fileType = "image/jpeg";
      const fileExtension = "jpg";
      const {
        data
      } = await this.api.get(`/upload?fileName=image.${fileExtension}&fileType=${fileType}`);
      console.log("Proses: Mengunggah gambar ke presigned URL");
      await axios.put(data.presignedUrl, buffer, {
        headers: {
          "Content-Type": fileType
        }
      });
      return data.publicUrl;
    } catch (error) {
      console.error("Error saat presign:", error.response?.data || error.message);
      throw error;
    }
  }
  async replace_bg({
    imageUrl,
    prompt,
    ...rest
  }) {
    console.log("Proses: Memulai penggantian background");
    try {
      const buffer = await this._get_img(imageUrl);
      const publicUrl = await this._presign(buffer);
      console.log("Proses: Mengirim permintaan penggantian background");
      const payload = {
        imageUrl: publicUrl,
        prompt: prompt || "beautiful view",
        ...rest
      };
      const {
        data
      } = await this.api.post("/replace-bg", payload);
      return data;
    } catch (error) {
      console.error("Error saat mengganti background:", error.response?.data || error.message);
      throw error;
    }
  }
  async remove_bg({
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai penghapusan background");
    try {
      const buffer = await this._get_img(imageUrl);
      const publicUrl = await this._presign(buffer);
      console.log("Proses: Mengirim permintaan penghapusan background");
      const payload = {
        imageUrl: publicUrl,
        ...rest
      };
      const {
        data
      } = await this.api.post("/remove-bg-fal", payload);
      return data;
    } catch (error) {
      console.error("Error saat menghapus background:", error.response?.data || error.message);
      throw error;
    }
  }
  async upscale({
    imageUrl,
    scale = 2,
    style = "general",
    ...rest
  }) {
    console.log("Proses: Memulai upscale gambar");
    try {
      const buffer = await this._get_img(imageUrl);
      const publicUrl = await this._presign(buffer);
      console.log("Proses: Mengirim permintaan upscale");
      const payload = {
        imageUrl: publicUrl,
        scale: scale,
        style: style,
        ...rest
      };
      const {
        data
      } = await this.api.post("/upscale", payload);
      return data;
    } catch (error) {
      console.error("Error saat upscale:", error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' dibutuhkan."
    });
  }
  const api = new GazouLab();
  try {
    let response;
    switch (action) {
      case "replace_bg":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' dibutuhkan untuk action 'replace_bg'."
          });
        }
        response = await api.replace_bg(params);
        return res.status(200).json(response);
      case "remove_bg":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' dibutuhkan untuk action 'remove_bg'."
          });
        }
        response = await api.remove_bg(params);
        return res.status(200).json(response);
      case "upscale":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' dibutuhkan untuk action 'upscale'."
          });
        }
        response = await api.upscale(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung adalah 'replace_bg', 'remove_bg', dan 'upscale'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error.response?.data?.error || error.message || "Internal Server Error";
    return res.status(500).json({
      error: errorMessage
    });
  }
}