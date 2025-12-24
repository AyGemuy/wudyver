import {
  EventSource
} from "eventsource";
import axios from "axios";
class NSFWImageGenerator {
  constructor() {
    this._style = ["anime", "real", "photo"];
  }
  async process(baseUrl, sessionHash) {
    return new Promise((resolve, reject) => {
      const eventSourceUrl = `${baseUrl}/gradio_api/queue/data?session_hash=${sessionHash}`;
      const eventSource = new EventSource(eventSourceUrl);
      eventSource.onmessage = event => {
        const eventData = JSON.parse(event.data);
        const msg = eventData.msg || "status_update";
        console.log(`Menerima stream: ${msg}`);
        if (eventData.msg === "process_completed") {
          console.log("Proses selesai.");
          eventSource.close();
          console.log("Koneksi stream ditutup.");
          resolve(eventData.output);
        }
      };
      eventSource.onerror = error => {
        console.error("Terjadi error pada EventSource:", error);
        eventSource.close();
        reject(new Error("Koneksi stream gagal atau terputus."));
      };
    });
  }
  async generateImage(prompt, options = {}) {
    const {
      negative_prompt = "lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry",
        style = "anime",
        width = 1024,
        height = 1024,
        guidance_scale = 7,
        inference_steps = 28
    } = options;
    if (!prompt) throw new Error("Prompt is required");
    if (!this._style.includes(style)) throw new Error(`Available styles: ${this._style.join(", ")}`);
    if (width < 256 || width > 1216) throw new Error("Min width: 256, Max width: 1216");
    if (height < 256 || height > 1216) throw new Error("Min height: 256, Max height: 1216");
    if (guidance_scale < 0 || guidance_scale > 20) throw new Error("Min guidance scale: 0, Max guidance scale: 20");
    if (inference_steps < 1 || inference_steps > 28) throw new Error("Max inference steps: 28");
    try {
      const session_hash = Math.random().toString(36).substring(2);
      const baseUrl = `https://heartsync-nsfw-uncensored${style !== "anime" ? `-${style}` : ""}.hf.space`;
      await axios.post(`${baseUrl}/gradio_api/queue/join?`, {
        data: [prompt, negative_prompt, 0, true, width, height, guidance_scale, inference_steps],
        event_data: null,
        fn_index: 2,
        trigger_id: 16,
        session_hash: session_hash
      });
      const output = await this.process(baseUrl, session_hash);
      return output;
    } catch (error) {
      console.error("Gagal melakukan request:", error.message);
      throw new Error(`Request gagal: ${error.message}`);
    }
  }
  async generate({
    prompt,
    ...options
  }) {
    if (!prompt) {
      throw new Error("Prompt is required for image generation.");
    }
    return await this.generateImage(prompt, options);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new NSFWImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}