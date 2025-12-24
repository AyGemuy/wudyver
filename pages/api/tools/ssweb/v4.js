import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const BASE = "https://api.conversiontools.io/v1";
const HEAD = {
  accept: "application/json",
  "content-type": "application/json",
  origin: "https://conversiontools.io",
  referer: "https://conversiontools.io/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
  ...SpoofHead()
};
class ScreenshotMachine {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE,
      headers: HEAD
    });
  }
  async generate({
    url,
    ...rest
  }) {
    console.log("start task");
    let taskId, fileId, dlId, img;
    try {
      const payload = {
        type: "convert.website_to_png",
        options: {
          url: url,
          emulate_device: rest.device ?? "",
          viewport_width: rest.width ?? "",
          viewport_height: rest.height ?? "",
          ...rest
        }
      };
      const t = await this.ax.post("/tasks", payload);
      taskId = t.data.task_id ?? null;
      console.log("task id:", taskId);
      if (!taskId) throw new Error("no task id");
      let status = "";
      while (status !== "SUCCESS") {
        await new Promise(r => setTimeout(r, 3e3));
        const s = await this.ax.get(`/tasks/${taskId}`);
        status = s.data.status ?? "";
        fileId = s.data.file_id ?? fileId;
        console.log("poll:", status, fileId);
      }
      const d = await this.ax.post(`/files/${fileId}/download`, {}, {
        headers: {
          accept: "application/json"
        }
      });
      dlId = d.data.download_id ?? null;
      console.log("dl id:", dlId);
      const i = await this.ax.get(`/files/${dlId}/download`, {
        responseType: "arraybuffer"
      });
      img = Buffer.from(i.data);
      console.log("img size:", img.length);
    } catch (e) {
      console.error("err:", e.message || e);
      throw e;
    }
    return img;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const sm = new ScreenshotMachine();
  try {
    const data = await sm.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}