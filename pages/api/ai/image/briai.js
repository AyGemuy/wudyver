import axios from "axios";
import crypto from "crypto";

class BriaAIQueue {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.sessionHash = this.generateSessionHash();
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseURL}/?__theme=system`,
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "Android",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      },
    });
  }

  generateSessionHash() {
    return crypto.randomBytes(8).toString("hex");
  }

  async joinQueue(data) {
    try {
      const response = await this.client.post("/queue/join?__theme=system", {
        ...data,
        session_hash: this.sessionHash,
      });
      if (response.data?.event_id) {
        return response.data.event_id;
      }
      throw new Error("Failed to join queue: event_id not found");
    } catch (error) {
      throw new Error(`Error in joinQueue: ${error.message}`);
    }
  }

  async processQueue() {
    const url = `/queue/data?session_hash=${this.sessionHash}`;
    try {
      while (true) {
        const response = await this.client.get(url, { responseType: "stream" });
        const responseText = await this.streamToString(response.data);

        const lines = responseText.split("\n").filter((line) => line.startsWith("data:"));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(5));
            if (data.msg === "process_completed") {
              return data;
            }
          } catch (err) {
            console.warn("Invalid JSON line:", line);
          }
        }
      }
    } catch (error) {
      throw new Error(`Error in processQueue: ${error.message}`);
    }
  }

  async streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, seed = "-1", width = "1024", height = "1024" } = req.query;

    if (!prompt) {
      return res.status(400).json({ error: "Missing required parameters: prompt, width, height" });
    }

    const baseURL = "https://briaai-bria-2-3-fast-lora.hf.space";
    const briaAI = new BriaAIQueue(baseURL);

    const joinData = {
      data: [prompt, seed || "-1", `${width} ${height}`],
      event_data: null,
      fn_index: 0,
      trigger_id: 9,
    };

    const eventId = await briaAI.joinQueue(joinData);
    const result = await briaAI.processQueue();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
