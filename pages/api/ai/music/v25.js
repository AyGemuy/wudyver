import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AISongCreator {
  constructor(cookie) {
    this.api = axios.create({
      baseURL: "https://aisongcreator.ai/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://aisongcreator.ai",
        referer: "https://aisongcreator.ai/?ref=aier.im",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        cookie: cookie || "__Secure-authjs.callback-url=https%3A%2F%2Faisongcreator.ai;",
        ...SpoofHead()
      }
    });
    console.log("AISongCreator class diinisialisasi.");
  }
  async _getCsrfToken() {
    console.log("Mencoba mendapatkan CSRF token...");
    try {
      const response = await this.api.get("/auth/csrf");
      const csrfToken = response.data?.csrfToken;
      if (!csrfToken) {
        throw new Error("Gagal mendapatkan csrfToken dari respons.");
      }
      console.log("Berhasil mendapatkan CSRF token.");
      return csrfToken;
    } catch (error) {
      console.error("Error saat mengambil CSRF token:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log(`Memulai proses generate untuk prompt: "${prompt}"`);
    try {
      const csrfToken = await this._getCsrfToken();
      const initialCookie = this.api.defaults.headers["cookie"].split("; ").filter(c => !c.startsWith("__Host-authjs.csrf-token")).join("; ");
      this.api.defaults.headers["cookie"] = `${initialCookie}; __Host-authjs.csrf-token=${csrfToken}`;
      const payload = {
        userInput: prompt,
        customMode: rest.customMode || false,
        musicType: rest.musicType ? rest.musicType : "vocal",
        selectedModel: rest.selectedModel || "V3_5",
        ...rest
      };
      console.log("Mengirim permintaan generate dengan payload:", payload);
      const response = await this.api.post("/music/generate", payload);
      console.log("Berhasil menerima respons generate.");
      return response.data;
    } catch (error) {
      console.error("Error pada proses generate:", error.response?.data || error.message);
      return null;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    const taskId = task_id || rest.taskId;
    if (!taskId) {
      console.error("task_id dibutuhkan untuk memeriksa status.");
      return null;
    }
    console.log(`Memeriksa status untuk task_id: ${taskId}`);
    try {
      const response = await this.api.get(`/music/task-status`, {
        params: {
          taskId: taskId,
          ...rest
        }
      });
      console.log("Berhasil mendapatkan status tugas.");
      return response.data;
    } catch (error) {
      console.error("Error saat memeriksa status:", error.response?.data?.message || error.message);
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
      error: "Action (create or status) is required."
    });
  }
  const sunoGen = new AISongCreator();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await sunoGen.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await sunoGen.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}