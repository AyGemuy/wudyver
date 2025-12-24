import axios from "axios";
import {
  EventSource
} from "eventsource";
import {
  Blob,
  FormData
} from "formdata-node";
class BackgroundRemover {
  constructor() {
    this.uploadEndpoint = "https://tuan2308-background-removal.hf.space/upload";
    this.queueJoinEndpoint = "https://tuan2308-background-removal.hf.space/queue/join?__theme=light";
    this.queueDataEndpoint = "https://tuan2308-background-removal.hf.space/queue/data";
  }
  async remove({
    imageUrl
  }) {
    try {
      const {
        data: buffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"]?.split("/")[1] || "jpg";
      const form = new FormData();
      form.append("files", new Blob([buffer], {
        type: headers["content-type"]
      }), `image.${ext}`);
      const {
        data: [filePath]
      } = await axios.post(this.uploadEndpoint, form, {
        headers: {
          ...form.headers,
          origin: "https://taoanhdep.com"
        }
      });
      const session = Math.random().toString(36).slice(2, 10);
      const requestData = {
        data: [{
          path: filePath,
          url: `https://tuan2308-background-removal.hf.space${filePath}`,
          orig_name: filePath,
          mime_type: headers["content-type"],
          meta: {
            _type: "gradio.FileData"
          }
        }],
        event_data: null,
        fn_index: 0,
        trigger_id: 13,
        session_hash: session
      };
      const queueResponse = await axios.post(this.queueJoinEndpoint, requestData, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://taoanhdep.com"
        }
      });
      if (!queueResponse.data?.event_id) return;
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${this.queueDataEndpoint}?session_hash=${session}`);
        eventSource.onmessage = ({
          data
        }) => {
          const parsed = JSON.parse(data);
          if (parsed.msg === "process_completed") {
            resolve(parsed.output);
            eventSource.close();
          }
        };
        eventSource.onerror = () => {
          reject("Error processing image");
          eventSource.close();
        };
      });
    } catch (error) {
      console.error("Background removal failed:", error);
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
    const remover = new BackgroundRemover();
    const result = await remover.remove(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}