import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class LabubuAI {
  constructor(cookie) {
    this.cookie = cookie || "";
    this.baseUrl = "https://labubuai.net/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      cookie: this.cookie,
      origin: "https://labubuai.net",
      referer: "https://labubuai.net/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai generate gambar...");
    if (!imageUrl) {
      console.error("Error: Paramenter `imageUrl` tidak boleh kosong.");
      return null;
    }
    try {
      console.log(`Proses: Mengunduh gambar dari URL: ${imageUrl}`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data, "binary");
      console.log("Proses: Gambar berhasil diunduh dan diubah menjadi buffer.");
      const form = new FormData();
      form.append("image", imageBuffer, {
        filename: "image-from-url.png",
        contentType: "image/png"
      });
      form.append("size", rest.size || "1:1");
      const config = {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      };
      const response = await axios.post(`${this.baseUrl}/generate-image-free`, form, config);
      const taskId = response?.data?.task_id;
      console.log(`Proses: Berhasil mendapatkan taskId: ${taskId}`);
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error selama proses generate:", error?.response?.data || error.message);
      return null;
    }
  }
  async status({
    task_id: taskId
  }) {
    console.log(`Proses: Memeriksa status untuk taskId: ${taskId}...`);
    try {
      const response = await axios.get(`${this.baseUrl}/image-task-status-free/${taskId}`, {
        headers: this.headers
      });
      console.log(`Proses: Status saat ini adalah "${response?.data?.status}".`);
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error saat memeriksa status:", error?.response?.data || error.message);
      return null;
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
      error: "Action is required."
    });
  }
  const api = new LabubuAI();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl are required for create."
          });
        }
        response = await api.generate(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'create', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}