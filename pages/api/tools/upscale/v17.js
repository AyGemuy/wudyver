import axios from "axios";
import {
  EventSource
} from "eventsource";
import FormData from "form-data";
import {
  v4 as uuidv4
} from "uuid";
class Upscaler {
  constructor() {
    this.baseUrl = "https://tuan2308-upscaler.hf.space";
    this.uploadEndpoint = `${this.baseUrl}/gradio_api/upload`;
    this.queueJoinEndpoint = `${this.baseUrl}/gradio_api/queue/join`;
    this.queueDataEndpoint = `${this.baseUrl}/gradio_api/queue/data`;
  }
  async upscale({
    imageUrl,
    model = "RealESRGAN_x4plus_anime_6B",
    scale = 4,
    gfpgan = false,
    denoise = .5
  }) {
    try {
      let buffer;
      let contentType;
      let originalName;
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        buffer = response.data;
        contentType = response.headers["content-type"] || "image/jpeg";
        originalName = `image.${contentType.split("/")[1] || "jpg"}`;
      } else if (typeof imageUrl === "string") {
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        buffer = Buffer.from(base64Data, "base64");
        contentType = imageUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
        originalName = `image.${contentType.split("/")[1] || "jpg"}`;
      } else if (imageUrl instanceof Buffer) {
        buffer = imageUrl;
        contentType = "image/jpeg";
        originalName = "image.jpg";
      } else {
        throw new Error("Invalid imageUrl format. Please provide a URL, base64 string, or a Buffer.");
      }
      const uploadId = uuidv4().replace(/-/g, "").substring(0, 10);
      const form = new FormData();
      form.append("files", buffer, {
        filename: originalName,
        contentType: contentType
      });
      const uploadResponse = await axios.post(`${this.uploadEndpoint}?upload_id=${uploadId}`, form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"
        }
      });
      const filePath = uploadResponse.data[0];
      const session = Math.random().toString(36).slice(2, 13);
      const requestData = {
        data: [{
          path: filePath,
          url: `${this.baseUrl}/gradio_api/file=${filePath}`,
          orig_name: originalName,
          size: buffer.length,
          mime_type: contentType,
          meta: {
            _type: "gradio.FileData"
          }
        }, model, denoise, gfpgan, scale],
        event_data: null,
        fn_index: 1,
        trigger_id: 17,
        session_hash: session
      };
      const queueResponse = await axios.post(this.queueJoinEndpoint, requestData, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"
        }
      });
      if (!queueResponse.data?.event_id) {
        throw new Error("Failed to join the queue.");
      }
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${this.queueDataEndpoint}?session_hash=${session}`);
        eventSource.onmessage = ({
          data
        }) => {
          const parsed = JSON.parse(data);
          if (parsed.msg === "process_completed") {
            resolve(parsed.output?.data?.[0]);
            eventSource.close();
          } else if (parsed.msg === "close_stream") {
            eventSource.close();
          }
        };
        eventSource.onerror = err => {
          reject(new Error(`Error processing image: ${err.message}`));
          eventSource.close();
        };
      });
    } catch (error) {
      console.error("Upscale failed:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const upscaler = new Upscaler();
    const result = await upscaler.upscale(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}