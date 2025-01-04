import axios from "axios";
import EventSource from "eventsource";
const API_BASE = "https://nsfwalex-realism-pony-card.hf.space";
const headers = {
  "Content-Type": "application/json",
  Accept: "*/*",
  Origin: API_BASE,
  Referer: `${API_BASE}/?__theme=light`,
  "User-Agent": "Postify/1.0.0"
};
const session_hash = () => Math.random().toString(36).slice(2);
const nsfwalex = {
  create: async (prompt = "A young woman is dancing on the bed wearing a bra and panties", fn = 1, trid = 8) => {
    const sh = session_hash();
    const payload = {
      data: [prompt],
      fn_index: fn,
      trigger_id: trid,
      session_hash: sh
    };
    try {
      const {
        data
      } = await axios.post(`${API_BASE}/queue/join?__theme=light`, payload, {
        headers: headers
      });
      if (!data.event_id) throw new Error("Gak ada Event ID nya 🥴");
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_BASE}/queue/data?session_hash=${sh}`);
        eventSource.onmessage = ({
          data
        }) => {
          const message = JSON.parse(data);
          if (message.msg === "progress") {
            const progress = message.progress_data?.[0];
            if (progress) {
              process.stdout.write(`\r🟢 Progress: ${((progress.index + 1) / progress.length * 100).toFixed(0)}%`);
            }
          }
          if (message.msg === "process_completed") {
            eventSource.close();
            console.log("\n✅ Gambar berhasil di generate.", message.output.data);
            resolve(message.output.data[0].map(({
              image
            }) => image.url));
          }
        };
        eventSource.onerror = err => {
          eventSource.close();
          reject(new Error(err.message));
        };
      });
    } catch (error) {
      console.error(error.response?.data || error.message);
      if (error.response) {
        const err = error.response.data;
        if (err.includes("exceeded your GPU quota")) {
          console.error("Yaaahh kasian 😂 kena limit GPU nya wkwk.");
        } else {
          console.error(err);
        }
      } else {
        console.error(error.message);
      }
      throw error;
    }
  }
};
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  if (method === "GET") {
    try {
      if (query.prompt) {
        const result = await nsfwalex.create(query.prompt, parseInt(query.fn) || 1, parseInt(query.trid) || 8);
        return res.status(200).json(result);
      }
      return res.status(400).json({
        error: "Prompt is required"
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to generate image"
      });
    }
  }
  return res.status(405).json({
    error: "Method not allowed"
  });
}